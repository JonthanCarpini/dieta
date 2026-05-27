const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Rotas administrativas exigem login JWT mínimo
router.use(authenticateToken);

// ====================================================
// ROTAS ACESSÍVEIS POR PROFISSIONAIS E ADMINS (FATURAMENTO)
// ====================================================
router.get('/billing', async (req, res) => {
  try {
    const role = req.user.role;

    if (role === 'admin') {
      const totalGrossRes = await db.query("SELECT COALESCE(SUM(amount), 0) as total FROM payments");
      const totalCommissionRes = await db.query("SELECT COALESCE(SUM(commission_amount), 0) as total FROM payments");
      
      const gross = parseFloat(totalGrossRes.rows[0].total);
      const commission = parseFloat(totalCommissionRes.rows[0].total);
      const net = gross - commission;

      const historyRes = await db.query(`
        SELECT p.id, p.amount, p.plan_name, p.payment_gateway, p.gateway_payment_id, p.commission_amount, p.created_at,
               u.name as patient_name, u.email as patient_email,
               pro.name as professional_name, pro.commission_percentage
        FROM payments p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN users pro ON p.professional_id = pro.id
        ORDER BY p.created_at DESC
        LIMIT 100
      `);

      res.json({
        role: 'admin',
        stats: { gross, commission, net },
        history: historyRes.rows
      });
    } else if (role === 'nutritionist' || role === 'trainer') {
      const professionalId = req.user.id;

      const totalCommissionRes = await db.query(
        "SELECT COALESCE(SUM(commission_amount), 0) as total FROM payments WHERE professional_id = $1", 
        [professionalId]
      );
      const commission = parseFloat(totalCommissionRes.rows[0].total);

      const patientsCountRes = await db.query(
        "SELECT COUNT(*) as count FROM professional_links WHERE professional_id = $1",
        [professionalId]
      );
      const activePatients = parseInt(patientsCountRes.rows[0].count);

      const historyRes = await db.query(`
        SELECT p.id, p.amount, p.plan_name, p.commission_amount, p.created_at,
               u.name as patient_name, u.email as patient_email
        FROM payments p
        JOIN users u ON p.user_id = u.id
        WHERE p.professional_id = $1
        ORDER BY p.created_at DESC
        LIMIT 100
      `, [professionalId]);

      res.json({
        role,
        stats: { commission, activePatients },
        history: historyRes.rows
      });
    } else {
      res.status(403).json({ error: 'Acesso proibido para este tipo de conta.' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar dados de faturamento.' });
  }
});

// ====================================================
// ROTAS DE AGENDA (PROFISSIONAIS E ADMINS)
// ====================================================

// GET /api/admin/pro-overview - Resumo do dashboard para profissional logado
router.get('/pro-overview', requireRole(['nutritionist', 'trainer']), async (req, res) => {
  const professionalId = req.user.id;
  const today = new Date().toISOString().split('T')[0];
  const todayDow = new Date().getDay();

  try {
    const [patientsRes, nextRes, slotsRes, commissionsRes] = await Promise.all([
      db.query(
        `SELECT COUNT(*) as count FROM professional_links WHERE professional_id = $1 AND type = $2`,
        [professionalId, req.user.role]
      ),
      db.query(
        `SELECT a.id, a.appointment_date, a.start_time, a.end_time, a.status, a.video_link,
                u.name as patient_name
         FROM appointments a
         JOIN users u ON a.patient_id = u.id
         WHERE a.professional_id = $1 AND a.appointment_date >= $2 AND a.status = 'scheduled'
         ORDER BY a.appointment_date ASC, a.start_time ASC
         LIMIT 8`,
        [professionalId, today]
      ),
      db.query(
        `SELECT COUNT(*) as count FROM professional_availability
         WHERE professional_id = $1 AND day_of_week = $2 AND active = true`,
        [professionalId, todayDow]
      ),
      db.query(
        `SELECT COALESCE(SUM(commission_amount), 0) as total FROM payments
         WHERE professional_id = $1 AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`,
        [professionalId]
      )
    ]);

    const consultationsToday = nextRes.rows.filter(a => {
      const d = String(a.appointment_date).split('T')[0];
      return d === today;
    }).length;

    res.json({
      totalPatients:     parseInt(patientsRes.rows[0].count),
      consultationsToday,
      slotsToday:        parseInt(slotsRes.rows[0].count),
      commissionsMonth:  parseFloat(commissionsRes.rows[0].total || 0),
      nextAppointments:  nextRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao carregar visão geral do profissional.' });
  }
});

// GET /admin/availability - Retorna os horários disponíveis do profissional logado
router.get('/availability', async (req, res) => {
  const professionalId = req.user.id;
  try {
    const result = await db.query(
      'SELECT * FROM professional_availability WHERE professional_id = $1 AND active = true ORDER BY day_of_week, start_time',
      [professionalId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar disponibilidade.' });
  }
});

// POST /admin/availability - Salva/substitui os horários do profissional logado
// Cada slot recebido é expandido em janelas individuais de 30 minutos no banco.
router.post('/availability', async (req, res) => {
  const professionalId = req.user.id;
  const { slots } = req.body;

  if (!Array.isArray(slots)) {
    return res.status(400).json({ error: 'Formato inválido. Esperado array de horários.' });
  }

  function timeToMins(t) {
    const [h, m] = (t || '').substring(0, 5).split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
  function minsToTime(mins) {
    return `${String(Math.floor(mins / 60)).padStart(2,'0')}:${String(mins % 60).padStart(2,'0')}`;
  }

  // Expande intervalos em slots individuais de 30 min
  const expanded = [];
  for (const slot of slots) {
    const { day_of_week, start_time, end_time } = slot;
    if (day_of_week === undefined || !start_time || !end_time) continue;
    const startMins = timeToMins(start_time);
    const endMins   = timeToMins(end_time);
    if (endMins <= startMins) continue;
    for (let t = startMins; t + 30 <= endMins; t += 30) {
      expanded.push({ dow: parseInt(day_of_week), start: minsToTime(t), end: minsToTime(t + 30) });
    }
  }

  try {
    await db.query('DELETE FROM professional_availability WHERE professional_id = $1', [professionalId]);

    for (const s of expanded) {
      await db.query(
        'INSERT INTO professional_availability (professional_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)',
        [professionalId, s.dow, s.start, s.end]
      );
    }

    res.json({ message: `Disponibilidade salva: ${expanded.length} slot(s) de 30 minutos configurado(s).` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar disponibilidade.' });
  }
});

// GET /admin/appointments - Retorna as consultas baseadas no cargo
router.get('/appointments', async (req, res) => {
  try {
    const role = req.user.role;
    if (role === 'admin') {
      const result = await db.query(
        `SELECT a.*, 
                pat.name as patient_name, pat.email as patient_email,
                pro.name as professional_name, pro.role as professional_role
         FROM appointments a
         JOIN users pat ON a.patient_id = pat.id
         JOIN users pro ON a.professional_id = pro.id
         ORDER BY a.appointment_date DESC, a.start_time DESC`
      );
      res.json(result.rows);
    } else if (role === 'nutritionist' || role === 'trainer') {
      const result = await db.query(
        `SELECT a.*, pat.name as patient_name, pat.email as patient_email
         FROM appointments a
         JOIN users pat ON a.patient_id = pat.id
         WHERE a.professional_id = $1
         ORDER BY a.appointment_date DESC, a.start_time DESC`,
        [req.user.id]
      );
      res.json(result.rows);
    } else {
      res.status(403).json({ error: 'Acesso negado.' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar consultas para o painel.' });
  }
});

// POST /admin/appointments/:id/cancel - Cancela consulta no painel
router.post('/appointments/:id/cancel', async (req, res) => {
  const appointmentId = parseInt(req.params.id);
  try {
    const appointmentRes = await db.query('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
    if (appointmentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Consulta não encontrada.' });
    }

    const appointment = appointmentRes.rows[0];
    const role = req.user.role;

    if (role !== 'admin' && appointment.professional_id !== req.user.id) {
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
// PROXY USDA FOODDATA CENTRAL — busca nutricional para o construtor de cardápios
// DEMO_KEY funciona sem cadastro (30 req/h, 50/dia). Chave gratuita em fdc.nal.usda.gov
// ==========================================
router.get('/calorie-search', requireRole(['admin', 'nutritionist', 'trainer']), async (req, res) => {
  const query = req.query.q || '';
  if (!query.trim()) return res.status(400).json({ error: 'Query obrigatória.' });
  try {
    const settingsRes = await db.query("SELECT value FROM system_settings WHERE key = 'usda_api_key'");
    const apiKey = settingsRes.rows[0]?.value?.trim() || 'DEMO_KEY';
    const params = new URLSearchParams({
      query,
      api_key: apiKey,
      pageSize: '10',
    });
    // Múltiplos dataType — evita parênteses na URL (Survey FNDDS causava 400)
    params.append('dataType', 'Foundation');
    params.append('dataType', 'SR Legacy');
    params.append('dataType', 'Survey (FNDDS)');
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.error('USDA error', response.status, errBody);
      return res.status(502).json({ error: `Erro na API USDA (${response.status}). Verifique a chave em Credenciais ou tente novamente.` });
    }
    const data = await response.json();

    // Normaliza para o formato esperado pelo frontend (valores por 100g)
    const items = (data.foods || []).slice(0, 10).map(food => {
      const n = food.foodNutrients || [];
      const get = (...ids) => {
        for (const id of ids) {
          const match = n.find(x => x.nutrientId === id);
          if (match && match.value != null) return Math.round(match.value * 10) / 10;
        }
        return 0;
      };
      return {
        name: food.description,
        calories:                get(1008, 2047, 2048),
        protein_g:               get(1003),
        carbohydrates_total_g:   get(1005),
        fat_total_g:             get(1004),
        serving_size_g:          100,
      };
    });
    res.json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao consultar banco de dados nutricional USDA.' });
  }
});

// Exige cargo de administrador para todas as rotas abaixo
router.use(requireRole(['admin']));

// ==========================================
// 1. LISTAR TODOS OS USUÁRIOS DO SISTEMA
// ==========================================
router.get('/users', async (req, res) => {
  try {
    const usersRes = await db.query(
      `SELECT id, email, name, role, plan, trial_expires_at, premium_expires_at, commission_percentage, created_at 
       FROM users 
       ORDER BY created_at DESC`
    );
    res.json(usersRes.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar lista de usuários.' });
  }
});

// ==========================================
// 2. ALTERAR CARGO DO USUÁRIO (PROMOÇÃO)
// ==========================================
router.post('/users/:id/role', async (req, res) => {
  const userId = parseInt(req.params.id);
  const { role } = req.body; // 'user', 'nutritionist', 'trainer', 'admin'

  if (!role || !['user', 'nutritionist', 'trainer', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Cargo inválido.' });
  }

  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Não é possível alterar seu próprio cargo de administrador.' });
  }

  try {
    const updated = await db.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, name, role',
      [role, userId]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    res.json({ message: 'Cargo atualizado com sucesso.', user: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar cargo do usuário.' });
  }
});

// ==========================================
// 3. ALTERAR PLANO / ASSINATURA DO USUÁRIO
// ==========================================
router.post('/users/:id/plan', async (req, res) => {
  const userId = parseInt(req.params.id);
  const { plan, durationDays } = req.body;

  if (!plan) {
    return res.status(400).json({ error: 'Plano não fornecido.' });
  }

  try {
    const planCheck = await db.query('SELECT name, duration_days FROM plans WHERE name = $1', [plan.toLowerCase().trim()]);
    if (planCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Plano não encontrado no sistema.' });
    }

    const dbPlan = planCheck.rows[0];
    let expiresAt = null;

    if (dbPlan.name !== 'trial') {
      const days = parseInt(durationDays) || dbPlan.duration_days || 30;
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);
    } else {
      // Volta para o trial resetando 7 dias de tolerância
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
    }

    const updated = await db.query(
      `UPDATE users 
       SET plan = $1::varchar, 
           premium_expires_at = (CASE WHEN $1::varchar = 'trial' THEN NULL ELSE $2::timestamp END), 
           trial_expires_at = (CASE WHEN $1::varchar = 'trial' THEN $3::timestamp ELSE trial_expires_at END)
       WHERE id = $4 RETURNING id, email, name, plan, premium_expires_at`,
      [dbPlan.name, expiresAt, dbPlan.name === 'trial' ? expiresAt : null, userId]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    res.json({ message: 'Plano de assinatura atualizado.', user: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao alterar plano do usuário.' });
  }
});

// ==========================================
// 4. REGISTRAR PROFISSIONAL MANUALMENTE
// ==========================================
router.post('/register-professional', async (req, res) => {
  const { email, password, name, role, commission_percentage } = req.body;

  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
  }

  if (!['nutritionist', 'trainer'].includes(role)) {
    return res.status(400).json({ error: 'Cargo de profissional deve ser nutritionist ou trainer.' });
  }

  const commission = parseFloat(commission_percentage || 0);

  try {
    const checkUser = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'E-mail já cadastrado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await db.query(
      `INSERT INTO users (email, password_hash, name, role, plan, premium_expires_at, commission_percentage) 
       VALUES ($1, $2, $3, $4, 'premium', NOW() + INTERVAL '10 years', $5) 
       RETURNING id, email, name, role, commission_percentage`,
      [email.toLowerCase().trim(), passwordHash, name, role, commission]
    );

    res.status(201).json({
      message: 'Profissional registrado com sucesso e plano premium vitalício concedido.',
      user: newUser.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar profissional.' });
  }
});

// ==========================================
// 4B. ALTERAR COMISSÃO DO PROFISSIONAL (ADMIN)
// ==========================================
router.post('/users/:id/commission', async (req, res) => {
  const userId = parseInt(req.params.id);
  const { commission_percentage } = req.body;

  if (commission_percentage === undefined || isNaN(parseFloat(commission_percentage))) {
    return res.status(400).json({ error: 'Percentual de comissão inválido.' });
  }

  const commission = parseFloat(commission_percentage);
  if (commission < 0 || commission > 100) {
    return res.status(400).json({ error: 'O percentual de comissão deve ser entre 0% e 100%.' });
  }

  try {
    const updated = await db.query(
      'UPDATE users SET commission_percentage = $1 WHERE id = $2 RETURNING id, email, name, role, commission_percentage',
      [commission, userId]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    res.json({ message: 'Comissão atualizada com sucesso.', user: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar comissão.' });
  }
});

// ==========================================
// 5. OBTER CONFIGURAÇÕES DO SISTEMA (ADMIN)
// ==========================================
router.get('/settings', async (req, res) => {
  try {
    const settingsRes = await db.query('SELECT * FROM system_settings');
    const settings = {};
    settingsRes.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao obter configurações.' });
  }
});

// ==========================================
// 6. SALVAR CONFIGURAÇÕES DO SISTEMA (ADMIN)
// ==========================================
router.post('/settings', async (req, res) => {
  const settings = req.body;
  
  try {
    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined) {
        await db.query(`
          INSERT INTO system_settings (key, value, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = NOW()
        `, [key, value]);
      }
    }
    res.json({ message: 'Configurações salvas com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar configurações.' });
  }
});

// ==========================================
// 7. OBTER TODOS OS PLANOS DO SISTEMA
// ==========================================
router.get('/plans', async (req, res) => {
  try {
    const plansRes = await db.query('SELECT * FROM plans ORDER BY id ASC');
    res.json(plansRes.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar planos.' });
  }
});

// ==========================================
// 8. CRIAR/ATUALIZAR PLANO
// ==========================================
router.post('/plans', async (req, res) => {
  const { 
    id, name, display_name, price, duration_days, description, features,
    has_nutritionist, has_trainer, max_nutritionist_appointments_per_month, max_trainer_appointments_per_month 
  } = req.body;

  if (!name || !display_name || price === undefined || duration_days === undefined) {
    return res.status(400).json({ error: 'Preencha os campos obrigatórios.' });
  }

  const featuresJson = typeof features === 'string' ? features : JSON.stringify(features || []);
  const hasNutri = has_nutritionist === true || has_nutritionist === 'true';
  const hasTrainer = has_trainer === true || has_trainer === 'true';
  const maxNutri = parseInt(max_nutritionist_appointments_per_month) || 0;
  const maxTrainer = parseInt(max_trainer_appointments_per_month) || 0;

  try {
    if (id) {
      // Atualizar plano existente
      const updated = await db.query(`
        UPDATE plans 
        SET name = $1, display_name = $2, price = $3, duration_days = $4, description = $5, features = $6,
            has_nutritionist = $7, has_trainer = $8, max_nutritionist_appointments_per_month = $9, max_trainer_appointments_per_month = $10
        WHERE id = $11
        RETURNING *
      `, [name.toLowerCase().trim(), display_name, price, duration_days, description, featuresJson, hasNutri, hasTrainer, maxNutri, maxTrainer, id]);
      
      res.json({ message: 'Plano atualizado com sucesso.', plan: updated.rows[0] });
    } else {
      // Criar novo plano
      const inserted = await db.query(`
        INSERT INTO plans (name, display_name, price, duration_days, description, features, has_nutritionist, has_trainer, max_nutritionist_appointments_per_month, max_trainer_appointments_per_month)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (name) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          price = EXCLUDED.price,
          duration_days = EXCLUDED.duration_days,
          description = EXCLUDED.description,
          features = EXCLUDED.features,
          has_nutritionist = EXCLUDED.has_nutritionist,
          has_trainer = EXCLUDED.has_trainer,
          max_nutritionist_appointments_per_month = EXCLUDED.max_nutritionist_appointments_per_month,
          max_trainer_appointments_per_month = EXCLUDED.max_trainer_appointments_per_month
        RETURNING *
      `, [name.toLowerCase().trim(), display_name, price, duration_days, description, featuresJson, hasNutri, hasTrainer, maxNutri, maxTrainer]);
      
      res.json({ message: 'Plano criado com sucesso.', plan: inserted.rows[0] });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar plano.' });
  }
});

// ==========================================
// 9. EXCLUIR PLANO
// ==========================================
router.delete('/plans/:id', async (req, res) => {
  const planId = parseInt(req.params.id);
  
  try {
    const planRes = await db.query('SELECT name FROM plans WHERE id = $1', [planId]);
    if (planRes.rows.length === 0) {
      return res.status(404).json({ error: 'Plano não encontrado.' });
    }
    const planName = planRes.rows[0].name;

    if (planName === 'trial' || planName === 'premium') {
      return res.status(400).json({ error: 'Os planos padrão (trial, premium) não podem ser excluídos.' });
    }

    // Altera os usuários que estão nesse plano para o plano 'trial'
    await db.query("UPDATE users SET plan = 'trial', premium_expires_at = NULL WHERE plan = $1", [planName]);

    // Deleta o plano
    await db.query('DELETE FROM plans WHERE id = $1', [planId]);

    res.json({ message: 'Plano excluído com sucesso. Usuários migrados para o plano Trial.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir plano.' });
  }
});

module.exports = router;
