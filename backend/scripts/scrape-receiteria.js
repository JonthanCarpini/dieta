/**
 * scrape-receiteria.js — Fase 9: Biblioteca de Receitas
 *
 * Varre categorias do receiteria.com.br, lê o JSON-LD schema.org `Recipe` de cada
 * receita e DECOMPÕE os ingredientes na TACO (`alimentos`) para obter os 20 micros
 * completos + escalabilidade, gravando em `recipes` / `recipe_ingredients`.
 *
 * Guardamos apenas DADOS FACTUAIS (ingredientes, gramas, nutrição) + nome descritivo
 * + nossa própria decomposição. NÃO copiamos o texto de preparo nem imagens.
 *
 * A nutrição por-100g do site é mantida só como CROSS-CHECK (src_*).
 *
 * USO (no container, cwd=/app):
 *   node scripts/scrape-receiteria.js collect [--max N]      # coleta URLs por categoria
 *   node scripts/scrape-receiteria.js ingest  [--max N] [--dry]
 *   node scripts/scrape-receiteria.js stats
 */
'use strict';
const db = require('../db');
const { clinicalTagsFor } = require('../nutrition/protocols');

const args = process.argv.slice(2);
const CMD = args[0] || 'stats';
const flag = f => { const i = args.indexOf(f); return i !== -1 && args[i + 1] ? args[i + 1] : null; };
const MAX = parseInt(flag('--max')) || Infinity;
const DRY = args.includes('--dry');

const SITE = 'https://www.receiteria.com.br';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DELAY = parseInt(flag('--delay')) || 700;
const FETCH_TIMEOUT = 15000;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── LLM híbrido: normaliza só o resíduo que o regex não resolveu ──────────────
const ai = require('../routes/ai');                 // reusa callLLM/getLLMConfig/extractJson
let _cfg = null, _llmOn = !args.includes('--no-llm');
async function llmNormalize(lines) {
  if (!_llmOn || !lines.length) return [];
  if (!_cfg) {
    try { _cfg = await ai.getLLMConfig(); } catch { _cfg = {}; }
    if (!(_cfg.gemini_api_key || _cfg.mistral_api_key || _cfg.openai_api_key)) {
      _llmOn = false; console.warn('  (sem chave LLM — híbrido desativado)'); return [];
    }
  }
  const prompt = `Você recebe linhas de ingredientes de uma receita brasileira. Para CADA linha, ` +
    `identifique o ALIMENTO BASE (nome simples, singular, SEM marca e SEM modo de preparo) e estime ` +
    `a MASSA TOTAL em GRAMAS para a quantidade citada (receita inteira). Para água, sal, temperos e ` +
    `itens "a gosto", use grams 0. Responda APENAS JSON: ` +
    `{"itens":[{"i":<indice>,"food":"<nome>","grams":<numero>}]}.\nLinhas:\n` +
    lines.map((l, i) => `${i}. ${l}`).join('\n');
  try {
    const { text } = await ai.callLLM(_cfg, prompt);
    const j = JSON.parse(ai.extractJson(text));
    return Array.isArray(j.itens) ? j.itens : (Array.isArray(j) ? j : []);
  } catch (e) { console.warn('  LLM falhou:', e.message.slice(0, 80)); return []; }
}

const MICRO_KEYS = ['ca','mg','p','fe','na','k','co','zn','se','re','rea','tiamina','riboflavina','piridoxina','niacina','vitc','vitb12','vitb9','vite','vitd'];

// Categorias a varrer (relevantes p/ refeições). Mapeadas à refeição do gerador.
// Categorias inexistentes (404) são puladas em silêncio.
const CATEGORIES = {
  // ── Categorias originais ──────────────────────────────────────────────────
  'frango':                      'almoco_jantar',
  'carnes':                      'almoco_jantar',
  'peixes-e-frutos-do-mar':      'almoco_jantar',
  'arroz-e-risotos':             'almoco_jantar',
  'massas':                      'almoco_jantar',
  'saladas-e-acompanhamentos':   'almoco_jantar',
  'sopas':                       'jantar',
  'sopas-e-caldos':              'jantar',
  'ovos':                        'cafe_almoco_jantar',
  'lanches-e-salgados':          'lanche',
  'entradas-e-petiscos':         'lanche',
  'molhos-e-pates':              'lanche',
  'paes':                        'cafe_lanche',
  'bolos':                       'cafe_lanche',
  'doces':                       'ceia',
  'sobremesas':                  'ceia',
  'bebidas':                     'bebida',
  'vegetarianas':                'almoco_jantar',

  // ── Categorias por objetivo / perfil nutricional ──────────────────────────
  'receitas-alta-proteina':       'almoco_jantar',   // ganho muscular
  'receitas-baixa-caloria':       'almoco_jantar',   // emagrecimento
  'receitas-low-carb':            'almoco_jantar',   // emagrecimento + diabetes
  'receitas-rica-em-fibra':       'almoco_jantar',   // emagrecimento + saciedade
  'receitas-baixo-acucar':        'almoco_jantar',   // diabetes
  'receitas-de-lanches-fitness':  'lanche',          // todos os objetivos
  'receitas-para-cafe-da-manha':  'cafe_lanche',     // todos os objetivos
  'receitas-com-peito-de-frango': 'almoco_jantar',   // ganho muscular (alta proteína)
  'receitas-com-frango':          'almoco_jantar',   // todos os objetivos
  'receitas-para-airfryer':       'almoco_jantar',   // preparo saudável (todos)
  'receitas-para-almoco':         'almoco_jantar',   // todos os objetivos
  'receitas-de-jantar-simples':   'jantar',          // todos os objetivos
};

