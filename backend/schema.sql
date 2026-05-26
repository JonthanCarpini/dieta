-- Schema de Banco de Dados para o Nutrir AI (Nutrir.online)
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
    commission_percentage DECIMAL(5,2) DEFAULT 0.00, -- Comissão de profissionais sobre assinaturas de seus pacientes
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

-- Insere chaves de API padrão vazias
INSERT INTO system_settings (key, value) VALUES 
('gemini_api_key', ''),
('google_client_id', ''),
('mercadopago_token', ''),
('asaas_key', '')
ON CONFLICT (key) DO NOTHING;

-- 10. TABELA DE PLANOS DO SISTEMA
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    duration_days INTEGER NOT NULL DEFAULT 30,
    description TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    has_nutritionist BOOLEAN DEFAULT FALSE,
    has_trainer BOOLEAN DEFAULT FALSE,
    max_nutritionist_appointments_per_month INTEGER DEFAULT 0,
    max_trainer_appointments_per_month INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insere planos padrões caso não existam
INSERT INTO plans (name, display_name, price, duration_days, description, features, has_nutritionist, has_trainer, max_nutritionist_appointments_per_month, max_trainer_appointments_per_month) VALUES 
('trial', 'Plano de Testes (7 dias)', 0.00, 7, 'Experimente todas as funcionalidades básicas do Nutrir gratuitamente.', '["Controle de macros básico", "Acompanhamento de água", "Escanear pratos por IA"]'::jsonb, FALSE, FALSE, 0, 0),
('premium', 'Plano Premium Mensal', 29.90, 30, 'Desbloqueie orientação profissional com nutricionistas e personal trainers.', '["Receitas por IA ilimitadas", "Acompanhamento profissional completo", "Análise de refeições ilimitada"]'::jsonb, TRUE, TRUE, 4, 4)
ON CONFLICT (name) DO NOTHING;

-- 11. TABELA DE PAGAMENTOS E FATURAMENTO (PAYMENTS LOG)
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    payment_gateway VARCHAR(50) NOT NULL, -- 'mercadopago' ou 'asaas'
    gateway_payment_id VARCHAR(255) UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'approved',
    professional_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Profissional comissionado
    commission_amount DECIMAL(10,2) DEFAULT 0.00,                   -- Valor da comissão calculada
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. TABELA DE DISPONIBILIDADE DE AGENDA DOS PROFISSIONAIS
CREATE TABLE IF NOT EXISTS professional_availability (
    id SERIAL PRIMARY KEY,
    professional_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Domingo, 1=Segunda ... 6=Sábado
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_availability_times CHECK (end_time > start_time)
);

-- Índices recomendados para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);
CREATE INDEX IF NOT EXISTS idx_water_user_date ON water_log(user_id, date);
CREATE INDEX IF NOT EXISTS idx_fasting_user_active ON fasting_log(user_id, active);
CREATE INDEX IF NOT EXISTS idx_ai_recipes_user ON ai_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_pro_links_patient ON professional_links(user_id);
CREATE INDEX IF NOT EXISTS idx_pro_links_professional ON professional_links(professional_id);
CREATE INDEX IF NOT EXISTS idx_availability_professional ON professional_availability(professional_id);

-- 13. TABELA DE AGENDAMENTOS DE CONSULTAS (VIDEO CHAMADAS)
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    professional_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    video_link VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'cancelled', 'completed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional ON appointments(professional_id);
