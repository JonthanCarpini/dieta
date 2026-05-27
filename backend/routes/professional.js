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
// 3.5 HISTÓRICO DE FEEDBACKS ENVIADOS AO PACIENTE
// ==========================================
router.get('/patients/:id/feedbacks', verifyPatientAccess, async (req, res) => {
  const patientId = parseInt(req.params.id);
  try {
    const feedbacks = await db.query(
      `SELECT m.*, u.name as professional_name 
       FROM professional_messages m
       JOIN users u ON m.professional_id = u.id
       WHERE m.user_id = $1
       ORDER BY m.created_at DESC`,
      [patientId]
    );
    res.json(feedbacks.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar histórico de feedbacks do paciente.' });
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

// ==========================================
// 5. HISTÓRICO DE PESO DO PACIENTE (ÁREA EVOLUTIVA)
// ==========================================
router.get('/patients/:id/weight-log', verifyPatientAccess, async (req, res) => {
  const patientId = parseInt(req.params.id);
  try {
    const historyRes = await db.query(
      "SELECT id, weight, TO_CHAR(date, 'YYYY-MM-DD') as date, created_at FROM weight_log WHERE user_id = $1 ORDER BY date ASC",
      [patientId]
    );
    res.json(historyRes.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar histórico de peso do paciente.' });
  }
});

// ==========================================
// 6. CARDÁPIOS SEMANAIS
// ==========================================

// Listar planos criados por este profissional
router.get('/weekly-plans', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT wp.id, wp.name, wp.notes, wp.is_active, wp.created_at, wp.updated_at,
              u.name as patient_name, u.id as patient_id
       FROM weekly_plans wp
       LEFT JOIN users u ON wp.patient_id = u.id
       WHERE wp.professional_id = $1
       ORDER BY wp.updated_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar cardápios.' });
  }
});

// Criar novo plano
router.post('/weekly-plans', async (req, res) => {
  const { name, patient_id, plan_data, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome do cardápio é obrigatório.' });
  try {
    const result = await db.query(
      `INSERT INTO weekly_plans (professional_id, patient_id, name, plan_data, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, patient_id || null, name, JSON.stringify(plan_data || { days: [] }), notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar cardápio.' });
  }
});

// Buscar plano completo
router.get('/weekly-plans/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT wp.*, u.name as patient_name
       FROM weekly_plans wp
       LEFT JOIN users u ON wp.patient_id = u.id
       WHERE wp.id = $1 AND wp.professional_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cardápio não encontrado.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar cardápio.' });
  }
});

// Atualizar plano
router.put('/weekly-plans/:id', async (req, res) => {
  const { name, patient_id, plan_data, notes, is_active } = req.body;
  try {
    const check = await db.query('SELECT id FROM weekly_plans WHERE id = $1 AND professional_id = $2', [req.params.id, req.user.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Cardápio não encontrado.' });
    const result = await db.query(
      `UPDATE weekly_plans SET name=$1, patient_id=$2, plan_data=$3, notes=$4, is_active=$5, updated_at=NOW()
       WHERE id=$6 AND professional_id=$7 RETURNING *`,
      [name, patient_id || null, JSON.stringify(plan_data), notes || null, is_active !== false, req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar cardápio.' });
  }
});

// Excluir plano
router.delete('/weekly-plans/:id', async (req, res) => {
  try {
    const check = await db.query('SELECT id FROM weekly_plans WHERE id = $1 AND professional_id = $2', [req.params.id, req.user.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Cardápio não encontrado.' });
    await db.query('DELETE FROM weekly_plans WHERE id = $1', [req.params.id]);
    res.json({ message: 'Cardápio excluído.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir cardápio.' });
  }
});

// ==========================================
// 5. GESTÃO CLÍNICA DE PACIENTES & EXAMES
// ==========================================
const fs = require('fs');
const path = require('path');

router.get('/patients/:id/clinical', verifyPatientAccess, async (req, res) => {
  const patientId = parseInt(req.params.id);
  try {
    const result = await db.query(
      'SELECT comorbidities, intolerances, dietary_restrictions, notes FROM profiles WHERE user_id = $1',
      [patientId]
    );
    res.json(result.rows[0] || { comorbidities: '', intolerances: '', dietary_restrictions: '', notes: '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar dados clínicos do paciente.' });
  }
});

router.post('/patients/:id/clinical', verifyPatientAccess, async (req, res) => {
  const patientId = parseInt(req.params.id);
  const { comorbidities, intolerances, dietary_restrictions, notes } = req.body;
  try {
    await db.query(`
      INSERT INTO profiles (user_id, comorbidities, intolerances, dietary_restrictions, notes, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        comorbidities = EXCLUDED.comorbidities,
        intolerances = EXCLUDED.intolerances,
        dietary_restrictions = EXCLUDED.dietary_restrictions,
        notes = EXCLUDED.notes,
        updated_at = NOW()
    `, [patientId, comorbidities, intolerances, dietary_restrictions, notes]);
    res.json({ message: 'Ficha clínica do paciente salva com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar ficha clínica do paciente.' });
  }
});

router.get('/patients/:id/exams', verifyPatientAccess, async (req, res) => {
  const patientId = parseInt(req.params.id);
  try {
    const result = await db.query(
      'SELECT id, file_name, file_path, mime_type, notes, created_at FROM patient_exams WHERE patient_id = $1 ORDER BY created_at DESC',
      [patientId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar exames do paciente.' });
  }
});

router.get('/exams/download/:filename', async (req, res) => {
  const { filename } = req.params;
  const absolutePath = path.join(__dirname, '..', 'uploads', 'exams', filename);
  try {
    const examRes = await db.query(
      'SELECT id, patient_id FROM patient_exams WHERE file_path LIKE $1',
      [`%${filename}`]
    );
    if (examRes.rows.length === 0) {
      return res.status(404).json({ error: 'Exame não encontrado.' });
    }
    const patientId = examRes.rows[0].patient_id;

    const linkCheck = await db.query(
      'SELECT id FROM professional_links WHERE user_id = $1 AND professional_id = $2 AND type = $3',
      [patientId, req.user.id, req.user.role]
    );
    if (linkCheck.rows.length === 0 && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Você não possui vínculo com o paciente deste exame.' });
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

router.post('/exams/:examId/notes', async (req, res) => {
  const examId = parseInt(req.params.examId);
  const { notes } = req.body;
  try {
    const examRes = await db.query('SELECT patient_id FROM patient_exams WHERE id = $1', [examId]);
    if (examRes.rows.length === 0) {
      return res.status(404).json({ error: 'Exame não encontrado.' });
    }
    const patientId = examRes.rows[0].patient_id;

    const linkCheck = await db.query(
      'SELECT id FROM professional_links WHERE user_id = $1 AND professional_id = $2 AND type = $3',
      [patientId, req.user.id, req.user.role]
    );
    if (linkCheck.rows.length === 0 && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    await db.query('UPDATE patient_exams SET notes = $1 WHERE id = $2', [notes, examId]);
    res.json({ message: 'Observações do exame atualizadas com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar notes do exame.' });
  }
});

// ==========================================
// DADOS ANTROPOMÉTRICOS DO PACIENTE
// ==========================================

// GET /professional/patients/:id/measurements — lista todas as medições
router.get('/patients/:id/measurements', verifyPatientAccess, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM patient_measurements WHERE patient_id = $1 ORDER BY measured_at DESC, created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar dados antropométricos.' });
  }
});

// POST /professional/patients/:id/measurements — registra nova medição
router.post('/patients/:id/measurements', verifyPatientAccess, async (req, res) => {
  const {
    measured_at, weight_kg, height_cm, body_fat_pct, muscle_mass_kg,
    waist_cm, hip_cm, chest_cm, arm_cm, thigh_cm, notes
  } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO patient_measurements
         (patient_id, professional_id, measured_at, weight_kg, height_cm,
          body_fat_pct, muscle_mass_kg, waist_cm, hip_cm, chest_cm, arm_cm, thigh_cm, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        req.params.id, req.user.id,
        measured_at || new Date().toISOString().split('T')[0],
        weight_kg    || null, height_cm   || null,
        body_fat_pct || null, muscle_mass_kg || null,
        waist_cm     || null, hip_cm      || null,
        chest_cm     || null, arm_cm      || null,
        thigh_cm     || null, notes       || null
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar medição.' });
  }
});

// DELETE /professional/patients/:id/measurements/:measId — remove uma medição
router.delete('/patients/:id/measurements/:measId', verifyPatientAccess, async (req, res) => {
  try {
    const check = await db.query(
      'SELECT id FROM patient_measurements WHERE id = $1 AND patient_id = $2',
      [req.params.measId, req.params.id]
    );
    if (check.rows.length === 0) return res.status(404).json({ error: 'Medição não encontrada.' });
    await db.query('DELETE FROM patient_measurements WHERE id = $1', [req.params.measId]);
    res.json({ message: 'Medição excluída.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir medição.' });
  }
});

module.exports = router;
