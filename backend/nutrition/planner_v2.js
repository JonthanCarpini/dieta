'use strict';
/**
 * planner_v2.js — V2: síntese clínica completa.
 *
 * Conecta as três camadas que o V1 ignorava:
 *   1. energy_calculations  → GET real do paciente → meta calórica segura
 *   2. patient_exam_markers → marcadores anormais → protocolos alimentares
 *   3. patient_anamnesis    → estilo de vida, condições, restrições, nº de refeições
 *   +  patient_exam_proxy   → substituto quando não há exames recentes
 *
 * buildClinicalConfig(db, patientId, overrides) → config completo para generatePlan
 *
 * Compatível com generator.js existente (mesmo formato de saída do planner.js V1),
 * com campos adicionais: protocols, alerts, clinicalSource.
 */

const planner  = require('./planner');
const { resolveProtocols } = require('./protocols');
const formulas = require('./formulas');
const macros   = require('./macros');   // Fase D: macros clínicos por g/kg

const round = n => Math.round(n);

// Seleção automática da fórmula mais indicada por perfil (via formulas.js)
// — Mifflin para sobrepeso/obesos (IMC ≥ 25)
// — Cunningham/Tinsley para atletas
// — Harris-Benedict revisada para eutróficos
// Elimina o viés de usar sempre Harris-Benedict independente do perfil.
function calcAuto(profile) {
  const res = formulas.autoCalc(profile);
  if (res) return res;
  // fallback absoluto (dados insuficientes)
  const w   = Number(profile.weight)   || 70;
  const h   = Number(profile.height)   || 170;
  const age = Number(profile.age)      || 30;
  const act = Number(profile.activity) || 1.375;
  const male = profile.gender === 'male' || profile.gender === 'M';
  const tmb = male ? 88.362 + 13.397*w + 4.799*h - 5.677*age : 447.593 + 9.247*w + 3.098*h - 4.330*age;
  return { formula_id: 2, formula_name: 'Harris-Benedict revisada (1984)', tmb: round(tmb), get: round(tmb * act) };
}

// ── Limites mínimos absolutos de kcal (segurança) ────────────────────────────
const MIN_KCAL = { male: 1500, female: 1200, default: 1200 };

// ── Fator de déficit por objetivo (fallback quando speed não está disponível) ──
const DEFICIT_FACTOR = {
  lose:     0.80,   // 20% de déficit sobre o GET
  maintain: 1.00,
  gain:     1.10,
};

// Calcula meta calórica a partir do GET e da velocidade desejada (kg/semana).
// 1 kg de gordura ≈ 7.700 kcal → 1 kg/semana = 1.100 kcal/dia de déficit.
function kcalFromSpeed(get, speed, objetivo) {
  if (!speed || speed <= 0) return null;
  const dailyDelta = Math.round(speed * 7700 / 7);  // kcal/dia
  return objetivo === 'gain' ? Math.round(get + dailyDelta) : Math.round(get - dailyDelta);
}

// ── Distribuição de refeições por nº de refeições/dia ─────────────────────────
// Respeita a anamnese: se o paciente faz só 3 refeições, não gerar 6.
const DIST_BY_MEAL_COUNT = {
  3: { cafe_da_manha: 0.30, almoco: 0.42, jantar: 0.28 },
  4: { cafe_da_manha: 0.27, lanche_manha: 0.08, almoco: 0.38, jantar: 0.27 },
  5: { cafe_da_manha: 0.25, lanche_manha: 0.06, almoco: 0.36, lanche_tarde: 0.06, jantar: 0.27 },
  6: { cafe_da_manha: 0.25, lanche_manha: 0.06, almoco: 0.36, lanche_tarde: 0.06, jantar: 0.21, ceia: 0.06 },
};
const DEFAULT_MEAL_DIST = DIST_BY_MEAL_COUNT[6];

