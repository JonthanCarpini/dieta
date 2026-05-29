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

// POST /professional/patients/:id/target-calories — salva meta calórica do cálculo energético
router.post('/patients/:id/target-calories', verifyPatientAccess, async (req, res) => {
  const patientId = parseInt(req.params.id);
  const { target_calories } = req.body;
  if (!target_calories || isNaN(target_calories)) {
    return res.status(400).json({ error: 'Valor de meta calórica inválido.' });
  }
  try {
    await db.query(
      `INSERT INTO profiles (user_id, target_calories)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET target_calories = EXCLUDED.target_calories`,
      [patientId, Math.round(target_calories)]
    );
    res.json({ message: 'Meta calórica atualizada.', target_calories: Math.round(target_calories) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar meta calórica.' });
  }
});

// ==========================================
// BANCO DE ALIMENTOS DO NUTRICIONISTA
// ==========================================

async function _ensureProFoodsTable(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS pro_foods (
      id               SERIAL PRIMARY KEY,
      professional_id  INTEGER NOT NULL,
      name             VARCHAR(200) NOT NULL,
      category         VARCHAR(100) DEFAULT 'Personalizado',
      portion_grams    NUMERIC DEFAULT 100,
      energy_kcal      NUMERIC,
      protein_g        NUMERIC,
      fat_g            NUMERIC,
      carbs_g          NUMERIC,
      fiber_g          NUMERIC,
      sodium_mg        NUMERIC,
      calcium_mg       NUMERIC,
      iron_mg          NUMERIC,
      saturated_fat_g  NUMERIC,
      trans_fat_g      NUMERIC,
      measures         JSONB DEFAULT '[]',
      notes            TEXT,
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // Adiciona coluna measures se tabela já existia sem ela
  await db.query(`ALTER TABLE pro_foods ADD COLUMN IF NOT EXISTS measures JSONB DEFAULT '[]'`);
}

// GET /professional/foods — lista/busca alimentos do nutricionista
router.get('/foods', async (req, res) => {
  const proId = req.user.id;
  const q = (req.query.q || '').trim();
  try {
    await _ensureProFoodsTable(db);
    const result = q
      ? await db.query(
          `SELECT * FROM pro_foods WHERE professional_id = $1 AND name ILIKE $2 ORDER BY name LIMIT 40`,
          [proId, `%${q}%`]
        )
      : await db.query(
          `SELECT * FROM pro_foods WHERE professional_id = $1 ORDER BY created_at DESC LIMIT 200`,
          [proId]
        );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar alimentos.' });
  }
});

// POST /professional/foods — cadastrar alimento
router.post('/foods', async (req, res) => {
  const proId = req.user.id;
  const { name, category, portion_grams, energy_kcal, protein_g, fat_g, carbs_g,
          fiber_g, sodium_mg, calcium_mg, iron_mg, saturated_fat_g, trans_fat_g,
          measures, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome do alimento obrigatório.' });
  try {
    await _ensureProFoodsTable(db);
    const measuresJson = JSON.stringify(Array.isArray(measures) ? measures : []);
    const result = await db.query(
      `INSERT INTO pro_foods (professional_id, name, category, portion_grams, energy_kcal,
         protein_g, fat_g, carbs_g, fiber_g, sodium_mg, calcium_mg, iron_mg,
         saturated_fat_g, trans_fat_g, measures, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [proId, name.trim(), category || 'Personalizado', portion_grams || 100,
       energy_kcal||null, protein_g||null, fat_g||null, carbs_g||null, fiber_g||null,
       sodium_mg||null, calcium_mg||null, iron_mg||null, saturated_fat_g||null,
       trans_fat_g||null, measuresJson, notes||null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar alimento.' });
  }
});

// PUT /professional/foods/:id — atualizar alimento
router.put('/foods/:id', async (req, res) => {
  const proId = req.user.id;
  const { name, category, portion_grams, energy_kcal, protein_g, fat_g, carbs_g,
          fiber_g, sodium_mg, calcium_mg, iron_mg, saturated_fat_g, trans_fat_g,
          measures, notes } = req.body;
  try {
    await _ensureProFoodsTable(db);
    const chk = await db.query('SELECT id FROM pro_foods WHERE id=$1 AND professional_id=$2', [req.params.id, proId]);
    if (!chk.rows.length) return res.status(404).json({ error: 'Alimento não encontrado.' });
    const measuresJson = JSON.stringify(Array.isArray(measures) ? measures : []);
    const result = await db.query(
      `UPDATE pro_foods SET name=$1, category=$2, portion_grams=$3, energy_kcal=$4,
         protein_g=$5, fat_g=$6, carbs_g=$7, fiber_g=$8, sodium_mg=$9, calcium_mg=$10,
         iron_mg=$11, saturated_fat_g=$12, trans_fat_g=$13, measures=$14, notes=$15, updated_at=NOW()
       WHERE id=$16 RETURNING *`,
      [name, category||'Personalizado', portion_grams||100,
       energy_kcal||null, protein_g||null, fat_g||null, carbs_g||null, fiber_g||null,
       sodium_mg||null, calcium_mg||null, iron_mg||null, saturated_fat_g||null,
       trans_fat_g||null, measuresJson, notes||null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar alimento.' });
  }
});

// DELETE /professional/foods/:id
router.delete('/foods/:id', async (req, res) => {
  const proId = req.user.id;
  try {
    await db.query('DELETE FROM pro_foods WHERE id=$1 AND professional_id=$2', [req.params.id, proId]);
    res.json({ message: 'Alimento excluído.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir alimento.' });
  }
});

// ==========================================
// ALIMENTOS IMPORTADOS (base global, source='extra')
// ==========================================

// GET /professional/imported-foods?q=&page=&limit=
router.get('/imported-foods', async (req, res) => {
  const q     = (req.query.q || '').trim();
  const page  = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(parseInt(req.query.limit) || 30, 100);
  const offset = (page - 1) * limit;
  try {
    const where  = q ? `WHERE source='extra' AND name ILIKE $1` : `WHERE source='extra'`;
    const params = q ? [`%${q}%`] : [];

    const countRes = await db.query(`SELECT COUNT(*) FROM foods ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    const listRes = await db.query(
      `SELECT id, name, category, energy_kcal, protein_g, carbs_g, fat_g, fiber_g
       FROM foods ${where}
       ORDER BY name ASC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({
      items: listRes.rows,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar alimentos importados.' });
  }
});

// DELETE /professional/imported-foods/:id — remove um alimento importado
router.delete('/imported-foods/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM foods WHERE id=$1 AND source='extra'`, [req.params.id]);
    res.json({ message: 'Alimento removido.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover alimento.' });
  }
});

// ==========================================
// HISTÓRICO DE CÁLCULO ENERGÉTICO
// ==========================================

const _ensureEnergyTable = (db) => db.query(`
  CREATE TABLE IF NOT EXISTS energy_calculations (
    id                   SERIAL PRIMARY KEY,
    patient_id           INTEGER NOT NULL,
    professional_id      INTEGER NOT NULL,
    calculated_at        TIMESTAMPTZ DEFAULT NOW(),
    formula_id           INTEGER,
    formula_name         VARCHAR(120),
    peso                 NUMERIC,
    altura               NUMERIC,
    idade                INTEGER,
    genero               CHAR(1),
    mlg                  NUMERIC,
    fator_atividade      NUMERIC,
    fator_atividade_desc VARCHAR(60),
    fator_injuria        NUMERIC,
    fator_injuria_desc   VARCHAR(120),
    tmb                  NUMERIC,
    get_value            NUMERIC,
    notes                TEXT
  )
`);

// GET /professional/patients/:id/energy-calculations
router.get('/patients/:id/energy-calculations', verifyPatientAccess, async (req, res) => {
  try {
    await _ensureEnergyTable(db);
    const result = await db.query(
      `SELECT * FROM energy_calculations WHERE patient_id = $1 ORDER BY calculated_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar histórico de cálculo energético.' });
  }
});

// POST /professional/patients/:id/energy-calculations
router.post('/patients/:id/energy-calculations', verifyPatientAccess, async (req, res) => {
  const patientId = parseInt(req.params.id);
  const {
    formula_id, formula_name, peso, altura, idade, genero, mlg,
    fator_atividade, fator_atividade_desc, fator_injuria, fator_injuria_desc,
    tmb, get_value, notes
  } = req.body;

  if (!tmb || !get_value) return res.status(400).json({ error: 'TMB e GET são obrigatórios.' });

  try {
    await _ensureEnergyTable(db);
    const result = await db.query(
      `INSERT INTO energy_calculations
         (patient_id, professional_id, formula_id, formula_name, peso, altura, idade, genero, mlg,
          fator_atividade, fator_atividade_desc, fator_injuria, fator_injuria_desc, tmb, get_value, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [
        patientId, req.user.id,
        formula_id   || null, formula_name || null,
        peso         || null, altura       || null,
        idade        || null, genero       || null,
        mlg          || null,
        fator_atividade      || null, fator_atividade_desc || null,
        fator_injuria        || null, fator_injuria_desc   || null,
        tmb, get_value,
        notes || null
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar cálculo energético.' });
  }
});

// DELETE /professional/patients/:id/energy-calculations/:calcId
router.delete('/patients/:id/energy-calculations/:calcId', verifyPatientAccess, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM energy_calculations WHERE id = $1 AND patient_id = $2',
      [req.params.calcId, req.params.id]
    );
    res.json({ message: 'Registro excluído.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir registro.' });
  }
});

module.exports = router;
