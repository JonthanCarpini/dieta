/**
 * scrape-extra.js — Importador em massa de alimentos do Extra Mercado (VTEX)
 *
 * Descobre produtos navegando pelas categorias via API pública de catálogo VTEX,
 * extrai a tabela nutricional direto da página (JSON-LD / regex), com fallback
 * opcional para o LLM, e insere na tabela global `foods` (source='extra').
 *
 * USO:
 *   node backend/scripts/scrape-extra.js                 # tudo, parser direto
 *   node backend/scripts/scrape-extra.js --max 100       # limita a 100 produtos
 *   node backend/scripts/scrape-extra.js --llm           # usa LLM no fallback
 *   node backend/scripts/scrape-extra.js --dry           # não grava no banco
 *   node backend/scripts/scrape-extra.js --cat alimentos # filtra categoria raiz
 *
 * É educado: respeita delay entre requisições e User-Agent real.
 */

const db = require('../db');

// ── Configuração ──────────────────────────────────────────────────────────────
const BASE         = 'https://www.extramercado.com.br';
const DELAY_MS     = 1200;          // intervalo entre requisições (respeitoso)
const PAGE_SIZE    = 50;            // produtos por página VTEX (máx 50)
const UA           = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Flags de linha de comando
const args      = process.argv.slice(2);
const MAX       = parseInt(_flagVal('--max')) || Infinity;
const USE_LLM   = args.includes('--llm');
const DRY_RUN   = args.includes('--dry');
const CAT_FILTER= (_flagVal('--cat') || '').toLowerCase();

function _flagVal(flag) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Estatísticas
const stats = { discovered: 0, parsed: 0, inserted: 0, skipped: 0, failed: 0 };

// ── HTTP helper ───────────────────────────────────────────────────────────────
async function _get(url, asJson = false) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': asJson ? 'application/json' : 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
    redirect: 'follow',
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
  return asJson ? r.json() : r.text();
}

// ── 1. Descoberta de categorias (VTEX category tree) ──────────────────────────
async function discoverCategories() {
  try {
    const tree = await _get(`${BASE}/api/catalog_system/pub/category/tree/3`, true);
    const cats = [];
    const walk = (nodes) => {
      for (const n of nodes) {
        cats.push({ id: n.id, name: n.name, url: n.url });
        if (n.children?.length) walk(n.children);
      }
    };
    walk(tree);
    const filtered = CAT_FILTER
      ? cats.filter(c => c.name.toLowerCase().includes(CAT_FILTER))
      : cats;
    console.log(`📂 ${filtered.length} categorias encontradas${CAT_FILTER ? ` (filtro: "${CAT_FILTER}")` : ''}.`);
    return filtered;
  } catch (err) {
    console.error('Falha ao obter árvore de categorias VTEX:', err.message);
    return [];
  }
}

// ── 2. Listagem de produtos por categoria (VTEX search) ───────────────────────
async function* productsInCategory(catId) {
  let from = 0;
  while (true) {
    const to  = from + PAGE_SIZE - 1;
    const url = `${BASE}/api/catalog_system/pub/products/search?fq=C:${catId}&_from=${from}&_to=${to}`;
    let batch;
    try {
      batch = await _get(url, true);
    } catch (err) {
      // VTEX retorna 206 (partial) ok; outros erros encerram a categoria
      if (String(err.message).includes('416')) break; // out of range
      console.warn(`  ⚠ erro listando categoria ${catId} (${from}): ${err.message}`);
      break;
    }
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const p of batch) yield p;
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
    await sleep(DELAY_MS);
  }
}

// ── 3. Parser direto de nutrição ──────────────────────────────────────────────

// Tenta extrair a tabela nutricional de um produto VTEX usando, em ordem:
//   a) specifications/properties do próprio JSON do produto
//   b) descrição (description) com regex
//   c) HTML da página do produto (JSON-LD + regex)
async function parseNutrition(product) {
  const name = _cleanName(product.productName || product.productTitle || '');
  const brand = product.brand && !name.toLowerCase().includes(product.brand.toLowerCase())
    ? ` ${product.brand}` : '';
  const fullName = (name + brand).trim();
  const category = (product.categories?.[0] || '').split('/').filter(Boolean).pop() || 'Industrializados';

  // a) + b) — texto disponível no JSON do produto
  let blob = '';
  (product.items || []).forEach(it => { /* sku-level data, raramente tem nutrição */ });
  if (product.description) blob += ' ' + product.description;
  (product.allSpecifications || []).forEach(spec => {
    const vals = product[spec];
    if (Array.isArray(vals)) blob += ` ${spec}: ${vals.join(' ')} `;
  });

  let nut = _parseNutritionText(blob);

  // c) fallback — página do produto
  if (!_hasMacros(nut) && product.link) {
    try {
      const pageUrl = product.link.startsWith('http') ? product.link : `${BASE}/${product.linkText}/p`;
      const html = await _get(pageUrl);
      nut = _parseNutritionText(_htmlToText(html)) || nut;
    } catch { /* ignora */ }
  }

  return { name: fullName, category, ...nut };
}

