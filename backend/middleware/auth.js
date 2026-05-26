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
      `SELECT u.id, u.email, u.name, u.role, u.plan, u.trial_expires_at, u.premium_expires_at,
              p.has_nutritionist, p.has_trainer, p.max_nutritionist_appointments_per_month, p.max_trainer_appointments_per_month
       FROM users u
       LEFT JOIN plans p ON u.plan = p.name
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(403).json({ error: 'Usuário inexistente ou inativo.' });
    }

    const user = userRes.rows[0];
    const now = new Date();
    
    // Verifica se o plano expirou (Trial dentro do prazo OU Premium/outro plano dentro do prazo)
    let isPlanExpired = false;
    if (user.plan === 'trial') {
      if (user.trial_expires_at && new Date(user.trial_expires_at) < now) {
        isPlanExpired = true;
      }
    } else {
      if (user.premium_expires_at && new Date(user.premium_expires_at) < now) {
        isPlanExpired = true;
      }
    }

    // Mantém compatibilidade com código existente que usa isPremiumActive para indicar conta ativa/não-expirada
    const isPremiumActive = !isPlanExpired;

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      trial_expires_at: user.trial_expires_at,
      premium_expires_at: user.premium_expires_at,
      isPremiumActive,
      isPlanExpired,
      has_nutritionist: user.has_nutritionist || false,
      has_trainer: user.has_trainer || false,
      max_nutritionist_appointments_per_month: parseInt(user.max_nutritionist_appointments_per_month) || 0,
      max_trainer_appointments_per_month: parseInt(user.max_trainer_appointments_per_month) || 0
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
