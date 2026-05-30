'use strict';
/**
 * micros.js — Fase 3: compensação semanal de micronutrientes.
 * Estratégia: swap ISO-CALÓRICO (troca um item por um alimento rico no micro
 * deficiente mantendo ~as mesmas kcal da refeição), com trava de UL diário.
 * Ver GERADOR_CARDAPIO.md (modelo: média semanal + teto diário + piso hidrossolúvel).
 */
const gen = require('./generator');
const L = require('./limits');

const round1 = n => Math.round(n * 10) / 10;
const per100Key = m => (m === 'fiber' ? 'fiber' : m);
const driKey    = m => (L.MICRO_META[m] && L.MICRO_META[m].dri) || m;
const itemVal   = (item, m) => Number(item[per100Key(m)]) || 0;

const ALL_MICROS = [...new Set([...L.COMPENSABLE, ...L.REPORT_ONLY, 'na', 'p', 'se', 'co', 'vitb9'])];

// ── 3.1 Panorama semanal ──────────────────────────────────────────────────────
function computeWeeklyPanorama(plan_data, dri) {
  const weekly = {}; const perDay = {};
  ALL_MICROS.forEach(m => { weekly[m] = 0; });
  for (const day of plan_data.days) {
    const dm = {}; ALL_MICROS.forEach(m => { dm[m] = 0; });
    for (const meal of day.meals) for (const it of meal.items) {
      ALL_MICROS.forEach(m => { const v = itemVal(it, m); dm[m] += v; weekly[m] += v; });
    }
    perDay[day.dow] = dm;
  }
  const report = {};
  ALL_MICROS.forEach(m => {
    const rda = dri[driKey(m)] || 0;
    const dailyAvg = weekly[m] / 7;
    report[m] = { weeklyTotal: round1(weekly[m]), dailyAvg: round1(dailyAvg), rda, pct: rda ? Math.round(dailyAvg / rda * 100) : null };
  });
  return { report, perDay };
}

// melhores "carregadores" do micro DENTRO da refeição (preserva coerência cultural)
function bestCarriers(micro, pool, meal) {
  const key = per100Key(micro);
  const out = [];
  const roles = pool[meal] ? Object.keys(pool[meal]) : [];
  for (const role of roles) {
    if (role.startsWith('_')) continue;
    for (const food of (pool[meal][role] || [])) {
      const m = Number(food.per100[key]) || 0;
      if (m <= 0) continue;
      const kcal = Number(food.per100.calories) || 0;
      out.push({ role, food, density: kcal > 0 ? m / kcal : m });
    }
  }
  out.sort((a, b) => b.density - a.density);
  return out.slice(0, 12);
}

// troca iso-calórica: mesmo kcal do item, alimento novo, gramas reclampados ao papel
function swapItemIso(item, carrierFood) {
  const targetKcal = item.calories || 1;
  const perGkcal = (carrierFood.per100.calories || 0) / 100;
  let grams = perGkcal > 0 ? targetKcal / perGkcal : item.grams;
  const cl = gen.CLAMP[item.role] || [20, 300];
  grams = Math.max(cl[0], Math.min(cl[1], grams));
  grams = Math.max(5, Math.round(grams / 5) * 5);
  const ni = gen.scaleItem(carrierFood, grams);
  ni.role = item.role;
  return ni;
}

function dayKcal(day) {
  return day.meals.reduce((s, m) => s + m.items.reduce((a, it) => a + (it.calories || 0), 0), 0);
}
function dayMicroTotals(day, keys) {
  const t = {}; keys.forEach(k => { t[k] = 0; });
  for (const m of day.meals) for (const it of m.items) keys.forEach(k => { t[k] += Number(it[k]) || 0; });
  return t;
}