// ── HTTP ────────────────────────────────────────────────────────────────────
let circuitFails = 0;
async function getText(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
    try {
      const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': UA } });
      clearTimeout(t);
      if (r.ok) { circuitFails = 0; return r.text(); }
      if (r.status === 404) return null;
      if ((r.status === 403 || r.status === 429) && i < tries - 1) { await sleep(4000 * (i + 1)); continue; }
      throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      clearTimeout(t);
      if (i < tries - 1) { await sleep(2500 * (i + 1)); continue; }
      circuitFails++;
      if (circuitFails >= 8) { console.error('⛔ circuito aberto (muitas falhas) — abortando'); process.exit(2); }
      return null;
    }
  }
  return null;
}

const recipeUrls = html =>
  [...new Set([...(html || '').matchAll(/href="(https:\/\/www\.receiteria\.com\.br\/receita\/[a-z0-9-]+\/)"/g)].map(m => m[1]))];

// ── COLLECT: categorias × páginas → recipe_sources ───────────────────────────
async function collect() {
  await ensureSchema();
  let total = 0;
  for (const [cat, meal] of Object.entries(CATEGORIES)) {
    let page = 1, catCount = 0;
    while (total < MAX) {
      const url = page === 1 ? `${SITE}/${cat}/` : `${SITE}/${cat}/page/${page}/`;
      const html = await getText(url);
      const urls = recipeUrls(html);
      if (!urls.length) break;                       // fim da categoria
      for (const u of urls) {
        const slug = (u.match(/receita\/([a-z0-9-]+)/) || [])[1];
        const res = await db.query(
          `INSERT INTO recipe_sources (url, slug, category, meal) VALUES ($1,$2,$3,$4)
           ON CONFLICT (url) DO NOTHING`, [u, slug, cat, meal]);
        if (res.rowCount) { catCount++; total++; }
      }
      page++;
      await sleep(DELAY);
      if (page > 60) break;                          // trava de segurança
    }
    console.log(`  ${cat.padEnd(28)} +${catCount} novas`);
  }
  console.log(`\n✓ coletadas ${total} URLs novas`);
}

// ── PARSER de ingredientes → gramas ──────────────────────────────────────────
const FRAC = { '½': .5, '¼': .25, '¾': .75, '⅓': 1/3, '⅔': 2/3, '⅛': .125 };
function qtyOf(s) {
  s = s.trim();
  let m = s.match(/^(\d+)\s+(\d+)\/(\d+)/); if (m) return +m[1] + (+m[2] / +m[3]);   // 1 1/2
  m = s.match(/^(\d+)\/(\d+)/);            if (m) return +m[1] / +m[2];               // 1/2
  m = s.match(/^(\d+(?:[.,]\d+)?)/);       if (m) return parseFloat(m[1].replace(',', '.'));
  for (const k in FRAC) if (s.startsWith(k)) return FRAC[k];
  return null;
}
// peso médio (g) por unidade de medida caseira (genérico; usado quando não há gramas explícitas)
const UNIT_G = [
  ['colher de sopa', 15], ['colheres de sopa', 15], ['colher de chá', 5], ['colheres de chá', 5],
  ['colher de café', 2], ['colher de sobremesa', 10], ['xícara de chá', 120], ['xícaras de chá', 120],
  ['xícara', 120], ['xícaras', 120], ['copo', 200], ['copos', 200], ['dente', 3], ['dentes', 3],
  ['fatia', 20], ['fatias', 20], ['folha', 4], ['folhas', 4], ['pitada', 1], ['lata', 350],
  ['pacote', 100], ['fio', 3], ['ramo', 5], ['talo', 15],
];
function parseGrams(line) {
  const low = line.toLowerCase();
  if (/\ba gosto\b|q\.?\s?b\.?|quanto baste|a vontade|à vontade/.test(low)) return 0;
  // massa/volume explícita EM QUALQUER LUGAR da linha (parênteses ou não):
  // "500 gramas de filé", "1 kg de frango", "(90 gramas)", "240 ml"
  let m = low.match(/(\d+(?:[.,]\d+)?)\s*(kg|quilos?|gramas?|g|ml|mls|litros?|l)\b/);
  if (m) {
    const n = parseFloat(m[1].replace(',', '.')); const u = m[2];
    if (/kg|quilo/.test(u)) return n * 1000;
    if (/^l$|litro/.test(u)) return n * 1000;
    return n;                                        // g e ml ~ 1:1
  }
  const qty = qtyOf(low);
  if (qty == null) return null;
  // unidade de medida (pega a mais longa primeiro)
  for (const [u, g] of UNIT_G) if (low.includes(u)) return qty * g;
  // "N <alimento>" (unidade) — resolvido depois via medidas_caseiras; sinaliza com qty
  return { unit: true, qty };
}

