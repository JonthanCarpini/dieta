'use strict';
/**
 * protocols.js — V2: mapa clínico (marcador laboratorial / comorbidade / proxy)
 * → protocolos alimentares concretos (exclusões + prioridades + alertas).
 *
 * Cada protocolo tem:
 *   id          : identificador único (string)
 *   label       : nome legível para exibir ao nutricionista
 *   exclusions  : keywords de alimentos a excluir (substring no nome)
 *   grupos      : grupos TACO a excluir (match exato)
 *   priorities  : keywords de alimentos a priorizar (informativo, não filtra)
 *   deficit_cap : fator máximo de déficit sobre o GET (ex: 0.88 para Gota)
 *   alert       : mensagem de alerta para o nutricionista
 */

const PROTOCOLS = {

  baixa_purina: {
    id: 'baixa_purina',
    label: 'Baixa Purina (Gota / Hiperuricemia)',
    exclusions: [
      'fígado', 'figado', 'moela', 'coração de frango', 'coracao de frango',
      'rim bovino', 'rim de', 'miúdo', 'miudo', 'víscera', 'viscera',
      'sardinha', 'anchova', 'arenque', 'atum',
      'camarão', 'camarao', 'marisco', 'lula', 'polvo', 'ostra', 'siri', 'caranguejo', 'mexilhão', 'mexilhao',
      'salame', 'linguiça', 'linguica', 'presunto', 'mortadela', 'bacon', 'embutido',
    ],
    grupos: [],
    priorities: ['tilápia', 'tilapia', 'merluza', 'frango', 'ovo', 'leguminosa', 'vegetais', 'frutas'],
    deficit_cap: 0.88,   // déficit máximo de 12% — cetose eleva ácido úrico
    alert: 'Paciente com Gota / hiperuricemia: déficit calórico acima de 12% do GET aumenta risco de crise aguda (cetose eleva ácido úrico). Meta calórica ajustada para déficit seguro.',
  },

  baixo_tg: {
    id: 'baixo_tg',
    label: 'Baixo Triglicerídeos',
    exclusions: [
      'açúcar', 'acucar', 'mel ', 'melado', 'refrigerante', 'achocolatado',
      'doce', 'bala', 'bombom', 'chocolate ao leite',
      'pão branco', 'pao branco', 'farinha branca', 'farinha de trigo refinada',
      'suco concentrado', 'néctar', 'nectar',
    ],
    grupos: [],
    priorities: ['aveia', 'chia', 'linhaça', 'linhaca', 'feijão', 'feijao', 'lentilha', 'grão-de-bico', 'vegetais'],
    deficit_cap: 0.80,
    alert: 'Triglicerídeos elevados: evitar açúcares simples, sucos em excesso, farinhas refinadas e bebidas adoçadas.',
  },

  hdl_boost: {
    id: 'hdl_boost',
    label: 'Elevar HDL',
    exclusions: [],
    grupos: [],
    priorities: ['azeite', 'abacate', 'castanha', 'amêndoa', 'amendoa', 'nozes', 'noz', 'amendoim', 'salmão', 'salmao', 'atum'],
    deficit_cap: 0.80,
    alert: 'HDL baixo: priorizar gorduras mono e poliinsaturadas (azeite, abacate, oleaginosas, peixe).',
  },

  baixo_ig: {
    id: 'baixo_ig',
    label: 'Baixo Índice Glicêmico (Diabetes / Pré-diabetes)',
    exclusions: [
      'açúcar', 'acucar', 'mel ', 'melado', 'refrigerante', 'achocolatado',
      'suco concentrado', 'néctar', 'nectar', 'bala', 'doce', 'bombom',
      'arroz branco', 'pão branco', 'pao branco', 'farinha de trigo refinada',
      'batata frita', 'batata palha',
    ],
    grupos: [],
    priorities: ['aveia', 'arroz integral', 'quinoa', 'feijão', 'feijao', 'lentilha', 'grão-de-bico', 'vegetais', 'maçã', 'pera', 'mamão'],
    deficit_cap: 0.80,
    alert: 'Pré-diabetes / diabetes: distribuir carboidratos uniformemente nas refeições, evitar açúcares simples e índice glicêmico alto. Fibra em toda refeição.',
  },

  renal: {
    id: 'renal',
    label: 'Protocolo Renal',
    exclusions: [
      'espinafre', 'beterraba', 'batata (alta potássio)', 'banana (alta potássio)',
      'laranja (alta potássio)', 'abacate (alta potássio)',
    ],
    grupos: [],
    priorities: ['arroz', 'maçã', 'morango', 'pera', 'uva', 'frango cozido'],
    deficit_cap: 0.80,
    alert: 'Doença renal: moderar proteína animal (≤ 0,8g/kg peso ideal), limitar alimentos ricos em fósforo e potássio. Exige acompanhamento médico/nutricional especializado.',
  },

  baixo_na: {
    id: 'baixo_na',
    label: 'Baixo Sódio (Hipertensão)',
    exclusions: [
      'sal', 'embutido', 'salame', 'linguiça', 'linguica', 'presunto', 'mortadela', 'bacon',
      'enlatado', 'conserva', 'azeitona', 'queijo parmesão', 'queijo parmesao',
      'tempero pronto', 'caldo knorr', 'shoyu', 'molho de soja',
    ],
    grupos: [],
    priorities: ['ervas frescas', 'limão', 'limao', 'alho', 'cebola', 'azeite'],
    deficit_cap: 0.80,
    alert: 'Hipertensão: evitar embutidos, enlatados, queijos curados e condimentos industrializados. Temperar com ervas, limão e alho.',
  },

  baixo_colesterol: {
    id: 'baixo_colesterol',
    label: 'Redução de Colesterol',
    exclusions: [
      'fígado', 'figado', 'moela', 'coração de frango', 'coracao de frango', 'rim bovino',
      'manteiga', 'banha', 'toucinho', 'creme de leite', 'nata',
      'bacon', 'salame', 'linguiça', 'linguica',
    ],
    grupos: [],
    priorities: ['aveia', 'azeite', 'abacate', 'castanha', 'amêndoa', 'amendoa', 'peixe', 'leguminosas'],
    deficit_cap: 0.80,
    alert: 'Colesterol elevado: reduzir gordura saturada e trans, evitar vísceras e embutidos. Priorizar fibra solúvel (aveia, leguminosas) e gorduras insaturadas.',
  },

  baixo_oxalato: {
    id: 'baixo_oxalato',
    label: 'Baixo Oxalato (Litíase Renal)',
    exclusions: [
      'espinafre', 'beterraba', 'acelga', 'cacau', 'chocolate', 'amendoim',
      'castanha de caju', 'farelo de trigo',
    ],
    grupos: [],
    priorities: ['água', 'limão', 'limao', 'frutas cítricas', 'frango', 'arroz', 'batata'],
    deficit_cap: 0.80,
    alert: 'Histórico de cálculo renal (oxalato): evitar alimentos ricos em oxalato. Hidratação mínima de 2L/dia essencial.',
  },
};