// ── 3.2 + 3.3 Compensação com trava de UL ─────────────────────────────────────
function compensateMicros(plan_data, pool, config, dri) {
  const TARGET_PCT = 95;
  const MAX_ITERS  = 90;
  const KCAL_TOL   = 0.20;              // dia não pode sair ±20% do alvo
  const ULK = Object.keys(L.UL);
  const swapLog = [];
  const attempted = new Set();

  let iters = 0;
  while (iters++ < MAX_ITERS) {
    const pano = computeWeeklyPanorama(plan_data, dri);
    const deficits = L.COMPENSABLE
      .filter(m => pano.report[m] && pano.report[m].rda > 0 && pano.report[m].pct != null && pano.report[m].pct < TARGET_PCT)
      .sort((a, b) => pano.report[a].pct - pano.report[b].pct);
    if (!deficits.length) break;

    let improved = false;
    for (const micro of deficits) {
      // dias ordenados pelo menor teor do micro (reforçar onde está mais baixo)
      const days = [...plan_data.days].sort((a, b) => (pano.perDay[a.dow][micro] || 0) - (pano.perDay[b.dow][micro] || 0));
      let done = false;

      for (const day of days) {
        const di = plan_data.days.indexOf(day);
        for (let mi = 0; mi < day.meals.length && !done; mi++) {
          const meal = day.meals[mi];
          // carregadores ricos no micro DENTRO desta refeição (mantém coerência cultural)
          const carriers = bestCarriers(micro, pool, meal.type);
          for (const carrier of carriers) {
            for (let ii = 0; ii < meal.items.length; ii++) {
              const item = meal.items[ii];
              if (item.role !== carrier.role || item.alimento_id === carrier.food.id) continue;
              const key = `${micro}|${di}|${mi}|${ii}|${carrier.food.id}`;
              if (attempted.has(key)) continue;

              const ni = swapItemIso(item, carrier.food);
              if (itemVal(ni, micro) <= itemVal(item, micro)) { attempted.add(key); continue; }

              const ulBefore = dayMicroTotals(day, ULK);
              const old = meal.items[ii];
              meal.items[ii] = ni;

              const kcalOk = config.kcal ? Math.abs(dayKcal(day) - config.kcal) / config.kcal <= KCAL_TOL : true;
              const ulAfter = dayMicroTotals(day, ULK);
              const ulOk = ULK.every(k => ulAfter[k] <= Math.max(L.UL[k], ulBefore[k] + 0.001));

              if (kcalOk && ulOk) {
                meal.total = gen.sumTotals(meal.items);
                attempted.add(key);
                swapLog.push({ micro, dow: day.dow });
                improved = true; done = true; break;
              } else {
                meal.items[ii] = old;
                attempted.add(key);
              }
            }
            if (done) break;
          }
          if (done) break;
        }
        if (done) break;
      }
      if (done) break; // recomputa panorama a cada swap aceito
    }
    if (!improved) break;
  }

  // recomputa totais de refeição (garantia) e devolve log
  plan_data.days.forEach(d => d.meals.forEach(m => { m.total = gen.sumTotals(m.items); }));
  return { swapLog, iterations: iters };
}

// ── 3.5 Relatório de adequação ────────────────────────────────────────────────
function buildAdequacyReport(plan_data, dri, swapLog = []) {
  const pano = computeWeeklyPanorama(plan_data, dri);
  const reinforced = {};
  swapLog.forEach(s => {
    reinforced[s.micro] = reinforced[s.micro] || {};
    reinforced[s.micro][s.dow] = (reinforced[s.micro][s.dow] || 0) + 1;
  });

  const order = [...L.TIER.A, 'fiber', ...L.TIER.B, ...L.REPORT_ONLY, 'na', 'p', 'se', 'co', 'vitb9'];
  const seen = new Set();
  const micros = [];
  for (const m of order) {
    if (seen.has(m) || !L.MICRO_META[m]) continue;
    seen.add(m);
    const r = pano.report[m]; if (!r) continue;
    const tier = L.tierOf(m);
    let status;
    if (m === 'na') {
      const maxDay = Math.max(...plan_data.days.map(d => d.meals.reduce((s, ml) => s + ml.items.reduce((a, it) => a + (Number(it.na) || 0), 0), 0)));
      status = maxDay > L.UL.na ? 'alto' : 'ok'; // sódio é teto
      r.maxDay = round1(maxDay);
    } else if (L.REPORT_ONLY.includes(m)) {
      status = 'monitorar'; // Tier C: dado fraco / suplementação
    } else if (r.pct == null) {
      status = 'sem_dado';
    } else {
      status = r.pct >= 90 ? 'ok' : (r.pct >= 70 ? 'baixo' : 'muito_baixo');
    }
    micros.push({
      key: m, label: L.MICRO_META[m].label, unit: L.MICRO_META[m].unit,
      tier, dailyAvg: r.dailyAvg, rda: r.rda, pct: r.pct,
      maxDay: r.maxDay, status,
      reinforcedDays: reinforced[m] ? Object.keys(reinforced[m]).map(Number) : [],
    });
  }

  // piso diário hidrossolúvel (3.4) — reportado (não enforce duro nesta versão)
  const floorAlerts = [];
  for (const m of L.WATER_SOLUBLE) {
    const rda = dri[driKey(m)] || 0;
    if (!rda) continue;
    const lowDays = plan_data.days.filter(d => {
      const tot = d.meals.reduce((s, ml) => s + ml.items.reduce((a, it) => a + (Number(it[m]) || 0), 0), 0);
      return tot < rda * L.FLOOR_PCT;
    }).map(d => d.dow);
    if (lowDays.length) floorAlerts.push({ micro: m, label: L.MICRO_META[m].label, daysBelow: lowDays });
  }

  const okCount = micros.filter(x => x.status === 'ok').length;
  return {
    micros,
    floorAlerts,
    summary: { total: micros.length, ok: okCount, swaps: swapLog.length },
  };
}

