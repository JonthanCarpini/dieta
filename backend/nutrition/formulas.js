'use strict';
/**
 * formulas.js — Fórmulas de cálculo energético (TMB → GET).
 *
 * Fonte única da verdade para o backend. Os mesmos coeficientes usados no
 * painel web (pro-energy.js) — mantidos em sincronia aqui para evitar divergência.
 *
 * Exporta:
 *   calcTmb(formulaId, peso, altura, idade, genero, mlg) → { tmb, obs } | null
 *   calcGet(tmb, formulaId, fatAtiv, fatInj) → get
 *   selectFormula(profile) → formulaId  ← seleciona a fórmula mais indicada automaticamente
 *   FORMULAS, FATORES_ATIVIDADE
 */

const FORMULAS = [
  { id: 1,  nome: 'Harris-Benedict (1919)',          req_mlg: false },
  { id: 2,  nome: 'Harris-Benedict revisada (1984)', req_mlg: false },
  { id: 3,  nome: 'Katch-McArdle (1996)',             req_mlg: true  },
  { id: 4,  nome: 'Cunningham (1980)',                req_mlg: true  },
  { id: 6,  nome: 'Mifflin-St Jeor (1990)',           req_mlg: false },
  { id: 8,  nome: 'FAO/WHO (2004)',                   req_mlg: false },
  { id: 9,  nome: 'Henry & Rees (1991)',              req_mlg: false },
  { id: 11, nome: 'GET por fórmula de bolso',         req_mlg: false },
  { id: 12, nome: 'Tinsley — por peso (2018)',        req_mlg: false },
  { id: 13, nome: 'Tinsley — por MLG (2018)',         req_mlg: true  },
];

const FATORES_ATIVIDADE = [
  { valor: 1.200, desc: 'Sedentário' },
  { valor: 1.375, desc: 'Leve (1–3×/semana)' },
  { valor: 1.550, desc: 'Moderada (3–5×/semana)' },
  { valor: 1.725, desc: 'Intensa (6–7×/semana)' },
  { valor: 1.900, desc: 'Muito intensa / atleta' },
];

// ── FAO/WHO 2004 por faixa etária ────────────────────────────────────────────
function _faoWho(peso, alturaM, idadeMeses, g) {
  if (g === 'M') {
    if (idadeMeses < 36)  return (0.255*peso - 0.141*alturaM + 2.690)*239;
    if (idadeMeses < 120) return (0.0937*peso + 2.150*alturaM + 0.325)*239;
    if (idadeMeses < 180) return (0.082*peso + 0.545*alturaM + 1.736)*239;
    if (idadeMeses < 240) return (0.092*peso + 0.218*alturaM + 1.472)*239;
    if (idadeMeses < 360) return (0.063*peso - 0.042*alturaM + 2.953)*239;
    if (idadeMeses < 720) return 58.317*peso - 31.1;
    return (0.049*peso + 2.459*alturaM + 0.077)*239;
  }
  if (idadeMeses < 36)  return (0.246*peso - 0.130*alturaM + 2.191)*239;
  if (idadeMeses < 120) return (0.085*peso + 2.033*alturaM - 0.651)*239;
  if (idadeMeses < 180) return (0.071*peso + 0.677*alturaM + 1.553)*239;
  if (idadeMeses < 240) return (0.063*peso + 2.015*alturaM - 0.786)*239;
  if (idadeMeses < 360) return (0.062*peso + 2.036*alturaM + 0.069)*239;
  if (idadeMeses < 720) return 20.315*peso + 485.9;
  return (0.038*peso + 2.755*alturaM + 0.167)*239;
}

// ── Henry & Rees 1991 ────────────────────────────────────────────────────────
function _henryRees(peso, alturaM, idadeMeses, g) {
  if (g === 'M') {
    if (idadeMeses < 36)  return (0.118*peso + 3.59*alturaM - 1.55)*239;
    if (idadeMeses < 120) return (0.0632*peso + 1.31*alturaM + 1.28)*239;
    if (idadeMeses < 180) return (0.0651*peso + 1.11*alturaM + 1.25)*239;
    if (idadeMeses < 240) return (0.0600*peso + 1.31*alturaM + 0.473)*239;
    if (idadeMeses < 360) return (0.0600*peso + 1.31*alturaM + 0.473)*239;
    if (idadeMeses < 720) return (0.0476*peso + 2.26*alturaM - 0.574)*239;
    return (0.0478*peso + 2.26*alturaM - 1.07)*239;
  }
  if (idadeMeses < 36)  return (0.127*peso + 2.94*alturaM - 1.20)*239;
  if (idadeMeses < 120) return (0.0666*peso + 0.878*alturaM + 1.46)*239;
  if (idadeMeses < 180) return (0.0532*peso + 1.69*alturaM + 0.0165)*239;
  if (idadeMeses < 240) return (0.0510*peso + 2.70*alturaM - 0.654)*239;
  if (idadeMeses < 360) return (0.0510*peso + 2.70*alturaM - 0.654)*239;
  if (idadeMeses < 720) return (0.0630*peso + 2.466)*239;
  return (0.0510*peso + 2.26*alturaM - 0.574)*239;
}

