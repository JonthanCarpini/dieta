/**
 * scrape-tabela.js — Importador de alimentos do tabeladealimentos.com.br
 *
 * O site (sem fins lucrativos, sem API) expõe um endpoint ajax que o próprio
 * front-end usa: POST /config/config.php
 *   - redirect=R&referencia=ID → subcategorias (data-referencia) OU produtos (data-indice)
 *   - indice=ID                → detalhe do alimento (valores POR 1 GRAMA)
 *
 * Navega a árvore de categorias recursivamente, coleta os produtos e importa
 * para a tabela global `foods` (source='tabela'), normalizando para 100g.
 *
 * USO:
 *   node backend/scripts/scrape-tabela.js --dry --max 30
 *   node backend/scripts/scrape-tabela.js --max 2000
 *   node backend/scripts/scrape-tabela.js --cat frutas
 */

const db = require('../db');

const args = process.argv.slice(2);
function _flag(f) { const i = args.indexOf(f); return i !== -1 && args[i + 1] ? args[i + 1] : null; }

const SITE   = 'http://www.tabeladealimentos.com.br';
const ENDP   = `${SITE}/config/config.php`;
const UA     = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DELAY  = parseInt(_flag('--delay')) || 500;
const MAX    = parseInt(_flag('--max')) || Infinity;
const DRY    = args.includes('--dry');
const CATF   = (_flag('--cat') || '').toLowerCase();
const FETCH_TIMEOUT = 15000;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const stats = { cats: 0, products: 0, valid: 0, inserted: 0, skipped: 0, noTable: 0, failed: 0 };

// ── HTTP ──────────────────────────────────────────────────────────────────────
async function _post(data, tries = 3) {
  for (let i = 0; i < tries; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
    try {
      const r = await fetch(ENDP, {
        method: 'POST', signal: ctrl.signal,
        headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
        body: data,
      });
      clearTimeout(t);
      if (r.ok) return r.text();
      if ((r.status === 403 || r.status === 429) && i < tries - 1) { await sleep(5000 * (i + 1)); continue; }
      throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      clearTimeout(t);
      if (i < tries - 1) { await sleep(3000 * (i + 1)); continue; }
      throw e;
    }
  }
  throw new Error('falha após retries');
}

