const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// ── Fetch settings from DB ────────────────────────────────────

async function getLLMConfig() {
  const res = await db.query(
    "SELECT key, value FROM system_settings WHERE key IN ('gemini_api_key','openai_api_key','mistral_api_key','active_llm_provider')"
  );
  const cfg = {};
  res.rows.forEach(r => { cfg[r.key] = r.value; });
  return cfg;
}

// ── Provider: Gemini (with fallback) ─────────────────────────

const GEMINI_CANDIDATES = [
  { api: 'v1beta', model: 'gemini-2.5-flash' },
  { api: 'v1beta', model: 'gemini-2.0-flash' },
  { api: 'v1',     model: 'gemini-2.0-flash' },
  { api: 'v1beta', model: 'gemini-1.5-flash' },
  { api: 'v1',     model: 'gemini-1.5-flash' },
  { api: 'v1beta', model: 'gemini-1.5-flash-latest' },
];

async function callGemini(apiKey, prompt, imageBase64 = null) {
  const parts = [{ text: prompt }];
  if (imageBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } });
  const payload = {
    contents: [{ parts }],
    generationConfig: { responseMimeType: 'application/json' }
  };

  let lastErr;
  for (const { api, model } of GEMINI_CANDIDATES) {
    const url = `https://generativelanguage.googleapis.com/${api}/models/${model}:generateContent?key=${apiKey}`;
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (r.ok) {
      const data = await r.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Resposta vazia do Gemini');
      console.log(`Gemini OK: ${api}/${model}`);
      return { text, model: `${model} (${api})` };
    }
    const body = await r.text();
    lastErr = `Gemini ${r.status} (${api}/${model}): ${body}`;
    console.warn(lastErr);
    // fallback on overload or model not found; stop on auth errors
    if (r.status === 401 || r.status === 403) break;
  }
  throw new Error(lastErr);
}

// ── Provider: OpenAI ─────────────────────────────────────────

async function callOpenAI(apiKey, prompt) {
  const MODEL = 'gpt-4o-mini';
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Você é um nutricionista e chef. Responda SEMPRE em JSON puro, sem markdown.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })
  });
  if (!r.ok) { const e = await r.text(); throw new Error(`OpenAI ${r.status}: ${e}`); }
  const data = await r.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Resposta vazia do OpenAI');
  console.log(`OpenAI OK: ${MODEL}`);
  return { text, model: MODEL };
}

// ── Provider: Mistral ────────────────────────────────────────

async function callMistral(apiKey, prompt) {
  const MODEL = 'mistral-small-latest';
  const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Você é um nutricionista e chef. Responda SEMPRE em JSON puro, sem markdown.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })
  });
  if (!r.ok) { const e = await r.text(); throw new Error(`Mistral ${r.status}: ${e}`); }
  const data = await r.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Resposta vazia do Mistral');
  console.log(`Mistral OK: ${MODEL}`);
  return { text, model: MODEL };
}

// ── Unified dispatcher ────────────────────────────────────────

async function callLLM(cfg, prompt, imageBase64 = null) {
  const provider = cfg.active_llm_provider || 'gemini';
  if (provider === 'openai') {
    if (!cfg.openai_api_key) throw new Error('Chave OpenAI não configurada no painel admin.');
    return { provider, ...(await callOpenAI(cfg.openai_api_key, prompt)) };
  }
  if (provider === 'mistral') {
    if (!cfg.mistral_api_key) throw new Error('Chave Mistral não configurada no painel admin.');
    if (imageBase64) throw new Error('Mistral não suporta análise de imagens. Use Gemini ou OpenAI para o scanner.');
    return { provider, ...(await callMistral(cfg.mistral_api_key, prompt)) };
  }
  // default: gemini
  if (!cfg.gemini_api_key) throw new Error('Chave Gemini não configurada no painel admin.');
  return { provider, ...(await callGemini(cfg.gemini_api_key, prompt, imageBase64)) };
}

// ── Prompts ───────────────────────────────────────────────────

