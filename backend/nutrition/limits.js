'use strict';
/**
 * limits.js — Fase 3: DRI (RDA), UL (tetos) e piso diário de hidrossolúveis.
 * DRI espelhada de admin/modules/pro-meals.js (mesma fonte IOM/ANVISA).
 */

const DRI_TABLE = {
  female: {
    '14-18': { ca:1300,mg:360,p:1250,fe:15,na:1500,k:2300,co:0.89,zn:9, se:55,rea:700,tiamina:1.0,riboflavina:1.0,piridoxina:1.2,niacina:14,vitc:65, vitb12:2.4,vitb9:400,vite:15,vitd:15,fibras:26 },
    '19-30': { ca:1000,mg:310,p:700, fe:18,na:1500,k:2600,co:0.9, zn:8, se:55,rea:700,tiamina:1.1,riboflavina:1.1,piridoxina:1.3,niacina:14,vitc:75, vitb12:2.4,vitb9:400,vite:15,vitd:15,fibras:25 },
    '31-50': { ca:1000,mg:320,p:700, fe:18,na:1500,k:2600,co:0.9, zn:8, se:55,rea:700,tiamina:1.1,riboflavina:1.1,piridoxina:1.3,niacina:14,vitc:75, vitb12:2.4,vitb9:400,vite:15,vitd:15,fibras:25 },
    '51-70': { ca:1200,mg:320,p:700, fe:8, na:1300,k:2600,co:0.9, zn:8, se:55,rea:700,tiamina:1.1,riboflavina:1.1,piridoxina:1.5,niacina:14,vitc:75, vitb12:2.4,vitb9:400,vite:15,vitd:20,fibras:21 },
    '70+':   { ca:1200,mg:320,p:700, fe:8, na:1200,k:2600,co:0.9, zn:8, se:55,rea:700,tiamina:1.1,riboflavina:1.1,piridoxina:1.5,niacina:14,vitc:75, vitb12:2.4,vitb9:400,vite:15,vitd:20,fibras:21 },
  },
  male: {
    '14-18': { ca:1300,mg:410,p:1250,fe:11,na:1500,k:3000,co:0.89,zn:11,se:55,rea:900,tiamina:1.2,riboflavina:1.3,piridoxina:1.3,niacina:16,vitc:75, vitb12:2.4,vitb9:400,vite:15,vitd:15,fibras:38 },
    '19-30': { ca:1000,mg:400,p:700, fe:8, na:1500,k:3400,co:0.9, zn:11,se:55,rea:900,tiamina:1.2,riboflavina:1.3,piridoxina:1.3,niacina:16,vitc:90, vitb12:2.4,vitb9:400,vite:15,vitd:15,fibras:38 },
    '31-50': { ca:1000,mg:420,p:700, fe:8, na:1500,k:3400,co:0.9, zn:11,se:55,rea:900,tiamina:1.2,riboflavina:1.3,piridoxina:1.3,niacina:16,vitc:90, vitb12:2.4,vitb9:400,vite:15,vitd:15,fibras:38 },
    '51-70': { ca:1000,mg:420,p:700, fe:8, na:1300,k:3400,co:0.9, zn:11,se:55,rea:900,tiamina:1.2,riboflavina:1.3,piridoxina:1.7,niacina:16,vitc:90, vitb12:2.4,vitb9:400,vite:15,vitd:20,fibras:30 },
    '70+':   { ca:1200,mg:420,p:700, fe:8, na:1200,k:3400,co:0.9, zn:11,se:55,rea:900,tiamina:1.2,riboflavina:1.3,piridoxina:1.7,niacina:16,vitc:90, vitb12:2.4,vitb9:400,vite:15,vitd:20,fibras:30 },
  },
};