// ── MATCH ingrediente → TACO ─────────────────────────────────────────────────
const STOP = new Set(('de da do dos das e ou com sem para por em no na nos nas a o os as ao à um uma uns umas ' +
  'picado picada picados picadas ralado ralada ralados fatiado fatiada fatiados cubos rodelas fresco fresca ' +
  'fresquinho grande grandes médio media média medio pequeno pequena bem gelado gelada quente morno mornas ' +
  'opcional gosto tipo cozido cozida cozidos assado assada cru crua light fit caseiro caseira pó po flocos ' +
  'finos fina fino grosso grossa sopa chá cha xícara xicara xícaras copo copos colher colheres dente dentes ' +
  'fatia fatias folha folhas lata latas pacote ml gramas grama kg litro litros fio ramo talo pitada nanica ' +
  'integral natural sem-sal vermelho verde amarelo branco branca cheio cheia rasa rasas inteiro inteira ' +
  'desfiado desfiada moído moida moído escaldado picadinho temperado ' +
  'cortado cortada cortados cortadas triturado triturada triturados espremido espremida descascado ' +
  'descascada descascados amassado amassada batido batida derretido derretida peneirado escorrido ' +
  'escorrida lavado limpo limpa limpos tiras cubo rodela maduro madura congelado congelada caroço ' +
  'pele osso médias pequenas pedaços pedaço ponta pontas').split(/\s+/));
function keywords(line) {
  let s = line.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[\d/.,½¼¾⅓⅔⅛]+/g, ' ').replace(/[^a-zà-ú\s]/gi, ' ');
  let w = s.split(/\s+/).filter(x => x.length > 2 && !STOP.has(x));
  w = w.map(x => (x.length > 4 && x.endsWith('s')) ? x.slice(0, -1) : x);          // singular naive
  return [...new Set(w)].slice(0, 4);
}
const PREPARED = /salada|sandu[ií]ch|\bsuco\b|\bdoce\b|em pó|\bbolo\b|receita|caramel|açúcar|rechead|\btorta\b|\bsopa\b|nugget|farofa|risoto|strogonoff|empad|pizza|lasanha|panqueca|pastel|coxinha|salgad|\bbarra\b|cereal|frit|maionese|ketchup|\bmolho\b|\bcaldo\b|tempero|gratin|espeto|à grega/;
const esc = w => w.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

// ── Classificação "fit" (nome + ingredientes decompostos + densidade) ─────────
// A decomposição pode estar correta e a receita ainda NÃO ser dieta (ex.: parmegiana,
// macarrão com creme de leite, arroz de Natal doce). Usamos os ingredientes casados.
const BAD_ING = /creme de leite|catupiry|requeij|maionese|bacon|leite condensado|chantilly|batata palha|salsich|lingui[cç]|salame|\bpresunto\b|mortadela|\bnata\b|banha|toucinho|a[çc]úcar|doce de leite/i;
const BAD_NAME = /parmegian|milanes|à dor[ée]?|\bnatal\b|\bdoce\b|brigadeir|brownie|pudim|mousse|sorvete|\bbolo\b|\btorta\b|frit|empanad|rechead|strogonoff|gratin|chantilly|cheesecake|brulee|p[ãa]o de mel|cocada|beijinho|sonho|churros/i;
// isHealthy: mantido como alias de lose (retrocompatibilidade)
function isHealthy(name, per100, ingNames) {
  return computeGoals(name, per100, ingNames).includes('lose');
}

// computeGoals: deriva os objetivos para os quais a receita é adequada.
// Uma receita pode servir a múltiplos objetivos.
function computeGoals(name, per100, ingNames) {
  const nm = (name || '').toLowerCase();
  const hasBadIng  = (ingNames || []).some(n => BAD_ING.test(n || ''));
  const hasBadName = BAD_NAME.test(nm);
  const kcal = per100.kcal || 0;
  const lip  = per100.lip  || 0;
  const ptn  = per100.ptn  || 0;
  if (kcal <= 0) return [];

  const goals = [];
  // lose: baixa caloria, baixa gordura, sem ingredientes ruins
  if (!hasBadIng && !hasBadName && kcal <= 280 && lip <= 18) goals.push('lose');
  // maintain: moderado, sem junk food/sobremesas gordurosas
  if (!hasBadName && kcal <= 350 && lip <= 25) goals.push('maintain');
  // gain: proteína adequada, energia suficiente, sem junk food
  if (!hasBadName && ptn >= 10 && kcal >= 80 && kcal <= 500) goals.push('gain');
  return goals;
}