// ── calcTmb — coeficientes idênticos ao pro-energy.js ────────────────────────
function calcTmb(formulaId, peso, altura, idade, genero, mlg) {
  const meses = idade * 12;
  const hM    = altura / 100;
  const g     = (String(genero).toLowerCase() === 'm' || genero === 'male' || genero === 'M') ? 'M' : 'F';
  let tmb = 0, obs = null;

  if (formulaId === 1) {
    tmb = g === 'M'
      ? 66.4730 + 13.7516*peso + 5.0033*altura - 6.7550*idade
      : 655.0955 + 9.5634*peso + 1.8494*altura - 4.6756*idade;
  } else if (formulaId === 2) {
    tmb = g === 'M'
      ? 88.362 + 13.397*peso + 4.799*altura - 5.677*idade
      : 447.593 + 9.247*peso + 3.098*altura - 4.330*idade;
  } else if (formulaId === 3) {
    if (!mlg) return null;
    tmb = 370 + 21.6*mlg;
  } else if (formulaId === 4) {
    if (!mlg) return null;
    tmb = g === 'M' ? 500 + 22*mlg : 481 + 22*mlg;
  } else if (formulaId === 6) {
    tmb = g === 'M'
      ? 9.99*peso + 6.25*altura - 4.92*idade + 5
      : 9.99*peso + 6.25*altura - 4.92*idade - 161;
  } else if (formulaId === 8) {
    tmb = _faoWho(peso, hM, meses, g);
  } else if (formulaId === 9) {
    tmb = _henryRees(peso, hM, meses, g);
  } else if (formulaId === 11) {
    // Fórmula de bolso — GET direto (não precisa de fator atividade)
    const kcalKg = g === 'M' ? 25 : 20;
    tmb = peso * kcalKg;
    obs = 'Fórmula de bolso — valor já representa o GET direto.';
  } else if (formulaId === 12) {
    tmb = 24.8*peso + 10;   // Tinsley por peso
  } else if (formulaId === 13) {
    if (!mlg) return null;
    tmb = 25.9*mlg + 284;   // Tinsley por MLG
  } else {
    return null;
  }

  return { tmb: Math.round(tmb * 10) / 10, obs };
}

// Aplica fator atividade e fator injúria sobre a TMB
function calcGet(tmb, formulaId, fatAtiv, fatInj) {
  if (formulaId === 11) return Math.round(tmb * 10) / 10;   // bolso já é GET
  return Math.round(tmb * (fatAtiv || 1) * (fatInj || 1) * 10) / 10;
}

// ── Seleção automática da fórmula mais indicada por perfil ───────────────────
//
// Critérios clínicos (resumo das diretrizes):
//   • Sobrepeso / Obesidade (IMC ≥ 25)   → Mifflin-St Jeor (id=6)
//     — melhor aproximação da realidade metabólica nesse grupo
//   • Atleta / muito ativo (activity ≥ 1.725) COM MLG conhecida → Cunningham (id=4)
//   • Atleta / muito ativo SEM MLG → Tinsley por peso (id=12)
//   • Eutrófico (IMC 18.5–24.9)          → Harris-Benedict revisada (id=2)
//   • Abaixo do peso (IMC < 18.5)        → Mifflin (sub-estima menos em magreza)
//   • Sem dados suficientes              → Harris-Benedict revisada (id=2) como fallback
//
// O nutricionista SEMPRE pode sobrescrever no painel.
function selectFormula(profile) {
  const peso   = Number(profile.weight)   || 0;
  const altura = Number(profile.height)   || 0;  // em cm
  const mlg    = Number(profile.mlg)      || 0;
  const activity = Number(profile.activity) || 1.2;

  if (!peso || !altura) return 2;   // fallback Harris-Benedict revisada

  const imc = peso / ((altura / 100) ** 2);
  const atletico = activity >= 1.725;

  if (atletico && mlg > 0) return 4;      // Cunningham — atleta com MLG
  if (atletico)            return 12;     // Tinsley por peso — atleta sem MLG
  if (imc >= 25)           return 6;      // Mifflin — sobrepeso/obesidade
  return 2;                               // Harris-Benedict revisada — eutrófico
}

// Calcula TMB e GET completo com seleção automática de fórmula
function autoCalc(profile) {
  const formulaId = selectFormula(profile);
  const formula   = FORMULAS.find(f => f.id === formulaId);
  const peso    = Number(profile.weight)   || 0;
  const altura  = Number(profile.height)   || 0;
  const idade   = Number(profile.age)      || 30;
  const genero  = profile.gender;
  const mlg     = Number(profile.mlg)      || null;
  const fatAtiv = Number(profile.activity) || 1.375;

  const result = calcTmb(formulaId, peso, altura, idade, genero, mlg);
  if (!result) return null;

  const get = calcGet(result.tmb, formulaId, fatAtiv, 1);
  return {
    formula_id:   formulaId,
    formula_name: formula?.nome || `Fórmula ${formulaId}`,
    tmb:  result.tmb,
    get,
    obs:  result.obs,
  };
}

module.exports = { FORMULAS, FATORES_ATIVIDADE, calcTmb, calcGet, selectFormula, autoCalc };
