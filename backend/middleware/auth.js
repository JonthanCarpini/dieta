const jwt = require('jsonwebtoken');
const db = require('../db');

// Middleware para validar JWT e expor o req.user
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Carrega dados atualizados do banco (permite alteração de cargo sem relogar)
    const userRes = await db.query(
      'SELECT id, email, name, role, plan, trial_expires_at, premium_expires_at FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(403).json({ error: 'Usuário inexistente ou inativo.' });
    }

    const user = userRes.rows[0];
    const now = new Date();
    
    // Verifica se possui plano ativo (Trial dentro do prazo OU Premium dentro do prazo)
    let isPremiumActive = false;
    if (user.plan === 'premium') {
      if (!user.premium_expires_at || new Date(user.premium_expires_at) > now) {
        isPremiumActive = true;
      }
    } else {
      // Trial
      if (new Date(user.trial_expires_at) > now) {
        isPremiumActive = true; 
      }
    }

    req.user = {
      ...user,
      isPremiumActive
    };

    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token expirado ou inválido.' });
  }
};

// Middleware para verificar privilégios específicos (ex: admin, nutritionist, trainer)
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }
    if (!roles.includes(req.user.role) && req.user.role !== 'admin') {
      // Admins têm acesso universal a qualquer rota protegida por cargo
      return res.status(403).json({ error: 'Acesso negado. Nível de permissão insuficiente.' });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};