// ── Classificador de REFEIÇÃO por nome + ingredientes ─────────────────────────
// A categoria do site é grosseira (jogava "Salada de frutas" no almoço). Aqui o tipo
// vem do NOME do prato (sinal forte) + proteína nos ingredientes. Tags batem com o
// RECIPE_MEAL_MAP do generator. café/ceia/bebida não são usados pelo gerador hoje.
const MEAL_RX = {
  bebida: /\bsuco\b|vitamina|smoothie|shake|milk\s?shake|\bch[áa]\b|limonada|frapp|\bdrink\b|caipi|batida|refresco/,
  lanche: /salada de frutas?|pat[êe]\b|sandu[íi]ch|bolinho|croquete|chips|petisco|\bwrap\b|dadinho|enroladinho|pipoca|barrinha|\bsnack\b|biscoito|cookie|torrada|bruschetta/,
  sopa:   /\bsopa\b|\bcaldo\b|\bcanja\b/,
  cafe:   /panqueca|crepioca|tapioca|mingau|granola|\baveia\b|overnight|p[ãa]o de queijo|p[ãa]o integral|p[ãa]o caseiro|broa|ovos? mexid|omelete|crepe|waffle|cuscuz|bolo de caneca|iogurte|geleia/,
};
const MEAL_MAIN = /arroz|risoto|feij|galinha|galinhada|feijoada|escondidinho|strogonoff|estrogonofe|ensopad|assad|grelhad|refogad|cozid|\bfrango\b|carne|peixe|\bfil[ée]\b|\bbife\b|lombo|costela|camar[ãa]o|lasanha|nhoque|macarr[ãa]o|bob[óo]|moqueca|bai[ãa]o|virado|parmegian|\bisca\b|alm[ôo]nd|hamb[úu]rguer|kafta|quibe|picadinho|fricass|salpic|rosbife|maminha|cupim|vaca atolada|pizza/;
const MEAL_PROT = /frango|carne|peixe|patinho|ac[ée]m|alcatra|coxa|sobrecoxa|til[áa]pia|merluza|sardinha|camar[ãa]o|bacalhau|lombo|m[úu]sculo|mo[íi]d|\bfil[ée]|contrafil|maminha|\batum\b|pernil|costela|salm[ãa]o/;
function classifyMeal(name, ingNames) {
  const n = (name || '').toLowerCase();
  const ing = (ingNames || []).join(' | ').toLowerCase();
  if (MEAL_RX.bebida.test(n)) return 'bebida';
  if (MEAL_RX.lanche.test(n)) return 'lanche';
  if (MEAL_RX.sopa.test(n)) return 'jantar';
  if (MEAL_RX.cafe.test(n) && !MEAL_MAIN.test(n)) return 'cafe_lanche';
  if (MEAL_MAIN.test(n) || MEAL_PROT.test(ing)) return 'almoco_jantar';
  return 'lanche';                          // fallback leve — não joga duvidoso no prato principal
}

async function queryTaco(words) {
  if (!words.length) return [];
  const conds = words.map((_, i) => `nome ILIKE $${i + 1}`).join(' AND ');
  const params = words.map(w => `%${w}%`);
  try {
    // exclui entradas com marca/qualificador entre parênteses ("Presunto (Seara)")
    return (await db.query(
      `SELECT id, nome, grupo, kcal, ptn, cho, lip, fibras, ${MICRO_KEYS.join(', ')}
       FROM alimentos WHERE (tipo IS NULL OR tipo='alimento') AND nome NOT LIKE '%(%'
         AND ${conds} AND kcal > 0 LIMIT 80`, params)).rows;
  } catch { return []; }
}
function scoreRow(r, words) {
  const n = (r.nome || '').toLowerCase(); let s = 0;
  if (n.startsWith(words[0])) s += 40;
  for (const w of words) if (new RegExp(`(^|[ ,])${esc(w)}([ ,]|$)`).test(n)) s += 12;
  if (PREPARED.test(n)) s -= 45;
  if (/\bcru\b|\bcrua\b/.test(n)) s -= 8;
  if (/ com /.test(n)) s -= 15;
  // penalidade leve por verbosidade — a TACO usa nomes longos ("Frango, peito, sem
  // pele, grelhado"); penalizar forte demais rejeitava o alimento certo.
  s -= Math.min(16, n.split(/[ ,]+/).filter(Boolean).length * 2);
  return s;
}
// Relaxamento progressivo: tenta AND de todas as palavras; se vazio, tenta subconjuntos
// (sem a 1ª — geralmente adjetivo como "filé"; as 2 mais longas; a mais longa). Resolve
// casos como "filé de peito de frango" → "Peito de frango" (não tinha a palavra "filé").
async function matchTaco(line) {
  const words = keywords(line);
  if (!words.length) return null;
  const longest = [...words].sort((a, b) => b.length - a.length);
  const sets = [words, words.slice(1), words.slice(-2), longest.slice(0, 2), longest.slice(0, 1)]
    .filter(s => s.length).map(s => s.join('|'));
  const seen = new Set(); let best = null, bestSc = -1e9;
  for (const key of sets) {
    if (seen.has(key)) continue; seen.add(key);
    const rows = await queryTaco(key.split('|'));
    for (const r of rows) { const sc = scoreRow(r, words); if (sc > bestSc) { bestSc = sc; best = r; } }
    if (best && bestSc >= 25) break;                   // já é um bom match — para
  }
  if (!best || bestSc < 4) return null;                // abaixo do limiar → não-casado
  return { row: best, score: bestSc };
}

