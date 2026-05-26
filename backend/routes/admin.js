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
  const { gemini_api_key } = req.body;
  if (gemini_api_key === undefined) {
    return res.status(400).json({ error: 'Parâmetro gemini_api_key ausente.' });
  }

  try {
    await db.query(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('gemini_api_key', $1, NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `, [gemini_api_key]);

    res.json({ message: 'Configurações salvas com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar configurações.' });
  }
});

module.exports = router;
