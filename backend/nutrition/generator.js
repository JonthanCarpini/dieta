'use strict';
/**
 * generator.js — Fase 2 do Gerador de Cardápios: motor base (kcal + macros/dia).
 * Monta pool da TACO, aplica templates por refeição e preenche porções para bater
 * o alvo de kcal+macros. SEM otimização de micro ainda (isso é Fase 3).
 * Ver GERADOR_CARDAPIO.md.
 */
const planner = require('./planner');

// Mesma ordem/chaves de MICRO_KEYS do builder (pro-meals.js) — compatibilidade do item
const MICRO_KEYS = ['ca','mg','p','fe','na','k','co','zn','se','re','rea','tiamina','riboflavina','piridoxina','niacina','vitc','vitb12','vitb9','vite','vitd'];

// Papel → grupos reais da TACO (confirmados na Fase 0/2)
const ROLE_GROUPS = {
  protein:   ['Carnes e derivados', 'Pescados e Frutos do mar', 'Pescados e frutos do mar', 'Ovos e derivados'],
  legume:    ['Leguminosas e derivados'],
  carb:      ['Cereais e derivados'],
  vegetable: ['Vegetais e derivados'],
  fruit:     ['Frutas e derivados'],
  dairy:     ['Leite e derivados'],
  fat:       ['Gorduras e azeites', 'Gorduras e óleos'],
};

// Filtro de sanidade macro por papel (por 100g): preferir alimentos MAGROS/LIMPOS
// (proteína magra não despeja gordura; carbo limpo = grão, não doce frito)
const ROLE_MACRO_FILTER = {
  protein:   'ptn >= 15 AND lip <= 12',          // proteína magra e densa (menos gramas)
  legume:    'cho >= 10 AND lip <= 10',
  carb:      'cho >= 18 AND lip <= 8',            // grão/raiz, sem fritura
  vegetable: 'kcal < 80',
  fruit:     'cho >= 5 AND kcal < 150',
  dairy:     '(ptn >= 2 OR cho >= 3) AND lip <= 12',
  fat:       'lip >= 40',
};

// Nomes a evitar: frituras, crus, embutidos, sobremesas, ultraprocessados
const NAME_BLACKLIST = /frit|milanes|à dor[ée]|caramelizad|maionese|nugget|empanad|parmegian|crist|em calda|torresmo|salgadinho|rechead|chips|bacon|defumad|enlatad|conserva|\bcru\b|\bcrua\b|apresuntad|presunto|mortadela|salsich|lingui[cç]|salame|condensad|brigadeir|pudim|mousse|sorvete|achocolat|gelatina|\bbolo\b|\btorta\b/i;
// Papéis isentos da blacklist (vegetal/fruta podem ser crus). Gordura agora APLICA (tira maionese).
const BLACKLIST_SKIP = new Set(['vegetable', 'fruit']);
const ENERGY_ROLES   = new Set(['carb', 'legume', 'dairy', 'fruit', 'vegetable']);

// Composição de cada refeição (papéis) — rotina/fisiologia do brasileiro:
//  - 3 principais (café/almoço/jantar) concentram as calorias
//  - lanches: leves, fruta
//  - ceia: SEM carboidrato (horário tardio); laticínio magro + oleaginosa/semente
//    rica em fibra (saciedade + esvaziamento gástrico mais lento)
const MEAL_TEMPLATES = {
  cafe_da_manha: ['carb', 'dairy', 'fruit'],
  lanche_manha:  ['fruit'],
  almoco:        ['protein', 'legume', 'vegetable', 'fat', 'carb'],
  lanche_tarde:  ['fruit'],
  jantar:        ['protein', 'vegetable', 'carb'],
  ceia:          ['dairy', 'fat'],
};