// peso de "1 unidade" do alimento via medidas_caseiras (ou null)
async function unitGrams(alimentoId) {
  try {
    const r = await db.query(
      `SELECT peso_g FROM medidas_caseiras WHERE alimento_id=$1
        AND (nome_mc ILIKE '%unidade%' OR nome_mc ILIKE '%médi%' OR nome_mc ILIKE '%inteir%')
        ORDER BY peso_g LIMIT 1`, [alimentoId]);
    return r.rows.length ? Number(r.rows[0].peso_g) : null;
  } catch { return null; }
}

// ── INGEST: JSON-LD → decomposição → recipes ─────────────────────────────────
function extractRecipe(html) {
  const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  for (const b of blocks) {
    let j; try { j = JSON.parse(b); } catch { continue; }
    const arr = Array.isArray(j) ? j : (j['@graph'] || [j]);
    const r = arr.find(x => x && (x['@type'] === 'Recipe' || (Array.isArray(x['@type']) && x['@type'].includes('Recipe'))));
    if (r && r.recipeIngredient) return r;
  }
  return null;
}
function srcYield(r) {
  const y = Array.isArray(r.recipeYield) ? r.recipeYield[0] : r.recipeYield;
  const m = String(y || '').match(/\d+/); return m ? +m[0] : 1;
}
function srcNutr(r) {
  const n = r.nutrition || {};
  const num = v => { const m = String(v || '').match(/[\d.,]+/); return m ? parseFloat(m[0].replace(',', '.')) : null; };
  return { kcal: num(n.calories), ptn: num(n.proteinContent), cho: num(n.carbohydrateContent), lip: num(n.fatContent) };
}

// Extrai o NOME DO AUTOR do JSON-LD (schema.org Person ou Organization)
function srcAuthor(r) {
  const a = r.author;
  if (!a) return null;
  const first = Array.isArray(a) ? a[0] : a;
  return (first && (first.name || first['@name'])) || null;
}

// Extrai o PREPARO ORIGINAL como texto numerado, sem parafrasear.
// recipeInstructions pode ser: string | string[] | HowToStep[] | HowToSection[]
function srcPreparo(r) {
  const ins = r.recipeInstructions;
  if (!ins) return null;
  if (typeof ins === 'string') return ins.trim();
  const steps = [];
  let n = 1;
  const addStep = t => { const s = (t || '').replace(/\s+/g, ' ').trim(); if (s) steps.push(`${n++}. ${s}`); };
  for (const item of (Array.isArray(ins) ? ins : [ins])) {
    if (typeof item === 'string') { addStep(item); continue; }
    if (item['@type'] === 'HowToStep') { addStep(item.text); continue; }
    // HowToSection — contém itemListElement[]
    if (item['@type'] === 'HowToSection' && Array.isArray(item.itemListElement)) {
      for (const s of item.itemListElement) addStep(typeof s === 'string' ? s : s.text);
    }
  }
  return steps.length ? steps.join('\n') : null;
}

