'use strict';
/**
 * match-curated.js — Fase 6: cria `curated_foods` e casa cada item do seed
 * (seed_curated.json) com o melhor `alimentos.id` da TACO por pontuação.
 * Idempotente: limpa e re-semeia. Imprime relatório (✓ match / ⚠ baixa confiança / ✗ não achado).
 *
 * USO (no container): node nutrition/match-curated.js [--dry]
 */
const fs = require('fs');
const path = require('path');
const db = require('../db');
const gen = require('./generator');

const DRY = process.argv.includes('--dry');
const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed_curated.json'), 'utf8'));

const MICRO_OK = r => Number(r.ca) > 0 && Number(r.fe) > 0 && Number(r.na) > 0 && Number(r.k) > 0;

// pratos preparados / formas indesejadas (penalidade forte)
const PREPARED = /salada|sandu[ií]ch|\bsuco\b|\bdoce\b|em pó|\bbolo\b|receita|espeto|à grega|caramel|açúcar|rechead|\btorta\b|\bsopa\b|creme de|nugget|mingau|farofa|risoto|strogonoff|empad|pizza|lasanha|panqueca|pastel|coxinha|salgad|\bbarra\b|cereal/;

function scoreRow(row, role, words) {
  const n = (row.nome || '').toLowerCase();
  let s = 0;
  const grps = gen.ROLE_GROUPS[role] || [];
  if (grps.includes(row.grupo)) s += 25;
  if (role !== 'fat') s += MICRO_OK(row) ? 50 : -30;

  // palavra principal como token inteiro no nome → forte sinal de match correto
  const first = words[0];
  if (first && new RegExp(`(^|[ ,])${first.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}([ ,]|$)`).test(n)) s += 30;
  // nome COMEÇA com a palavra principal → forte sinal de que é o alimento puro (não ingrediente)
  if (first && n.startsWith(first)) s += 40;

  // preparo
  if (/cozid|grelhad|assad|refogad/.test(n)) s += 10;
  if (/\bcru\b|\bcrua\b/.test(n)) s -= 45;
  if (/frit|conserva|defumad|em calda|enlatad/.test(n)) s -= 30;
  // prato preparado / composto
  if (PREPARED.test(n)) s -= 45;
  // "X com <comida>" (mistura) — permite "com sal/óleo/sem/casca/pele/leite"
  if (/ com (?!sal|óleo|oleo|sem|casca|pele|leite)/.test(n)) s -= 22;
  // óleo quando não é papel gordura/azeite
  if (/óleo de|oleo de/.test(n) && !/óleo|oleo|azeite/.test(words.join(' '))) s -= 35;
  // leite em pó para laticínio líquido
  if (role === 'dairy' && /em pó|em po/.test(n)) s -= 35;

  const ptn = Number(row.ptn) || 0, cho = Number(row.cho) || 0, lip = Number(row.lip) || 0;
  if (role === 'protein') { if (ptn >= 12) s += 15; if (ptn < 8) s -= 15; }
  if (role === 'carb')    { if (cho >= 18) s += 10; }
  if (role === 'legume')  { if (cho >= 8)  s += 8; }
  if (role === 'fat')     { if (lip >= 40) s += 15; }
  if (role === 'vegetable') { if ((Number(row.kcal) || 0) < 80) s += 5; }

  // preferir nomes simples (menos componentes)
  const parts = n.split(/[ ,]+/).filter(Boolean).length;
  s -= Math.min(28, parts * 3);
  return s;
}

async function findBest(entry) {
  const micros = gen.MICRO_KEYS.join(', ');
  const words = entry.q.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  const conds = words.map((_, i) => `nome ILIKE $${i + 1}`).join(' AND ');
  const params = words.map(w => `%${w}%`);
  const res = await db.query(
    `SELECT id, nome, grupo, kcal, ptn, cho, lip, fibras, ${micros}
     FROM alimentos
     WHERE (tipo IS NULL OR tipo='alimento') AND ${conds} AND kcal > 0
     LIMIT 150`,
    params
  );
  if (!res.rows.length) return null;
  let best = null, bestScore = -1e9;
  for (const row of res.rows) {
    const sc = scoreRow(row, entry.role, words);
    if (sc > bestScore) { bestScore = sc; best = row; }
  }
  return { row: best, score: bestScore };
}

async function main() {
  console.log(`\n🍽️  Match curado → TACO  (${DRY ? 'DRY' : 'GRAVANDO'}) — ${seed.length} itens\n`);

  if (!DRY) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS curated_foods (
        id SERIAL PRIMARY KEY,
        alimento_id INTEGER NOT NULL,
        display_name VARCHAR(120) NOT NULL,
        role VARCHAR(20) NOT NULL,
        meals JSONB NOT NULL DEFAULT '[]',
        region VARCHAR(30) DEFAULT 'nacional',
        default_portion_g NUMERIC,
        taco_name VARCHAR(200),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
    await db.query(`DELETE FROM curated_foods`); // re-seed limpo
  }

  let ok = 0, low = 0, miss = 0;
  for (const e of seed) {
    let m;
    if (e.id) {
      // id explícito no seed → casa direto (sem chute de score). Para itens que a
      // TACO mapeia mal por nome (sucos, sementes), fixamos o alimento certo.
      const micros = gen.MICRO_KEYS.join(', ');
      const r = await db.query(
        `SELECT id, nome, grupo, kcal, ptn, cho, lip, fibras, ${micros} FROM alimentos WHERE id=$1`, [e.id]);
      m = r.rows.length ? { row: r.rows[0], score: 999 } : null;
    } else {
      m = await findBest(e);
    }
    if (!m || !m.row) { miss++; console.log(`  ✗ ${e.name}  (q="${e.q}") — NÃO ACHADO`); continue; }
    const conf = m.score >= 30 ? '✓' : '⚠';
    if (m.score >= 30) ok++; else low++;
    console.log(`  ${conf} ${e.name.padEnd(28)} → [${m.row.id}] ${m.row.nome.slice(0, 42)}  (${Math.round(m.row.kcal)}kcal sc:${m.score})`);
    if (!DRY) {
      await db.query(
        `INSERT INTO curated_foods (alimento_id, display_name, role, meals, region, default_portion_g, taco_name)
         VALUES ($1,$2,$3,$4,'nacional',$5,$6)`,
        [m.row.id, e.name, e.role, JSON.stringify(e.meals), e.portion, m.row.nome]
      );
    }
  }

  console.log(`\n──────────────────────────────`);
  console.log(`✓ match bom: ${ok} | ⚠ baixa confiança: ${low} | ✗ não achado: ${miss}`);
  console.log(`──────────────────────────────\n`);
  try { await db.pool.end(); } catch {}
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