// ── Derivação automática de protocolos a partir de marcadores laboratoriais ───
// markers = array de { marker_name, numeric_value, status } de patient_exam_markers
function protocolsFromMarkers(markers = []) {
  const active = new Set();
  for (const m of markers) {
    const name = (m.marker_name || '').toLowerCase();
    const val  = Number(m.numeric_value) || 0;
    const stat = (m.status || '').toLowerCase();

    if ((name.includes('ácido úrico') || name.includes('acido urico')) && (val > 7.0 || stat === 'high'))
      active.add('baixa_purina');
    if ((name.includes('triglicerídeos') || name.includes('triglicerideos')) && (val > 150 || stat === 'abnormal' || stat === 'high'))
      active.add('baixo_tg');
    if (name.includes('hdl') && (val < 40 || stat === 'low'))
      active.add('hdl_boost');
    if ((name.includes('hemoglobina glicada') || name.includes('hba1c')) && (val >= 5.7 || stat === 'high' || stat === 'abnormal'))
      active.add('baixo_ig');
    if ((name.includes('glicose') || name.includes('glicemia')) && val >= 100 && stat !== 'normal')
      active.add('baixo_ig');
    if ((name.includes('creatinina') && !name.includes('urina')) && (val > 1.3 || stat === 'high'))
      active.add('renal');
    if ((name.includes('sódio') || name.includes('sodio')) && (val > 145 || stat === 'high'))
      active.add('baixo_na');
    if ((name.includes('colesterol total')) && (val >= 240 || stat === 'high'))
      active.add('baixo_colesterol');
    if (name.includes('ldl') && (val >= 160 || stat === 'high'))
      active.add('baixo_colesterol');
    if (name.includes('oxalato') && (stat === 'abnormal' || stat === 'high'))
      active.add('baixo_oxalato');
  }
  return [...active];
}

