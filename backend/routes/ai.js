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

// Only models confirmed available via ListModels for this key class
// v1beta supports responseMimeType (JSON mode); v1 does not
const GEMINI_CANDIDATES = [
  { api: 'v1beta', model: 'gemini-2.5-flash',          jsonMode: true  },
  { api: 'v1beta', model: 'gemini-2.0-flash',          jsonMode: true  },
  { api: 'v1beta', model: 'gemini-2.0-flash-001',      jsonMode: true  },
  { api: 'v1beta', model: 'gemini-2.0-flash-lite',     jsonMode: true  },
  { api: 'v1beta', model: 'gemini-2.0-flash-lite-001', jsonMode: true  },
  { api: 'v1beta', model: 'gemini-flash-latest',       jsonMode: true  },
  { api: 'v1beta', model: 'gemini-2.5-flash-lite',     jsonMode: true  },
  { api: 'v1beta', model: 'gemini-pro-latest',         jsonMode: false },
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
  // Suporta string única ou array de imagens base64
  const imgs = Array.isArray(imageBase64) ? imageBase64 : (imageBase64 ? [imageBase64] : []);
  imgs.forEach(img => { if (img) parts.push({ inlineData: { mimeType: 'image/jpeg', data: img } }); });

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
  const active = cfg.active_llm_provider || 'gemini';

  // Build ordered list: active provider first, then fallbacks
  const order = [active, ...['gemini', 'mistral', 'openai'].filter(p => p !== active)];
  let lastErr;

  for (const provider of order) {
    try {
      if (provider === 'openai' && cfg.openai_api_key) {
        const result = await callOpenAI(cfg.openai_api_key, prompt);
        if (provider !== active) console.warn(`Auto-fallback para OpenAI após falha de ${active}`);
        return { provider, ...result };
      }
      if (provider === 'mistral' && cfg.mistral_api_key) {
        const hasImage = Array.isArray(imageBase64) ? imageBase64.some(Boolean) : !!imageBase64;
        if (hasImage) { lastErr = 'Mistral não suporta imagens'; continue; }
        const result = await callMistral(cfg.mistral_api_key, prompt);
        if (provider !== active) console.warn(`Auto-fallback para Mistral após falha de ${active}`);
        return { provider, ...result };
      }
      if (provider === 'gemini' && cfg.gemini_api_key) {
        const result = await callGemini(cfg.gemini_api_key, prompt, imageBase64);
        return { provider, ...result };
      }
    } catch (err) {
      lastErr = err.message;
      console.warn(`Provedor ${provider} falhou: ${err.message.slice(0, 120)}`);
    }
  }

  throw new Error(lastErr || 'Nenhum provedor de IA configurado ou disponível.');
}

// ── Prompts ───────────────────────────────────────────────────

const MEAL_LABELS = { breakfast: 'café da manhã', lunch: 'almoço', dinner: 'jantar', snack: 'lanche', all: 'refeição' };
const GOAL_LABELS  = { lose: 'emagrecer / perda de gordura', gain: 'ganho de massa muscular', maintain: 'manutenção de peso e saúde' };
const GENDER_LABELS = { male: 'masculino', female: 'feminino' };

function profileContext(p) {
  if (!p || !p.goal) return '';
  let clinical = '';
  if (p.comorbidities) clinical += `- Comorbidades: ${p.comorbidities}\n`;
  if (p.intolerances) clinical += `- Intolerâncias/Alergias Alimentares: ${p.intolerances}\n`;
  if (p.dietary_restrictions) clinical += `- Restrições Alimentares Adicionais: ${p.dietary_restrictions}\n`;
  if (p.notes) clinical += `- Notas Clínicas importantes: ${p.notes}\n`;

  return `
PERFIL DO CLIENTE:
- Objetivo: ${GOAL_LABELS[p.goal] || p.goal}
- Peso atual: ${p.weight || '?'}kg | Meta: ${p.goalWeight || '?'}kg
- Gênero: ${GENDER_LABELS[p.gender] || p.gender || '?'} | Idade: ${p.age || '?'} anos
- Meta diária: ${p.targetCalories || '?'} kcal | P ${p.targetProtein || '?'}g | C ${p.targetCarbs || '?'}g | G ${p.targetFat || '?'}g
${clinical}`;
}

