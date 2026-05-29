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

function scoreRow(row, role) {
  const n = (row.nome || '').toLowerCase();
  let s = 0;
  // grupo coerente com o papel
  const grps = gen.ROLE_GROUPS[role] || [];
  if (grps.includes(row.grupo)) s += 20;
  // micro-completude (exceto gordura)
  if (role !== 'fat') s += MICRO_OK(row) ? 50 : -30;
  // preferir preparo cozido/grelhado
  if (/cozid|grelhad|assad|refogad/.test(n)) s += 12;
  // penalizar formas indesejadas
  if (/\bcru\b|\bcrua\b|frit|conserva|caramelizad|maionese|defumad|em calda|enlatad/.test(n)) s -= 25;
  // ajuste por macro do papel
  const ptn = Number(row.ptn) || 0, cho = Number(row.cho) || 0, lip = Number(row.lip) || 0;
  if (role === 'protein') { if (ptn >= 12) s += 15; if (ptn < 8) s -= 15; }
  if (role === 'carb')    { if (cho >= 18) s += 10; }
  if (role === 'legume')  { if (cho >= 8)  s += 8; }
  if (role === 'fat')     { if (lip >= 40) s += 15; }
  if (role === 'vegetable') { if ((Number(row.kcal) || 0) < 80) s += 5; }
  // preferir nomes simples (staples)
  s -= Math.min(18, Math.floor(n.length / 7));
  return s;
}

async function findBest(entry) {
  const micros = gen.MICRO_KEYS.join(', ');
  const res = await db.query(
    `SELECT id, nome, grupo, kcal, ptn, cho, lip, fibras, ${micros}
     FROM alimentos
     WHERE (tipo IS NULL OR tipo='alimento') AND nome ILIKE $1 AND kcal > 0
     LIMIT 120`,
    [`%${entry.q}%`]
  );
  if (!res.rows.length) return null;
  let best = null, bestScore = -1e9;
  for (const row of res.rows) {
    const sc = scoreRow(row, entry.role);
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
    const m = await findBest(e);
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
