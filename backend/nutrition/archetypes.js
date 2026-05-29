'use strict';
/**
 * archetypes.js — Fase 7: combos idiomáticos de refeição (mesa brasileira).
 * Cada arquétipo = lista de SLOTS. Cada slot: { role, owns, required, only }.
 *  - owns: 'protein' | 'fat' | 'kcal' | undefined(=porção fixa). 'kcal' = fecha energia.
 *  - required: default true. false → slot pode ser omitido se o pool estiver vazio.
 *  - only: lista de palavras-chave (substring no display_name) p/ FIXAR os alimentos
 *          do slot (ex: carbo do café = só pão/tapioca/cuscuz). Com fallback ao pool do
 *          papel se nada casar. É o que torna o combo idiomático de verdade.
 * Regra: cada arquétipo tem um slot owns:'kcal' (fechador de energia).
 */

const A = (name, slots, weight = 1) => ({ name, slots, weight });

// famílias reutilizáveis de palavras-chave (casam com display_name do seed)
const PAO   = ['pão', 'tapioca', 'cuscuz'];
const OVO   = ['ovo', 'omelete'];
const ARROZ = ['arroz'];
const FEIJAO= ['feijão'];
const OLEO  = ['azeite', 'óleo'];
const FRANGO= ['frango', 'peito de frango', 'coxa', 'sobrecoxa', 'asa', 'moela', 'coração', 'fígado de frango'];
const PEIXE = ['tilápia', 'merluza', 'sardinha', 'pescada', 'salmão', 'bacalhau', 'corvina', 'tainha', 'pintado', 'atum'];
const CARNE = ['patinho', 'acém', 'alcatra', 'coxão', 'músculo', 'maminha', 'fraldinha', 'contrafilé', 'picanha', 'cupim', 'costela', 'lagarto', 'fígado bovino', 'carne seca', 'lombo', 'pernil', 'bisteca'];
const IOG   = ['iogurte'];
const QUEIJO= ['queijo', 'requeijão', 'ricota'];
const CASTA = ['castanha', 'amêndoa', 'noz', 'avelã', 'pistache', 'amendoim'];
const SEM   = ['chia', 'linhaça'];
const AVEIA = ['aveia', 'granola', 'mingau'];

const ARCHETYPES = {
  cafe_da_manha: [
    A('Pão com ovos mexidos',        [{ role: 'protein', owns: 'protein', only: OVO }, { role: 'carb', owns: 'kcal', only: PAO }, { role: 'bebida', required: false, only: ['café', 'chá'] }]),
    A('Pão com ovos e fruta',        [{ role: 'protein', owns: 'protein', only: OVO }, { role: 'carb', owns: 'kcal', only: PAO }, { role: 'fruit' }]),
    A('Pão, queijo e café',          [{ role: 'dairy', only: QUEIJO }, { role: 'carb', owns: 'kcal', only: PAO }, { role: 'bebida', required: false, only: ['café', 'chá'] }]),
    A('Tapioca com ovo',             [{ role: 'protein', owns: 'protein', only: OVO }, { role: 'carb', owns: 'kcal', only: ['tapioca'] }, { role: 'fruit', required: false }]),
    A('Iogurte com fruta e granola', [{ role: 'dairy', only: IOG }, { role: 'fruit' }, { role: 'carb', owns: 'kcal', only: AVEIA }]),
    A('Mingau de aveia com fruta',   [{ role: 'carb', owns: 'kcal', only: AVEIA }, { role: 'fruit' }, { role: 'dairy', required: false, only: IOG }]),
  ],

  lanche_manha: [
    A('Fruta',               [{ role: 'fruit', owns: 'kcal' }]),
    A('Fatia de queijo',     [{ role: 'dairy', owns: 'kcal', only: QUEIJO }]),
    A('Iogurte',             [{ role: 'dairy', owns: 'kcal', only: IOG }]),
    A('Fruta com castanhas', [{ role: 'fruit', owns: 'kcal' }, { role: 'fat', only: CASTA }]),
  ],

  lanche_tarde: [
    A('Fruta',               [{ role: 'fruit', owns: 'kcal' }]),
    A('Fruta com castanhas', [{ role: 'fruit', owns: 'kcal' }, { role: 'fat', only: CASTA }]),
    A('Iogurte com fruta',   [{ role: 'dairy', only: IOG }, { role: 'fruit', owns: 'kcal' }]),
  ],

  almoco: [
    A('Arroz, feijão, carne e salada',   [{ role: 'protein', owns: 'protein', only: CARNE }, { role: 'legume', only: FEIJAO }, { role: 'vegetable' }, { role: 'fat', only: OLEO }, { role: 'carb', owns: 'kcal', only: ARROZ }, { role: 'bebida', required: false }]),
    A('Arroz, feijão, frango e legume',  [{ role: 'protein', owns: 'protein', only: FRANGO }, { role: 'legume', only: FEIJAO }, { role: 'vegetable' }, { role: 'fat', only: OLEO }, { role: 'carb', owns: 'kcal', only: ARROZ }]),
    A('Arroz, feijão, peixe e salada',   [{ role: 'protein', owns: 'protein', only: PEIXE }, { role: 'legume', only: FEIJAO }, { role: 'vegetable' }, { role: 'fat', only: OLEO }, { role: 'carb', owns: 'kcal', only: ARROZ }]),
    A('Arroz, lentilha, ovo e salada',   [{ role: 'protein', owns: 'protein', only: OVO }, { role: 'legume', only: ['lentilha'] }, { role: 'vegetable' }, { role: 'carb', owns: 'kcal', only: ARROZ }]),
  ],

  jantar: [
    A('Omelete com queijo e salada',  [{ role: 'protein', owns: 'kcal', only: OVO }, { role: 'dairy', only: QUEIJO }, { role: 'vegetable' }]),
    A('Arroz, frango e legume',       [{ role: 'protein', owns: 'protein', only: FRANGO }, { role: 'vegetable' }, { role: 'carb', owns: 'kcal', only: ARROZ }]),
    A('Arroz, carne e salada',        [{ role: 'protein', owns: 'protein', only: CARNE }, { role: 'vegetable' }, { role: 'carb', owns: 'kcal', only: ARROZ }]),
    A('Peixe com legumes',            [{ role: 'protein', owns: 'kcal', only: PEIXE }, { role: 'vegetable' }, { role: 'fat', required: false, only: OLEO }]),
  ],

  ceia: [
    A('Fruta leve',          [{ role: 'fruit', owns: 'kcal', only: ['mamão', 'melancia', 'melão', 'maçã', 'pera'] }]),
    A('Iogurte',             [{ role: 'dairy', owns: 'kcal', only: IOG }]),
    A('Iogurte com semente', [{ role: 'dairy', owns: 'kcal', only: IOG }, { role: 'fat', only: SEM }]),
    A('Chá com castanhas',   [{ role: 'fat', owns: 'kcal', only: CASTA }, { role: 'bebida', required: false, only: ['chá'] }]),
  ],
};

module.exports = { ARCHETYPES };
