const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Todos os endpoints aqui exigem login JWT e cargo de nutricionista ou personal trainer
router.use(authenticateToken);
router.use(requireRole(['nutritionist', 'trainer']));

// ==========================================
// 1. LISTAR PACIENTES/CLIENTES VINCULADOS
// ==========================================
router.get('/patients', async (req, res) => {
  try {
    const patientsRes = await db.query(
      `SELECT u.id, u.email, u.name, u.plan, p.weight, p.height, p.goal, p.target_calories 
       FROM professional_links l
       JOIN users u ON l.user_id = u.id
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE l.professional_id = $1 AND l.type = $2
       ORDER BY u.name ASC`,
      [req.user.id, req.user.role] // O tipo do link bate com a role (nutritionist ou trainer)
    );
    res.json(patientsRes.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar pacientes vinculados.' });
  }
});

// Helper middleware interno para garantir que o profissional é dono do paciente
const verifyPatientAccess = async (req, res, next) => {
  const patientId = parseInt(req.params.id);
  try {
    const linkCheck = await db.query(
      'SELECT id FROM professional_links WHERE user_id = $1 AND professional_id = $2 AND type = $3',
      [patientId, req.user.id, req.user.role]
    );

    if (linkCheck.rows.length === 0 && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Este paciente não está vinculado ao seu painel.' });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao validar acesso ao paciente.' });
  }
};

// ==========================================
// 2. VER DIÁRIO E REGISTROS DO PACIENTE
// ==========================================
router.get('/patients/:id/diary', verifyPatientAccess, async (req, res) => {
  const patientId = parseInt(req.params.id);
  const today = new Date().toISOString().split('T')[0];

  try {
    // 1. Refeições
    const meals = await db.query(
      'SELECT * FROM meals WHERE user_id = $1 ORDER BY date DESC, time DESC LIMIT 50',
      [patientId]
    );

    // 2. Hidratação de hoje
    const water = await db.query(
      'SELECT consumed, target FROM water_log WHERE user_id = $1 AND date = $2',
      [patientId, today]
    );

    // 3. Jejum ativo
    const fasting = await db.query(
      'SELECT start_time, duration_goal, active FROM fasting_log WHERE user_id = $1 AND active = true LIMIT 1',
      [patientId]
    );

    // 4. Metas do perfil
    const profile = await db.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [patientId]
    );

    res.json({
      profile: profile.rows[0] || null,
      meals: meals.rows,
      water: water.rows[0] || { consumed: 0, target: 2500 },
      fasting: fasting.rows[0] || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao ler registros do diário do paciente.' });
  }
});

// ==========================================
// 3. ENVIAR FEEDBACK / PRESCRIÇÃO / PLANO
// ==========================================
router.post('/patients/:id/feedback', verifyPatientAccess, async (req, res) => {
  const patientId = parseInt(req.params.id);
  const { content } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ error: 'O conteúdo da mensagem não pode ser vazio.' });
  }

  try {
    const feedback = await db.query(
      `INSERT INTO professional_messages (user_id, professional_id, content, type)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [patientId, req.user.id, content, req.user.role]
    );

    res.status(201).json(feedback.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao enviar orientações ao paciente.' });
  }
});

// ==========================================
// 4. CONSULTAS E AGENDAMENTOS DO PROFISSIONAL
// ==========================================

// Listar consultas do profissional
router.get('/appointments', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, u.name as patient_name, u.email as patient_email
       FROM appointments a
       JOIN users u ON a.patient_id = u.id
       WHERE a.professional_id = $1
       ORDER BY a.appointment_date DESC, a.start_time DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar consultas.' });
  }
});

// Cancelar consulta pelo profissional
router.post('/appointments/:id/cancel', async (req, res) => {
  const appointmentId = parseInt(req.params.id);
  try {
    const checkRes = await db.query(
      'SELECT professional_id FROM appointments WHERE id = $1',
      [appointmentId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado.' });
    }

    if (checkRes.rows[0].professional_id !== req.user.id) {
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
