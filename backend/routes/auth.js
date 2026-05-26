const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('../db');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 1. REGISTRO TRADICIONAL
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
  }

  try {
    // Verifica se usuário existe
    const checkUser = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'E-mail já cadastrado.' });
    }

    // Hash de senha
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Salva no banco
    const newUser = await db.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, role, plan',
      [email.toLowerCase().trim(), passwordHash, name]
    );

    // Cria token
    const token = jwt.sign({ id: newUser.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      token,
      user: newUser.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno ao registrar usuário.' });
  }
});

// 2. LOGIN TRADICIONAL
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  try {
    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'E-mail ou senha incorretos.' });
    }

    const user = userRes.rows[0];
    
    // Se logado anteriormente apenas via Google e sem senha cadastrada
    if (!user.password_hash) {
      return res.status(400).json({ error: 'Esta conta utiliza Login Social. Entre com o Google.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'E-mail ou senha incorretos.' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor durante o login.' });
  }
});

// 3. LOGIN SOCIAL GOOGLE
router.post('/google', async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'Credencial do Google ausente.' });
  }

  try {
    // Valida Token com a biblioteca oficial do Google
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const email = payload.email.toLowerCase().trim();
    const name = payload.name;

    // Procura usuário no banco
    let userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = null;

    if (userRes.rows.length === 0) {
      // Usuário não existe, cria novo registro (Trial padrão)
      const insertRes = await db.query(
        'INSERT INTO users (email, name, role, plan) VALUES ($1, $2, $3, $4) RETURNING *',
        [email, name, 'user', 'trial']
      );
      user = insertRes.rows[0];
    } else {
      user = userRes.rows[0];
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan
      }
    });
  } catch (err) {
    console.error("Erro no Google Auth:", err);
    res.status(400).json({ error: 'Autenticação do Google inválida ou expirada.' });
  }
});

// 4. CONFIGURAÇÃO CLIENT-SIDE (GOOGLE_CLIENT_ID)
router.get('/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || ''
  });
});

module.exports = router;
