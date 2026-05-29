/**
 * scrape-extra.js — Importador em massa de alimentos do Extra Mercado
 *
 * Plataforma: site Next.js + API GPA (api.vendas.gpa.digital).
 *
 * Fluxo:
 *   1. Descobre termos a partir da árvore de categorias (público) ou --terms.
 *   2. Para cada termo, pagina a busca pública (POST /ex/search/search) e coleta
 *      as URLs dos produtos (dedup por id).
 *   3. Abre cada produto e lê a tabela nutricional estruturada de
 *      __NEXT_DATA__.product.nutritionalMap.
 *   4. NORMALIZA para 100g: a base (por porção ou por 100g) varia por produto;
 *      detectamos pelo %VD (sempre calculado sobre a porção) cruzado com a porção
 *      do header. Validado contra produtos reais.
 *   5. Importa só produtos com TABELA NUTRICIONAL COMPLETA (energia + 3 macros)
 *      para a tabela global `foods` (source='extra'), com dedup por nome.
 *
 * USO:
 *   node backend/scripts/scrape-extra.js --dry --max 20         # teste sem gravar
 *   node backend/scripts/scrape-extra.js --max 500              # importa até 500
 *   node backend/scripts/scrape-extra.js --terms "arroz,feijao" # termos próprios
 *
 * Educado: delay entre requisições + User-Agent real.
 */

const db = require('../db');

// ── Config ────────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
function _flag(f) { const i = args.indexOf(f); return i !== -1 && args[i + 1] ? args[i + 1] : null; }

const API   = 'https://api.vendas.gpa.digital/ex';
const SITE   = 'https://www.extramercado.com.br';
const UA     = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const STORE  = parseInt(_flag('--store')) || 483;
const DELAY  = parseInt(_flag('--delay')) || 1300;
const PAGE_SZ= 24;

const MAX     = parseInt(_flag('--max')) || Infinity;
const DRY     = args.includes('--dry');
const TERMS_CLI = (_flag('--terms') || '').split(',').map(s => s.trim()).filter(Boolean);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const num   = v => { const m = String(v ?? '').match(/-?\d+(?:[.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : null; };

const stats = { terms: 0, found: 0, products: 0, valid: 0, inserted: 0, skipped: 0, noTable: 0, failed: 0 };

// Mapa código GPA → campo. Referência ANVISA p/ %VD (porção).
const FIELDS = [
  { code: 'infnutricValorEnergetico', key: 'energy_kcal', vdRef: 2000 },
  { code: 'infnutricProteina',        key: 'protein_g',   vdRef: 50   },
  { code: 'infnutricCarboidrato',     key: 'carbs_g',     vdRef: 300  },
  { code: 'infnutricGordurasTotais',  key: 'fat_g',       vdRef: 55   },
  { code: 'infnutricFibraAlim',       key: 'fiber_g',     vdRef: 25   },
];

// ── HTTP (com timeout p/ não pendurar o processo) ─────────────────────────────
const FETCH_TIMEOUT = 15000;
async function _fetchT(url, opts = {}, ms = FETCH_TIMEOUT) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}
// Retry com backoff em 403/429 (rate-limit do site recupera com espera)
async function _getText(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    let r;
    try {
      r = await _fetchT(url, { headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Referer': `${SITE}/`,
        'Upgrade-Insecure-Requests': '1',
      } });
    } catch (e) {
      if (i < tries - 1) { await sleep(4000 * (i + 1)); continue; }
      throw e;
    }
    if (r.ok) return r.text();
    if ((r.status === 403 || r.status === 429) && i < tries - 1) {
      const wait = [6000, 20000, 45000][i] || 45000;
      console.warn(`  ⏳ ${r.status} — aguardando ${wait/1000}s (rate-limit)`);
      await sleep(wait);
      continue;
    }
    throw new Error(`HTTP ${r.status}`);
  }
  throw new Error('falha após retries');
}
async function _search(terms, page) {
  const r = await _fetchT(`${API}/search/search`, {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Content-Type': 'application/json', 'Accept': 'application/json', 'x-origin': 'CATALOG' },
    body: JSON.stringify({
      terms, page, sortBy: 'relevance', resultsPerPage: PAGE_SZ,
      allowRedirect: true, storeId: STORE, customerPlus: true,
      department: 'ecom', partner: 'fallback',
    }),
  });
  if (!r.ok) throw new Error(`search HTTP ${r.status}`);
  return r.json();
}