// ── Derivação a partir de comorbidades (texto livre do profiles) ──────────────
function protocolsFromComorbidities(text = '') {
  const t = text.toLowerCase();
  const active = new Set();
  if (/gota|hiperuricemia|ácido úrico|acido urico/i.test(t))   active.add('baixa_purina');
  if (/triglicerídeo|triglicerideo|dislipidemia/i.test(t))      active.add('baixo_tg');
  if (/diabetes|diabético|diabetico|pré-diab|pre-diab/i.test(t)) active.add('baixo_ig');
  if (/hipertensão|hipertensao|pressão alta|pressao alta/i.test(t)) active.add('baixo_na');
  if (/doença renal|doenca renal|nefropatia|renal crônica|renal cronica/i.test(t)) active.add('renal');
  if (/colesterol|dislipidemia/i.test(t))                         active.add('baixo_colesterol');
  if (/cálculo renal|calculo renal|pedra nos rins|litíase|litiase/i.test(t)) active.add('baixo_oxalato');
  return [...active];
}

// ── Derivação a partir de respostas proxy (patient_exam_proxy) ─────────────────
function protocolsFromProxy(proxy = {}) {
  const active = new Set();
  if (proxy.uric_acid_high)    active.add('baixa_purina');
  if (proxy.cholesterol_high)  { active.add('baixo_tg'); active.add('baixo_colesterol'); active.add('hdl_boost'); }
  if (proxy.glucose_high)      active.add('baixo_ig');
  if (proxy.kidney_stones)     active.add('baixo_oxalato');
  return [...active];
}

// ── Derivação a partir de checklist de anamnese (conditions[]) ────────────────
function protocolsFromAnamnesis(conditions = []) {
  const active = new Set();
  const c = conditions.map(s => s.toLowerCase());
  if (c.some(s => /gota|hiperuricemia/.test(s)))         active.add('baixa_purina');
  if (c.some(s => /triglicerídeo|triglicerideo|dislipidemia/.test(s))) active.add('baixo_tg');
  if (c.some(s => /colesterol/.test(s)))                 active.add('baixo_colesterol');
  if (c.some(s => /diabetes|pre-diab/.test(s)))          active.add('baixo_ig');
  if (c.some(s => /hipertensão|hipertensao/.test(s)))    active.add('baixo_na');
  if (c.some(s => /renal/.test(s)))                      active.add('renal');
  if (c.some(s => /cálculo|calculo|pedra nos rins/.test(s))) active.add('baixo_oxalato');
  return [...active];
}

// ── Mescla todos os protocolos ativos e constrói exclusões unificadas ─────────
function buildProtocolExclusions(protocolIds = []) {
  const keywords = new Set();
  const grupos   = new Set();
  const priorities = new Set();
  const alerts = [];
  let deficitCap = 0.80;   // padrão: déficit máximo 20%

  for (const id of protocolIds) {
    const p = PROTOCOLS[id];
    if (!p) continue;
    p.exclusions.forEach(k => keywords.add(k.toLowerCase()));
    p.grupos.forEach(g => grupos.add(g));
    p.priorities.forEach(pr => priorities.add(pr));
    alerts.push({ protocol: id, label: p.label, message: p.alert });
    if (p.deficit_cap > deficitCap) deficitCap = p.deficit_cap;   // cap mais conservador vence
  }

  return {
    keywords: [...keywords],
    grupos:   [...grupos],
    priorities: [...priorities],
    alerts,
    deficitCap,   // fator máximo de déficit sobre o GET (ex: 0.88 para Gota)
  };
}

// ── Resolve todos os protocolos a partir de todas as fontes disponíveis ───────
function resolveProtocols({ markers, comorbidities, proxy, anamnesis_conditions }) {
  const ids = new Set([
    ...protocolsFromMarkers(markers || []),
    ...protocolsFromComorbidities(comorbidities || ''),
    ...protocolsFromProxy(proxy || {}),
    ...protocolsFromAnamnesis(anamnesis_conditions || []),
  ]);
  return { ids: [...ids], ...buildProtocolExclusions([...ids]) };
}

module.exports = {
  PROTOCOLS,
  protocolsFromMarkers,
  protocolsFromComorbidities,
  protocolsFromProxy,
  protocolsFromAnamnesis,
  buildProtocolExclusions,
  resolveProtocols,
};
