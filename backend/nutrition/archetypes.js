'use strict';
/**
 * archetypes.js — Fase 7: combos idiomáticos de refeição (mesa brasileira).
 * Cada arquétipo = lista de SLOTS. Cada slot: { role, owns, required, only, staple }.
 *  - owns: 'protein' | 'fat' | 'kcal' | undefined(=porção fixa). 'kcal' = fecha energia.
 *  - required: default true. false → slot pode ser omitido se o pool estiver vazio.
 *  - only: lista de palavras-chave (substring no display_name) p/ FIXAR os alimentos
 *          do slot (ex: carbo do café = só pão/tapioca/cuscuz). Com fallback ao pool do
 *          papel se nada casar. É o que torna o combo idiomático de verdade.
 *  - staple: 'arroz' | 'feijao' → o alimento NÃO varia dia a dia; é definido pela
 *          "despensa da semana" (gerador) e fixado por blocos de 3-4 dias. Brasileiro
 *          médio cozinha 1 panela e come por dias — repetição aqui é realismo, não falha.
 *          A QUANTIDADE (gramas) ainda varia normalmente; só a identidade é travada.
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
  // Café SEMPRE com bebida (café/chá) OU laticínio líquido (iogurte) — café da manhã
  // brasileiro não existe "seco". Onde há iogurte, ele é o componente líquido.
  cafe_da_manha: [
    A('Pão com ovos mexidos',        [{ role: 'protein', owns: 'protein', only: OVO }, { role: 'carb', owns: 'kcal', only: PAO }, { role: 'bebida', only: ['café', 'chá'] }]),
    A('Pão com ovos e fruta',        [{ role: 'protein', owns: 'protein', only: OVO }, { role: 'carb', owns: 'kcal', only: PAO }, { role: 'fruit' }, { role: 'bebida', only: ['café', 'chá'] }]),
    A('Pão, queijo e café',          [{ role: 'dairy', only: QUEIJO }, { role: 'carb', owns: 'kcal', only: PAO }, { role: 'bebida', only: ['café', 'chá'] }]),
    A('Tapioca com ovo e café',      [{ role: 'protein', owns: 'protein', only: OVO }, { role: 'carb', owns: 'kcal', only: ['tapioca'] }, { role: 'bebida', only: ['café', 'chá'] }]),
    A('Iogurte com fruta e granola', [{ role: 'dairy', only: IOG }, { role: 'fruit' }, { role: 'carb', owns: 'kcal', only: AVEIA }]),
    A('Mingau de aveia com fruta',   [{ role: 'carb', owns: 'kcal', only: AVEIA }, { role: 'fruit' }, { role: 'dairy', only: IOG }]),
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

  // Almoço SEMPRE com bebida: suco natural na maioria dos dias (rico em vit C/folato/
  // potássio — ajuda a meta semanal de micros), água/refri zero na rotação (gerador).
  // arroz/feijão são `staple` → fixos por blocos (não trocam de tipo todo dia).
  almoco: [
    A('Arroz, feijão, carne e salada',   [{ role: 'protein', owns: 'protein', only: CARNE }, { role: 'legume', only: FEIJAO, staple: 'feijao' }, { role: 'vegetable' }, { role: 'fat', only: OLEO }, { role: 'carb', owns: 'kcal', only: ARROZ, staple: 'arroz' }, { role: 'bebida' }]),
    A('Arroz, feijão, frango e legume',  [{ role: 'protein', owns: 'protein', only: FRANGO }, { role: 'legume', only: FEIJAO, staple: 'feijao' }, { role: 'vegetable' }, { role: 'fat', only: OLEO }, { role: 'carb', owns: 'kcal', only: ARROZ, staple: 'arroz' }, { role: 'bebida' }]),
    A('Arroz, feijão, peixe e salada',   [{ role: 'protein', owns: 'protein', only: PEIXE }, { role: 'legume', only: FEIJAO, staple: 'feijao' }, { role: 'vegetable' }, { role: 'fat', only: OLEO }, { role: 'carb', owns: 'kcal', only: ARROZ, staple: 'arroz' }, { role: 'bebida' }]),
    A('Arroz, lentilha, ovo e salada',   [{ role: 'protein', owns: 'protein', only: OVO }, { role: 'legume', only: ['lentilha'] }, { role: 'vegetable' }, { role: 'carb', owns: 'kcal', only: ARROZ, staple: 'arroz' }, { role: 'bebida' }]),
  ],

  jantar: [
    A('Omelete com queijo e salada',  [{ role: 'protein', owns: 'kcal', only: OVO }, { role: 'dairy', only: QUEIJO }, { role: 'vegetable' }]),
    A('Arroz, frango e legume',       [{ role: 'protein', owns: 'protein', only: FRANGO }, { role: 'vegetable' }, { role: 'carb', owns: 'kcal', only: ARROZ, staple: 'arroz' }]),
    A('Arroz, carne e salada',        [{ role: 'protein', owns: 'protein', only: CARNE }, { role: 'vegetable' }, { role: 'carb', owns: 'kcal', only: ARROZ, staple: 'arroz' }]),
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
