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

    // Validar se o horário solicitado está contido em alguma faixa de atendimento disponível
    const isWithinSlot = availabilityRes.rows.some(slot => {
      const slotStart = slot.start_time;
      const slotEnd = slot.end_time;
      return (start_time >= slotStart && end_time <= slotEnd && start_time < end_time);
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
    const videoLink = `https://meet.jit.si/${videoRoom}`;

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

module.exports = router;
