const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Rotas administrativas exigem login JWT e cargo estrito de Admin
router.use(authenticateToken);
router.use(requireRole(['admin']));

// ==========================================
// 1. LISTAR TODOS OS USUÁRIOS DO SISTEMA
// ==========================================
router.get('/users', async (req, res) => {
  try {
    const usersRes = await db.query(
      `SELECT id, email, name, role, plan, trial_expires_at, premium_expires_at, created_at 
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
  const { plan, durationDays } = req.body; // plan: 'trial' ou 'premium'

  if (!plan || !['trial', 'premium'].includes(plan)) {
    return res.status(400).json({ error: 'Plano inválido.' });
  }

  try {
    let expiresAt = null;
    if (plan === 'premium') {
      const days = parseInt(durationDays) || 30; // Padrão 30 dias
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);
    } else {
      // Volta para o trial resetando 7 dias de tolerância
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
    }

    const updated = await db.query(
      `UPDATE users 
       SET plan = $1, 
           premium_expires_at = $2, 
           trial_expires_at = CASE WHEN $1 = 'trial' THEN $3 ELSE trial_expires_at END
       WHERE id = $4 RETURNING id, email, name, plan, premium_expires_at`,
      [plan, plan === 'premium' ? expiresAt : null, plan === 'trial' ? expiresAt : null, userId]
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
  const { email, password, name, role } = req.body;

  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
  }

  if (!['nutritionist', 'trainer'].includes(role)) {
    return res.status(400).json({ error: 'Cargo de profissional deve ser nutritionist ou trainer.' });
  }

  try {
    const checkUser = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'E-mail já cadastrado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await db.query(
      `INSERT INTO users (email, password_hash, name, role, plan, premium_expires_at) 
       VALUES ($1, $2, $3, $4, 'premium', NOW() + INTERVAL '10 years') 
       RETURNING id, email, name, role`,
      [email.toLowerCase().trim(), passwordHash, name, role]
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
  const { id, name, display_name, price, duration_days, description, features } = req.body;

  if (!name || !display_name || price === undefined || duration_days === undefined) {
    return res.status(400).json({ error: 'Preencha os campos obrigatórios.' });
  }

  const featuresJson = typeof features === 'string' ? features : JSON.stringify(features || []);

  try {
    if (id) {
      // Atualizar plano existente
      const updated = await db.query(`
        UPDATE plans 
        SET name = $1, display_name = $2, price = $3, duration_days = $4, description = $5, features = $6
        WHERE id = $7
        RETURNING *
      `, [name.toLowerCase().trim(), display_name, price, duration_days, description, featuresJson, id]);
      
      res.json({ message: 'Plano atualizado com sucesso.', plan: updated.rows[0] });
    } else {
      // Criar novo plano
      const inserted = await db.query(`
        INSERT INTO plans (name, display_name, price, duration_days, description, features)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (name) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          price = EXCLUDED.price,
          duration_days = EXCLUDED.duration_days,
          description = EXCLUDED.description,
          features = EXCLUDED.features
        RETURNING *
      `, [name.toLowerCase().trim(), display_name, price, duration_days, description, featuresJson]);
      
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
