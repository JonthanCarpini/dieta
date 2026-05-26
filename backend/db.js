const { Pool } = require('pg');
require('dotenv').config();

// Inicializa o Pool de Conexões do PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Descomente a linha abaixo se a VPS usar SSL autoassinado/forçado para o BD fora do compose
  // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