async function ingestOne(src) {
  const html = await getText(src.url);
  if (!html) return { status: 'failed' };
  const r = extractRecipe(html);
  if (!r) return { status: 'skipped' };
  const ings = r.recipeIngredient.filter(Boolean);

  // PASSO 1 — regex: gramas + match TACO
  const recs = [];
  for (const raw of ings) {
    const g = parseGrams(raw);
    if (g === 0) { recs.push({ raw, skip: true }); continue; }            // "a gosto"
    const m = await matchTaco(raw);
    let grams = null, row = null;
    if (m && m.row) {
      row = m.row;
      if (typeof g === 'number' && g > 0) grams = g;
      else if (g && g.unit) { const ug = await unitGrams(m.row.id); grams = ug ? g.qty * ug : null; }
    } else if (typeof g === 'number' && g > 0) grams = g;                  // tem massa, falta alimento
    recs.push({ raw, row, grams, score: m ? m.score : null });
  }

  // PASSO 2 — LLM HÍBRIDO: só no resíduo (sem alimento OU sem gramas). 1 chamada/receita.
  const resIdx = recs.map((x, i) => i).filter(i => !recs[i].skip && (!recs[i].row || recs[i].grams == null));
  if (resIdx.length) {
    const out = await llmNormalize(resIdx.map(i => recs[i].raw));
    for (const it of out) {
      const idx = resIdx[it.i]; if (idx == null) continue;
      const rec = recs[idx]; if (!rec || rec.skip) continue;
      const grams = Number(it.grams);
      if (!rec.row && it.food) { const m = await matchTaco(it.food); if (m && m.row) { rec.row = m.row; rec.score = m.score; rec.llm = true; } }
      if (rec.row && rec.grams == null && grams > 0) { rec.grams = grams; rec.llm = true; }
    }
  }

  // acumula nutrição
  const rows = [];
  let matchedG = 0, knownG = 0;
  const acc = { kcal: 0, ptn: 0, cho: 0, lip: 0, fibras: 0 }; MICRO_KEYS.forEach(k => acc[k] = 0);
  for (const rec of recs) {
    if (rec.skip) { rows.push({ raw: rec.raw, alimento_id: null, matched_name: null, grams: null, score: null, llm: false }); continue; }
    if (typeof rec.grams === 'number' && rec.grams > 0) knownG += rec.grams;
    if (rec.row && typeof rec.grams === 'number' && rec.grams > 0) {
      matchedG += rec.grams; const f = rec.grams / 100;
      acc.kcal += (+rec.row.kcal || 0) * f; acc.ptn += (+rec.row.ptn || 0) * f;
      acc.cho += (+rec.row.cho || 0) * f; acc.lip += (+rec.row.lip || 0) * f; acc.fibras += (+rec.row.fibras || 0) * f;
      MICRO_KEYS.forEach(k => acc[k] += (+rec.row[k] || 0) * f);
    }
    rows.push({ raw: rec.raw, alimento_id: rec.row ? rec.row.id : null, matched_name: rec.row ? rec.row.nome : null,
                grams: rec.grams != null ? Math.round(rec.grams) : null, score: rec.score, llm: !!rec.llm });
  }

  if (matchedG < 30) return { status: 'skipped' };           // sem massa casada suficiente
  const coverage = knownG > 0 ? matchedG / knownG : 0;
  const per100 = {}; const dens = 100 / matchedG;
  ['kcal','ptn','cho','lip','fibras'].forEach(k => per100[k] = +(acc[k] * dens).toFixed(2));
  MICRO_KEYS.forEach(k => per100[k] = +(acc[k] * dens).toFixed(3));
  const sn = srcNutr(r);
  // PORTÃO DE CROSS-CHECK: só confia na decomposição se a cobertura for alta E o meu
  // kcal/100g bater ±20% com o do site. Sem isto, nutrição errada poluiria o gerador.
  const dev = sn.kcal ? Math.abs(per100.kcal - sn.kcal) / sn.kcal : 1;
  const trustworthy = coverage >= 0.7 && sn.kcal > 0 && dev <= 0.20;
  const active  = trustworthy;
  const ingNames = rows.map(x => x.matched_name).filter(Boolean);
  const goals   = trustworthy ? computeGoals(r.name, per100, ingNames) : [];
  const healthy = goals.includes('lose');   // retrocompatibilidade
  const clinicalTags = trustworthy ? clinicalTagsFor(ingNames) : [];   // protocolos que a receita respeita
  const author  = srcAuthor(r);
  const preparo = srcPreparo(r);   // texto original — nunca parafrasear

  if (DRY) {
    const goalStr = goals.length ? goals.join('+') : '✗fora';
    console.log(`\n• ${r.name}  [${author || '?'}]  [cov ${(coverage*100|0)}%]  ${per100.kcal}kcal p${Math.round(per100.ptn)}g  ${active ? goalStr : '✗reprovada'}`);
    if (preparo) console.log(`  📝 ${preparo.split('\n').length} passos`);
    rows.forEach(x => console.log(`    ${x.llm ? '🤖' : '  '} ${x.grams != null ? (x.grams+'g').padEnd(7) : '   ?   '} ${x.matched_name ? '→ '+x.matched_name.slice(0,40) : '✗ '+x.raw.slice(0,40)}`));
    return { status: 'done', active, healthy, goals };
  }

  const cols = ['slug','url','name','author_name','category','meal','yield_servings','total_grams','coverage','healthy','active',
    'kcal','ptn','cho','lip','fibras', ...MICRO_KEYS, 'src_kcal','src_ptn','src_cho','src_lip','preparo','goals','clinical_tags'];
  const vals = [src.slug, src.url, r.name, author, src.category, src.meal, srcYield(r), Math.round(knownG), +coverage.toFixed(3), healthy, active,
    per100.kcal, per100.ptn, per100.cho, per100.lip, per100.fibras, ...MICRO_KEYS.map(k => per100[k]),
    sn.kcal, sn.ptn, sn.cho, sn.lip, preparo, goals, clinicalTags];
  const ph = vals.map((_, i) => `$${i + 1}`).join(',');
  const up = cols.slice(2).map(c => `${c}=EXCLUDED.${c}`).join(',');
  const ins = await db.query(
    `INSERT INTO recipes (${cols.join(',')}) VALUES (${ph})
     ON CONFLICT (slug) DO UPDATE SET ${up} RETURNING id`, vals);
  const rid = ins.rows[0].id;
  await db.query(`DELETE FROM recipe_ingredients WHERE recipe_id=$1`, [rid]);
  for (const x of rows) {
    await db.query(
      `INSERT INTO recipe_ingredients (recipe_id, raw, alimento_id, matched_name, grams, match_score)
       VALUES ($1,$2,$3,$4,$5,$6)`, [rid, x.raw, x.alimento_id, x.matched_name, x.grams, x.score]);
  }
  return { status: 'done', active, healthy };
}