async function buildClinicalConfig(db, patientId, overrides = {}) {
  // ── 1. Buscar todos os dados do paciente ──────────────────────────────────
  const [profileRes, calcRes, markersRes, anamnesisRes, proxyRes] = await Promise.all([
    db.query('SELECT * FROM profiles WHERE user_id=$1', [patientId]),
    db.query('SELECT * FROM energy_calculations WHERE patient_id=$1 ORDER BY calculated_at DESC LIMIT 1', [patientId]),
    db.query('SELECT marker_name, numeric_value, unit, status FROM patient_exam_markers WHERE patient_id=$1', [patientId])
      .catch(() => ({ rows: [] })),
    db.query('SELECT * FROM patient_anamnesis WHERE patient_id=$1', [patientId])
      .catch(() => ({ rows: [] })),
    db.query('SELECT * FROM patient_exam_proxy WHERE patient_id=$1', [patientId])
      .catch(() => ({ rows: [] })),
  ]);

  const profile   = profileRes.rows[0]   || {};
  // Recalcula idade dinamicamente a partir de birthdate (nunca fica desatualizada)
  if (profile.birthdate) {
    const d = new Date(profile.birthdate);
    if (!isNaN(d)) {
      const today = new Date();
      let age = today.getFullYear() - d.getFullYear();
      const m = today.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
      profile.age = age;
    }
  }
  const energyCalc = calcRes.rows[0]     || null;
  const markers    = markersRes.rows      || [];
  const anamnesis  = anamnesisRes.rows[0] || null;
  const proxy      = proxyRes.rows[0]     || null;

  // ── 2. GET real — prioridade: cálculo salvo → fórmula automática ────────
  // Quando não há cálculo manual: seleciona a fórmula mais indicada pelo perfil
  // (Mifflin para sobrepeso, Cunningham/Tinsley para atletas, H-B revisada para
  // eutróficos). Elimina o viés de aplicar sempre Harris-Benedict a todos.
  const auto = calcAuto(profile);
  const get = energyCalc && Number(energyCalc.get_value) > 0
    ? Number(energyCalc.get_value)
    : auto.get;
  const tmb = energyCalc && Number(energyCalc.tmb) > 0
    ? Number(energyCalc.tmb)
    : auto.tmb;
  const autoFormula = energyCalc ? null : auto;
  const getSource = energyCalc
    ? `${energyCalc.formula_name || 'Cálculo salvo'} (${new Date(energyCalc.calculated_at).toLocaleDateString('pt-BR')})`
    : `${auto.formula_name} (automático — salve no Cálculo Energético para fixar)`;

  const objetivo = overrides.objetivo || profile.goal || 'maintain';

  // ── 3. Resolver protocolos clínicos ───────────────────────────────────────
  const protocols = resolveProtocols({
    markers,
    comorbidities: [profile.comorbidities, profile.notes].filter(Boolean).join(' '),
    proxy,
    anamnesis_conditions: anamnesis ? (anamnesis.conditions || []) : [],
  });

  // ── 4. Meta calórica: usa speed se disponível, senão fator percentual ────
  const speed = Number(profile.speed) || 0;
  const kcalFromSpeedVal = speed > 0 ? kcalFromSpeed(get, speed, objetivo) : null;

  // Limite seguro por protocolo (ex: gota → déficit máximo 12% = 88% do GET)
  const hasSpeed = speed > 0;
  const minSafeKcal = objetivo === 'lose'
    ? (hasSpeed ? round(tmb * 0.7) : round(get * protocols.deficitCap))   // se há speed selecionado, a TMB-based speed tem precedência
    : round(get * (DEFICIT_FACTOR[objetivo] || 1.0));
  const minKcal     = MIN_KCAL[profile.gender] || MIN_KCAL.default;

  // Aplica floor: nunca abaixo de TMB (exceto se emagrecimento, até TMB * 0.7), nunca abaixo do mínimo absoluto, nunca abaixo do protocolo
  const floorTmb    = objetivo === 'lose' ? round(tmb * 0.7) : round(tmb);
  const safeKcal    = kcalFromSpeedVal ?? round(get * (DEFICIT_FACTOR[objetivo] || 1.0));
  const flooredKcal = Math.max(safeKcal, minSafeKcal, minKcal, floorTmb);

  // Override manual do nutricionista (do formulário) tem precedência, mas gera alerta
  const requestedKcal = Number(overrides.kcal) > 0 ? round(Number(overrides.kcal)) : null;
  const finalKcal     = requestedKcal || flooredKcal;

  // ── 5. Alertas de déficit ─────────────────────────────────────────────────
  const alerts = [...(protocols.alerts || [])];

  if (requestedKcal && requestedKcal < flooredKcal * 0.80) {
    const devPct = round((flooredKcal - requestedKcal) / flooredKcal * 100);
    alerts.push({
      level: 'error',
      protocol: 'kcal_deficit',
      label: 'Déficit calórico elevado',
      message: `A meta solicitada (${requestedKcal} kcal) está ${devPct}% abaixo da meta segura calculada (${flooredKcal} kcal, baseada no GET de ${round(get)} kcal). ${protocols.ids.includes('baixa_purina') ? 'Para pacientes com Gota, déficit acima de 12% aumenta risco de crise aguda por elevação do ácido úrico.' : 'Déficits muito agressivos podem causar perda de massa muscular e outros efeitos adversos.'}`,
    });
  } else if (requestedKcal && requestedKcal < flooredKcal * 0.95) {
    const devPct = round((flooredKcal - requestedKcal) / flooredKcal * 100);
    alerts.push({
      level: 'warning',
      protocol: 'kcal_deficit',
      label: 'Meta calórica abaixo do recomendado',
      message: `A meta solicitada (${requestedKcal} kcal) está ${devPct}% abaixo da meta segura calculada (${flooredKcal} kcal). Considere ajustar.`,
    });
  }

  if (finalKcal <= tmb * 1.05) {
    alerts.push({
      level: 'warning',
      protocol: 'tmb_floor',
      label: 'Meta próxima da TMB',
      message: `Meta calórica (${finalKcal} kcal) está próxima ou abaixo da TMB (${round(tmb)} kcal). Plano muito restritivo pode comprometer a saúde metabólica.`,
    });
  }

  // ── 6. Macros (clínico por g/kg de peso — Fase D) ─────────────────────────
  // Proteína/gordura por g/kg conforme objetivo + protocolos (renal limita
  // proteína, diabetes controla carbo, atleta/idoso reforça proteína).
  let macroSplit = null;
  let macroTargets, macroBasis;
  if (overrides.macroSplit) {
    macroSplit = overrides.macroSplit;
    macroTargets = planner.macroTargetsFromKcal(finalKcal, macroSplit);
    macroBasis = 'split manual';
  } else {
    const mac = macros.resolveMacros({
      weight: profile.weight, age: profile.age, activity: profile.activity,
      objetivo, protocolIds: protocols.ids, kcal: finalKcal,
    });
    macroTargets = { protein_g: mac.protein_g, carbs_g: mac.carbs_g, fat_g: mac.fat_g };
    macroBasis = mac.basis;
  }

  // ── 7. Distribuição de refeições ──────────────────────────────────────────
  const mealCount = anamnesis && anamnesis.meal_count
    ? Math.min(6, Math.max(3, Number(anamnesis.meal_count)))
    : 6;
  const mealDistribution = overrides.mealDistribution
    || DIST_BY_MEAL_COUNT[mealCount]
    || DEFAULT_MEAL_DIST;

  // Horários da anamnese (se disponíveis)
  const mealTimesDB = (anamnesis && anamnesis.meal_times) || {};
  const MEAL_KEYS_ORDER = ['cafe_da_manha','lanche_manha','almoco','lanche_tarde','jantar','ceia'];
  const mealTimes = { ...planner.MEAL_TIMES };
  const timeMap = {
    cafe:   'cafe_da_manha', lanche_manha: 'lanche_manha',
    almoco: 'almoco',        lanche_tarde: 'lanche_tarde',
    jantar: 'jantar',        ceia: 'ceia',
  };
  for (const [k, mk] of Object.entries(timeMap)) {
    if (mealTimesDB[k]) mealTimes[mk] = mealTimesDB[k];
  }

  const perMeal = {};
  for (const [meal, frac] of Object.entries(mealDistribution)) {
    perMeal[meal] = {
      label:     planner.MEAL_LABELS[meal] || meal,
      time:      mealTimes[meal] || '12:00',
      fraction:  frac,
      kcal:      round(finalKcal * frac),
      protein_g: round(macroTargets.protein_g * frac),
      carbs_g:   round(macroTargets.carbs_g   * frac),
      fat_g:     round(macroTargets.fat_g     * frac),
    };
  }

  // ── 8. Exclusões clínicas: V1 (intolerâncias/dieta) + V2 (protocolos) ────
  const v1Excl = planner.buildClinicalExclusions({
    intolerances:         profile.intolerances,
    dietary_restrictions: profile.dietary_restrictions,
    // aversões da anamnese como exclusões adicionais
    ...(anamnesis && anamnesis.restrictions ? { dietary_restrictions: [profile.dietary_restrictions, anamnesis.restrictions.join(', ')].filter(Boolean).join('; ') } : {}),
  });
  // keywords extras das aversões livres da anamnese
  if (anamnesis && anamnesis.avoids_text) {
    anamnesis.avoids_text.split(/[,;]+/).forEach(w => {
      const k = w.trim().toLowerCase();
      if (k.length > 2) v1Excl.keywords.push(k);
    });
  }
  if (Array.isArray(overrides.excludedKeywords)) {
    overrides.excludedKeywords.forEach(k => { if (k) v1Excl.keywords.push(String(k).toLowerCase()); });
  }
  // mescla protocolos V2. `patientKeywords` guarda SÓ as restrições do paciente
  // (intolerâncias/dieta/aversões) — usado nas receitas para não reintroduzir
  // falsos positivos de substring dos protocolos (que viram clinical_tags).
  const exclusions = {
    keywords:        [...new Set([...v1Excl.keywords, ...protocols.keywords])],
    grupos:          [...new Set([...v1Excl.grupos,   ...protocols.grupos])],
    patientKeywords: [...new Set(v1Excl.keywords)],   // só restrições do paciente
    patientGrupos:   [...new Set(v1Excl.grupos)],
    matchedRules:    v1Excl.matchedRules,
    protocolIds:     protocols.ids,
  };

  // ── 9. Status da anamnese ─────────────────────────────────────────────────
  const anamnesisStatus = !anamnesis ? 'ausente'
    : !anamnesis.completed_at ? 'incompleta'
    : markers.length > 0 ? 'completa_com_exames'
    : proxy ? 'completa_proxy'
    : 'completa_sem_exames';

  return {
    objetivo,
    kcal:          finalKcal,
    kcalSafe:      flooredKcal,
    kcalGet:       round(get),
    kcalTmb:       round(tmb),
    macroSplit,
    macroTargets,
    macroBasis,
    mealCount,
    mealDistribution,
    perMeal,
    exclusions,
    protocols: {
      ids:        protocols.ids,
      priorities: protocols.priorities,
    },
    alerts,
    anamnesisStatus,
    clinicalSource: {
      get:         getSource,
    autoFormula: autoFormula ? `${autoFormula.formula_name} (IMC ${Math.round((Number(profile.weight)||70)/((Number(profile.height)||170)/100)**2 * 10)/10})` : null,
      markers:  markers.length > 0 ? `${markers.length} marcadores de exames` : (proxy ? 'respostas proxy' : 'nenhum'),
      anamnese: anamnesisStatus,
    },
    meta: {
      hasExplicitMacros: false,
      kcalSource: energyCalc ? 'energy_calc' : (Number(profile.target_calories) > 0 ? 'profile_target' : 'fallback_mifflin'),
    },
  };
}

module.exports = { buildClinicalConfig, DIST_BY_MEAL_COUNT };