// Regex robusto para tabelas nutricionais brasileiras (por porção ou 100g)
function _parseNutritionText(text) {
  if (!text) return {};
  const t = text.replace(/\s+/g, ' ');
  const num = (re) => {
    const m = t.match(re);
    if (!m) return null;
    return parseFloat(m[1].replace(',', '.'));
  };

  // Detecta a porção de referência
  const portion = num(/por\s+(\d+(?:[.,]\d+)?)\s*g/i) || num(/porção[^0-9]*(\d+(?:[.,]\d+)?)\s*g/i) || 100;

  const raw = {
    energy_kcal: num(/(?:valor\s+energ[ée]tico|energia)[^0-9]*(\d+(?:[.,]\d+)?)\s*kcal/i),
    protein_g:   num(/prote[íi]nas?[^0-9]*(\d+(?:[.,]\d+)?)\s*g/i),
    carbs_g:     num(/carboidratos?[^0-9]*(\d+(?:[.,]\d+)?)\s*g/i),
    fat_g:       num(/gorduras?\s+totais?[^0-9]*(\d+(?:[.,]\d+)?)\s*g/i),
    fiber_g:     num(/fibra[s]?\s+alimentar[^0-9]*(\d+(?:[.,]\d+)?)\s*g/i),
  };

  // Normaliza para 100g se a porção não for 100
  const factor = portion && portion !== 100 ? 100 / portion : 1;
  const norm = {};
  for (const [k, v] of Object.entries(raw)) {
    norm[k] = v != null ? Math.round(v * factor * 10) / 10 : null;
  }
  norm._portion = portion;
  return norm;
}

function _hasMacros(n) {
  return n && n.energy_kcal != null && (n.protein_g != null || n.carbs_g != null || n.fat_g != null);
}

function _htmlToText(html) {
  // Extrai JSON-LD + corpo limpo
  const ld = (html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [])
    .map(m => m.replace(/<[^>]+>/g, ' ')).join(' ');
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ');
  return (ld + ' ' + body).replace(/\s+/g, ' ');
}

function _cleanName(s) {
  return s.replace(/\s+/g, ' ').trim();
}

// ── 4. Fallback LLM (opcional, --llm) ─────────────────────────────────────────
let _llm = null;
function _getLLM() {
  if (!_llm) _llm = require('../routes/ai'); // expõe callLLM + getLLMConfig
  return _llm;
}

async function llmFallback(product) {
  try {
    const ai  = _getLLM();
    const cfg = await ai.getLLMConfig();
    const ctx = `Produto: ${product.productName}\nMarca: ${product.brand || ''}\nDescrição: ${(product.description || '').slice(0, 1500)}`;
    const prompt = `Extraia a tabela nutricional do produto abaixo. Retorne SOMENTE JSON:
{"energy_kcal":num_por_100g,"protein_g":num,"carbs_g":num,"fat_g":num,"fiber_g":num_ou_null}
Normalize para 100g. Use null se não houver dado.

${ctx}`;
    const { text } = await ai.callLLM(cfg, prompt);
    const j = JSON.parse(text.replace(/```json?|```/g, '').trim());
    return j;
  } catch (err) {
    return null;
  }
}

// ── 5. Inserção no banco (foods global, dedup por nome) ────────────────────────
let _createdBy = null;
async function _resolveCreatedBy() {
  try {
    const r = await db.query(`SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1`);
    _createdBy = r.rows[0]?.id || null;
  } catch { _createdBy = null; }
}

async function insertFood(food) {
  // Dedup por nome (case-insensitive) — não duplica produto já importado
  const exists = await db.query(`SELECT 1 FROM foods WHERE LOWER(name) = LOWER($1) LIMIT 1`, [food.name]);
  if (exists.rows.length) { stats.skipped++; return false; }

  if (DRY_RUN) { stats.inserted++; return true; }

  await db.query(
    `INSERT INTO foods (name, category, energy_kcal, protein_g, carbs_g, fat_g, fiber_g, source, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'extra',$8)`,
    [food.name, food.category,
     food.energy_kcal ?? 0, food.protein_g ?? 0, food.carbs_g ?? 0,
     food.fat_g ?? 0, food.fiber_g ?? null, _createdBy]
  );
  stats.inserted++;
  return true;
}

// ── Orquestração ──────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🛒 Scraper Extra Mercado — ${DRY_RUN ? 'DRY-RUN' : 'GRAVANDO'} | LLM fallback: ${USE_LLM ? 'on' : 'off'} | max: ${MAX === Infinity ? '∞' : MAX}\n`);

  await _resolveCreatedBy();
  const categories = await discoverCategories();
  if (!categories.length) { console.error('Nenhuma categoria. Abortando.'); process.exit(1); }

  const seenProducts = new Set();

  outer:
  for (const cat of categories) {
    console.log(`\n📁 ${cat.name} (id ${cat.id})`);
    for await (const product of productsInCategory(cat.id)) {
      if (stats.inserted + stats.skipped >= MAX) break outer;
      if (seenProducts.has(product.productId)) continue;
      seenProducts.add(product.productId);
      stats.discovered++;

      try {
        let food = await parseNutrition(product);

        if (!_hasMacros(food) && USE_LLM) {
          const j = await llmFallback(product);
          if (j) food = { ...food, ...j };
        }

        if (!food.name || !_hasMacros(food)) { stats.failed++; continue; }

        stats.parsed++;
        const ok = await insertFood(food);
        if (ok) {
          console.log(`  ✓ ${food.name} — ${food.energy_kcal}kcal P${food.protein_g ?? '-'} C${food.carbs_g ?? '-'} G${food.fat_g ?? '-'}`);
        }
      } catch (err) {
        stats.failed++;
        console.warn(`  ✗ ${product.productName}: ${err.message}`);
      }

      await sleep(DELAY_MS);
    }
  }

  console.log(`\n──────────────────────────────`);
  console.log(`Descobertos: ${stats.discovered}`);
  console.log(`Parseados:   ${stats.parsed}`);
  console.log(`Inseridos:   ${stats.inserted}`);
  console.log(`Duplicados:  ${stats.skipped}`);
  console.log(`Falhas:      ${stats.failed}`);
  console.log(`──────────────────────────────\n`);

  await db.pool.end();
  process.exit(0);
}

main().catch(err => { console.error('Erro fatal:', err); process.exit(1); });