// Comportamento por papel:
//  - 'fixed': porção fixa (veg/fruta/leguminosa/laticínio)
//  - owns 'protein' | 'fat': resolve esse macro
//  - owns 'kcal': CARBO fecha a energia restante (lever de calorias)
const ROLE_OWNS = { protein: 'protein', fat: 'fat', carb: 'kcal', legume: null, dairy: null, vegetable: null, fruit: null };
const ROLE_FALLBACK = { protein: 'legume', dairy: null };
const FIXED_PORTION = { vegetable: 90, fruit: 130, legume: 80, dairy: 200 };
// mínimos baixos para NÃO inflar porções caseiras curadas (ex: queijo 30g) — antes
// dairy mínimo 120 forçava queijo a 120g = ~400kcal, estourando a meta.
const CLAMP = { protein: [30, 220], carb: [20, 400], legume: [30, 180], dairy: [15, 250], fat: [3, 30], fruit: [30, 220], vegetable: [25, 180] };
// fixos primeiro, depois proteína, gordura, e CARBO por último (fecha kcal)
const ROLE_ORDER = ['vegetable', 'fruit', 'legume', 'dairy', 'protein', 'fat', 'carb'];

const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];
const round1 = n => Math.round(n * 10) / 10;
const round  = n => Math.round(n);

