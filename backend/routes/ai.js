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

async function callGemini(apiKey, prompt, imageBase64 = null) {
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
  const parts = [{ text: prompt }];
  if (imageBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } });
  const payload = {
    contents: [{ parts }],
    generationConfig: { responseMimeType: 'application/json' }
  };

  let lastErr;
  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (r.ok) {
      const data = await r.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Resposta vazia do Gemini');
      console.log(`Gemini OK: ${model}`);
      return text;
    }
    const body = await r.text();
    lastErr = `Gemini ${r.status} (${model}): ${body}`;
    console.warn(lastErr);
    if (r.status !== 503 && r.status !== 429) break;
  }
  throw new Error(lastErr);
}

// ── Provider: OpenAI ─────────────────────────────────────────

async function callOpenAI(apiKey, prompt) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
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
  console.log('OpenAI OK: gpt-4o-mini');
  return text;
}

// ── Provider: Mistral ────────────────────────────────────────

async function callMistral(apiKey, prompt) {
  const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'mistral-small-latest',
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
  console.log('Mistral OK: mistral-small-latest');
  return text;
}

// ── Unified dispatcher ────────────────────────────────────────

async function callLLM(cfg, prompt, imageBase64 = null) {
  const provider = cfg.active_llm_provider || 'gemini';
  if (provider === 'openai') {
    if (!cfg.openai_api_key) throw new Error('Chave OpenAI não configurada no painel admin.');
    if (imageBase64) return callOpenAI(cfg.openai_api_key, prompt); // gpt-4o-mini suporta vision via text prompt apenas
    return callOpenAI(cfg.openai_api_key, prompt);
  }
  if (provider === 'mistral') {
    if (!cfg.mistral_api_key) throw new Error('Chave Mistral não configurada no painel admin.');
    if (imageBase64) throw new Error('Mistral não suporta análise de imagens. Use Gemini ou OpenAI para o scanner.');
    return callMistral(cfg.mistral_api_key, prompt);
  }
  // default: gemini
  if (!cfg.gemini_api_key) throw new Error('Chave Gemini não configurada no painel admin.');
  return callGemini(cfg.gemini_api_key, prompt, imageBase64);
}

// ── Prompts ───────────────────────────────────────────────────

function promptAnalyzeFood() {
  return `Você é um nutricionista especialista em identificar pratos de comida por imagem. Analise a imagem e retorne um objeto JSON com os alimentos identificados, peso estimado (g) e macronutrientes.
Responda APENAS com JSON puro (sem markdown):
{"items":[{"name":"Nome","weight_g":150,"calories":210,"protein":24,"carbs":2,"fat":12}],"total":{"calories":210,"protein":24,"carbs":2,"fat":12}}`;
}

function promptDailyRecipe(mealType, cal, protein, carbs, fat) {
  const t = mealType === 'all' ? 'qualquer tipo de refeição saudável' : `refeição do tipo: ${mealType}`;
  return `Você é um chef e nutricionista. Crie uma receita saudável em português para ${t} com aproximadamente: ${cal} kcal, ${protein}g proteína, ${carbs}g carboidratos, ${fat}g gordura.
Responda APENAS com JSON puro (sem markdown):
{"name":"Nome da receita","time_min":15,"calories":320,"protein":24,"carbs":30,"fat":8,"ingredients":[{"name":"Ingrediente","amount":100,"unit":"g"}],"directions":"Modo de preparo."}`;
}

function promptWeeklyPlan(mealType, calPerMeal, protPerMeal, carbPerMeal, fatPerMeal) {
  const t = mealType === 'all' ? 'refeições variadas (café, almoço, jantar, lanche)' : `refeições do tipo: ${mealType}`;
  return `Você é um chef e nutricionista. Crie 7 receitas saudáveis diferentes em português (uma por dia, dias 1 a 7) do tipo ${t}, cada uma com ~${calPerMeal} kcal, ~${protPerMeal}g proteína, ~${carbPerMeal}g carbo, ~${fatPerMeal}g gordura.
Responda APENAS com JSON puro (sem markdown) — array com exatamente 7 objetos:
[{"day":1,"name":"Nome","time_min":20,"calories":400,"protein":30,"carbs":40,"fat":10,"ingredients":[{"name":"Ingrediente","amount":100,"unit":"g"}],"directions":"Modo de preparo."}]`;
}

// ── Routes ────────────────────────────────────────────────────

// POST /api/ai/analyze-food
router.post('/analyze-food', authenticateToken, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'Imagem base64 obrigatória.' });
    const cfg = await getLLMConfig();
    const text = await callLLM(cfg, promptAnalyzeFood(), image);
    res.json(JSON.parse(text));
  } catch (err) {
    console.error('Erro analyze-food:', err.message);
    res.status(502).json({ error: 'Falha ao analisar imagem com IA.', detail: err.message });
  }
});

// POST /api/ai/generate-recipe
router.post('/generate-recipe', authenticateToken, async (req, res) => {
  try {
    const { mealType = 'all', cal, protein, carbs, fat } = req.body;
    const cfg = await getLLMConfig();
    const text = await callLLM(cfg, promptDailyRecipe(mealType, cal, protein, carbs, fat));
    const recipe = JSON.parse(text);
    res.json({ recipe, mealType });
  } catch (err) {
    console.error('Erro generate-recipe:', err.message);
    res.status(502).json({ error: 'Falha ao gerar receita com IA.', detail: err.message });
  }
});

// POST /api/ai/generate-weekly
router.post('/generate-weekly', authenticateToken, async (req, res) => {
  try {
    const { mealType = 'all', targetCalories, targetProtein, targetCarbs, targetFat } = req.body;
    const cfg = await getLLMConfig();
    const cal = Math.round(targetCalories / 3);
    const prot = Math.round(targetProtein / 3);
    const carb = Math.round(targetCarbs / 3);
    const fat = Math.round(targetFat / 3);
    const text = await callLLM(cfg, promptWeeklyPlan(mealType, cal, prot, carb, fat));
    const plans = JSON.parse(text);
    res.json({ plans, mealType });
  } catch (err) {
    console.error('Erro generate-weekly:', err.message);
    res.status(502).json({ error: 'Falha ao gerar plano semanal com IA.', detail: err.message });
  }
});

// POST /api/ai/test  (admin only — no auth middleware needed since admin panel already has token)
router.post('/test', authenticateToken, async (req, res) => {
  const start = Date.now();
  try {
    const cfg = await getLLMConfig();
    const provider = cfg.active_llm_provider || 'gemini';
    const text = await callLLM(cfg, promptDailyRecipe('lunch', 400, 30, 40, 12));
    const recipe = JSON.parse(text);
    res.json({
      ok: true,
      provider,
      model: provider === 'gemini' ? 'gemini-2.5-flash / gemini-1.5-flash' : provider === 'openai' ? 'gpt-4o-mini' : 'mistral-small-latest',
      latency_ms: Date.now() - start,
      sample: { name: recipe.name, calories: recipe.calories, time_min: recipe.time_min }
    });
  } catch (err) {
    console.error('Erro test-llm:', err.message);
    res.status(502).json({ ok: false, error: err.message, latency_ms: Date.now() - start });
  }
});

module.exports = router;
