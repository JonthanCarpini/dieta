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
        isPremiumActive: req.user.isPremiumActive,
        isPlanExpired: req.user.isPlanExpired,
        has_nutritionist: req.user.has_nutritionist,
        has_trainer: req.user.has_trainer,
        max_nutritionist_appointments_per_month: req.user.max_nutritionist_appointments_per_month,
        max_trainer_appointments_per_month: req.user.max_trainer_appointments_per_month
      },
      profile: profileRes.rows[0] || null,
      geminiApiKey
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
});

const saveProfileHandler = async (req, res) => {
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
};

router.post('/profile', saveProfileHandler);
router.put('/profile', saveProfileHandler);

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

// Buscar detalhes de uma receita por ID
router.get('/recipes/:id', async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    const result = await db.query('SELECT * FROM ai_recipes WHERE id = $1', [recipeId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receita não encontrada.' });
    }
    const row = result.rows[0];
    const recipeData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    res.json({
      id: row.id,
      name: row.name,
      ...recipeData
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar receita.' });
  }
});

// Buscar plano semanal de IA do paciente
router.get('/meal-plan/weekly', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM weekly_plans 
       WHERE patient_id = $1 AND professional_id IS NULL AND is_active = TRUE
       ORDER BY updated_at DESC
       LIMIT 1`,
      [req.user.id]
    );
    if (result.rows.length === 0) return res.json(null);
    const row = result.rows[0];
    const planData = typeof row.plan_data === 'string' ? JSON.parse(row.plan_data) : row.plan_data;
    res.json(planData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar cardápio semanal da IA.' });
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

// Retorna os profissionais vinculados atualmente ao usuário logado
router.get('/linked-professionals', async (req, res) => {
  if (!req.user.isPremiumActive) {
    return res.status(403).json({ error: 'Acesso restrito a usuários premium.' });
  }
  try {
    const linked = await db.query(
      `SELECT l.type, u.id, u.name, u.email, u.role
       FROM professional_links l
       JOIN users u ON l.professional_id = u.id
       WHERE l.user_id = $1`,
      [req.user.id]
    );
    res.json(linked.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar profissionais vinculados.' });
  }
});

// Vincular profissional (nutricionista ou personal trainer)
router.post('/link-professional', async (req, res) => {
  if (req.user.isPlanExpired) {
    return res.status(403).json({ error: 'Sua assinatura expirou. Renove seu plano para continuar vinculando profissionais.' });
  }

  const { professional_id, type } = req.body;

  if (!professional_id || !type || !['nutritionist', 'trainer'].includes(type)) {
    return res.status(400).json({ error: 'ID do profissional ou tipo inválido.' });
  }

  // Valida direitos do plano do usuário
  if (type === 'nutritionist' && !req.user.has_nutritionist) {
    return res.status(403).json({ error: 'Seu plano atual não dá direito a acompanhamento com Nutricionista.' });
  }
  if (type === 'trainer' && !req.user.has_trainer) {
    return res.status(403).json({ error: 'Seu plano atual não dá direito a acompanhamento com Personal Trainer.' });
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

// ==========================================
// 7. CONSULTAS E AGENDAMENTOS (VIDEO CHAMADAS)
// ==========================================

// Retorna a disponibilidade de um profissional específico
router.get('/professionals/:id/availability', async (req, res) => {
  if (req.user.isPlanExpired) {
    return res.status(403).json({ error: 'Sua assinatura expirou.' });
  }
  const professionalId = parseInt(req.params.id);
  try {
    const profRes = await db.query('SELECT role FROM users WHERE id = $1', [professionalId]);
    if (profRes.rows.length === 0) {
      return res.status(404).json({ error: 'Profissional não encontrado.' });
    }
    const role = profRes.rows[0].role;
    if (role === 'nutritionist' && !req.user.has_nutritionist) {
      return res.status(403).json({ error: 'Acesso restrito. Seu plano não dá direito a Nutricionista.' });
    }
    if (role === 'trainer' && !req.user.has_trainer) {
      return res.status(403).json({ error: 'Acesso restrito. Seu plano não dá direito a Personal Trainer.' });
    }

    const availability = await db.query(
      'SELECT * FROM professional_availability WHERE professional_id = $1 AND active = true ORDER BY day_of_week, start_time',
      [professionalId]
    );
    res.json(availability.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar disponibilidade do profissional.' });
  }
});

// Obter consultas agendadas de um profissional em uma data específica (horários ocupados)
router.get('/professionals/:id/busy-slots', async (req, res) => {
  if (req.user.isPlanExpired) {
    return res.status(403).json({ error: 'Sua assinatura expirou.' });
  }
  const professionalId = parseInt(req.params.id);
  const { date } = req.query; // YYYY-MM-DD

  if (!date) {
    return res.status(400).json({ error: 'Data não informada.' });
  }

  try {
    const result = await db.query(
      `SELECT start_time, end_time FROM appointments 
       WHERE professional_id = $1 
         AND appointment_date = $2 
         AND status = 'scheduled'
       ORDER BY start_time`,
      [professionalId, date]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar horários ocupados do profissional.' });
  }
});

// Obter horários disponíveis de um profissional em uma data específica
router.get('/appointments/available', async (req, res) => {
  if (req.user.isPlanExpired) {
    return res.status(403).json({ error: 'Sua assinatura expirou.' });
  }

  let professionalId = req.query.professional_id;
  const { date } = req.query; // YYYY-MM-DD

  if (!date) {
    return res.status(400).json({ error: 'Data é obrigatória.' });
  }

  try {
    if (!professionalId) {
      // Busca nutricionista vinculado ao usuário
      const linkRes = await db.query(
        "SELECT professional_id FROM professional_links WHERE user_id = $1 AND type = 'nutritionist'",
        [req.user.id]
      );
      if (linkRes.rows.length === 0) {
        // Fallback para qualquer profissional vinculado
        const fallbackRes = await db.query(
          "SELECT professional_id FROM professional_links WHERE user_id = $1 LIMIT 1",
          [req.user.id]
        );
        if (fallbackRes.rows.length === 0) {
          return res.json({ date, slots: [] });
        }
        professionalId = fallbackRes.rows[0].professional_id;
      } else {
        professionalId = linkRes.rows[0].professional_id;
      }
    }

    // Calcula dia da semana
    const dateParts = date.split('-');
    const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    const dayOfWeek = dateObj.getDay();

    // Busca disponibilidade cadastrada pelo profissional
    const availabilityRes = await db.query(
      `SELECT start_time, end_time FROM professional_availability
       WHERE professional_id = $1 AND day_of_week = $2 AND active = true
       ORDER BY start_time`,
      [professionalId, dayOfWeek]
    );

    // Busca agendamentos de consulta já agendados
    const appointmentsRes = await db.query(
      `SELECT start_time, end_time FROM appointments
       WHERE professional_id = $1 AND appointment_date = $2 AND status = 'scheduled'`,
      [professionalId, date]
    );

    const normalizeTime = t => (t || '').substring(0, 5);

    // Validação de horário no passado baseado em América/Sao_Paulo (Horário de Brasília)
    const nowSaoPaulo = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const year = nowSaoPaulo.getFullYear();
    const month = String(nowSaoPaulo.getMonth() + 1).padStart(2, '0');
    const day = String(nowSaoPaulo.getDate()).padStart(2, '0');
    const currentDateSP = `${year}-${month}-${day}`;
    
    const hours = String(nowSaoPaulo.getHours()).padStart(2, '0');
    const minutes = String(nowSaoPaulo.getMinutes()).padStart(2, '0');
    const currentTimeSP = `${hours}:${minutes}`;

    const slots = availabilityRes.rows.map(slot => {
      const startTime = normalizeTime(slot.start_time);
      const endTime = normalizeTime(slot.end_time);

      let isPast = false;
      if (date < currentDateSP) {
        isPast = true;
      } else if (date === currentDateSP && startTime <= currentTimeSP) {
        isPast = true;
      }

      const isBooked = appointmentsRes.rows.some(appt => {
        const apptStart = normalizeTime(appt.start_time);
        const apptEnd = normalizeTime(appt.end_time);
        return startTime < apptEnd && endTime > apptStart;
      });

      return {
        time: startTime,
        endTime: endTime,
        available: !isBooked && !isPast
      };
    });

    res.json({ date, slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar horários disponíveis.' });
  }
});

// Agendar consulta (video chamada)
router.post('/appointments', async (req, res) => {
  if (req.user.isPlanExpired) {
    return res.status(403).json({ error: 'Sua assinatura expirou. Renove seu plano para agendar consultas.' });
  }

  const { professional_id, appointment_date, start_time, end_time } = req.body;

  if (!professional_id || !appointment_date || !start_time || !end_time) {
    return res.status(400).json({ error: 'Dados do agendamento incompletos.' });
  }

  // Validação de data/hora futuras de acordo com o Horário de Brasília (America/Sao_Paulo)
  const nowSaoPaulo = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const year = nowSaoPaulo.getFullYear();
  const month = String(nowSaoPaulo.getMonth() + 1).padStart(2, '0');
  const day = String(nowSaoPaulo.getDate()).padStart(2, '0');
  const currentDateSP = `${year}-${month}-${day}`;
  
  const hours = String(nowSaoPaulo.getHours()).padStart(2, '0');
  const minutes = String(nowSaoPaulo.getMinutes()).padStart(2, '0');
  const currentTimeSP = `${hours}:${minutes}`;

  if (appointment_date < currentDateSP) {
    return res.status(400).json({ error: 'Não é possível agendar consultas em datas passadas de acordo com o Horário de Brasília.' });
  }

  if (appointment_date === currentDateSP && start_time <= currentTimeSP) {
    return res.status(400).json({ error: 'Não é possível agendar consultas em horários passados de acordo com o Horário de Brasília.' });
  }

  try {
    // 1. Validar se o profissional existe e tem cargo aceitável
    const profRes = await db.query('SELECT id, name, role FROM users WHERE id = $1', [professional_id]);
    if (profRes.rows.length === 0 || !['nutritionist', 'trainer'].includes(profRes.rows[0].role)) {
      return res.status(400).json({ error: 'Profissional inválido ou não encontrado.' });
    }

    const professional = profRes.rows[0];

    // Verificar se o usuário tem direito de agendar com este tipo de profissional no seu plano
    if (professional.role === 'nutritionist' && !req.user.has_nutritionist) {
      return res.status(403).json({ error: 'Seu plano atual não dá direito a consultas com Nutricionista.' });
    }
    if (professional.role === 'trainer' && !req.user.has_trainer) {
      return res.status(403).json({ error: 'Seu plano atual não dá direito a consultas com Personal Trainer.' });
    }

    // Verificar limite mensal de consultas
    const limit = professional.role === 'nutritionist' 
      ? req.user.max_nutritionist_appointments_per_month 
      : req.user.max_trainer_appointments_per_month;

    const countRes = await db.query(
      `SELECT COUNT(*) as count FROM appointments a
       JOIN users u ON a.professional_id = u.id
       WHERE a.patient_id = $1 
         AND u.role = $2
         AND a.status != 'cancelled'
         AND DATE_TRUNC('month', a.appointment_date) = DATE_TRUNC('month', CURRENT_DATE)`,
      [req.user.id, professional.role]
    );

    const appointmentsCount = parseInt(countRes.rows[0].count);
    if (appointmentsCount >= limit) {
      return res.status(400).json({ 
        error: `Você atingiu o limite de consultas mensais (${limit}) para este tipo de profissional no seu plano atual.` 
      });
    }

    // 2. Verificar se o paciente está de fato vinculado a este profissional
    const linkCheck = await db.query(
      'SELECT id FROM professional_links WHERE user_id = $1 AND professional_id = $2',
      [req.user.id, professional_id]
    );
    if (linkCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Você só pode agendar consultas com profissionais vinculados ao seu perfil.' });
    }

    // 3. Validar se o dia da semana está dentro da disponibilidade
    const dateParts = appointment_date.split('-');
    const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    const dayOfWeek = dateObj.getDay();

    // Buscar disponibilidade para este dia da semana
    const availabilityRes = await db.query(
      `SELECT * FROM professional_availability 
       WHERE professional_id = $1 AND day_of_week = $2 AND active = true`,
      [professional_id, dayOfWeek]
    );

    if (availabilityRes.rows.length === 0) {
      return res.status(400).json({ error: 'O profissional não atende neste dia da semana.' });
    }

    // Validar se o horário solicitado está contido em alguma faixa de atendimento disponível.
    // Normaliza para HH:MM pois o PostgreSQL retorna time como "HH:MM:SS".
    const normalizeTime = t => (t || '').substring(0, 5);
    const reqStart = normalizeTime(start_time);
    const reqEnd   = normalizeTime(end_time);

    const isWithinSlot = availabilityRes.rows.some(slot => {
      const slotStart = normalizeTime(slot.start_time);
      const slotEnd   = normalizeTime(slot.end_time);
      return reqStart >= slotStart && reqEnd <= slotEnd && reqStart < reqEnd;
    });

    if (!isWithinSlot) {
      return res.status(400).json({ error: 'O horário solicitado está fora do período de atendimento configurado pelo profissional.' });
    }

    // 4. Verificar conflito de horários (se o profissional já possui agendamento ativo nessa data e horário sobreposto)
    const conflictRes = await db.query(
      `SELECT id FROM appointments 
       WHERE professional_id = $1 
         AND appointment_date = $2 
         AND status = 'scheduled'
         AND (
           (start_time <= $3 AND end_time > $3) OR
           (start_time < $4 AND end_time >= $4) OR
           (start_time >= $3 AND end_time <= $4)
         )`,
      [professional_id, appointment_date, start_time, end_time]
    );

    if (conflictRes.rows.length > 0) {
      return res.status(400).json({ error: 'Este horário já está reservado por outro paciente.' });
    }

    // 5. Gerar link único do Jitsi Meet
    const timestamp = Date.now();
    const videoRoom = `nutrir-consultation-${req.user.id}-${professional_id}-${timestamp}`;
    const videoLink = `https://meet.jit.si/${videoRoom}#config.disableDeepLinking=true`;

    // 6. Inserir no banco
    const newAppointment = await db.query(
      `INSERT INTO appointments (patient_id, professional_id, appointment_date, start_time, end_time, video_link)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, professional_id, appointment_date, start_time, end_time, videoLink]
    );

    res.status(201).json({
      message: 'Consulta agendada com sucesso.',
      appointment: newAppointment.rows[0],
      professionalName: professional.name
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao agendar consulta.' });
  }
});

// Listar consultas do paciente
router.get('/appointments', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, u.name as professional_name, u.role as professional_role
       FROM appointments a
       JOIN users u ON a.professional_id = u.id
       WHERE a.patient_id = $1
       ORDER BY a.appointment_date DESC, a.start_time DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar consultas.' });
  }
});

// Cancelar consulta pelo paciente
router.post('/appointments/:id/cancel', async (req, res) => {
  const appointmentId = parseInt(req.params.id);
  try {
    const checkRes = await db.query(
      'SELECT patient_id FROM appointments WHERE id = $1',
      [appointmentId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    if (checkRes.rows[0].patient_id !== req.user.id) {
      return res.status(403).json({ error: 'Não autorizado a cancelar esta consulta.' });
    }

    const updated = await db.query(
      "UPDATE appointments SET status = 'cancelled' WHERE id = $1 RETURNING *",
      [appointmentId]
    );

    res.json({ message: 'Consulta cancelada com sucesso.', appointment: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cancelar consulta.' });
  }
});

// ==========================================
// 8. HISTÓRICO DE PESO (ÁREA EVOLUTIVA)
// ==========================================

// Salvar ou atualizar peso
router.post('/weight-log', async (req, res) => {
  const { weight, date } = req.body;

  if (weight === undefined || isNaN(parseFloat(weight))) {
    return res.status(400).json({ error: 'Peso inválido ou não informado.' });
  }

  // Define data padrão como hoje (formato YYYY-MM-DD) no fuso America/Sao_Paulo
  let targetDate = date;
  if (!targetDate) {
    const nowSaoPaulo = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const year = nowSaoPaulo.getFullYear();
    const month = String(nowSaoPaulo.getMonth() + 1).padStart(2, '0');
    const day = String(nowSaoPaulo.getDate()).padStart(2, '0');
    targetDate = `${year}-${month}-${day}`;
  }

  try {
    // 1. Salvar ou atualizar na tabela weight_log
    const logRes = await db.query(`
      INSERT INTO weight_log (user_id, weight, date)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, date) DO UPDATE SET
        weight = EXCLUDED.weight
      RETURNING *
    `, [req.user.id, parseFloat(weight), targetDate]);

    // 2. Atualizar peso atual na tabela profiles
    // Só atualizamos se for a data mais recente ou hoje para manter coerência
    const maxDateRes = await db.query(`
      SELECT MAX(date) as max_date FROM weight_log WHERE user_id = $1
    `, [req.user.id]);
    
    const maxDate = maxDateRes.rows[0].max_date;
    // Se o registro inserido/atualizado for na data máxima (ou igual), atualiza profiles
    if (!maxDate || new Date(targetDate) >= new Date(maxDate)) {
      await db.query(`
        UPDATE profiles 
        SET weight = $1, updated_at = NOW() 
        WHERE user_id = $2
      `, [parseFloat(weight), req.user.id]);
    }

    res.status(201).json(logRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar peso.' });
  }
});

// Buscar histórico de peso
router.get('/weight-log', async (req, res) => {
  try {
    const historyRes = await db.query(
      "SELECT id, weight, TO_CHAR(date, 'YYYY-MM-DD') as date, created_at FROM weight_log WHERE user_id = $1 ORDER BY date ASC",
      [req.user.id]
    );
    res.json(historyRes.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar histórico de peso.' });
  }
});

// Buscar cardápio semanal ativo atribuído ao usuário pelo profissional
router.get('/weekly-plan', async (req, res) => {
  try {
    // Busca o plano mais recente (is_active=true) atribuído a este usuário
    const result = await db.query(
      `SELECT wp.*, u.name as professional_name, u.role as professional_role
       FROM weekly_plans wp
       JOIN users u ON wp.professional_id = u.id
       WHERE wp.patient_id = $1 AND wp.is_active = TRUE
       ORDER BY wp.updated_at DESC
       LIMIT 1`,
      [req.user.id]
    );
    if (result.rows.length === 0) return res.json(null);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar cardápio.' });
  }
});

// ==========================================
// 9. FICHA CLÍNICA & EXAMES LABORATORIAIS
// ==========================================
const fs = require('fs');
const path = require('path');

async function analyzeExamFile(examId, patientId, relativePath, mimeType) {
  try {
    // 1. Busca chave de API do Gemini nas configurações do sistema
    const geminiKeyRes = await db.query("SELECT value FROM system_settings WHERE key = 'gemini_api_key'");
    const apiKey = geminiKeyRes.rows[0] ? geminiKeyRes.rows[0].value : null;

    if (!apiKey) {
      console.warn('[EXAM_PARSER] Chave gemini_api_key não configurada no system_settings. Abortando análise automática.');
      return;
    }

    // 2. Lê o arquivo do disco e converte para base64
    const absolutePath = path.join(__dirname, '..', relativePath);
    if (!fs.existsSync(absolutePath)) {
      console.error(`[EXAM_PARSER] Arquivo não encontrado: ${absolutePath}`);
      return;
    }
    const fileBuffer = fs.readFileSync(absolutePath);
    const base64Data = fileBuffer.toString('base64');

    // 3. Define prompt para o Gemini
    const prompt = `Você é um assistente de nutrição e saúde especialista em interpretar laudos de exames laboratoriais.
Analise o exame fornecido (que pode estar em formato PDF ou imagem) e extraia todos os biomarcadores/valores de exames presentes nele.
Retorne SEMPRE uma resposta em formato JSON contendo um array de objetos chamado "markers".
Cada objeto no array deve conter exatamente as seguintes chaves:
- "marker_name": nome do exame/marcador (ex: "Glicose", "Colesterol Total", "Hemoglobina", etc.). Sempre padronize e limpe os nomes.
- "marker_value": o valor do resultado exatamente como consta no exame (ex: "95", "Ausente", "Negativo").
- "numeric_value": o valor numérico convertido para float/decimal caso seja um número (ex: 95.0, 1.25), ou null caso não seja um número.
- "unit": unidade de medida do marcador (ex: "mg/dL", "g/dL", "%", "U/L"), ou null se não houver.
- "reference_range": o intervalo ou valor de referência normal (ex: "70 a 99 mg/dL", "Desejável menor que 190").
- "status": a classificação do resultado com base nos valores de referência fornecidos no próprio laudo. Deve ser estritamente um destes valores: "normal", "high", "low" ou "abnormal" (para resultados qualitativos fora do normal).

Exemplo de formato esperado:
{
  "markers": [
    {
      "marker_name": "Glicose",
      "marker_value": "95",
      "numeric_value": 95.0,
      "unit": "mg/dL",
      "reference_range": "70 a 99 mg/dL",
      "status": "normal"
    }
  ]
}`;

    // 4. Executa a chamada para os candidatos de modelos do Gemini (com fallback)
    const candidates = [
      { api: 'v1beta', model: 'gemini-2.5-flash' },
      { api: 'v1beta', model: 'gemini-2.0-flash' },
      { api: 'v1beta', model: 'gemini-2.0-flash-lite' },
      { api: 'v1beta', model: 'gemini-flash-latest' }
    ];

    let parsedResult = null;
    let lastErr = null;

    for (const { api, model } of candidates) {
      const url = `https://generativelanguage.googleapis.com/${api}/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      };

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const resJson = await response.json();
          const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            parsedResult = JSON.parse(rawText);
            console.log(`[EXAM_PARSER] Gemini OK com o modelo: ${model}`);
            break;
          }
        } else {
          const errText = await response.text();
          lastErr = `HTTP ${response.status} (${model}): ${errText}`;
        }
      } catch (err) {
        lastErr = err.message;
      }
    }

    if (!parsedResult) {
      throw new Error(lastErr || 'Não foi possível obter resposta válida da IA para os modelos testados.');
    }

    const markers = parsedResult.markers || [];
    console.log(`[EXAM_PARSER] Extraídos ${markers.length} marcadores do exame ${examId}.`);

    // 5. Salva os marcadores no banco de dados
    if (markers.length > 0) {
      for (const marker of markers) {
        const numVal = marker.numeric_value !== undefined && marker.numeric_value !== null ? parseFloat(marker.numeric_value) : null;
        await db.query(`
          INSERT INTO patient_exam_markers (exam_id, patient_id, marker_name, marker_value, numeric_value, unit, reference_range, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          examId,
          patientId,
          marker.marker_name,
          marker.marker_value,
          numVal,
          marker.unit || null,
          marker.reference_range || null,
          marker.status || 'normal'
        ]);
      }

      // Dispara a geração de orientação clínica consolidada
      generateClinicalSummary(patientId).catch(e => {
        console.error('[EXAM_SUMMARY] Falha ao gerar orientação clínica após importação:', e);
      });
    }

  } catch (err) {
    console.error(`[EXAM_PARSER] Erro na análise do exame ${examId}:`, err);
  }
}

async function generateClinicalSummary(patientId) {
  try {
    // 1. Busca chave de API do Gemini
    const geminiKeyRes = await db.query("SELECT value FROM system_settings WHERE key = 'gemini_api_key'");
    const apiKey = geminiKeyRes.rows[0] ? geminiKeyRes.rows[0].value : null;

    if (!apiKey) {
      console.warn('[EXAM_SUMMARY] Chave gemini_api_key não configurada. Ignorando geração de orientação clínica.');
      return;
    }

    // 2. Busca todos os biomarcadores do paciente
    const markersRes = await db.query(
      `SELECT m.marker_name, m.marker_value, m.unit, m.reference_range, m.status, e.file_name AS exam_name, e.created_at
       FROM patient_exam_markers m
       JOIN patient_exams e ON m.exam_id = e.id
       WHERE m.patient_id = $1
       ORDER BY e.created_at DESC, m.marker_name ASC`,
      [patientId]
    );

    const markers = markersRes.rows;
    if (markers.length === 0) {
      console.log('[EXAM_SUMMARY] Nenhum marcador disponível para gerar orientação clínica.');
      return;
    }

    // 3. Monta lista de marcadores em formato legível para a IA
    let markersListText = '';
    markers.forEach(m => {
      const dateStr = new Date(m.created_at).toLocaleDateString('pt-BR');
      markersListText += `- [${dateStr}] [Exame: ${m.exam_name}] Marcador: ${m.marker_name} | Valor: ${m.marker_value} ${m.unit || ''} | Referência: ${m.reference_range || 'Não informada'} | Status: ${m.status}\n`;
    });

    // 4. Prompt para a IA
    const prompt = `Você é um assistente médico e de nutrição de nível sênior, atuando como consultor de suporte à decisão clínica para o nutricionista responsável pelo paciente.
Com base nos resultados dos exames laboratoriais do paciente fornecidos abaixo, elabore um relatório clínico de orientação exclusivo para o profissional de saúde.

ATENÇÃO E DIRETRIZES DE SEGURANÇA:
- Escreva em tom puramente profissional, técnico e analítico.
- Enfatize de forma clara no início que são APENAS POSSIBILIDADES diagnósticas e hipóteses clínicas de apoio à decisão, e não um diagnóstico médico final.
- Apresente o texto formatado em Markdown com as seguintes seções muito bem delimitadas:
  1. **RESUMO CLÍNICO DOS EXAMES**: um sumário conciso do quadro geral revelado pelos exames.
  2. **ALERTAS E RESULTADOS CRÍTICOS**: identifique marcadores que estão alterados (com status "low", "high" ou "abnormal").
  3. **POSSÍVEIS CAUSAS E ASSOCIAÇÕES METABÓLICAS**: faça o cruzamento sistemático e a correlação metabólica/nutricional dos resultados alterados. Explique como eles se relacionam fisiologicamente entre si.
  4. **HIPÓTESES CLÍNICAS E DE INVESTIGAÇÃO (QUADRO UNIFICADO)**: identifique e apresente possíveis patologias, síndromes, distúrbios sistêmicos ou deficiências de nutrientes que consigam englobar ou justificar a totalidade ou a grande maioria dos marcadores alterados de forma unificada (em vez de analisá-los apenas isoladamente). Proponha direcionamentos de investigação e possíveis exames adicionais para confirmar essas hipóteses (tudo estritamente como possibilidades e hipóteses de estudo).
  5. **DIRETRIZES DE ORIENTAÇÃO PARA O NUTRICIONISTA**: diretrizes práticas de como adaptar a conduta dietoterápica ou suplementação com base no cruzamento desses marcadores, ou se há indicação clínica clara para encaminhamento a um médico especialista (ex: endocrinologista, hematologista, cardiologista, etc.).

Resultados dos exames do paciente:
${markersListText}`;

    // 5. Executa chamada para o Gemini usando os candidatos de modelos
    const candidates = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
    let rawText = '';
    let lastErr = null;

    for (const model of candidates) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }]
      };

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const resJson = await response.json();
          rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            console.log(`[EXAM_SUMMARY] Orientação gerada com sucesso pelo modelo ${model}`);
            break;
          }
        } else {
          lastErr = `HTTP ${response.status} (${model}): ${await response.text()}`;
        }
      } catch (err) {
        lastErr = err.message;
      }
    }

    if (!rawText) {
      throw new Error(lastErr || 'Falha ao chamar a IA para a orientação clínica.');
    }

    // 6. Insere ou atualiza o cache no banco de dados (UPSERT)
    await db.query(`
      INSERT INTO patient_exam_summaries (patient_id, summary_text, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (patient_id) DO UPDATE SET
        summary_text = EXCLUDED.summary_text,
        updated_at = NOW()
    `, [patientId, rawText]);

  } catch (err) {
    console.error(`[EXAM_SUMMARY] Erro ao gerar orientação clínica para o paciente ${patientId}:`, err);
  }
}

router.get('/clinical', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT comorbidities, intolerances, dietary_restrictions, medications, health_goals, notes FROM profiles WHERE user_id = $1',
      [req.user.id]
    );
    res.json(result.rows[0] || {
      comorbidities: '', intolerances: '', dietary_restrictions: '',
      medications: '', health_goals: '', notes: '',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar dados clínicos.' });
  }
});

router.post('/clinical', async (req, res) => {
  const { comorbidities, intolerances, dietary_restrictions, medications, health_goals } = req.body;
  try {
    await db.query(`
      INSERT INTO profiles (user_id, comorbidities, intolerances, dietary_restrictions, medications, health_goals, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        comorbidities = EXCLUDED.comorbidities,
        intolerances = EXCLUDED.intolerances,
        dietary_restrictions = EXCLUDED.dietary_restrictions,
        medications = EXCLUDED.medications,
        health_goals = EXCLUDED.health_goals,
        updated_at = NOW()
    `, [req.user.id, comorbidities, intolerances, dietary_restrictions, medications, health_goals]);
    res.json({ message: 'Perfil clínico atualizado com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar perfil clínico.' });
  }
});

router.post('/exams', async (req, res) => {
  const { 
    name, fileName, 
    type, mimeType, mime_type,
    base64, fileBase64, 
    category, 
    size_kb, sizeKb,
    notes 
  } = req.body;

  const fName = name || fileName;
  let mType = mimeType || mime_type || (type === 'image' ? 'image/png' : 'application/pdf');
  const fBase64 = base64 || fileBase64;
  const fSize = size_kb || sizeKb || 0;
  const fCategory = category || 'Outro';

  // Normalização caso o client envie 'application/octet-stream'
  if (fName && mType === 'application/octet-stream') {
    const ext = fName.substring(fName.lastIndexOf('.')).toLowerCase();
    if (ext === '.pdf') {
      mType = 'application/pdf';
    } else if (ext === '.jpg' || ext === '.jpeg') {
      mType = 'image/jpeg';
    } else if (ext === '.png') {
      mType = 'image/png';
    } else if (ext === '.webp') {
      mType = 'image/webp';
    }
  }

  if (!fName || !mType || !fBase64) {
    return res.status(400).json({ error: 'Arquivo ou metadados ausentes.' });
  }

  try {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(mType)) {
      return res.status(400).json({ error: 'Tipo de arquivo não suportado. Envie apenas PDF ou Imagens (JPEG/PNG/WEBP).' });
    }

    const base64Data = fBase64.replace(/^data:.*?;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    
    const fileExt = fName.substring(fName.lastIndexOf('.'));
    const uniqueName = `exam_${req.user.id}_${Date.now()}${fileExt}`;
    const relativePath = `uploads/exams/${uniqueName}`;
    const absolutePath = path.join(__dirname, '..', relativePath);

    fs.writeFileSync(absolutePath, buffer);

    const result = await db.query(`
      INSERT INTO patient_exams (patient_id, file_name, file_path, mime_type, category, size_kb, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, file_name AS name, mime_type, category, size_kb, created_at AS uploaded_at, notes, file_path
    `, [req.user.id, fName, relativePath, mType, fCategory, fSize, notes || '']);

    const row = result.rows[0];

    // Dispara análise por IA em background (assíncrona)
    analyzeExamFile(row.id, req.user.id, relativePath, mType).catch(e => {
      console.error('[EXAM_PARSER] Falha ao disparar análise em background:', e);
    });

    res.status(201).json({
      id: row.id,
      name: row.name,
      type: row.mime_type.startsWith('image/') ? 'image' : 'pdf',
      size_kb: row.size_kb,
      uploaded_at: row.uploaded_at,
      category: row.category,
      url: `https://nutrir.online/api/user/exams/download/${path.basename(row.file_path)}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao fazer upload do exame.' });
  }
});

router.get('/exams', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, file_name, file_path, mime_type, category, size_kb, notes, created_at FROM patient_exams WHERE patient_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    const exams = result.rows;
    let markers = [];
    if (exams.length > 0) {
      const examIds = exams.map(e => e.id);
      const markersRes = await db.query(
        'SELECT * FROM patient_exam_markers WHERE exam_id = ANY($1::int[]) ORDER BY marker_name ASC',
        [examIds]
      );
      markers = markersRes.rows;
    }

    const mapped = exams.map(row => ({
      id: row.id,
      name: row.file_name,
      type: row.mime_type.startsWith('image/') ? 'image' : 'pdf',
      size_kb: row.size_kb || 0,
      uploaded_at: row.created_at,
      category: row.category || 'Outro',
      notes: row.notes,
      url: `https://nutrir.online/api/user/exams/download/${path.basename(row.file_path)}`,
      markers: markers.filter(m => m.exam_id === row.id)
    }));

    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar exames.' });
  }
});

router.delete('/exams/:id', async (req, res) => {
  const examId = parseInt(req.params.id);
  try {
    const checkRes = await db.query('SELECT file_path, patient_id FROM patient_exams WHERE id = $1', [examId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Exame não encontrado.' });
    }
    if (checkRes.rows[0].patient_id !== req.user.id) {
      return res.status(403).json({ error: 'Não autorizado.' });
    }

    const relativePath = checkRes.rows[0].file_path;
    const absolutePath = path.join(__dirname, '..', relativePath);

    await db.query('DELETE FROM patient_exams WHERE id = $1', [examId]);

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    res.json({ message: 'Exame excluído com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir exame.' });
  }
});

router.get('/exams/download/:filename', async (req, res) => {
  const { filename } = req.params;
  const absolutePath = path.join(__dirname, '..', 'uploads', 'exams', filename);
  try {
    const fileCheck = await db.query(
      'SELECT patient_id FROM patient_exams WHERE file_path LIKE $1',
      [`%${filename}`]
    );
    if (fileCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Exame não encontrado.' });
    }
    if (fileCheck.rows[0].patient_id !== req.user.id) {
      return res.status(403).json({ error: 'Não autorizado.' });
    }

    if (fs.existsSync(absolutePath)) {
      res.download(absolutePath);
    } else {
      res.status(404).json({ error: 'Arquivo físico não encontrado no servidor.' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao baixar exame.' });
  }
});

router.get('/exams/markers', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT m.id, m.exam_id, m.marker_name, m.marker_value, m.numeric_value, m.unit, m.reference_range, m.status, m.created_at, e.file_name AS exam_name
       FROM patient_exam_markers m
       JOIN patient_exams e ON m.exam_id = e.id
       WHERE m.patient_id = $1
       ORDER BY m.created_at DESC, m.marker_name ASC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar histórico de marcadores.' });
  }
});

router.get('/exams/:id/markers', async (req, res) => {
  const examId = parseInt(req.params.id);
  try {
    const checkExam = await db.query('SELECT patient_id FROM patient_exams WHERE id = $1', [examId]);
    if (checkExam.rows.length === 0) {
      return res.status(404).json({ error: 'Exame não encontrado.' });
    }
    if (checkExam.rows[0].patient_id !== req.user.id) {
      return res.status(403).json({ error: 'Não autorizado.' });
    }

    const result = await db.query(
      'SELECT id, marker_name, marker_value, numeric_value, unit, reference_range, status, created_at FROM patient_exam_markers WHERE exam_id = $1 ORDER BY marker_name ASC',
      [examId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar marcadores do exame.' });
  }
});

// ==========================================
// 10. MEDIÇÕES CORPORAIS PRÓPRIAS (APK)
// ==========================================

router.get('/measurements', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM patient_measurements WHERE patient_id = $1 ORDER BY measured_at DESC, created_at DESC LIMIT 10',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar avaliações corporais.' });
  }
});

router.post('/measurements', async (req, res) => {
  const { measured_at, weight_kg, height_cm, body_fat_pct, muscle_mass_kg,
          waist_cm, hip_cm, chest_cm, arm_cm, thigh_cm, notes } = req.body;
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await db.query(
      `INSERT INTO patient_measurements
         (patient_id, professional_id, measured_at, weight_kg, height_cm,
          body_fat_pct, muscle_mass_kg, waist_cm, hip_cm, chest_cm, arm_cm, thigh_cm, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [req.user.id, null, measured_at || today,
       weight_kg || null, height_cm || null, body_fat_pct || null,
       muscle_mass_kg || null, waist_cm || null, hip_cm || null,
       chest_cm || null, arm_cm || null, thigh_cm || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar avaliação corporal.' });
  }
});

// ==========================================
// 11. HISTÓRICO DIÁRIO CONSOLIDADO
// ==========================================
router.get('/diario/historico', async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  try {
    // Obter data atual no fuso de Brasília (America/Sao_Paulo)
    const nowSaoPaulo = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    
    // Gerar lista de datas retroativas YYYY-MM-DD
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(nowSaoPaulo);
      d.setDate(nowSaoPaulo.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${dayStr}`);
    }

    const startDate = dates[0];
    const endDate = dates[dates.length - 1];

    // Inicializar mapa de histórico estruturado para o período
    const historyMap = {};
    for (const dateStr of dates) {
      const parts = dateStr.split('-');
      const label = `${parts[2]}/${parts[1]}`;
      historyMap[dateStr] = {
        date: dateStr,
        label: label,
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        water_ml: 0,
        weight: null
      };
    }

    // Consultas concorrentes no banco para as tabelas relacionadas
    const [mealsRes, waterRes, weightRes] = await Promise.all([
      db.query(
        `SELECT TO_CHAR(date, 'YYYY-MM-DD') as date_str, total 
         FROM meals 
         WHERE user_id = $1 AND date >= $2 AND date <= $3`,
        [req.user.id, startDate, endDate]
      ),
      db.query(
        `SELECT TO_CHAR(date, 'YYYY-MM-DD') as date_str, consumed 
         FROM water_log 
         WHERE user_id = $1 AND date >= $2 AND date <= $3`,
        [req.user.id, startDate, endDate]
      ),
      db.query(
        `SELECT TO_CHAR(date, 'YYYY-MM-DD') as date_str, weight 
         FROM weight_log 
         WHERE user_id = $1 AND date >= $2 AND date <= $3`,
        [req.user.id, startDate, endDate]
      )
    ]);

    // Consolidar e agregar refeições
    for (const row of mealsRes.rows) {
      const dateStr = row.date_str;
      if (historyMap[dateStr]) {
        const total = row.total || {};
        historyMap[dateStr].calories += Number(total.calories || 0);
        historyMap[dateStr].protein += Number(total.protein || 0);
        historyMap[dateStr].carbs += Number(total.carbs || 0);
        historyMap[dateStr].fats += Number(total.fat || total.fats || 0);
      }
    }

    // Consolidar consumo de água
    for (const row of waterRes.rows) {
      const dateStr = row.date_str;
      if (historyMap[dateStr]) {
        historyMap[dateStr].water_ml += Number(row.consumed || 0);
      }
    }

    // Consolidar peso
    for (const row of weightRes.rows) {
      const dateStr = row.date_str;
      if (historyMap[dateStr]) {
        historyMap[dateStr].weight = Number(row.weight);
      }
    }

    // Arredondar valores agregados para exibição limpa
    const result = dates.map(dateStr => {
      const entry = historyMap[dateStr];
      entry.calories = Math.round(entry.calories);
      entry.protein = Math.round(entry.protein);
      entry.carbs = Math.round(entry.carbs);
      entry.fats = Math.round(entry.fats);
      return entry;
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar histórico diário.' });
  }
});

// ==========================================
// RASTREADOR DE PASSOS E ATIVIDADES FÍSICAS
// ==========================================
router.get('/activity/history', async (req, res) => {
  const limit = parseInt(req.query.limit) || 30;
  try {
    const historyRes = await db.query(`
      SELECT 
        TO_CHAR(date, 'YYYY-MM-DD') as date_str,
        steps,
        steps_target,
        steps_calories,
        exercises
      FROM activity_log 
      WHERE user_id = $1
      ORDER BY date DESC
      LIMIT $2
    `, [req.user.id, limit]);
    
    res.json(historyRes.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar histórico de atividades.' });
  }
});

router.get('/activity', async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  try {
    const activityRes = await db.query('SELECT * FROM activity_log WHERE user_id = $1 AND date = $2', [req.user.id, date]);
    res.json(activityRes.rows[0] || { steps: 0, steps_target: 10000, steps_calories: 0.0, exercises: [], date });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar atividades.' });
  }
});

router.post('/activity/steps', async (req, res) => {
  const { date, steps, steps_target } = req.body;
  if (!date || steps === undefined || steps_target === undefined) {
    return res.status(400).json({ error: 'Parâmetros de passos inválidos.' });
  }

  try {
    // Obter peso para cálculo preciso de calorias
    const profileRes = await db.query('SELECT weight FROM profiles WHERE user_id = $1', [req.user.id]);
    const weight = profileRes.rows[0]?.weight ? Number(profileRes.rows[0].weight) : 70;
    
    // Calorias por passo: 0.000628 * peso (kg)
    const steps_calories = Math.round(steps * 0.000628 * weight * 10) / 10;

    const activityRes = await db.query(`
      INSERT INTO activity_log (user_id, date, steps, steps_target, steps_calories)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, date) DO UPDATE SET
        steps = EXCLUDED.steps,
        steps_target = EXCLUDED.steps_target,
        steps_calories = EXCLUDED.steps_calories
      RETURNING *
    `, [req.user.id, date, steps, steps_target, steps_calories]);

    res.json(activityRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar passos.' });
  }
});

router.post('/activity/exercise', async (req, res) => {
  const { date, name, duration_min, custom_calories, met } = req.body;
  if (!date || !name || !duration_min) {
    return res.status(400).json({ error: 'Parâmetros de exercício inválidos.' });
  }

  try {
    // Obter peso para cálculo de MET
    const profileRes = await db.query('SELECT weight FROM profiles WHERE user_id = $1', [req.user.id]);
    const weight = profileRes.rows[0]?.weight ? Number(profileRes.rows[0].weight) : 70;

    let calories = 0;
    if (custom_calories !== undefined && custom_calories !== null && custom_calories !== '') {
      calories = Number(custom_calories);
    } else {
      // Fórmula: MET * peso (kg) * (tempo / 60)
      const currentMet = Number(met) || 4.0;
      calories = Math.round(currentMet * weight * (Number(duration_min) / 60));
    }

    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
    const newExercise = {
      name,
      duration_min: Number(duration_min),
      calories,
      time
    };

    // Obter ou criar registro do dia
    const activityRes = await db.query('SELECT * FROM activity_log WHERE user_id = $1 AND date = $2', [req.user.id, date]);
    let exercises = [];
    if (activityRes.rows[0]) {
      exercises = typeof activityRes.rows[0].exercises === 'string' 
        ? JSON.parse(activityRes.rows[0].exercises) 
        : (activityRes.rows[0].exercises || []);
    }
    exercises.push(newExercise);

    const updateRes = await db.query(`
      INSERT INTO activity_log (user_id, date, exercises)
      VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (user_id, date) DO UPDATE SET
        exercises = EXCLUDED.exercises
      RETURNING *
    `, [req.user.id, date, JSON.stringify(exercises)]);

    res.json(updateRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao adicionar exercício.' });
  }
});

router.delete('/activity/exercise/:index', async (req, res) => {
  const index = Number(req.params.index);
  const date = req.query.date || new Date().toISOString().split('T')[0];

  if (isNaN(index)) {
    return res.status(400).json({ error: 'Índice de exercício inválido.' });
  }

  try {
    const activityRes = await db.query('SELECT * FROM activity_log WHERE user_id = $1 AND date = $2', [req.user.id, date]);
    if (!activityRes.rows[0]) {
      return res.status(404).json({ error: 'Nenhuma atividade registrada nesta data.' });
    }

    let exercises = typeof activityRes.rows[0].exercises === 'string'
      ? JSON.parse(activityRes.rows[0].exercises)
      : (activityRes.rows[0].exercises || []);

    if (index < 0 || index >= exercises.length) {
      return res.status(400).json({ error: 'Exercício não encontrado.' });
    }

    exercises.splice(index, 1);

    const updateRes = await db.query(`
      UPDATE activity_log 
      SET exercises = $1::jsonb
      WHERE user_id = $2 AND date = $3
      RETURNING *
    `, [JSON.stringify(exercises), req.user.id, date]);

    res.json(updateRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover exercício.' });
  }
});

router.generateClinicalSummary = generateClinicalSummary;
module.exports = router;
