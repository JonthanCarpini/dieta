const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const professionalRoutes = require('./routes/professional');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 5000;

// Configuração do CORS (libera acesso do frontend no domínio correspondente)
app.use(cors({
  origin: '*', // Em produção, restrinja para o seu domínio (ex: https://nutrir.online)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// One-time idempotent migration for clinical profile columns
db.query(`
  ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS medications TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS health_goals TEXT DEFAULT ''
`).catch((e) => console.error('Migration skip:', e.message));

// One-time idempotent migration for activity tracking table
db.query(`
  CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    steps INTEGER DEFAULT 0,
    steps_target INTEGER DEFAULT 10000,
    steps_calories DECIMAL(6,1) DEFAULT 0.0,
    exercises JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_date_activity UNIQUE (user_id, date)
  );
`).then(() => {
  db.query(`CREATE INDEX IF NOT EXISTS idx_activity_log_user_date ON activity_log(user_id, date);`);
}).catch((e) => console.error('Activity migration skip:', e.message));

// Migration: Tabela de Alimentos (Banco TACO/TBCA)
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS foods (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'Geral',
        energy_kcal DECIMAL(7,2) DEFAULT 0,
        protein_g DECIMAL(6,2) DEFAULT 0,
        carbs_g DECIMAL(6,2) DEFAULT 0,
        fat_g DECIMAL(6,2) DEFAULT 0,
        fiber_g DECIMAL(6,2),
        source VARCHAR(50) DEFAULT 'TACO',
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name)`);

    const count = await db.query('SELECT COUNT(*) FROM foods WHERE source = $1', ['TACO']);
    if (parseInt(count.rows[0].count) === 0) {
      await db.query(`
        INSERT INTO foods (name, category, energy_kcal, protein_g, carbs_g, fat_g, fiber_g, source) VALUES
        -- Cereais e Derivados
        ('Arroz branco cozido','Cereais e Derivados',128,2.5,28.1,0.2,1.6,'TACO'),
        ('Arroz integral cozido','Cereais e Derivados',124,2.6,25.8,1.0,2.7,'TACO'),
        ('Macarrão cozido','Cereais e Derivados',110,3.8,22.7,0.4,1.6,'TACO'),
        ('Macarrão integral cozido','Cereais e Derivados',124,5.0,23.6,1.1,2.8,'TACO'),
        ('Pão francês','Cereais e Derivados',300,8.0,58.6,3.1,2.3,'TACO'),
        ('Pão de forma integral','Cereais e Derivados',253,8.1,48.0,3.1,6.9,'TACO'),
        ('Pão de forma branco','Cereais e Derivados',270,7.8,52.3,3.4,2.0,'TACO'),
        ('Aveia em flocos','Cereais e Derivados',394,13.9,66.6,8.5,9.1,'TACO'),
        ('Farelo de aveia','Cereais e Derivados',246,17.3,66.2,7.0,15.9,'TACO'),
        ('Farinha de trigo crua','Cereais e Derivados',361,9.8,75.1,1.4,2.4,'TACO'),
        ('Farinha de mandioca crua','Cereais e Derivados',344,1.4,84.6,0.4,6.5,'TACO'),
        ('Tapioca (goma)','Cereais e Derivados',346,0.2,85.5,0.0,0.0,'TACO'),
        ('Milho verde cozido','Cereais e Derivados',82,3.2,18.7,1.0,2.3,'TACO'),
        ('Cuscuz nordestino preparado','Cereais e Derivados',164,4.5,36.3,0.7,1.6,'TACO'),
        ('Batata inglesa cozida','Cereais e Derivados',52,1.2,12.0,0.1,1.8,'TACO'),
        ('Batata doce cozida','Cereais e Derivados',77,1.4,18.4,0.1,2.2,'TACO'),
        ('Mandioca cozida','Cereais e Derivados',125,0.9,30.1,0.3,1.9,'TACO'),
        ('Inhame cozido','Cereais e Derivados',91,1.5,21.0,0.3,1.5,'TACO'),
        ('Polenta cozida','Cereais e Derivados',70,1.8,14.9,0.5,0.6,'TACO'),
        ('Granola','Cereais e Derivados',365,9.0,67.0,8.0,7.0,'TACO'),
        ('Pão de queijo assado','Cereais e Derivados',312,6.1,46.0,11.1,0.5,'TACO'),
        -- Leguminosas
        ('Feijão carioca cozido','Leguminosas',76,4.8,13.6,0.5,8.5,'TACO'),
        ('Feijão preto cozido','Leguminosas',77,4.5,14.0,0.5,8.4,'TACO'),
        ('Feijão branco cozido','Leguminosas',100,6.0,18.3,0.3,7.4,'TACO'),
        ('Lentilha cozida','Leguminosas',93,6.3,16.3,0.5,3.7,'TACO'),
        ('Grão-de-bico cozido','Leguminosas',164,8.9,27.4,2.6,6.2,'TACO'),
        ('Ervilha cozida','Leguminosas',74,4.8,12.7,0.4,4.7,'TACO'),
        ('Soja cozida','Leguminosas',141,12.4,11.0,6.4,9.6,'TACO'),
        ('Proteína de soja texturizada (seca)','Leguminosas',330,52.5,28.1,1.2,17.1,'TACO'),
        -- Carnes Bovinas
        ('Patinho grelhado','Carnes Bovinas',219,32.0,0.0,10.0,0.0,'TACO'),
        ('Acém cozido','Carnes Bovinas',233,30.0,0.0,13.0,0.0,'TACO'),
        ('Alcatra grelhada','Carnes Bovinas',205,34.0,0.0,7.5,0.0,'TACO'),
        ('Contrafilé grelhado','Carnes Bovinas',240,30.8,0.0,13.0,0.0,'TACO'),
        ('Carne moída refogada','Carnes Bovinas',222,25.0,0.0,14.0,0.0,'TACO'),
        ('Fígado bovino grelhado','Carnes Bovinas',135,26.0,2.9,2.5,0.0,'TACO'),
        ('Costela bovina cozida','Carnes Bovinas',380,25.0,0.0,32.0,0.0,'TACO'),
        ('Músculo cozido','Carnes Bovinas',223,33.0,0.0,10.0,0.0,'TACO'),
        -- Carnes de Frango
        ('Frango peito grelhado (sem pele)','Carnes de Frango',159,32.0,0.0,3.0,0.0,'TACO'),
        ('Frango coxa assada (sem pele)','Carnes de Frango',198,26.0,0.0,10.0,0.0,'TACO'),
        ('Frango filé cozido','Carnes de Frango',148,29.0,0.0,3.5,0.0,'TACO'),
        ('Frango asa assada','Carnes de Frango',313,28.0,0.0,22.0,0.0,'TACO'),
        ('Frango sobrecoxa (sem pele) assada','Carnes de Frango',215,25.0,0.0,12.5,0.0,'TACO'),
        -- Carnes Suínas
        ('Lombo suíno assado','Carnes Suínas',200,27.0,0.0,10.0,0.0,'TACO'),
        ('Costela suína assada','Carnes Suínas',385,26.0,0.0,31.0,0.0,'TACO'),
        ('Bacon cozido','Carnes Suínas',541,37.0,1.4,42.0,0.0,'TACO'),
        ('Linguiça calabresa cozida','Carnes Suínas',290,12.0,2.5,26.0,0.0,'TACO'),
        ('Linguiça de frango grelhada','Carnes de Frango',180,18.0,1.0,11.5,0.0,'TACO'),
        -- Ovos
        ('Ovo inteiro cozido','Ovos',146,13.3,0.6,9.5,0.0,'TACO'),
        ('Clara de ovo cozida','Ovos',51,10.9,0.7,0.0,0.0,'TACO'),
        ('Gema de ovo cozida','Ovos',317,15.9,0.7,27.7,0.0,'TACO'),
        ('Ovo mexido (com azeite)','Ovos',176,12.0,0.6,14.0,0.0,'TACO'),
        -- Peixes e Frutos do Mar
        ('Atum em conserva em água','Peixes e Frutos do Mar',128,28.0,0.0,1.9,0.0,'TACO'),
        ('Sardinha em conserva em óleo','Peixes e Frutos do Mar',191,27.0,0.0,9.0,0.0,'TACO'),
        ('Tilápia grelhada','Peixes e Frutos do Mar',130,26.0,0.0,2.7,0.0,'TACO'),
        ('Salmão grelhado','Peixes e Frutos do Mar',231,25.0,0.0,14.0,0.0,'TACO'),
        ('Camarão cozido','Peixes e Frutos do Mar',99,20.0,0.9,1.1,0.0,'TACO'),
        ('Bacalhau dessalgado cozido','Peixes e Frutos do Mar',165,35.0,0.0,2.0,0.0,'TACO'),
        ('Merluza grelhada','Peixes e Frutos do Mar',101,22.0,0.0,1.0,0.0,'TACO'),
        ('Pescada cozida','Peixes e Frutos do Mar',97,20.0,0.0,1.9,0.0,'TACO'),
        -- Leite e Derivados
        ('Leite integral','Leite e Derivados',61,3.2,4.7,3.3,0.0,'TACO'),
        ('Leite semidesnatado','Leite e Derivados',48,3.3,4.8,1.6,0.0,'TACO'),
        ('Leite desnatado','Leite e Derivados',35,3.4,5.0,0.1,0.0,'TACO'),
        ('Iogurte natural integral','Leite e Derivados',66,3.4,5.0,3.3,0.0,'TACO'),
        ('Iogurte natural desnatado','Leite e Derivados',49,3.5,7.0,0.5,0.0,'TACO'),
        ('Queijo minas frescal','Leite e Derivados',264,17.4,3.0,20.2,0.0,'TACO'),
        ('Queijo mussarela','Leite e Derivados',322,22.0,2.4,25.0,0.0,'TACO'),
        ('Queijo parmesão ralado','Leite e Derivados',452,35.7,3.2,32.7,0.0,'TACO'),
        ('Queijo prato','Leite e Derivados',358,26.0,1.6,27.0,0.0,'TACO'),
        ('Requeijão cremoso','Leite e Derivados',279,11.5,4.2,24.0,0.0,'TACO'),
        ('Creme de leite','Leite e Derivados',281,2.3,3.4,29.4,0.0,'TACO'),
        ('Leite condensado','Leite e Derivados',321,7.8,55.0,8.4,0.0,'TACO'),
        ('Whey protein em pó (concentrado)','Suplementos',377,78.0,11.0,4.0,0.0,'TACO'),
        ('Proteína isolada de soja em pó','Suplementos',340,80.7,0.0,3.8,0.0,'TACO'),
        -- Verduras e Hortaliças
        ('Alface crua','Verduras e Hortaliças',11,1.3,1.7,0.2,1.8,'TACO'),
        ('Brócolis cozido','Verduras e Hortaliças',35,3.8,5.0,0.4,3.0,'TACO'),
        ('Cenoura crua','Verduras e Hortaliças',34,1.3,7.7,0.2,3.2,'TACO'),
        ('Couve refogada','Verduras e Hortaliças',69,4.2,6.6,3.4,1.9,'TACO'),
        ('Espinafre cozido','Verduras e Hortaliças',19,2.5,2.8,0.3,1.7,'TACO'),
        ('Abobrinha cozida','Verduras e Hortaliças',18,0.8,3.9,0.1,1.0,'TACO'),
        ('Beterraba cozida','Verduras e Hortaliças',37,1.6,7.9,0.1,2.0,'TACO'),
        ('Chuchu cozido','Verduras e Hortaliças',17,0.6,3.8,0.1,1.4,'TACO'),
        ('Tomate cru','Verduras e Hortaliças',15,0.9,3.1,0.2,1.2,'TACO'),
        ('Pepino cru','Verduras e Hortaliças',13,0.7,2.8,0.1,0.4,'TACO'),
        ('Cebola crua','Verduras e Hortaliças',39,0.9,9.0,0.1,1.5,'TACO'),
        ('Pimentão verde cru','Verduras e Hortaliças',20,0.9,4.2,0.3,1.3,'TACO'),
        ('Pimentão vermelho cru','Verduras e Hortaliças',27,1.0,6.3,0.3,1.3,'TACO'),
        ('Abóbora cozida','Verduras e Hortaliças',19,0.6,4.5,0.1,1.4,'TACO'),
        ('Couve-flor cozida','Verduras e Hortaliças',19,2.1,2.2,0.3,1.5,'TACO'),
        ('Repolho cru','Verduras e Hortaliças',16,1.3,3.4,0.1,1.3,'TACO'),
        ('Quiabo cozido','Verduras e Hortaliças',26,1.9,5.2,0.1,2.1,'TACO'),
        ('Vagem cozida','Verduras e Hortaliças',24,1.8,4.9,0.1,2.7,'TACO'),
        ('Alho cru','Verduras e Hortaliças',136,6.3,28.9,0.2,4.3,'TACO'),
        ('Berinjela cozida','Verduras e Hortaliças',24,0.8,5.5,0.2,2.0,'TACO'),
        ('Acelga crua','Verduras e Hortaliças',17,1.7,2.8,0.2,1.6,'TACO'),
        ('Rúcula crua','Verduras e Hortaliças',25,2.6,3.7,0.4,1.6,'TACO'),
        ('Agrião cru','Verduras e Hortaliças',23,2.4,4.4,0.1,1.5,'TACO'),
        -- Frutas
        ('Banana nanica crua','Frutas',92,1.3,23.8,0.1,2.9,'TACO'),
        ('Banana prata crua','Frutas',98,1.3,26.0,0.1,1.9,'TACO'),
        ('Maçã fuji crua','Frutas',56,0.3,15.2,0.1,2.0,'TACO'),
        ('Laranja pera crua','Frutas',37,1.0,8.9,0.1,1.7,'TACO'),
        ('Manga tommy crua','Frutas',64,0.7,17.0,0.3,1.6,'TACO'),
        ('Mamão papaia cru','Frutas',40,0.5,10.4,0.1,1.8,'TACO'),
        ('Uva itália crua','Frutas',69,0.6,17.9,0.1,0.9,'TACO'),
        ('Abacaxi cru','Frutas',48,0.9,12.3,0.1,1.0,'TACO'),
        ('Morango cru','Frutas',30,0.8,7.1,0.3,2.0,'TACO'),
        ('Melancia crua','Frutas',33,0.7,8.1,0.2,0.4,'TACO'),
        ('Pêssego cru','Frutas',36,0.8,9.4,0.1,1.5,'TACO'),
        ('Abacate cru','Frutas',96,1.2,6.0,8.4,6.9,'TACO'),
        ('Limão siciliano (suco)','Frutas',22,0.4,7.0,0.1,0.3,'TACO'),
        ('Acerola crua','Frutas',32,0.8,7.3,0.2,1.4,'TACO'),
        ('Goiaba vermelha crua','Frutas',54,2.3,12.0,0.4,6.2,'TACO'),
        ('Maracujá polpa crua','Frutas',68,2.4,13.7,0.7,3.1,'TACO'),
        ('Melão cantaloupe cru','Frutas',25,0.8,5.8,0.1,0.7,'TACO'),
        ('Pera crua','Frutas',55,0.4,15.2,0.1,3.0,'TACO'),
        ('Kiwi cru','Frutas',61,1.1,14.7,0.6,3.0,'TACO'),
        ('Coco polpa fresca','Frutas',406,4.0,12.5,38.3,9.6,'TACO'),
        ('Ameixa crua','Frutas',46,0.7,11.4,0.3,1.4,'TACO'),
        ('Tangerina ponkan crua','Frutas',38,0.8,9.3,0.2,1.0,'TACO'),
        -- Gorduras e Óleos
        ('Azeite de oliva','Gorduras e Óleos',884,0.0,0.0,100.0,0.0,'TACO'),
        ('Óleo de soja','Gorduras e Óleos',884,0.0,0.0,100.0,0.0,'TACO'),
        ('Óleo de milho','Gorduras e Óleos',884,0.0,0.0,100.0,0.0,'TACO'),
        ('Óleo de coco','Gorduras e Óleos',862,0.0,0.0,100.0,0.0,'TACO'),
        ('Manteiga com sal','Gorduras e Óleos',726,0.5,0.0,83.0,0.0,'TACO'),
        ('Margarina vegetal','Gorduras e Óleos',537,0.1,0.6,59.0,0.0,'TACO'),
        -- Oleaginosas e Sementes
        ('Amendoim torrado (sem sal)','Oleaginosas e Sementes',600,28.8,19.3,49.9,8.5,'TACO'),
        ('Pasta de amendoim integral','Oleaginosas e Sementes',598,25.1,13.9,51.4,6.0,'TACO'),
        ('Castanha de caju assada (sem sal)','Oleaginosas e Sementes',574,18.5,29.1,46.3,3.7,'TACO'),
        ('Castanha do Pará crua','Oleaginosas e Sementes',701,14.5,12.3,67.1,7.9,'TACO'),
        ('Amêndoa crua','Oleaginosas e Sementes',607,21.9,18.7,51.5,12.0,'TACO'),
        ('Noz crua','Oleaginosas e Sementes',620,15.2,9.2,58.1,4.4,'TACO'),
        ('Semente de chia','Oleaginosas e Sementes',489,16.5,42.1,30.7,34.4,'TACO'),
        ('Semente de linhaça','Oleaginosas e Sementes',495,18.3,28.9,34.3,27.3,'TACO'),
        ('Semente de gergelim','Oleaginosas e Sementes',597,20.4,9.4,50.4,5.9,'TACO'),
        ('Semente de girassol','Oleaginosas e Sementes',582,23.4,20.0,47.5,8.6,'TACO'),
        -- Bebidas
        ('Água de coco','Bebidas',19,0.5,4.4,0.1,0.0,'TACO'),
        ('Suco de laranja natural','Bebidas',45,0.7,10.8,0.2,0.4,'TACO'),
        ('Café infusão (sem açúcar)','Bebidas',1,0.1,0.2,0.0,0.0,'TACO'),
        ('Chá verde (infusão)','Bebidas',1,0.1,0.0,0.0,0.0,'TACO'),
        ('Leite de soja','Bebidas',40,3.3,2.2,1.5,0.0,'TACO'),
        ('Suco de uva integral','Bebidas',67,0.6,16.6,0.1,0.1,'TACO'),
        -- Produtos Açucarados e Condimentos
        ('Açúcar refinado','Produtos Açucarados',387,0.0,100.0,0.0,0.0,'TACO'),
        ('Açúcar mascavo','Produtos Açucarados',375,0.3,97.1,0.0,0.0,'TACO'),
        ('Mel de abelha','Produtos Açucarados',309,0.4,82.4,0.0,0.0,'TACO'),
        ('Maionese','Condimentos',669,1.4,3.6,72.0,0.0,'TACO'),
        ('Molho de tomate (industrializado)','Condimentos',44,1.5,8.4,0.7,1.0,'TACO'),
        ('Ketchup','Condimentos',92,1.4,22.4,0.2,0.8,'TACO'),
        ('Mostarda amarela','Condimentos',67,4.4,6.3,3.3,3.1,'TACO'),
        ('Shoyu (molho de soja)','Condimentos',60,5.5,8.4,0.1,0.6,'TACO')
      ON CONFLICT DO NOTHING
    `);
    console.log('Banco de alimentos TACO inicializado com sucesso.');
  }
  } catch (e) {
    console.error('Foods migration error:', e.message);
  }
})();

// Registro das rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/professional', professionalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// ==========================================
// 5. WEBHOOKS DE PAGAMENTOS (MERCADO PAGO & ASAAS)
// ==========================================

// Função auxiliar para registrar pagamentos e calcular comissões
async function recordPayment(payerEmail, planName, gateway, gatewayPaymentId) {
  try {
    // 1. Busca dados do usuário pagador
    const userRes = await db.query("SELECT id FROM users WHERE email = $1", [payerEmail.toLowerCase().trim()]);
    if (userRes.rows.length === 0) return null;
    const userId = userRes.rows[0].id;

    // 2. Busca o preço e dados do plano
    const planRes = await db.query("SELECT name, price, duration_days FROM plans WHERE name = $1", [planName]);
    const planInfo = planRes.rows[0] || { name: 'premium', price: 29.90, duration_days: 30 };
    const amount = parseFloat(planInfo.price);

    // 3. Verifica se o usuário tem profissional vinculado (nutri ou personal)
    const linksRes = await db.query(`
      SELECT pl.professional_id, u.commission_percentage 
      FROM professional_links pl
      JOIN users u ON pl.professional_id = u.id
      WHERE pl.user_id = $1
    `, [userId]);

    if (linksRes.rows.length === 0) {
      // Nenhum profissional vinculado -> Registra pagamento sem comissão
      await db.query(`
        INSERT INTO payments (user_id, amount, plan_name, payment_gateway, gateway_payment_id, status, professional_id, commission_amount)
        VALUES ($1, $2, $3, $4, $5, 'approved', NULL, 0.00)
        ON CONFLICT (gateway_payment_id) DO NOTHING
      `, [userId, amount, planInfo.name, gateway, gatewayPaymentId]);
    } else {
      // Um ou mais profissionais vinculados -> Registra pagamento com comissão para cada um
      for (const link of linksRes.rows) {
        const commissionVal = amount * (parseFloat(link.commission_percentage || 0) / 100);
        const uniqueGatewayId = `${gatewayPaymentId}_${link.professional_id}`;
        
        await db.query(`
          INSERT INTO payments (user_id, amount, plan_name, payment_gateway, gateway_payment_id, status, professional_id, commission_amount)
          VALUES ($1, $2, $3, $4, $5, 'approved', $6, $7)
          ON CONFLICT (gateway_payment_id) DO NOTHING
        `, [userId, amount, planInfo.name, gateway, uniqueGatewayId, link.professional_id, commissionVal]);
      }
    }

    return planInfo;
  } catch (err) {
    console.error("Erro ao registrar pagamento no banco:", err);
    return null;
  }
}

// Webhook Mercado Pago
app.post('/api/payments/mercadopago-webhook', async (req, res) => {
  const { action, data, type } = req.body;
  
  if ((type === 'payment' || action === 'payment.created') && data && data.id) {
    try {
      console.log(`Mercado Pago Webhook recebido para pagamento: ${data.id}`);
      const payerEmail = req.body.payer_email || (req.body.data && req.body.data.email);
      
      if (payerEmail) {
        const planName = req.body.plan_name || 'premium';
        const gatewayPaymentId = req.body.payment_id || (req.body.data && req.body.data.id) || ('pay_' + Date.now());
        
        const planInfo = await recordPayment(payerEmail, planName, 'mercadopago', gatewayPaymentId);
        
        if (planInfo) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + planInfo.duration_days);

          await db.query(
            "UPDATE users SET plan = $1, premium_expires_at = $2 WHERE email = $3",
            [planInfo.name, expiresAt, payerEmail.toLowerCase().trim()]
          );
          console.log(`Plano ${planInfo.name} ativado via Mercado Pago para: ${payerEmail}`);
        }
      }
    } catch (err) {
      console.error("Erro ao processar Webhook Mercado Pago:", err);
    }
  }

  res.status(200).send('OK');
});

// Webhook Asaas
app.post('/api/payments/asaas-webhook', async (req, res) => {
  const { event, payment } = req.body;

  if (event === 'PAYMENT_RECEIVED' && payment) {
    try {
      console.log(`Asaas Webhook recebido. Pagamento: ${payment.id}`);
      const customerEmail = payment.customerEmail || req.body.email;

      if (customerEmail) {
        const planName = req.body.plan_name || 'premium';
        const gatewayPaymentId = payment.id || ('pay_' + Date.now());
        
        const planInfo = await recordPayment(customerEmail, planName, 'asaas', gatewayPaymentId);
        
        if (planInfo) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + planInfo.duration_days);

          await db.query(
            "UPDATE users SET plan = $1, premium_expires_at = $2 WHERE email = $3",
            [planInfo.name, expiresAt, customerEmail.toLowerCase().trim()]
          );
          console.log(`Plano ${planInfo.name} ativado via Asaas para: ${customerEmail}`);
        }
      }
    } catch (err) {
      console.error("Erro ao processar Webhook Asaas:", err);
    }
  }

  res.status(200).send('OK');
});

// Rota de status básico
app.get('/health', async (req, res) => {
  try {
    const dbCheck = await db.query('SELECT NOW()');
    res.json({
      status: 'healthy',
      timestamp: new Date(),
      database: 'connected',
      dbTime: dbCheck.rows[0].now
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: err.message
    });
  }
});

// Migração automática de tabelas criadas após o volume inicial do banco
async function runMigrations() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS professional_availability (
      id SERIAL PRIMARY KEY,
      professional_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT chk_availability_times CHECK (end_time > start_time)
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_availability_professional ON professional_availability(professional_id)
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS weight_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      weight DECIMAL(5,2) NOT NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_user_date_weight UNIQUE (user_id, date)
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_weight_log_user_date ON weight_log(user_id, date)
  `);
  // Migrações adicionais: Ficha Clínica e Exames
  await db.query(`
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS comorbidities TEXT,
    ADD COLUMN IF NOT EXISTS intolerances TEXT,
    ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS patient_exams (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_patient_exams_patient ON patient_exams(patient_id)
  `);
  console.log('Migrações executadas com sucesso.');
}

// Inicialização do servidor
const http = require('http');
const WebSocket = require('ws');

const server = http.createServer(app);

// Inicialização do WebSocket Server de sinalização
const wss = new WebSocket.Server({ noServer: true });

// Armazenar conexões por sala
const rooms = new Map(); // roomName -> Set of ws clients

wss.on('connection', (ws) => {
  let currentRoom = null;
  let clientUserId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'join':
          currentRoom = data.room;
          clientUserId = data.userId;
          
          if (!rooms.has(currentRoom)) {
            rooms.set(currentRoom, new Set());
          }
          
          const roomClients = rooms.get(currentRoom);
          if (roomClients.size >= 2) {
            ws.send(JSON.stringify({ type: 'error', message: 'A sala está cheia.' }));
            return;
          }
          
          roomClients.add(ws);
          ws.room = currentRoom;
          ws.userId = clientUserId;

          console.log(`Usuário ${clientUserId} entrou na sala ${currentRoom}`);

          // Se já tem outro participante, notifica apenas quem acabou de entrar para iniciar a chamada (evita colisão SDP)
          if (roomClients.size === 2) {
            let otherUser = null;
            for (const client of roomClients) {
              if (client !== ws) {
                otherUser = client;
                break;
              }
            }
            if (otherUser) {
              ws.send(JSON.stringify({ type: 'new-peer', userId: otherUser.userId }));
            }
          }
          break;

        case 'offer':
        case 'answer':
        case 'candidate':
          // Encaminhar para o outro cliente na mesma sala
          if (currentRoom && rooms.has(currentRoom)) {
            const clients = rooms.get(currentRoom);
            clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
              }
            });
          }
          break;

        case 'leave':
          leaveRoom();
          break;
      }
    } catch (e) {
      console.error('Erro ao processar mensagem WS:', e);
    }
  });

  function leaveRoom() {
    if (currentRoom && rooms.has(currentRoom)) {
      const clients = rooms.get(currentRoom);
      clients.delete(ws);
      console.log(`Usuário ${clientUserId} saiu da sala ${currentRoom}`);
      
      // Notifica o outro que o peer saiu
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'peer-left' }));
        }
      });

      if (clients.size === 0) {
        rooms.delete(currentRoom);
      }
    }
    currentRoom = null;
  }

  ws.on('close', () => {
    leaveRoom();
  });

  ws.on('error', (err) => {
    console.error('Erro na conexão WS:', err);
    leaveRoom();
  });
});

// Interceptar o upgrade de protocolo HTTP para WebSocket na rota /api/signal
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  if (pathname === '/api/signal') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`Servidor rodando com sucesso em http://0.0.0.0:${PORT}`);
  
  // Garante a existência do diretório de uploads de exames
  const fs = require('fs');
  const path = require('path');
  const uploadsDir = path.join(__dirname, 'uploads', 'exams');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  await runMigrations();
});