const MEAL_LABELS = { breakfast: 'café da manhã', lunch: 'almoço', dinner: 'jantar', snack: 'lanche', all: 'refeição' };
const GOAL_LABELS  = { lose: 'emagrecer / perda de gordura', gain: 'ganho de massa muscular', maintain: 'manutenção de peso e saúde' };
const GENDER_LABELS = { male: 'masculino', female: 'feminino' };

function profileContext(p) {
  if (!p || !p.goal) return '';
  return `
PERFIL DO CLIENTE:
- Objetivo: ${GOAL_LABELS[p.goal] || p.goal}
- Peso atual: ${p.weight || '?'}kg | Meta: ${p.goalWeight || '?'}kg
- Gênero: ${GENDER_LABELS[p.gender] || p.gender || '?'} | Idade: ${p.age || '?'} anos
- Meta diária: ${p.targetCalories || '?'} kcal | P ${p.targetProtein || '?'}g | C ${p.targetCarbs || '?'}g | G ${p.targetFat || '?'}g
`;
}

function promptAnalyzeFood() {
  return `Você é um nutricionista especialista em identificar pratos de comida por imagem.
Analise a imagem com precisão: identifique cada alimento visível, estime o peso real em gramas com base no tamanho aparente e calcule os macronutrientes corretos.
Seja preciso: uma pera média pesa ~170g e tem ~70 kcal, não 96 kcal. Use valores reais do TACO/IBGE.
Responda APENAS com JSON puro (sem markdown, sem explicações):
{"items":[{"name":"Nome do alimento","weight_g":150,"calories":210,"protein":24,"carbs":2,"fat":12,"fiber":3}],"total":{"calories":210,"protein":24,"carbs":2,"fat":12,"fiber":3}}`;
}

function promptDailyRecipe(mealType, cal, protein, carbs, fat, profile) {
  const mealLabel = MEAL_LABELS[mealType] || mealType;
  const ctx = profileContext(profile);
  return `Você é um chef e nutricionista brasileiro especializado em receitas práticas e saborosas para o dia a dia.
${ctx}
RECEITA SOLICITADA:
- Tipo de refeição: ${mealLabel}
- Calorias desta refeição: ~${cal} kcal
- Macros alvo: ~${protein}g proteína | ~${carbs}g carbos | ~${fat}g gordura

REGRAS OBRIGATÓRIAS:
1. Use APENAS ingredientes facilmente encontrados em qualquer supermercado brasileiro (frango, ovos, arroz, feijão, legumes comuns, etc.)
2. Tempo máximo de preparo: 30 minutos
3. Receita REAL com nome criativo — não genérica como "Frango com Legumes"
4. Modo de preparo em passos numerados claros
5. As quantidades dos ingredientes devem resultar nos macros especificados
6. Adequada ao objetivo do cliente: ${GOAL_LABELS[profile?.goal] || 'saudável'}

Responda APENAS com JSON puro (sem markdown):
{"name":"Nome criativo da receita","time_min":20,"calories":${cal},"protein":${protein},"carbs":${carbs},"fat":${fat},"ingredients":[{"name":"Ingrediente","amount":100,"unit":"g"}],"directions":"1. Passo um.\\n2. Passo dois.\\n3. Passo três."}`;
}