function promptAnalyzeFood() {
  return `Você é um nutricionista especialista em identificar pratos de comida por imagem.
Analise a imagem com precisão: identifique cada alimento visível, estime o peso real em gramas com base no tamanho aparente e calcule os macronutrientes corretos.
Seja preciso: uma pera média pesa ~170g e tem ~70 kcal, não 96 kcal. Use valores reais do TACO/IBGE.
Responda APENAS com JSON puro (sem markdown, sem explicações):
{"items":[{"name":"Nome do alimento","weight_g":150,"calories":210,"protein":24,"carbs":2,"fat":12,"fiber":3}],"total":{"calories":210,"protein":24,"carbs":2,"fat":12,"fiber":3}}`;
}

function promptDailyRecipe(mealType, cal, protein, carbs, fat, profile, recipeName = '') {
  const mealLabel = MEAL_LABELS[mealType] || mealType;
  const ctx = profileContext(profile);
  const goalTips = {
    lose:     'Priorize vegetais, proteínas magras (frango sem pele, claras, atum, cottage). Evite frituras, molhos gordurosos e açúcar. A receita deve ser saciante com baixa densidade calórica.',
    gain:     'Inclua carboidratos complexos (arroz, batata-doce, aveia) e proteína completa. Calorias devem ser densas mas nutritivas.',
    maintain: 'Receita equilibrada com todos os grupos nutricionais em proporção saudável.'
  };
  const tip = goalTips[profile?.goal] || goalTips.maintain;
  const recipeSpec = recipeName ? `\nO prato que você DEVE ensinar a preparar é obrigatoriamente: "${recipeName}". Ajuste as quantidades e ingredientes de forma que esse prato específico bata com precisão as calorias e macros sugeridos.` : '';

  return `Você é um nutricionista e chef brasileiro especialista em receitas práticas. Crie UMA receita saudável, super simples, rápida e realista para ${mealLabel}.${recipeSpec}
${ctx}
PARÂMETROS DESTA REFEIÇÃO (siga com precisão):
- Calorias: ${cal} kcal (tolerância: ±30 kcal)
- Proteína: ${protein}g | Carboidratos: ${carbs}g | Gordura: ${fat}g

ORIENTAÇÃO NUTRICIONAL: ${tip}

REGRAS — SIGA TODAS:
1. Use ingredientes simples, básicos e acessíveis de supermercado brasileiro comum (como ovos, peito de frango, atum enlatado, pão integral, queijo branco, aveia, frutas, vegetais comuns).
2. Simplicidade extrema: utilize no máximo 5 ou 6 ingredientes principais no total.
3. Tempo de preparo: máximo 15 minutos (deve ser extremamente rápida e prática para o dia a dia corrido).
4. Porção para 1 pessoa adulta — quantidades realistas (ex: máximo 200g de carne, 2-3 ovos).
5. As QUANTIDADES dos ingredientes DEVEM resultar exatamente em ${cal} kcal — calcule os pesos com precisão.
6. Modo de preparo em passos extremamente diretos e curtos (máximo 3 a 4 passos simples. Proibido processos demorados como forno convencional prolongado, panela de pressão ou marinadas complexas).
7. Nome criativo, apetitoso e direto em português (pode ser baseado em "${recipeName || 'Nome da receita'}").
8. PROIBIDO: receitas de maromba/culturismo para objetivos de perda de peso.
9. IMPORTANTE: Se o Perfil do Cliente contiver comorbidades, intolerâncias/alergias ou restrições alimentares listadas, você DEVE EXCLUIR COMPLETAMENTE ingredientes incompatíveis ou nocivos para essas condições (ex: intolerância à lactose = sem leite e derivados convencionais; diabetes = sem açúcar/mel/doces; alergia a amendoim = sem amendoim, etc.).

Responda APENAS com JSON puro sem markdown. Exemplo de formato:
{"name":"Nome da receita","time_min":10,"calories":${cal},"protein":${protein},"carbs":${carbs},"fat":${fat},"ingredients":[{"name":"Peito de frango","amount":150,"unit":"g"},{"name":"Brócolis","amount":100,"unit":"g"}],"directions":"1. Tempere o frango com sal e alho.\\n2. Grelhe em frigideira quente por 6 minutos de cada lado.\\n3. Cozinhe o brócolis no microondas por 3 minutos com um pouco de água."}`;
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
9. IMPORTANTE: Se o Perfil do Cliente contiver comorbidades, intolerâncias/alergias ou restrições alimentares listadas, você DEVE EXCLUIR COMPLETAMENTE ingredientes incompatíveis ou nocivos para essas condições (ex: intolerância à lactose = sem leite e derivados convencionais; diabetes = sem açúcar/mel/doces, etc.).

Responda APENAS com JSON puro sem markdown — array com exatamente 7 objetos:
[{"day":1,"name":"Nome criativo","time_min":20,"calories":${calPerMeal},"protein":${protPerMeal},"carbs":${carbPerMeal},"fat":${fatPerMeal},"ingredients":[{"name":"Ingrediente","amount":150,"unit":"g"}],"directions":"1. Passo um.\\n2. Passo dois.\\n3. Passo três."}]`;
}

function promptAnalyzeBody(heightCm) {
  return `Você é um especialista em composição corporal e avaliação física com 20 anos de experiência clínica.

Analise esta foto de avaliação corporal (posição frontal, roupa de banho, braços e pernas abertos) e estime as medidas antropométricas com base nas proporções visíveis.

PARÂMETRO EXATO CONHECIDO:
- Altura: ${heightCm} cm (use como régua de referência para calibrar TODAS as estimativas de circunferência e composição)

METODOLOGIA:
1. Use a altura como escala de referência para estimar as dimensões dos segmentos corporais
2. Estime as circunferências com base nas proporções relativas à altura e ao desenvolvimento muscular visível
3. Estime o percentual de gordura pela distribuição visível de gordura subcutânea (abdômen, quadril, membros)
4. Estime a massa muscular com base no desenvolvimento muscular aparente e na estimativa de peso total
5. Seja conservador — prefira valores médios da população quando houver incerteza visual

REFERÊNCIAS ANTROPOMÉTRICAS HUMANAS (use como sanity check):
- Cintura feminina típica: 65–90 cm; masculina: 75–100 cm
- Quadril feminino típico: 88–110 cm; masculino: 90–108 cm
- Braço masculino típico: 28–42 cm; feminino: 26–36 cm
- Coxa masculina típica: 48–65 cm; feminina: 52–68 cm
- Gordura corporal saudável: homem 10–22%, mulher 20–32%

REGRAS:
- Responda APENAS com JSON puro, sem markdown, sem explicações fora do JSON
- Use números decimais com ponto (ex: 28.5 não "28,5")
- Se a foto não mostrar o corpo claramente, retorne confidence: 0 e explique em "notes"
- Todas as estimativas devem ser biologicamente plausíveis

Responda com exatamente este JSON (sem campos extras):
{"body_fat_pct":<decimal>,"waist_cm":<decimal>,"hip_cm":<decimal>,"chest_cm":<decimal>,"arm_cm":<decimal>,"thigh_cm":<decimal>,"muscle_mass_kg":<decimal>,"visual_assessment":"<ectomorfo|mesomorfo|endomorfo>","confidence":<0-10>,"notes":"<observações breves sobre precisão>"}`;
}

// ── Routes ────────────────────────────────────────────────────

// POST /api/ai/analyze-food (JSON body com base64 - usado pelo web)
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

// POST /api/ai/analyze-food-binary (upload binário direto - usado pelo mobile)
// Aceita corpo image/jpeg ou image/png cru, sem JSON. Permite o mobile usar
// FileSystem.uploadAsync (OkHttp nativo), evitando passar 200KB+ base64 pelo
// bridge JS->Native do RN, que estava causando crash do app durante a leitura
// da resposta.
router.post(
  '/analyze-food-binary',
  authenticateToken,
  express.raw({ type: ['image/*', 'application/octet-stream'], limit: '15mb' }),
  async (req, res) => {
    const t0 = Date.now();
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: 'Body vazio. Envie a imagem como image/jpeg ou image/png.' });
      }
      const image = req.body.toString('base64');
      const cfg = await getLLMConfig();
      const { text, provider, model } = await callLLM(cfg, promptAnalyzeFood(), image);
      const result = JSON.parse(text);
      result._meta = { provider, model, latency_ms: Date.now() - t0, bytes: req.body.length };
      res.json(result);
    } catch (err) {
      console.error('Erro analyze-food-binary:', err.message);
      res.status(502).json({ error: 'Falha ao analisar imagem com IA.', detail: err.message });
    }
  }
);

// POST /api/ai/generate-recipe
router.post('/generate-recipe', authenticateToken, async (req, res) => {
  const t0 = Date.now();
  try {
    const { mealType = 'all', cal, protein, carbs, fat, profile, recipeName } = req.body;
    const cfg = await getLLMConfig();
    const { text, provider, model } = await callLLM(cfg, promptDailyRecipe(mealType, cal, protein, carbs, fat, profile, recipeName));
    const recipe = JSON.parse(text);
    res.json({ recipe, mealType, _meta: { provider, model, latency_ms: Date.now() - t0 } });
  } catch (err) {
    console.error('Erro generate-recipe:', err.message);
    res.status(502).json({ error: 'Falha ao gerar receita com IA.', detail: err.message });
  }
});

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

    const dayNames = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
    const mappedDays = [];

    for (let i = 0; i < plans.length; i++) {
      const p = plans[i];
      const recipeId = Math.floor(100000 + Math.random() * 900000); // 6-digit random ID
      
      const mappedIngredients = (p.ingredients || []).map(ing => ({
        name: ing.name,
        quantity: `${ing.amount || ''} ${ing.unit || ''}`.trim()
      }));

      const mappedSteps = typeof p.directions === 'string'
        ? p.directions.split('\n').map(s => s.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)
        : (Array.isArray(p.directions) ? p.directions : [String(p.directions)]);

      const recipeDetail = {
        id: recipeId,
        name: p.name || 'Receita Saudável',
        description: `Receita para o dia ${p.day || (i + 1)} do cardápio semanal.`,
        calories: parseInt(p.calories) || cal,
        protein: parseInt(p.protein) || prot,
        carbs: parseInt(p.carbs) || carb,
        fats: parseInt(p.fat || p.fats) || fat,
        prep_time: parseInt(p.time_min) || 20,
        servings: 1,
        difficulty: 'Fácil',
        ingredients: mappedIngredients,
        steps: mappedSteps
      };

      // Save to ai_recipes
      await db.query(
        `INSERT INTO ai_recipes (id, user_id, type, name, data)
         VALUES ($1, $2, $3, $4, $5)`,
        [recipeId, req.user.id, mealType, recipeDetail.name, JSON.stringify(recipeDetail)]
      );

      // Create Day entry
      const dayName = dayNames[i] || dayNames[p.day - 1] || 'segunda';
      mappedDays.push({
        day: dayName,
        total_calories: recipeDetail.calories,
        meals: [
          {
            type: MEAL_LABELS[mealType] || 'Refeição principal',
            name: recipeDetail.name,
            calories: recipeDetail.calories,
            protein: recipeDetail.protein,
            carbs: recipeDetail.carbs,
            fats: recipeDetail.fats,
            recipe_id: recipeId
          }
        ]
      });
    }

    // Save weekly plan to database
    await db.query(
      `UPDATE weekly_plans SET is_active = FALSE 
       WHERE patient_id = $1 AND professional_id IS NULL`,
      [req.user.id]
    );

    await db.query(
      `INSERT INTO weekly_plans (professional_id, patient_id, name, plan_data, is_active)
       VALUES (NULL, $1, $2, $3, TRUE)`,
      [req.user.id, 'Cardápio Semanal IA', JSON.stringify({ days: mappedDays })]
    );

    res.json({ plans: { days: mappedDays }, mealType, _meta: { provider, model, latency_ms: Date.now() - t0 } });
  } catch (err) {
    console.error('Erro generate-weekly:', err.message);
    res.status(502).json({ error: 'Falha ao gerar plano semanal com IA.', detail: err.message });
  }
});

// POST /api/ai/analyze-body
router.post('/analyze-body', authenticateToken, async (req, res) => {
  const t0 = Date.now();
  try {
    const { image, height_cm } = req.body;
    if (!image) return res.status(400).json({ error: 'Imagem base64 obrigatória.' });
    if (!height_cm || isNaN(parseFloat(height_cm))) {
      return res.status(400).json({ error: 'Altura em cm obrigatória para calibrar as estimativas.' });
    }
    const cfg = await getLLMConfig();
    const { text, provider, model } = await callLLM(cfg, promptAnalyzeBody(parseFloat(height_cm)), image);
    const result = JSON.parse(text);
    result._meta = { provider, model, latency_ms: Date.now() - t0 };
    res.json(result);
  } catch (err) {
    console.error('Erro analyze-body:', err.message);
    res.status(502).json({ error: 'Falha ao analisar foto corporal com IA.', detail: err.message });
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

// POST /api/ai/scan-nutrition-label — lê tabela nutricional de uma ou duas fotos
// Aceita: { image: "base64" }  OU  { images: ["base64_frente", "base64_tabela"] }
router.post('/scan-nutrition-label', authenticateToken, async (req, res) => {
  const t0 = Date.now();
  try {
    // Normaliza para array; suporta envio legado com campo "image"
    let images = req.body.images || (req.body.image ? [req.body.image] : []);
    images = images.filter(Boolean);
    if (!images.length) return res.status(400).json({ error: 'Ao menos uma imagem base64 obrigatória.' });
    const image = images; // repassa array para callLLM → callGemini

    const nImgs  = images.length;
    const imgCtx = nImgs > 1
        ? 'Você receberá DUAS imagens: a primeira é a frente da embalagem (nome, marca, sabor, variante) e a segunda é o quadro de informações nutricionais.'
        : 'Você receberá UMA imagem de um rótulo ou tabela nutricional.';

    const prompt = `Você é um sistema de extração de dados nutricionais. ${imgCtx}

Analise TODAS as imagens fornecidas e extraia as informações completas do produto.

Retorne SOMENTE um JSON válido com a seguinte estrutura (sem markdown, sem explicações):
{
  "name": "nome completo do produto incluindo marca, sabor e variante (ex: Requeijão Cremoso Light Vigor), se visível, senão null",
  "category": "categoria do alimento em português (ex: Laticínios, Grãos e Cereais, Carnes, Bebidas, Biscoitos, Massas, Temperos, Frutas, Vegetais, Suplementos, Industrializados), senão null",
  "portion_grams": porção de referência em gramas (número),
  "energy_kcal_100g": kcal por 100g (número),
  "energy_kcal_portion": kcal por porção (número ou null),
  "protein_g": proteínas por 100g (número),
  "fat_g": lipídios/gorduras totais por 100g (número),
  "saturated_fat_g": gordura saturada por 100g (número ou null),
  "trans_fat_g": gordura trans por 100g (número ou null),
  "carbs_g": carboidratos totais por 100g (número),
  "fiber_g": fibra alimentar por 100g (número ou null),
  "sodium_mg": sódio em mg por 100g (número ou null),
  "calcium_mg": cálcio em mg por 100g (número ou null),
  "iron_mg": ferro em mg por 100g (número ou null),
  "measures": [
    { "label": "descrição da medida caseira (ex: 1 colher de sopa, 1 xícara, 1 unidade, 1 fatia, 1 porção)", "grams": equivalência em gramas (número) }
  ]
}

IMPORTANTE:
- Normalize TODOS os valores nutricionais para por 100g. Se o rótulo mostrar valores por porção, converta usando: valor_100g = (valor_porção / portion_grams) * 100
- Para "measures": extraia TODAS as medidas caseiras visíveis no rótulo (ex: "Porção: 1 colher de sopa (30g)" → { label: "1 colher de sopa", grams: 30 }). Sempre inclua também a porção principal. Se não houver medidas caseiras, retorne array vazio [].
- Se um campo nutricional não estiver visível, use null.`;

    const cfg = await getLLMConfig();
    const { text, provider, model } = await callLLM(cfg, prompt, image);
    const result = JSON.parse(extractJson(text));
    result._meta = { provider, model, latency_ms: Date.now() - t0 };
    res.json(result);
  } catch (err) {
    console.error('Erro scan-nutrition-label:', err.message);
    res.status(502).json({ error: 'Falha ao analisar tabela nutricional.', detail: err.message });
  }
});

// POST /api/ai/from-url — extrai informações nutricionais de uma URL de produto
router.post('/from-url', authenticateToken, async (req, res) => {
  const t0 = Date.now();
  try {
    const { url } = req.body;
    if (!url || !url.startsWith('http')) return res.status(400).json({ error: 'URL inválida.' });

    // 1. Busca o HTML da página
    const pageRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      redirect: 'follow',
    });
    if (!pageRes.ok) throw new Error(`HTTP ${pageRes.status} ao buscar a URL.`);
    const html = await pageRes.text();

    // 2. Extrai conteúdo relevante do HTML
    const content = _extractPageContent(html, url);
    if (!content || content.length < 50) throw new Error('Não foi possível extrair conteúdo da página.');

    // 3. Envia ao LLM
    const cfg = await getLLMConfig();
    const prompt = `Você é um sistema de extração de dados de produtos alimentícios.

Analise o conteúdo HTML/texto abaixo de uma página de produto de supermercado e extraia as informações nutricionais.

CONTEÚDO DA PÁGINA:
---
${content}
---

Retorne SOMENTE um JSON válido com a seguinte estrutura (sem markdown, sem explicações):
{
  "name": "nome completo do produto incluindo marca, sabor e variante",
  "category": "categoria do alimento em português (ex: Laticínios, Grãos e Cereais, Pães, Bebidas, Carnes, Industrializados, etc.)",
  "portion_grams": porção de referência em gramas (número),
  "energy_kcal_100g": kcal por 100g (número),
  "energy_kcal_portion": kcal por porção (número ou null),
  "protein_g": proteínas por 100g (número),
  "fat_g": lipídios/gorduras totais por 100g (número),
  "saturated_fat_g": gordura saturada por 100g (número ou null),
  "trans_fat_g": gordura trans por 100g (número ou null),
  "carbs_g": carboidratos totais por 100g (número),
  "fiber_g": fibra alimentar por 100g (número ou null),
  "sodium_mg": sódio em mg por 100g (número ou null),
  "calcium_mg": cálcio em mg por 100g (número ou null),
  "iron_mg": ferro em mg por 100g (número ou null),
  "measures": [ { "label": "descrição da medida (ex: 1 unidade, 1 fatia, 1 colher de sopa)", "grams": equivalência em gramas } ]
}

IMPORTANTE: Normalize todos os valores para 100g. Se algum campo não estiver disponível na página, use null.`;

    const { text, provider, model } = await callLLM(cfg, prompt);
    const result = JSON.parse(extractJson(text));
    result._meta = { provider, model, latency_ms: Date.now() - t0, source: 'url' };
    res.json(result);

  } catch (err) {
    console.error('Erro from-url:', err.message);
    res.status(502).json({ error: err.message || 'Falha ao extrair dados da URL.' });
  }
});

// Extrai texto relevante do HTML para não ultrapassar o contexto do LLM
function _extractPageContent(html, url) {
  // 1. Tenta extrair JSON-LD (structured data)
  const jsonLdMatches = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || [];
  const jsonLdTexts   = jsonLdMatches.map(m => m.replace(/<[^>]+>/g, '').trim()).join('\n');

  // 2. Remove tags desnecessárias
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // 3. Encontra a seção de informações nutricionais
  const keywords = ['nutricional', 'nutrição', 'nutrientes', 'porção', 'calorias', 'proteínas', 'carboidratos', 'lipídios', 'sódio', 'gordura'];
  let bestIdx = -1, bestScore = 0;
  for (const kw of keywords) {
    let idx = 0;
    while ((idx = text.toLowerCase().indexOf(kw, idx)) !== -1) {
      // conta quantas keywords estão próximas
      const window = text.slice(Math.max(0, idx - 500), idx + 1000).toLowerCase();
      const score  = keywords.filter(k => window.includes(k)).length;
      if (score > bestScore) { bestScore = score; bestIdx = idx; }
      idx++;
    }
  }

  // 4. Extrai janela ao redor da seção nutricional + início da página (nome do produto)
  const pageStart   = text.slice(0, 600);
  const nutritional = bestIdx > -1 ? text.slice(Math.max(0, bestIdx - 200), bestIdx + 2000) : text.slice(0, 3000);

  return `URL: ${url}\n\nJSON-LD ESTRUTURADO:\n${jsonLdTexts.slice(0, 1500)}\n\nINÍCIO DA PÁGINA:\n${pageStart}\n\nSEÇÃO NUTRICIONAL:\n${nutritional}`.slice(0, 8000);
}

// POST /api/ai/substitute-food — sugere substitutos equivalentes para um alimento (Fase 5)
router.post('/substitute-food', authenticateToken, async (req, res) => {
  const t0 = Date.now();
  try {
    const { food, meal, role, kcal, restrictions } = req.body || {};
    if (!food) return res.status(400).json({ error: 'Alimento obrigatório.' });

    const prompt = `Você é nutricionista brasileiro. Sugira 5 substitutos COMUNS e de fácil acesso no Brasil para o alimento abaixo, equivalentes nutricionalmente (mesmo papel na refeição e calorias aproximadas) e culturalmente adequados à refeição indicada.

Alimento atual: ${food}
Refeição: ${meal || 'não informada'}
Papel: ${role || 'não informado'}
Calorias aproximadas da porção: ${kcal ? Math.round(kcal) + ' kcal' : 'não informada'}
${restrictions ? 'Restrições do paciente (NÃO sugerir): ' + restrictions : ''}

Retorne SOMENTE JSON válido (sem markdown):
{"substitutes":[{"name":"nome do alimento","portion":"porção caseira sugerida (ex: 2 fatias, 1 concha)","why":"motivo curto da equivalência"}]}`;

    const cfg = await getLLMConfig();
    const { text, provider, model } = await callLLM(cfg, prompt);
    const result = JSON.parse(extractJson(text));
    result._meta = { provider, model, latency_ms: Date.now() - t0 };
    res.json(result);
  } catch (err) {
    console.error('substitute-food:', err.message);
    res.status(502).json({ error: 'Falha ao sugerir substitutos com IA.', detail: err.message });
  }
});

router.getLLMConfig = getLLMConfig;
router.callLLM = callLLM;
router.extractJson = extractJson;

module.exports = router;