async function ingest() {
  await ensureSchema();
  const catF = flag('--cat');
  const lim = MAX === Infinity ? 100000 : MAX;
  const { rows } = await db.query(
    `SELECT url, slug, category, meal FROM recipe_sources
     WHERE status='pending' ${catF ? 'AND category=$2' : ''} ORDER BY id LIMIT $1`,
    catF ? [lim, catF] : [lim]);
  console.log(`\n🍳 ingest ${rows.length} receitas ${DRY ? '(DRY)' : ''}\n`);
  const st = { done: 0, kept: 0, healthy: 0, skipped: 0, failed: 0 };
  let i = 0;
  for (const src of rows) {
    i++;
    let res; try { res = await ingestOne(src); } catch (e) { res = { status: 'failed' }; console.error('  erro', src.slug, e.message); }
    st[res.status] = (st[res.status] || 0) + 1;
    if (res.active) st.kept++;
    if (res.healthy) st.healthy++;
    if (!DRY) await db.query(`UPDATE recipe_sources SET status=$2 WHERE url=$1`, [src.url, res.status]);
    if (i % 25 === 0) console.log(`  ...${i}/${rows.length}  (confiáveis ${st.kept}, fit ${st.healthy}, skip ${st.skipped}, fail ${st.failed})`);
    await sleep(DELAY);
  }
  console.log(`\n✓ processadas ${st.done} | confiáveis ${st.kept} | fit ${st.healthy} | skip ${st.skipped} | fail ${st.failed}`);
}

