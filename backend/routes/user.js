const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Todos os endpoints neste roteador exigem login JWT válido
router.use(authenticateToken);

// ==========================================
// 1. PERFIL DO USUÁRIO
// ==========================================
router.get('/profile', async (req, res) => {
  try {
    const profileRes = await db.query('SELECT * FROM profiles WHERE user_id = $1', [req.user.id]);
    
    // Carrega a chave de API global do Gemini
    const geminiKeyRes = await db.query("SELECT value FROM system_settings WHERE key = 'gemini_api_key'");
    const geminiApiKey = geminiKeyRes.rows[0] ? geminiKeyRes.rows[0].value : '';

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        plan: req.user.plan,
        trial_expires_at: req.user.trial_expires_at,
        premium_expires_at: req.user.premium_expires_at,
        isPremiumActive: req.user.isPremiumActive
      },
      profile: profileRes.rows[0] || null,
      geminiApiKey
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
});

router.post('/profile', async (req, res) => {
  const {
    gender, age, weight, height, activity, goal,
    goal_weight, speed, target_calories, target_protein, target_carbs, target_fat
  } = req.body;

  try {
    // Insere ou atualiza o perfil (UPSERT)
    await db.query(`
      INSERT INTO profiles (
        user_id, gender, age, weight, height, activity, goal, 
        goal_weight, speed, target_calories, target_protein, target_carbs, target_fat, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        gender = EXCLUDED.gender,
        age = EXCLUDED.age,
        weight = EXCLUDED.weight,
        height = EXCLUDED.height,
        activity = EXCLUDED.activity,
        goal = EXCLUDED.goal,
        goal_weight = EXCLUDED.goal_weight,
        speed = EXCLUDED.speed,
        target_calories = EXCLUDED.target_calories,
        target_protein = EXCLUDED.target_protein,
        target_carbs = EXCLUDED.target_carbs,
        target_fat = EXCLUDED.target_fat,
        updated_at = NOW()
    `, [
      req.user.id, gender, age, weight, height, activity, goal,
      goal_weight, speed, target_calories, target_protein, target_carbs, target_fat
    ]);

    // Atualiza opcionalmente o peso base na tabela principal do usuário se necessário, ou mantém apenas em profiles
    const updatedProfile = await db.query('SELECT * FROM profiles WHERE user_id = $1', [req.user.id]);
    res.json(updatedProfile.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar perfil.' });
  }
});

// ==========================================
// 2. DIÁRIO DE REFEIÇÕES
// ==========================================
router.get('/meals', async (req, res) => {
  try {
    // Retorna todas as refeições (pode ser paginado ou filtrado por data no futuro)
    const mealsRes = await db.query('SELECT * FROM meals WHERE user_id = $1 ORDER BY date DESC, time DESC', [req.user.id]);
    res.json(mealsRes.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar refeições.' });
  }
});

router.post('/meals', async (req, res) => {
  const { id, date, time, name, items, total } = req.body;

  if (!id || !date || !time || !name || !items || !total) {
    return res.status(400).json({ error: 'Dados da refeição incompletos.' });
  }

  try {
    const mealRes = await db.query(`
      INSERT INTO meals (id, user_id, date, time, name, items, total)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        date = EXCLUDED.date,
        time = EXCLUDED.time,
        name = EXCLUDED.name,
        items = EXCLUDED.items,
        total = EXCLUDED.total
      RETURNING *
    `, [id, req.user.id, date, time, name, JSON.stringify(items), JSON.stringify(total)]);

    res.status(201).json(mealRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar refeição.' });
  }
});

router.delete('/meals/:id', async (req, res) => {
  try {
    const checkMeal = await db.query('SELECT user_id FROM meals WHERE id = $1', [req.params.id]);
    if (checkMeal.rows.length === 0) {
      return res.status(404).json({ error: 'Refeição não encontrada.' });
    }

    if (checkMeal.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Não autorizado.' });
    }

    await db.query('DELETE FROM meals WHERE id = $1', [req.params.id]);
    res.json({ message: 'Refeição excluída com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir refeição.' });
  }
});

// ==========================================
// 3. RASTREADOR DE ÁGUA
// ==========================================
router.get('/water', async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  try {
    const waterRes = await db.query('SELECT * FROM water_log WHERE user_id = $1 AND date = $2', [req.user.id, date]);
    res.json(waterRes.rows[0] || { consumed: 0, target: 2500, date });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar hidratação.' });
  }
});

router.post('/water', async (req, res) => {
  const { date, consumed, target } = req.body;
  if (!date || consumed === undefined || target === undefined) {
    return res.status(400).json({ error: 'Parâmetros de hidratação inválidos.' });
  }

  try {
    const waterRes = await db.query(`
      INSERT INTO water_log (user_id, date, consumed, target)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, date) DO UPDATE SET
        consumed = EXCLUDED.consumed,
        target = EXCLUDED.target
      RETURNING *
    `, [req.user.id, date, consumed, target]);

    res.json(waterRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar hidratação.' });
  }
});

// ==========================================
// 4. JEJUM INTERMITENTE
// ==========================================
router.get('/fasting', async (req, res) => {
  try {
    const fastingRes = await db.query(
      'SELECT * FROM fasting_log WHERE user_id = $1 AND active = true ORDER BY start_time DESC LIMIT 1',
      [req.user.id]
    );
    res.json(fastingRes.rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar jejum.' });
  }
});

router.post('/fasting', async (req, res) => {
  const { start_time, duration_goal, active } = req.body;

  try {
    if (active === false) {
      // Finaliza jejum ativo
      await db.query('UPDATE fasting_log SET active = false WHERE user_id = $1 AND active = true', [req.user.id]);
      res.json({ message: 'Jejum finalizado.' });
    } else {
      // Inicia novo jejum (e garante que fecha jejuns antigos)
      await db.query('UPDATE fasting_log SET active = false WHERE user_id = $1 AND active = true', [req.user.id]);
      const newFasting = await db.query(`
        INSERT INTO fasting_log (user_id, start_time, duration_goal, active)
        VALUES ($1, $2, $3, true) RETURNING *
      `, [req.user.id, new_time = start_time || new Date(), duration_goal || 14]);

      res.json(newFasting.rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar estado de jejum.' });
  }
});

// ==========================================
// 5. RECEITAS GERADAS POR IA
// ==========================================
router.get('/recipes', async (req, res) => {
  try {
    const recipesRes = await db.query('SELECT * FROM ai_recipes WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(recipesRes.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar receitas salvas.' });
  }
});

router.post('/recipes', async (req, res) => {
  const { id, type, name, data } = req.body;

  if (!id || !type || !name || !data) {
    return res.status(400).json({ error: 'Dados da receita incompletos.' });
  }

  try {
    const recipeRes = await db.query(`
      INSERT INTO ai_recipes (id, user_id, type, name, data)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        data = EXCLUDED.data
      RETURNING *
    `, [id, req.user.id, type, name, JSON.stringify(data)]);

    res.status(201).json(recipeRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar receita de IA.' });
  }
});

// ==========================================
// 6. DETALHES DE ASSINATURA E GATEWAYS
// ==========================================
// Retorna a lista de profissionais disponíveis no sistema para o usuário vincular
router.get('/available-professionals', async (req, res) => {
  if (!req.user.isPremiumActive) {
    return res.status(403).json({ error: 'Acesso restrito a usuários premium.' });
  }
  try {
    const pros = await db.query(
      'SELECT id, name, role FROM users WHERE role IN (\'nutritionist\', \'trainer\') ORDER BY name ASC'
    );
    res.json(pros.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar profissionais.' });
  }
});

// Vincula o usuário ao profissional selecionado
router.post('/link-professional', async (req, res) => {
  if (!req.user.isPremiumActive) {
    return res.status(403).json({ error: 'Acesso restrito a usuários premium.' });
  }
  const { professional_id, type } = req.body; // type: 'nutritionist' ou 'trainer'

  if (!professional_id || !type || !['nutritionist', 'trainer'].includes(type)) {
    return res.status(400).json({ error: 'ID do profissional ou tipo inválido.' });
  }

  try {
    // Insere ou atualiza o vínculo (Paciente -> Profissional)
    await db.query(`
      INSERT INTO professional_links (user_id, professional_id, type)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, type) DO UPDATE SET
        professional_id = EXCLUDED.professional_id
    `, [req.user.id, professional_id, type]);

    res.json({ message: 'Profissional vinculado com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao vincular profissional.' });
  }
});

// Retorna orientações do nutricionista e personal trainer
router.get('/professional-feedbacks', async (req, res) => {
  try {
    const feedbackRes = await db.query(
      `SELECT m.*, u.name as professional_name 
       FROM professional_messages m 
       JOIN users u ON m.professional_id = u.id 
       WHERE m.user_id = $1 
       ORDER BY m.created_at DESC`,
      [req.user.id]
    );
    res.json(feedbackRes.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar feedbacks de profissionais.' });
  }
});

module.exports = router;