function getDRI(age, gender) {
  const tbl = DRI_TABLE[gender === 'male' ? 'male' : 'female'];
  const a = Number(age) || 0;
  if (!a || a < 14) return tbl['19-30'];
  if (a <= 18) return tbl['14-18'];
  if (a <= 30) return tbl['19-30'];
  if (a <= 50) return tbl['31-50'];
  if (a <= 70) return tbl['51-70'];
  return tbl['70+'];
}

// UL — Tolerable Upper Intake Level (adulto, IOM/ANVISA). Teto DIÁRIO, não compensável.
// Magnésio/UL só vale p/ suplemento → não aplicar via comida. Potássio sem UL.
const UL = {
  na: 2300, ca: 2500, fe: 45, zn: 40, se: 400, rea: 3000,
  vitd: 100, niacina: 35, piridoxina: 100, vitc: 2000, vite: 1000,
};

// Hidrossolúveis: exigir piso diário (≥ FLOOR_PCT da RDA), não só média semanal.
const WATER_SOLUBLE = ['vitc', 'tiamina', 'riboflavina', 'niacina', 'piridoxina', 'vitb12', 'vitb9'];
const FLOOR_PCT = 0.70;

// Tiers de confiança (definidos na Fase 0 conforme cobertura de dados)
const TIER = {
  A: ['ca', 'fe', 'mg', 'k', 'zn'],                                            // compensação completa
  B: ['vitc', 'tiamina', 'riboflavina', 'niacina', 'piridoxina', 'vite'],      // compensação parcial
  C: ['vitd', 'vitb12', 'rea'],                                                // só relatório / suplementar
};
// fibra é tratada à parte (campo item.fiber, dri.fibras) — compensável (Tier B-like)
const COMPENSABLE = [...TIER.A, ...TIER.B, 'fiber'];
const REPORT_ONLY = [...TIER.C];
// 'na' é só teto (UL), nunca alvo a atingir

// micro → label/unidade/chave-DRI/chave-per100 (fibra difere: per100 'fiber', dri 'fibras')
const MICRO_META = {
  ca:{label:'Cálcio',unit:'mg',dri:'ca'}, fe:{label:'Ferro',unit:'mg',dri:'fe'},
  mg:{label:'Magnésio',unit:'mg',dri:'mg'}, k:{label:'Potássio',unit:'mg',dri:'k'},
  zn:{label:'Zinco',unit:'mg',dri:'zn'}, p:{label:'Fósforo',unit:'mg',dri:'p'},
  se:{label:'Selênio',unit:'mcg',dri:'se'}, co:{label:'Cobre',unit:'mg',dri:'co'},
  na:{label:'Sódio',unit:'mg',dri:'na'},
  vitc:{label:'Vitamina C',unit:'mg',dri:'vitc'}, tiamina:{label:'Tiamina (B1)',unit:'mg',dri:'tiamina'},
  riboflavina:{label:'Riboflavina (B2)',unit:'mg',dri:'riboflavina'}, niacina:{label:'Niacina (B3)',unit:'mg',dri:'niacina'},
  piridoxina:{label:'Piridoxina (B6)',unit:'mg',dri:'piridoxina'}, vite:{label:'Vitamina E',unit:'mg',dri:'vite'},
  vitd:{label:'Vitamina D',unit:'mcg',dri:'vitd'}, vitb12:{label:'Vitamina B12',unit:'mcg',dri:'vitb12'},
  vitb9:{label:'Folato (B9)',unit:'mcg',dri:'vitb9'}, rea:{label:'Vitamina A',unit:'mcg',dri:'rea'},
  fiber:{label:'Fibras',unit:'g',dri:'fibras'},
};

function tierOf(micro) {
  if (TIER.A.includes(micro)) return 'A';
  if (TIER.B.includes(micro) || micro === 'fiber') return 'B';
  if (TIER.C.includes(micro)) return 'C';
  return null;
}

module.exports = { DRI_TABLE, getDRI, UL, WATER_SOLUBLE, FLOOR_PCT, TIER, COMPENSABLE, REPORT_ONLY, MICRO_META, tierOf };
