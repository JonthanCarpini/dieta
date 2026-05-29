'use strict';
/**
 * planner.js — Fase 1 do Gerador de Cardápios: parâmetros e alvos.
 * Funções PURAS (sem DB). O endpoint (Fase 2) busca os dados e chama buildGenerationConfig.
 * Ver GERADOR_CARDAPIO.md.
 */

// ── 1.2 Splits de macro por objetivo (fração de kcal) ─────────────────────────
const MACRO_SPLITS = {
  lose:     { protein: 0.30, carbs: 0.40, fat: 0.30 }, // emagrecer: proteína mais alta
  gain:     { protein: 0.25, carbs: 0.50, fat: 0.25 }, // ganho de massa
  maintain: { protein: 0.20, carbs: 0.50, fat: 0.30 },
};

// ── 1.3 Distribuição de kcal por refeição (soma = 1.0) ────────────────────────
const MEAL_DISTRIBUTION = {
  cafe_da_manha: 0.20,
  lanche_manha:  0.10,
  almoco:        0.30,
  lanche_tarde:  0.10,
  jantar:        0.25,
  ceia:          0.05,
};
const MEAL_LABELS = {
  cafe_da_manha: 'Café da Manhã', lanche_manha: 'Lanche da Manhã', almoco: 'Almoço',
  lanche_tarde: 'Lanche da Tarde', jantar: 'Jantar', ceia: 'Ceia',
};
const MEAL_TIMES = {
  cafe_da_manha: '06:00', lanche_manha: '09:00', almoco: '12:00',
  lanche_tarde: '15:00', jantar: '18:00', ceia: '21:00',
};

const round = n => Math.round(n);

// ── 1.1 kcal alvo ─────────────────────────────────────────────────────────────
// Prioridade: GET salvo (energy_calculations) → target_calories do perfil → fallback Mifflin×atividade
function deriveTargetKcal({ profile = {}, latestEnergyCalc = null } = {}) {
  if (latestEnergyCalc && Number(latestEnergyCalc.get_value) > 0) return round(Number(latestEnergyCalc.get_value));
  if (Number(profile.target_calories) > 0) return round(Number(profile.target_calories));
  return computeFallbackGet(profile);
}

function computeFallbackGet(profile = {}) {
  const w = Number(profile.weight) || 70;
  const h = Number(profile.height) || 170;
  const age = Number(profile.age) || 30;
  const male = profile.gender === 'male';
  // Mifflin-St Jeor
  const tmb = male ? (10 * w + 6.25 * h - 5 * age + 5) : (10 * w + 6.25 * h - 5 * age - 161);
  const activity = Number(profile.activity) > 0 ? Number(profile.activity) : 1.4; // leve por padrão
  return round(tmb * activity);
}

// ── 1.2 macros (g) a partir de kcal ───────────────────────────────────────────
function macroTargetsFromKcal(kcal, split) {
  return {
    protein_g: round((kcal * split.protein) / 4),  // 4 kcal/g
    carbs_g:   round((kcal * split.carbs)   / 4),   // 4 kcal/g
    fat_g:     round((kcal * split.fat)     / 9),   // 9 kcal/g
  };
}

// ── 1.5 Exclusões clínicas ────────────────────────────────────────────────────
// Grupos reais da tabela `alimentos` (confirmados na Fase 0)
const GROUP = {
  CARNES:   'Carnes e derivados',
  PESCADOS: 'Pescados e Frutos do mar',
  OVOS:     'Ovos e derivados',
  LEITE:    'Leite e derivados',
};

// Cada regra: se o texto clínico casar, adiciona keywords (substring no nome) e/ou grupos (match exato)
const EXCLUSION_RULES = [
  { match: /lactose|laticín|intoler[âa]ncia a leite/i, keywords: ['leite', 'queijo', 'iogurte', 'requeij', 'manteiga', 'creme de leite', 'lactose'], grupos: [] },
  { match: /gl[úu]ten|cel[íi]ac/i,                      keywords: ['trigo', 'pão', 'pao ', 'macarr', 'biscoito', 'bolacha', 'farinha de trigo', 'cevada', 'centeio', 'malte'], grupos: [] },
  { match: /amendoim/i,                                 keywords: ['amendoim', 'paçoca', 'pacoca'], grupos: [] },
  { match: /frutos do mar|camar[ãa]o|marisco|crust[áa]ceo/i, keywords: ['camarão', 'camarao', 'marisco', 'lula', 'polvo', 'ostra', 'siri', 'caranguejo', 'mexilhão'], grupos: [] },
  { match: /\bpeixe\b|pescado/i,                         keywords: [], grupos: [GROUP.PESCADOS] },
  { match: /\bovo\b|alergia a ovo/i,                     keywords: ['ovo'], grupos: [GROUP.OVOS] },
  { match: /\bsoja\b/i,                                  keywords: ['soja', 'tofu', 'shoyu'], grupos: [] },
  { match: /vegano|vegana/i,                             keywords: [], grupos: [GROUP.CARNES, GROUP.PESCADOS, GROUP.OVOS, GROUP.LEITE] },
  { match: /vegetarian/i,                                keywords: [], grupos: [GROUP.CARNES, GROUP.PESCADOS] },
  { match: /carne vermelha/i,                            keywords: ['carne bovina', ' boi', 'bovina', 'suíno', 'suino', 'porco', 'cordeiro'], grupos: [] },
  { match: /carne de porco|su[íi]no/i,                   keywords: ['porco', 'suíno', 'suino', 'bacon', 'linguiça', 'linguica', 'presunto'], grupos: [] },
];

