'use strict';
/**
 * archetypes.js — Fase 7: combos idiomáticos de refeição (mesa brasileira).
 * Cada arquétipo = lista de SLOTS. Cada slot: { role, owns, required, portion }.
 *  - owns: 'protein' | 'fat' | 'kcal' | undefined(=porção fixa). 'kcal' = fecha energia.
 *  - required: default true. false → slot pode ser omitido se o pool estiver vazio.
 * Regra: cada arquétipo tem EXATAMENTE um slot owns:'kcal' (o fechador de energia).
 * Os slots referenciam PAPÉIS — os alimentos vêm do pool curado da refeição.
 */

const A = (name, slots, weight = 1) => ({ name, slots, weight });

const ARCHETYPES = {
  cafe_da_manha: [
    A('Pão com ovos mexidos',        [{ role: 'protein', owns: 'protein' }, { role: 'carb', owns: 'kcal' }, { role: 'bebida', required: false }]),
    A('Pão com ovos e fruta',        [{ role: 'protein', owns: 'protein' }, { role: 'carb', owns: 'kcal' }, { role: 'fruit' }]),
    A('Pão, queijo e café',          [{ role: 'dairy' }, { role: 'carb', owns: 'kcal' }, { role: 'bebida', required: false }]),
    A('Tapioca com ovo',             [{ role: 'protein', owns: 'protein' }, { role: 'carb', owns: 'kcal' }, { role: 'fruit', required: false }]),
    A('Cuscuz com ovo',              [{ role: 'protein', owns: 'protein' }, { role: 'carb', owns: 'kcal' }, { role: 'bebida', required: false }]),
    A('Iogurte com fruta e granola', [{ role: 'dairy' }, { role: 'fruit' }, { role: 'carb', owns: 'kcal' }]),
    A('Mingau de aveia com fruta',   [{ role: 'carb', owns: 'kcal' }, { role: 'fruit' }, { role: 'dairy', required: false }]),
  ],

  lanche_manha: [
    A('Fruta',               [{ role: 'fruit', owns: 'kcal' }]),
    A('Fatia de queijo',     [{ role: 'dairy', owns: 'kcal' }]),
    A('Iogurte',             [{ role: 'dairy', owns: 'kcal' }]),
    A('Fruta com castanhas', [{ role: 'fruit', owns: 'kcal' }, { role: 'fat' }]),
  ],

  lanche_tarde: [
    A('Fruta',               [{ role: 'fruit', owns: 'kcal' }]),
    A('Fruta com castanhas', [{ role: 'fruit', owns: 'kcal' }, { role: 'fat' }]),
    A('Iogurte com fruta',   [{ role: 'dairy' }, { role: 'fruit', owns: 'kcal' }]),
    A('Castanhas',           [{ role: 'fat', owns: 'kcal' }]),
  ],

  almoco: [
    A('Arroz, feijão, carne e salada',   [{ role: 'protein', owns: 'protein' }, { role: 'legume' }, { role: 'vegetable' }, { role: 'fat' }, { role: 'carb', owns: 'kcal' }, { role: 'bebida', required: false }]),
    A('Arroz, feijão, frango e legume',  [{ role: 'protein', owns: 'protein' }, { role: 'legume' }, { role: 'vegetable' }, { role: 'fat' }, { role: 'carb', owns: 'kcal' }]),
    A('Arroz, feijão, peixe e salada',   [{ role: 'protein', owns: 'protein' }, { role: 'legume' }, { role: 'vegetable' }, { role: 'fat' }, { role: 'carb', owns: 'kcal' }]),
    A('Arroz, lentilha, ovo e salada',   [{ role: 'protein', owns: 'protein' }, { role: 'legume' }, { role: 'vegetable' }, { role: 'carb', owns: 'kcal' }]),
  ],

  jantar: [
    A('Omelete com queijo e salada',  [{ role: 'protein', owns: 'kcal' }, { role: 'dairy' }, { role: 'vegetable' }]),
    A('Arroz, frango e legume',       [{ role: 'protein', owns: 'protein' }, { role: 'vegetable' }, { role: 'carb', owns: 'kcal' }]),
    A('Arroz, carne e salada',        [{ role: 'protein', owns: 'protein' }, { role: 'vegetable' }, { role: 'carb', owns: 'kcal' }]),
    A('Peixe com legumes',            [{ role: 'protein', owns: 'kcal' }, { role: 'vegetable' }, { role: 'fat', required: false }]),
  ],

  ceia: [
    A('Fruta leve',         [{ role: 'fruit', owns: 'kcal' }]),
    A('Iogurte',            [{ role: 'dairy', owns: 'kcal' }]),
    A('Iogurte com semente',[{ role: 'dairy', owns: 'kcal' }, { role: 'fat' }]),
    A('Chá com castanhas',  [{ role: 'fat', owns: 'kcal' }, { role: 'bebida', required: false }]),
  ],
};

module.exports = { ARCHETYPES };
