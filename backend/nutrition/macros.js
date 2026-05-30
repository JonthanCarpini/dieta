'use strict';
/**
 * macros.js — V2 Fase D: cálculo clínico de macronutrientes por g/kg de peso.
 *
 * Nutricionistas prescrevem proteína e gordura em g/kg de peso corporal, não em
 * % de kcal. Este módulo deriva proteína e gordura a partir do peso + objetivo +
 * protocolos clínicos, e fecha o restante das kcal em carboidrato.
 *
 * resolveMacros({ weight, age, activity, objetivo, protocolIds, kcal }) →
 *   { protein_g, carbs_g, fat_g, basis }
 */

const round = n => Math.round(n);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Proteína-alvo (g/kg de peso) por objetivo — faixa de preservação/ganho de massa
const PROTEIN_GKG = {
  lose:     1.8,   // déficit: proteína alta preserva massa magra
  maintain: 1.2,
  gain:     2.0,   // hipertrofia
};

// Gordura mínima (g/kg) — saúde hormonal; nunca abaixo disso
const FAT_MIN_GKG = 0.8;

function resolveMacros({ weight, height, age, activity, objetivo, protocolIds = [], kcal }) {
  const w = Number(weight) || 70;
  const h = Number(height) || 170;
  const act = Number(activity) || 1.375;
  const obj = objetivo || 'maintain';
  const kc = Number(kcal) || 0;
  const has = id => protocolIds.includes(id);

  // Peso de REFERÊNCIA para g/kg: obesos (IMC>30) usam peso ajustado, senão
  // 1,8 g/kg sobre o peso real superestimaria a proteína. Ajustado de Devine:
  //   peso_ideal = 22.5 × altura²  ;  ajustado = ideal + 0.25×(atual − ideal)
  const imc = w / ((h / 100) ** 2);
  let wRef = w;
  if (imc > 30) {
    const ideal = 22.5 * ((h / 100) ** 2);
    wRef = round(ideal + 0.25 * (w - ideal));
  }

  // ── 1. Proteína (g/kg do peso de referência) ──────────────────────────────
  let pGkg = PROTEIN_GKG[obj] || 1.2;
  if (act >= 1.725) pGkg += 0.2;            // muito ativo / atleta → mais proteína
  if (Number(age) >= 60) pGkg = Math.max(pGkg, 1.2);  // idoso: piso anti-sarcopenia

  // Protocolo RENAL restringe proteína (domina qualquer objetivo)
  let basis = `proteína ${pGkg.toFixed(1)} g/kg`;
  if (has('renal')) {
    pGkg = 0.8;                             // restrição renal: 0,6–0,8 g/kg
    basis = 'proteína 0,8 g/kg (restrição renal)';
  }

  let protein_g = round(pGkg * wRef);

  // ── 2. Gordura (g/kg, com pisos/tetos por protocolo) ──────────────────────
  let fatGkg = obj === 'gain' ? 0.9 : 1.0;  // manutenção/emagrecimento ~1 g/kg
  if (has('baixo_ig')) fatGkg = 1.1;        // diabetes: + gordura boa, - carbo
  if (has('baixo_colesterol') || has('baixo_tg')) fatGkg = Math.min(fatGkg, 0.9); // limitar gordura total
  fatGkg = Math.max(fatGkg, FAT_MIN_GKG);
  let fat_g = round(fatGkg * wRef);

  // ── 3. Carboidrato fecha o restante das kcal ──────────────────────────────
  let carbs_g = 0;
  if (kc > 0) {
    const remain = kc - (protein_g * 4 + fat_g * 9);
    carbs_g = round(remain / 4);
    // Se carbo ficou negativo/baixo (kcal apertada + proteína alta), reequilibra:
    if (carbs_g < round(wRef)) {              // piso ~1 g/kg de carbo (cérebro/SNC)
      carbs_g = round(wRef);
      // recalcula gordura com o que sobrou (proteína é prioridade clínica)
      const remFat = kc - (protein_g * 4 + carbs_g * 4);
      fat_g = Math.max(round(FAT_MIN_GKG * wRef), round(remFat / 9));
    }
  }

  // Diabetes: garante que carbo não seja a maior fração (controle glicêmico)
  if (has('baixo_ig') && kc > 0) {
    const carbKcal = carbs_g * 4;
    if (carbKcal > kc * 0.45) {
      carbs_g = round((kc * 0.45) / 4);
      const remFat = kc - (protein_g * 4 + carbs_g * 4);
      fat_g = Math.max(round(FAT_MIN_GKG * wRef), round(remFat / 9));
      basis += ' · carbo ≤45% (controle glicêmico)';
    }
  }

  return { protein_g, carbs_g: Math.max(0, carbs_g), fat_g: Math.max(0, fat_g), proteinGkg: +pGkg.toFixed(2), basis };
}

module.exports = { resolveMacros, PROTEIN_GKG };
