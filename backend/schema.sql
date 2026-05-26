-- Schema de Banco de Dados para o Slimo AI (Nutrir.online)
-- Banco de Dados: PostgreSQL

-- Habilita extensão para UUID caso necessário no futuro
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- Pode ser nulo se logado exclusivamente via Google
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user', -- 'user', 'nutritionist', 'trainer', 'admin'
    plan VARCHAR(50) DEFAULT 'trial', -- 'trial', 'premium'
    trial_expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
    premium_expires_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELA DE PERFIS DE METAS (ONBOARDING)
CREATE TABLE IF NOT EXISTS profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
    age INTEGER,
    weight DECIMAL(5,2),
    height INTEGER,
    activity DECIMAL(4,3), -- Nível de atividade (1.2, 1.375, etc.)
    goal VARCHAR(20) CHECK (goal IN ('lose', 'maintain', 'gain')),
    goal_weight DECIMAL(5,2),
    speed DECIMAL(3,2), -- Ritmo kg/semana
    target_calories INTEGER,
    target_protein INTEGER,
    target_carbs INTEGER,
    target_fat INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELA DE HISTÓRICO DE REFEIÇÕES (DIÁRIO)
CREATE TABLE IF NOT EXISTS meals (
    id VARCHAR(100) PRIMARY KEY, -- Mantém ID gerado no frontend (meal_12345)
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL, -- Data no formato YYYY-MM-DD
    time TIME NOT NULL, -- Hora no formato HH:MM
    name VARCHAR(255) NOT NULL,
    items JSONB NOT NULL, -- Array JSON contendo ingredientes e seus macros
    total JSONB NOT NULL, -- Totais calculados de calorias e macros
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA DE RASTREAMENTO DE ÁGUA
CREATE TABLE IF NOT EXISTS water_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    consumed INTEGER DEFAULT 0, -- Em ml
    target INTEGER DEFAULT 2500, -- Em ml
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_date_water UNIQUE (user_id, date)
);

-- 5. TABELA DE JEJUM INTERMITENTE
CREATE TABLE IF NOT EXISTS fasting_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    duration_goal INTEGER NOT NULL, -- Metas de 12, 14, 16, 18 horas
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABELA DE RECEITAS IA SALVAS (DIÁRIAS OU SEMANAIS)
CREATE TABLE IF NOT EXISTS ai_recipes (
    id VARCHAR(100) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('daily', 'weekly')),
    name VARCHAR(255) NOT NULL,
    data JSONB NOT NULL, -- Dados da receita ou do plano semanal
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABELA DE VINCULAÇÃO COM PROFISSIONAIS
CREATE TABLE IF NOT EXISTS professional_links (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- ID do Paciente
    professional_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- ID do Nutri/Personal
    type VARCHAR(50) NOT NULL CHECK (type IN ('nutritionist', 'trainer')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_type_professional UNIQUE (user_id, type)
);

-- 8. TABELA DE FEEDBACKS / ORIENTAÇÕES DOS PROFISSIONAIS
CREATE TABLE IF NOT EXISTS professional_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- Paciente
    professional_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- Profissional remetente
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('nutritionist', 'trainer')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABELA DE CONFIGURAÇÕES GLOBAIS DO SISTEMA
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insere chave padrão vazia do Gemini
INSERT INTO system_settings (key, value) VALUES ('gemini_api_key', '') ON CONFLICT DO NOTHING;

-- Índices recomendados para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);
CREATE INDEX IF NOT EXISTS idx_water_user_date ON water_log(user_id, date);
CREATE INDEX IF NOT EXISTS idx_fasting_user_active ON fasting_log(user_id, active);
CREATE INDEX IF NOT EXISTS idx_ai_recipes_user ON ai_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_pro_links_patient ON professional_links(user_id);
CREATE INDEX IF NOT EXISTS idx_pro_links_professional ON professional_links(professional_id);