function buildClinicalExclusions(clinical = {}) {
  const text = [clinical.intolerances, clinical.dietary_restrictions]
    .filter(Boolean).join(' ; ').toLowerCase();
  const keywords = new Set();
  const grupos = new Set();
  const matchedRules = [];
  if (text.trim()) {
    for (const rule of EXCLUSION_RULES) {
      if (rule.match.test(text)) {
        matchedRules.push(rule.match.source);
        rule.keywords.forEach(k => keywords.add(k.toLowerCase()));
        rule.grupos.forEach(g => grupos.add(g));
      }
    }
  }
  return { keywords: [...keywords], grupos: [...grupos], matchedRules };
}

// Helper para a Fase 2: decide se um alimento deve ser excluído do pool
function isExcluded(food, exclusions) {
  if (!exclusions) return false;
  const nome = (food.nome || food.name || '').toLowerCase();
  if (food.grupo && exclusions.grupos.includes(food.grupo)) return true;
  return exclusions.keywords.some(k => nome.includes(k));
}

// ── 1.4 GenerationConfig ──────────────────────────────────────────────────────
function buildGenerationConfig({ profile = {}, latestEnergyCalc = null, clinical = {}, overrides = {} } = {}) {
  const objetivo = overrides.objetivo || profile.goal || 'maintain';
  const kcal = Number(overrides.kcal) > 0 ? round(Number(overrides.kcal)) : deriveTargetKcal({ profile, latestEnergyCalc });

  // Macros: se o perfil já tem metas explícitas (e sem override de split), usa-as. Senão, split por objetivo.
  const hasExplicit = Number(profile.target_protein) > 0 && Number(profile.target_carbs) > 0 && Number(profile.target_fat) > 0;
  let macroSplit = null;
  let macroTargets;
  if (!overrides.macroSplit && hasExplicit) {
    macroTargets = {
      protein_g: round(Number(profile.target_protein)),
      carbs_g:   round(Number(profile.target_carbs)),
      fat_g:     round(Number(profile.target_fat)),
    };
  } else {
    macroSplit = overrides.macroSplit || MACRO_SPLITS[objetivo] || MACRO_SPLITS.maintain;
    macroTargets = macroTargetsFromKcal(kcal, macroSplit);
  }

  const mealDistribution = overrides.mealDistribution || MEAL_DISTRIBUTION;

  const exclusions = buildClinicalExclusions(clinical);
  if (Array.isArray(overrides.excludedKeywords)) {
    overrides.excludedKeywords.forEach(k => { if (k) exclusions.keywords.push(String(k).toLowerCase()); });
  }

  // Alvo por refeição (kcal + macros proporcionais à distribuição)
  const perMeal = {};
  for (const [meal, frac] of Object.entries(mealDistribution)) {
    perMeal[meal] = {
      label: MEAL_LABELS[meal] || meal,
      time:  MEAL_TIMES[meal]  || '12:00',
      fraction: frac,
      kcal:      round(kcal * frac),
      protein_g: round(macroTargets.protein_g * frac),
      carbs_g:   round(macroTargets.carbs_g   * frac),
      fat_g:     round(macroTargets.fat_g     * frac),
    };
  }

  return {
    objetivo,
    kcal,
    macroSplit,
    macroTargets,
    mealDistribution,
    perMeal,
    exclusions,
    meta: {
      hasExplicitMacros: hasExplicit && !overrides.macroSplit,
      kcalSource: (latestEnergyCalc && Number(latestEnergyCalc.get_value) > 0) ? 'energy_calc'
                 : (Number(profile.target_calories) > 0 ? 'profile_target' : 'fallback_mifflin'),
    },
  };
}

module.exports = {
  MACRO_SPLITS, MEAL_DISTRIBUTION, MEAL_LABELS, MEAL_TIMES,
  deriveTargetKcal, computeFallbackGet, macroTargetsFromKcal,
  buildClinicalExclusions, isExcluded, buildGenerationConfig,
};
