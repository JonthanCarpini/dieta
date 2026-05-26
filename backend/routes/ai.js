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

// v1beta supports responseMimeType (JSON mode); v1 does not
const GEMINI_CANDIDATES = [
  { api: 'v1beta', model: 'gemini-2.5-flash',        jsonMode: true  },
  { api: 'v1beta', model: 'gemini-2.0-flash',        jsonMode: true  },
  { api: 'v1beta', model: 'gemini-2.0-flash-lite',   jsonMode: true  },
  { api: 'v1beta', model: 'gemini-1.5-flash',        jsonMode: true  },
  { api: 'v1beta', model: 'gemini-1.5-flash-002',    jsonMode: true  },
  { api: 'v1beta', model: 'gemini-1.5-flash-001',    jsonMode: true  },
  { api: 'v1',     model: 'gemini-1.5-flash',        jsonMode: false },
  { api: 'v1',     model: 'gemini-1.5-pro',          jsonMode: false },
  { api: 'v1beta', model: 'gemini-1.0-pro',          jsonMode: false },
];

function extractJson(text) {
  // Strip markdown code fences if model ignores the no-markdown instruction
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) return m[1].trim();
  const first = text.indexOf('{') !== -1 ? text.indexOf('{') : text.indexOf('[');
  const last  = text.lastIndexOf('}') !== -1 && text.lastIndexOf('}') > text.lastIndexOf(']') ? text.lastIndexOf('}') : text.lastIndexOf(']');
  if (first !== -1 && last !== -1) return text.slice(first, last + 1);
  return text;
}

async function callGemini(apiKey, prompt, imageBase64 = null) {
  const parts = [{ text: prompt }];
  if (imageBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } });

  let lastErr;
  for (const { api, model, jsonMode } of GEMINI_CANDIDATES) {
    const generationConfig = jsonMode ? { responseMimeType: 'application/json' } : {};
    const payload = { contents: [{ parts }], generationConfig };
    const url = `https://generativelanguage.googleapis.com/${api}/models/${model}:generateContent?key=${apiKey}`;
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (r.ok) {
      const data = await r.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw) { lastErr = `Gemini resposta vazia (${api}/${model})`; continue; }
      const text = jsonMode ? raw : extractJson(raw);
      console.log(`Gemini OK: ${api}/${model}`);
      return { text, model: `${model} (${api})` };
    }
    const body = await r.text();
    lastErr = `Gemini ${r.status} (${api}/${model}): ${body}`;
    console.warn(lastErr);
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
  const goalTips = {
    lose:     'Priorize vegetais, proteínas magras (frango sem pele, claras, atum, cottage). Evite frituras, molhos gordurosos e açúcar. A receita deve ser saciante com baixa densidade calórica.',
    gain:     'Inclua carboidratos complexos (arroz, batata-doce, aveia) e proteína completa. Calorias devem ser densas mas nutritivas.',
    maintain: 'Receita equilibrada com todos os grupos nutricionais em proporção saudável.'
  };
  const tip = goalTips[profile?.goal] || goalTips.maintain;

  return `Você é um nutricionista e chef brasileiro. Crie UMA receita saudável e realista para ${mealLabel}.
${ctx}
PARÂMETROS DESTA REFEIÇÃO (siga com precisão):
- Calorias: ${cal} kcal (tolerância: ±30 kcal)
- Proteína: ${protein}g | Carboidratos: ${carbs}g | Gordura: ${fat}g

ORIENTAÇÃO NUTRICIONAL: ${tip}

REGRAS — SIGA TODAS:
1. Use ingredientes de supermercado brasileiro comum (frango, ovos, arroz, feijão, legumes, frutas comuns)
2. Porção para 1 pessoa adulta — quantidades realistas (ex: máximo 200g de carne, 2-3 ovos, não 12)
3. Tempo de preparo: máximo 30 minutos
4. Nome criativo e apetitoso em português (não genérico)
5. As QUANTIDADES dos ingredientes DEVEM resultar exatamente em ${cal} kcal — calcule os pesos com precisão
6. Modo de preparo em passos numerados (mínimo 3 passos)
7. PROIBIDO: receitas de maromba/culturismo para objetivos de perda de peso

Responda APENAS com JSON puro sem markdown. Exemplo de formato:
{"name":"Nome da receita","time_min":20,"calories":${cal},"protein":${protein},"carbs":${carbs},"fat":${fat},"ingredients":[{"name":"Peito de frango","amount":150,"unit":"g"},{"name":"Brócolis","amount":100,"unit":"g"}],"directions":"1. Tempere o frango com sal e alho.\\n2. Grelhe por 8 minutos de cada lado.\\n3. Cozinhe o brócolis no vapor por 5 minutos."}`;
}

function promptWeeklyPlan(mealType, calPerMeal, protPerMeal, carbPerMeal, fatPerMeal, profile) {
  const mealLabel = mealType === 'all' ? 'refeições variadas (café da manhã, almoço, jantar, lanche — alternando ao longo da semana)' : `${MEAL_LABELS[mealType] || mealType}`;
  const ctx = profileContext(profile);
  const goalTips = {
    lose:     'Receitas para perda de peso: vegetais abundantes, proteínas magras moderadas (máx 180g carne/porção), carboidratos complexos em pequena quantidade, sem frituras ou molhos calóricos.',
    gain:     'Receitas para ganho de massa: inclua carboidratos complexos (batata-doce, arroz, aveia), proteína suficiente (frango, ovos, atum), gorduras boas (azeite, abacate).',
    maintain: 'Receitas equilibradas: todos os macros em proporção saudável, variedade de alimentos.'
  };
  const tip = goalTips[profile?.goal] || goalTips.maintain;

  return `Você é um nutricionista e chef brasileiro. Crie 7 receitas saudáveis para a semana.
${ctx}
PARÂMETROS DE CADA REFEIÇÃO (siga com precisão):
- Tipo: ${mealLabel}
- Calorias por receita: ${calPerMeal} kcal (tolerância: ±40 kcal)
- Macros: ${protPerMeal}g proteína | ${carbPerMeal}g carbos | ${fatPerMeal}g gordura

ORIENTAÇÃO NUTRICIONAL: ${tip}

REGRAS — SIGA TODAS:
1. 7 receitas COMPLETAMENTE DIFERENTES — sem repetir o prato principal
2. Ingredientes de supermercado brasileiro comum (frango, ovos, arroz, legumes, frutas comuns)
3. Porção para 1 pessoa adulta — quantidades realistas (máx 200g de carne, 2-3 ovos por receita)
4. Tempo máximo por receita: 35 minutos
5. Varie as proteínas ao longo da semana: frango, peixe/atum, ovos, leguminosas (feijão, lentilha), carne magra
6. As quantidades dos ingredientes DEVEM resultar em ${calPerMeal} kcal — calcule com precisão
7. Modo de preparo em passos numerados (mínimo 3 passos)
8. Nomes criativos e apetitosos em português

Responda APENAS com JSON puro sem markdown — array com exatamente 7 objetos:
[{"day":1,"name":"Nome criativo","time_min":20,"calories":${calPerMeal},"protein":${protPerMeal},"carbs":${carbPerMeal},"fat":${fatPerMeal},"ingredients":[{"name":"Ingrediente","amount":150,"unit":"g"}],"directions":"1. Passo um.\\n2. Passo dois.\\n3. Passo três."}]`;
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