function promptWeeklyPlan(mealType, calPerMeal, protPerMeal, carbPerMeal, fatPerMeal, profile) {
  const mealLabel = mealType === 'all' ? 'refeições variadas (café da manhã, almoço, jantar, lanche — alternando)' : `${MEAL_LABELS[mealType] || mealType}`;
  const ctx = profileContext(profile);
  return `Você é um chef e nutricionista brasileiro especializado em planejamento alimentar prático.
${ctx}
PLANO SEMANAL SOLICITADO:
- Tipo: ${mealLabel}
- Cada receita: ~${calPerMeal} kcal | ~${protPerMeal}g proteína | ~${carbPerMeal}g carbos | ~${fatPerMeal}g gordura

REGRAS OBRIGATÓRIAS:
1. 7 receitas DIFERENTES — sem repetição de pratos
2. Use APENAS ingredientes facilmente encontrados em supermercados brasileiros
3. Tempo máximo por receita: 35 minutos
4. Receitas REAIS e variadas (não genéricas) — inclua pratos da culinária brasileira saudável
5. Progressão lógica para a semana: varie proteínas (frango, peixe, ovos, leguminosas)
6. Adequadas ao objetivo: ${GOAL_LABELS[profile?.goal] || 'saudável'}
7. Modo de preparo em passos numerados

Responda APENAS com JSON puro (sem markdown) — array com exatamente 7 objetos:
[{"day":1,"name":"Nome criativo","time_min":20,"calories":${calPerMeal},"protein":${protPerMeal},"carbs":${carbPerMeal},"fat":${fatPerMeal},"ingredients":[{"name":"Ingrediente","amount":100,"unit":"g"}],"directions":"1. Passo um.\\n2. Passo dois."}]`;
}

// ── Routes ────────────────────────────────────────────────────

// POST /api/ai/analyze-food
router.post('/analyze-food', authenticateToken, async (req, res) => {
  const t0 = Date.now();
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'Imagem base64 obrigatória.' });
    const cfg = await getLLMConfig();
    const { text, provider, model } = await callLLM(cfg, promptAnalyzeFood(), image);
    const result = JSON.parse(text);
    result._meta = { provider, model, latency_ms: Date.now() - t0 };
    res.json(result);
  } catch (err) {
    console.error('Erro analyze-food:', err.message);
    res.status(502).json({ error: 'Falha ao analisar imagem com IA.', detail: err.message });
  }
});

// POST /api/ai/generate-recipe
router.post('/generate-recipe', authenticateToken, async (req, res) => {
  const t0 = Date.now();
  try {
    const { mealType = 'all', cal, protein, carbs, fat, profile } = req.body;
    const cfg = await getLLMConfig();
    const { text, provider, model } = await callLLM(cfg, promptDailyRecipe(mealType, cal, protein, carbs, fat, profile));
    const recipe = JSON.parse(text);
    res.json({ recipe, mealType, _meta: { provider, model, latency_ms: Date.now() - t0 } });
  } catch (err) {
    console.error('Erro generate-recipe:', err.message);
    res.status(502).json({ error: 'Falha ao gerar receita com IA.', detail: err.message });
  }
});

// POST /api/ai/generate-weekly
router.post('/generate-weekly', authenticateToken, async (req, res) => {
  const t0 = Date.now();
  try {
    const { mealType = 'all', targetCalories, targetProtein, targetCarbs, targetFat, profile } = req.body;
    const cfg = await getLLMConfig();
    const cal = Math.round(targetCalories / 3);
    const prot = Math.round(targetProtein / 3);
    const carb = Math.round(targetCarbs / 3);
    const fat = Math.round(targetFat / 3);
    const { text, provider, model } = await callLLM(cfg, promptWeeklyPlan(mealType, cal, prot, carb, fat, profile));
    const plans = JSON.parse(text);
    res.json({ plans, mealType, _meta: { provider, model, latency_ms: Date.now() - t0 } });
  } catch (err) {
    console.error('Erro generate-weekly:', err.message);
    res.status(502).json({ error: 'Falha ao gerar plano semanal com IA.', detail: err.message });
  }
});

// POST /api/ai/test
router.post('/test', authenticateToken, async (req, res) => {
  const t0 = Date.now();
  try {
    const cfg = await getLLMConfig();
    const { text, provider, model } = await callLLM(cfg, promptDailyRecipe('lunch', 400, 30, 40, 12));
    const recipe = JSON.parse(text);
    res.json({
      ok: true, provider, model,
      latency_ms: Date.now() - t0,
      sample: { name: recipe.name, calories: recipe.calories, time_min: recipe.time_min }
    });
  } catch (err) {
    console.error('Erro test-llm:', err.message);
    res.status(502).json({ ok: false, error: err.message, latency_ms: Date.now() - t0 });
  }
});

module.exports = router;