// Dedup rápida por nome (evita re-baixar páginas de produtos já importados)
async function _existsByName(name) {
  if (!name) return false;
  try { const r = await db.query(`SELECT 1 FROM foods WHERE LOWER(name)=LOWER($1) LIMIT 1`, [name]); return r.rows.length > 0; }
  catch { return false; }
}

// ── Descoberta de termos (árvore de categorias) ───────────────────────────────
async function _discoverTerms() {
  if (TERMS_CLI.length) { console.log(`🔎 ${TERMS_CLI.length} termos via --terms`); return TERMS_CLI; }
  try {
    const r = await fetch(`${API}/v3/products/categories/ecom?storeId=${STORE}&split=&showSub=true`,
      { headers: { 'User-Agent': UA, 'Accept': 'application/json', 'x-origin': 'CATALOG' } });
    const j = await r.json();
    const roots = j.content || [];
    // Departamentos de alimentos/bebidas
    const foodRoots = roots.filter(c => /aliment|bebida|merc|padaria|hortifr|congelad|doce|snack/i.test(c.name));
    const terms = new Set();
    const walk = (nodes) => {
      for (const n of nodes) {
        if (n.name && n.name.length > 2) terms.add(n.name);
        if (n.subCategory?.length) walk(n.subCategory);
      }
    };
    walk(foodRoots.length ? foodRoots : roots);
    console.log(`🔎 ${terms.size} termos extraídos de ${foodRoots.length || roots.length} departamentos`);
    return [...terms];
  } catch (err) {
    console.warn('Falha ao obter categorias, usando termos padrão:', err.message);
    return ['arroz','feijao','leite','pao','biscoito','carne','frango','queijo','iogurte','cafe','acucar','farinha','oleo','macarrao','molho','suco','refrigerante','fruta','legume','cereal'];
  }
}

// ── Parse + normalização da tabela nutricional ────────────────────────────────
function _parseNutrition(prod) {
  const nm = prod.nutritionalMap;
  if (!nm || !Array.isArray(nm.attributes) || !nm.attributes.length) return null;

  const portion = num((nm.header || '').match(/porç[ãa]o\s*de\s*([\d.,]+)\s*g/i)?.[1]) || null;

  // Coleta valores brutos + vd
  const raw = {};
  for (const f of FIELDS) {
    const a = nm.attributes.find(x => x.code === f.code);
    raw[f.key] = a ? { val: num(a.val ?? a.value), vd: num(a.vd) } : { val: null, vd: null };
  }

  // Detecta a base (por porção × por 100g) usando o %VD como discriminador.
  // %VD é sempre calculado sobre a PORÇÃO. Se `value` ~ vd/100*ref → é por porção;
  // se `value` ~ (vd/100*ref)*(100/porção) → é por 100g.
  let basis = null; // 'portion' | 'per100'
  if (portion && portion !== 100) {
    for (const f of FIELDS) {
      const { val, vd } = raw[f.key];
      if (val == null || vd == null || vd <= 0) continue;
      const perPortionFromVd = (vd / 100) * f.vdRef;
      if (perPortionFromVd <= 0) continue;
      const errPortion = Math.abs(val / perPortionFromVd - 1);
      const err100     = Math.abs(val / (perPortionFromVd * 100 / portion) - 1);
      basis = errPortion <= err100 ? 'portion' : 'per100';
      break;
    }
    // Fallback sem %VD: assume por porção se o resultado em 100g for plausível
    if (!basis) {
      const e = raw.energy_kcal.val;
      basis = (e != null && (e / portion * 100) <= 900) ? 'portion' : 'per100';
    }
  } else {
    basis = 'per100';
  }

  const factor = basis === 'per100' || !portion ? 1 : 100 / portion;
  const out = {};
  for (const f of FIELDS) {
    const v = raw[f.key].val;
    out[f.key] = v != null ? Math.round(v * factor * 10) / 10 : null;
  }
  out._portion = portion;
  out._basis   = basis;
  return out;
}

function _hasFullTable(n) {
  return n && n.energy_kcal != null && n.energy_kcal > 0
    && n.protein_g != null && n.carbs_g != null && n.fat_g != null;
}

