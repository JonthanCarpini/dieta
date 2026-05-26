const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const GEMINI_MODEL = 'gemini-2.5-flash';

async function getGeminiKey() {
  const res = await db.query("SELECT value FROM system_settings WHERE key = 'gemini_api_key'");
  return res.rows[0]?.value || null;
}

async function callGemini(apiKey, payload) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini ${res.status}: ${errBody}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Resposta vazia do Gemini');
  return text;
}

// POST /api/ai/analyze-food
// Body: { image: "<base64 string sem prefixo>" }
router.post('/analyze-food', authenticateToken, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'Imagem base64 obrigatória.' });

    const apiKey = await getGeminiKey();
    if (!apiKey) return res.status(503).json({ error: 'Chave Gemini não configurada. Contate o administrador.' });

    const prompt = `Você é um nutricionista especialista em identificar pratos de comida por imagem. Analise a imagem fornecida e retorne um objeto JSON contendo os alimentos identificados, o peso estimado (g), e os macronutrientes (calorias, carboidratos (g), proteínas (g), gorduras (g)) de cada um.
Responda ESTRITAMENTE em formato JSON puro (sem bloco de código markdown, apenas a string JSON limpa):
{
  "items": [
    { "name": "Nome do Alimento", "weight_g": 150, "calories": 210, "protein": 24, "carbs": 2, "fat": 12 }
  ],
  "total": { "calories": 210, "protein": 24, "carbs": 2, "fat": 12 }
}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: image } }] }],
      generationConfig: { responseMimeType: 'application/json' }
    };

    const jsonText = await callGemini(apiKey, payload);
    const result = JSON.parse(jsonText);
    res.json(result);
  } catch (err) {
    console.error('Erro analyze-food:', err.message);
    res.status(502).json({ error: 'Falha ao analisar imagem com IA.', detail: err.message });
  }
});

// POST /api/ai/generate-recipe
// Body: { mealType, cal, protein, carbs, fat }
router.post('/generate-recipe', authenticateToken, async (req, res) => {
  try {
    const { mealType = 'all', cal, protein, carbs, fat } = req.body;

    const apiKey = await getGeminiKey();
    if (!apiKey) return res.status(503).json({ error: 'Chave Gemini não configurada. Contate o administrador.' });

    const mealTypeStr = mealType === 'all' ? 'qualquer tipo de refeição saudável' : `refeição do tipo: ${mealType}`;
    const prompt = `Você é um chef e nutricionista experiente. Crie uma receita saudável, rápida e realista em português para ser consumida como ${mealTypeStr}.
A receita deve utilizar aproximadamente o seguinte limite nutricional:
- Calorias: ${cal} kcal
- Proteínas: ${protein}g
- Carboidratos: ${carbs}g
- Gorduras: ${fat}g

Responda ESTRITAMENTE em formato JSON puro (sem bloco de código markdown, apenas a string JSON limpa):
{
  "name": "Nome descritivo e gostoso da receita",
  "time_min": 15,
  "calories": 320,
  "protein": 24,
  "carbs": 30,
  "fat": 8,
  "ingredients": [
    { "name": "Nome exato do ingrediente", "amount": 100, "unit": "g" }
  ],
  "directions": "Modo de preparo passo a passo resumido."
}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    };

    const jsonText = await callGemini(apiKey, payload);
    const recipe = JSON.parse(jsonText);
    res.json({ recipe, mealType });
  } catch (err) {
    console.error('Erro generate-recipe:', err.message);
    res.status(502).json({ error: 'Falha ao gerar receita com IA.', detail: err.message });
  }
});

// POST /api/ai/generate-weekly
// Body: { mealType, targetCalories, targetProtein, targetCarbs, targetFat }
router.post('/generate-weekly', authenticateToken, async (req, res) => {
  try {
    const { mealType = 'all', targetCalories, targetProtein, targetCarbs, targetFat } = req.body;

    const apiKey = await getGeminiKey();
    if (!apiKey) return res.status(503).json({ error: 'Chave Gemini não configurada. Contate o administrador.' });

    const calPerMeal  = Math.round(targetCalories / 3);
    const protPerMeal = Math.round(targetProtein  / 3);
    const carbPerMeal = Math.round(targetCarbs    / 3);
    const fatPerMeal  = Math.round(targetFat      / 3);
    const mealTypeStr = mealType === 'all'
      ? 'refeições variadas (café, almoço, janta, lanche) ao longo dos dias'
      : `refeições estritamente do tipo: ${mealType}`;

    const prompt = `Você é um chef e nutricionista. Crie um plano de 7 dias com 7 receitas saudáveis diferentes em português (uma para cada dia, identificados de dia 1 a dia 7).
Tipo de refeição: ${mealTypeStr}.
Valor nutricional médio por receita:
- Calorias: ${calPerMeal} kcal  - Proteínas: ${protPerMeal}g  - Carboidratos: ${carbPerMeal}g  - Gorduras: ${fatPerMeal}g

Responda ESTRITAMENTE em formato JSON puro (sem bloco de código markdown) — um array com exatamente 7 objetos:
[
  {
    "day": 1,
    "name": "Nome da receita",
    "time_min": 20,
    "calories": 400,
    "protein": 30,
    "carbs": 40,
    "fat": 10,
    "ingredients": [{ "name": "Ingrediente", "amount": 100, "unit": "g" }],
    "directions": "Modo de preparo."
  }
]`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    };

    const jsonText = await callGemini(apiKey, payload);
    const plans = JSON.parse(jsonText);
    res.json({ plans, mealType });
  } catch (err) {
    console.error('Erro generate-weekly:', err.message);
    res.status(502).json({ error: 'Falha ao gerar plano semanal com IA.', detail: err.message });
  }
});

module.exports = router;