const MEAL_KEYS = ['cafe_da_manha', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar', 'ceia'];
// tag curada (café/lanche/almoço/jantar/ceia) → tipos de refeição do sistema
const TAG_TO_MEALS = {
  cafe:   ['cafe_da_manha'],
  lanche: ['lanche_manha', 'lanche_tarde'],
  almoco: ['almoco'],
  jantar: ['jantar'],
  ceia:   ['ceia'],
};

// ── Pool de alimentos POR REFEIÇÃO (curated) com fallback à TACO legada ───────
async function fetchFoodPool(db, exclusions) {
  // 1) Tenta a camada curada (Fase 6) — pool[meal][role]
  try {
    const cols = MICRO_KEYS.map(k => 'a.' + k).join(', ');
    const res = await db.query(`
      SELECT c.display_name, c.role, c.meals, c.default_portion_g,
             a.id AS alimento_id, a.grupo, a.kcal, a.ptn, a.cho, a.lip, a.fibras, ${cols}
      FROM curated_foods c JOIN alimentos a ON a.id = c.alimento_id
      WHERE c.active = true`);
    if (res.rows.length) return _buildCuratedPool(res.rows, exclusions);
  } catch (_) { /* tabela ainda não existe → fallback */ }
  // 2) Fallback legado (TACO por grupo, replicado em todas as refeições)
  return _fetchLegacyPool(db, exclusions);
}

function _toCuratedFood(r) {
  const per100 = {
    calories: Number(r.kcal) || 0, protein: Number(r.ptn) || 0,
    carbs: Number(r.cho) || 0, fat: Number(r.lip) || 0, fiber: Number(r.fibras) || 0,
  };
  MICRO_KEYS.forEach(k => { per100[k] = Number(r[k]) || 0; });
  return { id: r.alimento_id, nome: r.display_name, grupo: r.grupo, per100, portion: Number(r.default_portion_g) || null };
}

function _buildCuratedPool(rows, exclusions) {
  const pool = {}; MEAL_KEYS.forEach(m => { pool[m] = {}; });
  for (const r of rows) {
    if (planner.isExcluded({ nome: r.display_name, grupo: r.grupo }, exclusions)) continue;
    const food = _toCuratedFood(r);
    const tags = Array.isArray(r.meals) ? r.meals : JSON.parse(r.meals || '[]');
    const meals = new Set();
    tags.forEach(t => (TAG_TO_MEALS[t] || []).forEach(m => meals.add(m)));
    meals.forEach(m => {
      (pool[m][r.role] = pool[m][r.role] || []).push(food);
    });
  }
  pool._curated = true;
  return pool;
}

async function _fetchLegacyPool(db, exclusions) {
  const byRole = {};
  for (const [role, grupos] of Object.entries(ROLE_GROUPS)) {
    const microReq    = role === 'fat' ? '' : 'AND ca>0 AND fe>0 AND na>0 AND k>0';
    const macroFilter = ROLE_MACRO_FILTER[role] ? `AND ${ROLE_MACRO_FILTER[role]}` : '';
    const grpList     = grupos.map((_, i) => `$${i + 1}`).join(',');
    const sql = `
      SELECT id, nome, grupo, kcal, ptn, cho, lip, fibras, ${MICRO_KEYS.join(', ')}
      FROM alimentos
      WHERE (tipo IS NULL OR tipo='alimento') AND grupo IN (${grpList})
        ${microReq} ${macroFilter} AND kcal > 0
      ORDER BY nome LIMIT 200`;
    let rows = [];
    try { rows = (await db.query(sql, grupos)).rows; } catch (e) { rows = []; }
    byRole[role] = rows
      .filter(r => !planner.isExcluded(r, exclusions))
      .filter(r => BLACKLIST_SKIP.has(role) || !NAME_BLACKLIST.test(r.nome || ''))
      .map(toFood);
  }
  // replica o pool por papel em todas as refeições (sem distinção cultural)
  const pool = {}; MEAL_KEYS.forEach(m => { pool[m] = { ...byRole }; });
  pool._curated = false;
  return pool;
}

function toFood(r) {
  const per100 = {
    calories: Number(r.kcal) || 0, protein: Number(r.ptn) || 0,
    carbs: Number(r.cho) || 0, fat: Number(r.lip) || 0, fiber: Number(r.fibras) || 0,
  };
  MICRO_KEYS.forEach(k => { per100[k] = Number(r[k]) || 0; });
  return { id: r.id, nome: r.nome, grupo: r.grupo, per100 };
}

// Escala um alimento para `grams` no formato EXATO de item do builder (pro-meals.js)
function scaleItem(food, grams) {
  const f = grams / 100;
  const item = {
    alimento_id: food.id, name: food.nome,
    medida_label: 'grama(s)', medida_grams: 1, quantidade: grams, grams,
    available_measures: [{ label: 'grama(s)', grams: 1 }], per100: food.per100,
    calories: round1(food.per100.calories * f), protein: round1(food.per100.protein * f),
    carbs: round1(food.per100.carbs * f), fat: round1(food.per100.fat * f), fiber: round1(food.per100.fiber * f),
  };
  MICRO_KEYS.forEach(k => { item[k] = round1((food.per100[k] || 0) * f); });
  return item;
}

// Preenche uma refeição: fixos (veg/fruta/leguminosa/laticínio) → proteína (alvo P)
// → gordura (alvo G restante) → carbo (fecha a KCAL restante).
function fillMeal(target, picks) {
  const ordered = [...picks].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
  const remaining = { protein: target.protein_g, fat: target.fat_g, kcal: target.kcal };
  const items = [];
  for (const { role, food } of ordered) {
    const owns = ROLE_OWNS[role];
    let grams;
    if (!owns) {
      grams = food.portion || FIXED_PORTION[role] || 100;        // porção caseira curada, senão padrão
    } else if (owns === 'kcal') {
      const perG = (food.per100.calories || 0) / 100;           // carbo fecha energia
      grams = perG > 0 ? remaining.kcal / perG : (CLAMP[role][0]);
    } else {
      const perG = (food.per100[owns] || 0) / 100;              // proteína / gordura
      grams = perG > 0 ? remaining[owns] / perG : (CLAMP[role] ? CLAMP[role][0] : 50);
    }
    const clamp = CLAMP[role] || [20, 300];
    grams = Math.max(clamp[0], Math.min(clamp[1], grams));
    grams = Math.max(5, Math.round(grams / 5) * 5);             // múltiplos de 5g
    const item = scaleItem(food, grams);
    item.role = role; item._food = food;
    items.push(item);
    remaining.protein -= item.protein;
    remaining.fat     -= item.fat;
    remaining.kcal    -= item.calories;
  }

  // Correção final de KCAL: escala os itens de energia (não-proteína/não-gordura)
  // para encaixar no alvo da refeição — resolve overshoot de lanches/ceia.
  const lockedKcal = items.filter(it => it.role === 'protein' || it.role === 'fat')
                          .reduce((s, it) => s + it.calories, 0);
  const energyItems = items.filter(it => ENERGY_ROLES.has(it.role));
  const energyKcal  = energyItems.reduce((s, it) => s + it.calories, 0);
  const budget = Math.max(0, target.kcal - lockedKcal);
  if (energyKcal > 0 && Math.abs(energyKcal - budget) / Math.max(1, budget) > 0.10) {
    let factor = budget / energyKcal;
    factor = Math.max(0.4, Math.min(1.8, factor));
    energyItems.forEach(it => {
      const cl = CLAMP[it.role] || [20, 300];
      let g = Math.max(cl[0], Math.min(cl[1], it.grams * factor));
      g = Math.max(5, Math.round(g / 5) * 5);
      const scaled = scaleItem(it._food, g);
      scaled.role = it.role; scaled._food = it._food;
      Object.assign(it, scaled);
    });
  }

  // limpa só o campo interno _food (mantém role para a Fase 3)
  items.forEach(it => { delete it._food; });
  return items;
}

function sumTotals(items) {
  const t = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, grams: 0 };
  MICRO_KEYS.forEach(k => { t[k] = 0; });
  items.forEach(it => {
    t.calories += it.calories || 0; t.protein += it.protein || 0; t.carbs += it.carbs || 0;
    t.fat += it.fat || 0; t.fiber += it.fiber || 0; t.grams += it.grams || 0;
    MICRO_KEYS.forEach(k => { t[k] += it[k] || 0; });
  });
  Object.keys(t).forEach(k => { t[k] = round1(t[k]); });
  return t;
}