// ── Fase C: alimentos-fonte por micronutriente (sugestão acionável) ───────────
const MICRO_FOOD_SOURCES = {
  fe:   'carnes magras, feijão, lentilha, vegetais verde-escuros (consumir com fonte de vit. C)',
  ca:   'leite, iogurte, queijo, sardinha, couve, gergelim',
  mg:   'oleaginosas, sementes, leguminosas, vegetais verdes, aveia',
  k:    'banana, batata, feijão, abacate, água de coco',
  zn:   'carnes, ovos, leguminosas, sementes de abóbora',
  vitc: 'laranja, acerola, limão, goiaba, pimentão, brócolis',
  vita: 'cenoura, abóbora, manga, fígado (cuidado se gota), vegetais alaranjados',
  vitd: 'exposição solar, peixes gordos, ovos, suplementação se indicado',
  vite: 'azeite, oleaginosas, sementes, abacate',
  vitb12:'carnes, ovos, laticínios (vegetarianos estritos: suplementar)',
  vitb9: 'vegetais verde-escuros, leguminosas, fígado',
  tiamina:    'cereais integrais, leguminosas, carne suína',
  riboflavina:'leite, ovos, vegetais verdes',
  niacina:    'carnes, peixes, amendoim, cereais integrais',
  piridoxina: 'carnes, banana, batata, grão-de-bico',
  fiber:'vegetais, frutas com casca, leguminosas, aveia, cereais integrais',
};

// ── Fase C: alertas clínicos ACIONÁVEIS de micronutrientes (não compensa, avisa)
// Gera alertas no mesmo formato dos alertas do planner (level/label/message),
// destacando UL ultrapassado (erro) e micros muito baixos (atenção, com sugestão).
function buildMicroAlerts(adequacy, dri = {}) {
  if (!adequacy || !adequacy.micros) return [];
  const alerts = [];
  const lowKeys = new Set();   // micros já alertados como "muito baixo" (evita duplicar no piso)

  for (const m of adequacy.micros) {
    // Teto (UL) — sódio acima do limite diário → risco (erro)
    if (m.key === 'na' && m.status === 'alto') {
      alerts.push({
        level: 'error', protocol: 'ul_sodio', label: 'Sódio acima do limite',
        message: `Sódio chega a ${m.maxDay} ${m.unit}/dia — acima do teto seguro (${L.UL.na} mg). Reduza embutidos, enlatados, queijos curados e sal de adição.`,
      });
      continue;
    }
    // Micro muito baixo na média semanal → atenção com sugestão de fontes
    if (m.status === 'muito_baixo' && m.pct != null) {
      lowKeys.add(m.key);
      const src = MICRO_FOOD_SOURCES[m.key];
      alerts.push({
        level: 'warning', protocol: `micro_${m.key}`,
        label: `${m.label} baixo (${m.pct}% da meta semanal)`,
        message: `Média semanal de ${m.label} em ${m.pct}% do recomendado.` + (src ? ` Reforce com: ${src}.` : ''),
      });
    }
  }

  // Piso diário hidrossolúvel — CONSOLIDADO num único alerta (sem repetir os já listados acima)
  const floors = (adequacy.floorAlerts || []).filter(f => !lowKeys.has(f.micro));
  if (floors.length) {
    const list = floors.sort((a, b) => b.daysBelow.length - a.daysBelow.length)
      .map(f => `${f.label} (${f.daysBelow.length}d)`).join(', ');
    alerts.push({
      level: 'warning', protocol: 'floor_diario',
      label: 'Vitaminas hidrossolúveis abaixo do piso em alguns dias',
      message: `Abaixo do mínimo diário: ${list}. Como o corpo tem pouca reserva dessas vitaminas, distribua as fontes (frutas, vegetais, integrais, carnes) ao longo da semana.`,
    });
  }
  return alerts;
}

module.exports = { computeWeeklyPanorama, compensateMicros, buildAdequacyReport, buildMicroAlerts, MICRO_FOOD_SOURCES };