// ── Banco ─────────────────────────────────────────────────────────────────────
let _createdBy = null;
async function _resolveCreatedBy() {
  try { const r = await db.query(`SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1`); _createdBy = r.rows[0]?.id || null; }
  catch { _createdBy = null; }
}
async function _insert(food) {
  if (DRY) { stats.inserted++; return true; }
  const ex = await db.query(`SELECT 1 FROM foods WHERE LOWER(name)=LOWER($1) LIMIT 1`, [food.name]);
  if (ex.rows.length) { stats.skipped++; return false; }
  await db.query(
    `INSERT INTO foods (name, category, energy_kcal, protein_g, carbs_g, fat_g, fiber_g, source, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'extra',$8)`,
    [food.name, food.category, food.energy_kcal, food.protein_g, food.carbs_g, food.fat_g, food.fiber_g ?? null, _createdBy]
  );
  stats.inserted++;
  return true;
}

// ── Produto: abre página e extrai nutrição ────────────────────────────────────
function _titleCase(s) {
  return s.replace(/\s+/g, ' ').trim().toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
}
async function _fetchProduct(url, term) {
  const html = await _getText(url);
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  const prod = JSON.parse(m[1]).props?.pageProps?.product;
  if (!prod) return null;
  const nut = _parseNutrition(prod);
  if (!nut) return null;
  const name = (prod.name || '').replace(/\s+/g, ' ').trim();
  const category = term ? _titleCase(term) : 'Industrializados';
  return { name, category, ...nut };
}

// ── Orquestração ──────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🛒 Scraper Extra — ${DRY ? 'DRY-RUN (não grava)' : 'GRAVANDO'} | store ${STORE} | max ${MAX === Infinity ? '∞' : MAX}\n`);
  if (!DRY) await _resolveCreatedBy();

  const terms = await _discoverTerms();
  const seen  = new Set();
  let consecFail = 0;

  outer:
  for (const term of terms) {
    stats.terms++;
    let page = 1, totalPages = 1;
    do {
      let res;
      try { res = await _search(term, page); }
      catch (e) { console.warn(`  busca "${term}" p${page}: ${e.message}`); break; }
      totalPages = res.totalPages || 1;
      const prods = res.products || [];
      if (page === 1) console.log(`\n🔎 "${term}" — ${res.totalProducts || 0} produtos`);

      for (const p of prods) {
        if (stats.inserted + stats.skipped + stats.noTable >= MAX) break outer;
        if (!p.urlDetails || seen.has(p.id)) continue;
        seen.add(p.id);
        stats.products++;

        // Dedup rápida: se já existe pelo nome do resultado, pula sem baixar a página
        if (!DRY && await _existsByName((p.name || '').replace(/\s+/g, ' ').trim())) {
          stats.skipped++;
          if (stats.products % 25 === 0) console.log(`  … ${stats.products} vistos | ${stats.inserted} novos | ${stats.skipped} já existiam`);
          continue;
        }

        try {
          const food = await _fetchProduct(p.urlDetails, term);
          if (!food || !food.name) { stats.noTable++; }
          else if (!_hasFullTable(food)) { stats.noTable++; }
          else {
            stats.valid++;
            const ok = await _insert(food);
            if (ok) console.log(`  ✓ ${food.name.slice(0, 48)} — ${food.energy_kcal}kcal P${food.protein_g} C${food.carbs_g} G${food.fat_g} [${food._basis}/${food._portion ?? '?'}g]`);
          }
          consecFail = 0; // sucesso (ou produto sem tabela) reseta o contador
        } catch (e) {
          stats.failed++; consecFail++;
          if (stats.failed % 10 === 0) console.warn(`  ⚠ ${stats.failed} falhas (última: ${e.message})`);
          if (consecFail >= 25) { console.error(`\n⛔ ${consecFail} falhas seguidas — provável bloqueio. Encerrando.`); break outer; }
        }

        if (stats.products % 25 === 0) console.log(`  … ${stats.products} vistos | ${stats.inserted} novos | ${stats.skipped} já existiam | ${stats.noTable} sem tabela`);
        await sleep(DELAY);
      }
      page++;
      if (page <= totalPages) await sleep(DELAY);
    } while (page <= totalPages);
  }

  console.log(`\n──────────────────────────────`);
  console.log(`Termos buscados:    ${stats.terms}`);
  console.log(`Produtos vistos:    ${stats.products}`);
  console.log(`Com tabela completa:${stats.valid}`);
  console.log(`${DRY ? 'Seriam inseridos:  ' : 'Inseridos:         '} ${stats.inserted}`);
  console.log(`Já existiam (dup):  ${stats.skipped}`);
  console.log(`Sem tabela nutric.: ${stats.noTable}`);
  console.log(`Falhas:             ${stats.failed}`);
  console.log(`──────────────────────────────\n`);

  try { await db.pool.end(); } catch {}
  process.exit(0);
}

main().catch(err => { console.error('Erro fatal:', err); process.exit(1); });