// Embaralhador determinístico (variedade reprodutível por config)
function shuffle(arr, seed) {
  const a = [...arr]; let s = (seed || 1) % 233280 || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Geração do plano semanal (7 dias) — pools por refeição ────────────────────
function generatePlan(pool, config) {
  const shuffled = {}; const cursor = {};
  for (const meal of MEAL_KEYS) {
    shuffled[meal] = {};
    const roles = pool[meal] ? Object.keys(pool[meal]) : [];
    for (const role of roles) {
      shuffled[meal][role] = shuffle(pool[meal][role], (config.kcal || 2000) + role.length * 7 + meal.length);
      cursor[`${meal}|${role}`] = 0;
    }
  }
  const nextFood = (meal, role) => {
    let r = role;
    let list = shuffled[meal] ? shuffled[meal][r] : null;
    if ((!list || !list.length) && ROLE_FALLBACK[role]) { r = ROLE_FALLBACK[role]; list = r && shuffled[meal] ? shuffled[meal][r] : null; }
    if (!list || !list.length) return null;
    const key = `${meal}|${r}`;
    cursor[key] = cursor[key] || 0;
    const f = list[cursor[key] % list.length];
    cursor[key]++;
    return f;
  };

  const days = [];
  const summary = [];
  for (const dow of DOW_ORDER) {
    const meals = [];
    for (const [mealType, mt] of Object.entries(config.perMeal)) {
      const template = MEAL_TEMPLATES[mealType] || [];
      const picks = [];
      for (const role of template) {
        const f = nextFood(mealType, role);
        if (f) picks.push({ role, food: f });
      }
      const items = picks.length ? fillMeal(mt, picks) : [];
      meals.push({ type: mealType, label: mt.label, time: mt.time, items, instructions: '', total: sumTotals(items) });
    }
    const dayTotal = sumTotals(meals.flatMap(m => m.items));
    days.push({ dow, meals });
    summary.push({
      dow,
      kcal: round(dayTotal.calories), protein: round(dayTotal.protein),
      carbs: round(dayTotal.carbs), fat: round(dayTotal.fat),
      kcalTarget: config.kcal,
      devKcalPct: config.kcal ? round((dayTotal.calories - config.kcal) / config.kcal * 100) : 0,
    });
  }
  return { plan_data: { days }, summary };
}

module.exports = { fetchFoodPool, generatePlan, MEAL_TEMPLATES, ROLE_GROUPS, MICRO_KEYS, scaleItem, sumTotals, CLAMP };