async function _getText(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try { const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': UA } }); return r.text(); }
  finally { clearTimeout(t); }
}

// ── Categorias raiz (da home) ─────────────────────────────────────────────────
async function _rootCategories() {
  const html = await _getText(`${SITE}/`);
  const block = (html.match(/<ul id="main-list">([\s\S]*?)<\/ul>/) || [])[1] || '';
  const cats = [...block.matchAll(/data-redirect='(\d+)'\s+data-referencia='(\d+)'>([^<]+)</g)]
    .map(m => ({ redirect: m[1], referencia: m[2], name: m[3].trim() }));
  return CATF ? cats.filter(c => c.name.toLowerCase().includes(CATF)) : cats;
}

// ── Parse de nutrição (valores por 1g → ×100) ─────────────────────────────────
function _parseDetail(html) {
  const val = id => {
    const m = html.match(new RegExp(`id='${id}'[^>]*data-value='([\\d.]+)'`));
    return m ? parseFloat(m[1]) : null;
  };
  const per1g = {
    energy_kcal: val('calorias'),
    carbs_g:     val('carboidratos'),
    protein_g:   val('proteina'),
    fat_g:       val('gorduratotal'),
    fiber_g:     val('fibra'),
    sodium_mg:   val('sodio'),
  };
  const out = {};
  for (const [k, v] of Object.entries(per1g)) out[k] = v != null ? Math.round(v * 100 * 10) / 10 : null;
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
async function _existsByName(name) {
  if (!name) return false;
  try { const r = await db.query(`SELECT 1 FROM foods WHERE LOWER(name)=LOWER($1) LIMIT 1`, [name]); return r.rows.length > 0; }
  catch { return false; }
}
async function _insert(food) {
  if (DRY) { stats.inserted++; return true; }
  await db.query(
    `INSERT INTO foods (name, category, energy_kcal, protein_g, carbs_g, fat_g, fiber_g, source, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'tabela',$8)`,
    [food.name, food.category, food.energy_kcal, food.protein_g, food.carbs_g, food.fat_g, food.fiber_g ?? null, _createdBy]
  );
  stats.inserted++;
  return true;
}

// ── Coleta recursiva de produtos por categoria ────────────────────────────────
async function _collectProducts(redirect, referencia, rootName, productMap, visited, depth) {
  if (depth > 6) return;
  const key = `${redirect}:${referencia}`;
  if (visited.has(key)) return;
  visited.add(key);

  let html;
  try { html = await _post(`redirect=${redirect}&referencia=${referencia}`); }
  catch { return; }
  await sleep(DELAY);

  // Produtos (folha)
  for (const m of html.matchAll(/data-indice='(\d+)'>([^<]+)</g)) {
    const name = m[2].replace(/\s+/g, ' ').trim();
    if (!productMap.has(m[1])) productMap.set(m[1], { indice: m[1], name, category: rootName });
  }
  // Subcategorias (desce)
  const subs = [...html.matchAll(/data-redirect='(\d+)'\s+data-referencia='(\d+)'/g)];
  for (const s of subs) {
    await _collectProducts(s[1], s[2], rootName, productMap, visited, depth + 1);
  }
}

// ── Orquestração ──────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🥗 Scraper Tabela de Alimentos — ${DRY ? 'DRY-RUN (não grava)' : 'GRAVANDO'} | max ${MAX === Infinity ? '∞' : MAX}\n`);
  if (!DRY) await _resolveCreatedBy();

  const roots = await _rootCategories();
  if (!roots.length) { console.error('Nenhuma categoria raiz encontrada.'); process.exit(1); }
  console.log(`📂 ${roots.length} categorias raiz${CATF ? ` (filtro "${CATF}")` : ''}\n`);

  for (const cat of roots) {
    stats.cats++;
    const productMap = new Map();
    const visited = new Set();
    await _collectProducts(cat.redirect, cat.referencia, cat.name, productMap, visited, 0);
    const products = [...productMap.values()];
    console.log(`\n📁 ${cat.name} — ${products.length} produtos`);

    for (const p of products) {
      if (stats.inserted + stats.skipped + stats.noTable >= MAX) { _finish(); return; }

      // dedup rápida por nome
      if (!DRY && await _existsByName(p.name)) { stats.skipped++; continue; }

      stats.products++;
      try {
        const html = await _post(`indice=${p.indice}`);
        const nut = _parseDetail(html);
        const food = { name: p.name, category: p.category, ...nut };
        if (!_hasFullTable(food)) { stats.noTable++; }
        else {
          stats.valid++;
          await _insert(food);
          console.log(`  ✓ ${food.name.slice(0, 50)} — ${food.energy_kcal}kcal P${food.protein_g} C${food.carbs_g} G${food.fat_g}`);
        }
      } catch (e) { stats.failed++; }

      if (stats.products % 25 === 0) console.log(`  … ${stats.products} vistos | ${stats.inserted} novos | ${stats.skipped} já existiam | ${stats.noTable} sem tabela`);
      await sleep(DELAY);
    }
  }
  _finish();
}

function _finish() {
  console.log(`\n──────────────────────────────`);
  console.log(`Categorias:         ${stats.cats}`);
  console.log(`Produtos vistos:    ${stats.products}`);
  console.log(`Com tabela:         ${stats.valid}`);
  console.log(`${DRY ? 'Seriam inseridos:  ' : 'Inseridos:         '} ${stats.inserted}`);
  console.log(`Já existiam:        ${stats.skipped}`);
  console.log(`Sem tabela:         ${stats.noTable}`);
  console.log(`Falhas:             ${stats.failed}`);
  console.log(`──────────────────────────────\n`);
  try { db.pool.end(); } catch {}
  process.exit(0);
}

main().catch(err => { console.error('Erro fatal:', err); process.exit(1); });