// ── schema ───────────────────────────────────────────────────────────────────
async function ensureSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS recipe_sources (
      id SERIAL PRIMARY KEY, url TEXT UNIQUE, slug TEXT, category TEXT, meal TEXT,
      status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT NOW())`);
  const microCols = MICRO_KEYS.map(k => `${k} NUMERIC`).join(', ');
  await db.query(`
    CREATE TABLE IF NOT EXISTS recipes (
      id SERIAL PRIMARY KEY, slug TEXT UNIQUE, url TEXT, name TEXT, category TEXT, meal TEXT,
      yield_servings NUMERIC, total_grams NUMERIC, coverage NUMERIC, healthy BOOLEAN, active BOOLEAN DEFAULT true,
      kcal NUMERIC, ptn NUMERIC, cho NUMERIC, lip NUMERIC, fibras NUMERIC, ${microCols},
      src_kcal NUMERIC, src_ptn NUMERIC, src_cho NUMERIC, src_lip NUMERIC,
      created_at TIMESTAMPTZ DEFAULT NOW())`);
  await db.query(`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS preparo TEXT`);
  await db.query(`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS author_name TEXT`);
  await db.query(`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS goals TEXT[]`);
  await db.query(`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS clinical_tags TEXT[]`);   // protocolos respeitados
  await db.query(`
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id SERIAL PRIMARY KEY, recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
      raw TEXT, alimento_id INTEGER, matched_name TEXT, grams NUMERIC, match_score NUMERIC)`);
}

// Recalcula `healthy` sobre o banco (sem re-scrapear), usando nome + ingredientes.
async function reclassify() {
  await ensureSchema();
  const { rows } = await db.query(`SELECT id, name, kcal, lip, ptn FROM recipes WHERE active`);
  let changed = 0, fit = 0;
  for (const r of rows) {
    const ing = (await db.query(
      `SELECT matched_name FROM recipe_ingredients WHERE recipe_id=$1 AND matched_name IS NOT NULL`, [r.id]
    )).rows.map(x => x.matched_name);
    const per100 = { kcal: +r.kcal, lip: +r.lip, ptn: +r.ptn };
    const goals  = computeGoals(r.name, per100, ing);
    const h      = goals.includes('lose');
    const meal   = classifyMeal(r.name, ing);
    const ctags  = clinicalTagsFor(ing);
    if (h) fit++;
    const up = await db.query(
      `UPDATE recipes SET healthy=$2, goals=$3, meal=$4, clinical_tags=$5 WHERE id=$1
       AND (healthy IS DISTINCT FROM $2 OR goals IS DISTINCT FROM $3 OR meal IS DISTINCT FROM $4 OR clinical_tags IS DISTINCT FROM $5)`,
      [r.id, h, goals, meal, ctags]);
    changed += up.rowCount;
  }
  console.log(`✓ reclassificadas: ${changed} alteradas | fit(lose) = ${fit}/${rows.length}`);
}

// Gera MODO DE PREPARO próprio (LLM) a partir do nome + ingredientes decompostos.
// Texto original nosso (não copiamos o preparo do site). Default: só as fit (que o gerador usa).
// update-preparo: re-fetcha receitas ativas para coletar AUTOR + PREPARO ORIGINAL
// do JSON-LD, sem re-decompor ingredientes. Respeita o autor — não parafraseia.
async function updatePreparo() {
  await ensureSchema();
  const onlyFit = !args.includes('--all');
  const { rows } = await db.query(
    `SELECT id, slug, url FROM recipes WHERE active ${onlyFit ? 'AND healthy' : ''} ORDER BY id LIMIT $1`,
    [MAX === Infinity ? 100000 : MAX]);
  console.log(`\n✏️  update-preparo: ${rows.length} receitas ${onlyFit ? '(fit)' : '(todas ativas)'}\n`);
  let ok = 0, noAuthor = 0, noPreparo = 0;
  for (let i = 0; i < rows.length; i++) {
    const rec = rows[i];
    const html = await getText(rec.url);
    if (!html) { console.log(`  ✗ ${rec.slug}`); continue; }
    const r = extractRecipe(html);
    if (!r) { console.log(`  ✗ ${rec.slug} — sem JSON-LD`); continue; }
    const author  = srcAuthor(r);
    const preparo = srcPreparo(r);
    if (!author)  noAuthor++;
    if (!preparo) noPreparo++;
    await db.query(`UPDATE recipes SET author_name=$2, preparo=$3 WHERE id=$1`, [rec.id, author, preparo]);
    ok++;
    if ((i + 1) % 10 === 0) console.log(`  ...${i+1}/${rows.length}  (ok ${ok}, sem autor ${noAuthor}, sem preparo ${noPreparo})`);
    await sleep(DELAY);
  }
  console.log(`\n✓ atualizadas: ${ok} | sem autor: ${noAuthor} | sem preparo: ${noPreparo}`);
}

async function prep() {
  await ensureSchema();
  _cfg = _cfg || await ai.getLLMConfig();
  if (!(_cfg.gemini_api_key || _cfg.mistral_api_key || _cfg.openai_api_key)) { console.error('sem chave LLM configurada'); return; }
  const onlyFit = !args.includes('--all');
  const { rows } = await db.query(
    `SELECT id, name FROM recipes WHERE active ${onlyFit ? 'AND healthy' : ''} AND (preparo IS NULL OR preparo='') ORDER BY id LIMIT $1`,
    [MAX === Infinity ? 100000 : MAX]);
  console.log(`\n👨‍🍳 gerar preparo p/ ${rows.length} receitas ${onlyFit ? '(fit)' : '(todas ativas)'}\n`);
  let ok = 0, i = 0;
  for (const r of rows) {
    i++;
    const ing = (await db.query(
      `SELECT matched_name, grams FROM recipe_ingredients WHERE recipe_id=$1 AND matched_name IS NOT NULL ORDER BY grams DESC`, [r.id]
    )).rows;
    const list = ing.map(x => `${Math.round(x.grams)}g ${x.matched_name}`).join(', ');
    const prompt = `Você é chef. Escreva um MODO DE PREPARO ORIGINAL e conciso (3 a 6 passos curtos, numerados) ` +
      `para o prato "${r.name}", usando aproximadamente estes ingredientes: ${list}. Escreva do zero, objetivo, ` +
      `em português do Brasil — NÃO copie textos de sites. Responda APENAS JSON: {"preparo":"1. ...\\n2. ..."}.`;
    let txt = null;
    try { const { text } = await ai.callLLM(_cfg, prompt); txt = JSON.parse(ai.extractJson(text)).preparo; }
    catch (e) { console.warn(`  ✗ ${r.name}: ${e.message.slice(0, 60)}`); }
    if (txt && txt.length > 10) { await db.query(`UPDATE recipes SET preparo=$2 WHERE id=$1`, [r.id, txt]); ok++; }
    if (i % 10 === 0) console.log(`  ...${i}/${rows.length} (ok ${ok})`);
    await sleep(DELAY);
  }
  console.log(`\n✓ preparo gerado: ${ok}/${rows.length}`);
}

async function stats() {
  await ensureSchema();
  const s = await db.query(`SELECT status, count(*) FROM recipe_sources GROUP BY status ORDER BY status`);
  const r = await db.query(`SELECT count(*) tot, count(*) FILTER (WHERE active) ok,
    count(*) FILTER (WHERE 'lose'=ANY(goals)) lose,
    count(*) FILTER (WHERE 'maintain'=ANY(goals)) maintain,
    count(*) FILTER (WHERE 'gain'=ANY(goals)) gain,
    round(avg(coverage) FILTER (WHERE active)*100) cov FROM recipes`);
  const row = r.rows[0];
  console.log('recipe_sources:', s.rows.map(x => `${x.status}=${x.count}`).join('  '));
  console.log('recipes:', `total=${row.tot}  confiáveis=${row.ok}  cobertura=${row.cov||0}%`);
  console.log('  goals → lose:', row.lose, ' | maintain:', row.maintain, ' | gain:', row.gain);
}

(async () => {
  try {
    if (CMD === 'collect') await collect();
    else if (CMD === 'ingest') await ingest();
    else if (CMD === 'reclassify') await reclassify();
    else if (CMD === 'update-preparo') await updatePreparo();
    else if (CMD === 'prep') await prep();   // deprecated: gerava via LLM; preferir update-preparo
    else await stats();
  } catch (e) { console.error(e); process.exitCode = 1; }
  finally { try { await db.pool.end(); } catch {} }
})();
