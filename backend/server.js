const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const professionalRoutes = require('./routes/professional');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Configuração do CORS (libera acesso do frontend no domínio correspondente)
app.use(cors({
  origin: '*', // Em produção, restrinja para o seu domínio (ex: https://nutrir.online)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Registro das rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/professional', professionalRoutes);
app.use('/api/admin', adminRoutes);

// ==========================================
// 5. WEBHOOKS DE PAGAMENTOS (MERCADO PAGO & ASAAS)
// ==========================================

// Webhook Mercado Pago
app.post('/api/payments/mercadopago-webhook', async (req, res) => {
  const { action, data, type } = req.body;
  
  // No Mercado Pago, quando um pagamento é aprovado, recebemos uma notificação do tipo 'payment'
  if ((type === 'payment' || action === 'payment.created') && data && data.id) {
    try {
      console.log(`Mercado Pago Webhook recebido para pagamento: ${data.id}`);
      
      // Aqui faríamos um fetch à API do Mercado Pago usando process.env.MERCADO_PAGO_ACCESS_TOKEN
      // para validar se o status está 'approved' e pegar o email/id do pagador.
      // Exemplo simulado:
      // const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, { headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` } });
      // const paymentDetails = await mpResponse.json();
      
      // Simulando que validamos e identificamos o e-mail do usuário pagador no metadata ou e-mail
      // Para fins de teste/demo, pegaremos um e-mail vindo no payload ou logaremos.
      const payerEmail = req.body.payer_email || (req.body.data && req.body.data.email);
      
      if (payerEmail) {
        // Busca a duração do plano no banco de dados
        const planName = req.body.plan_name || 'premium';
        const planRes = await db.query("SELECT name, duration_days FROM plans WHERE name = $1", [planName]);
        const planInfo = planRes.rows[0] || { name: 'premium', duration_days: 30 };

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + planInfo.duration_days);

        await db.query(
          "UPDATE users SET plan = $1, premium_expires_at = $2 WHERE email = $3",
          [planInfo.name, expiresAt, payerEmail.toLowerCase().trim()]
        );
        console.log(`Plano ${planInfo.name} ativado via Mercado Pago para: ${payerEmail}`);
      }
    } catch (err) {
      console.error("Erro ao processar Webhook Mercado Pago:", err);
    }
  }

  // Responde com status 200/201 exigido pelo Mercado Pago para cessar tentativas
  res.status(200).send('OK');
});

// Webhook Asaas
app.post('/api/payments/asaas-webhook', async (req, res) => {
  const { event, payment } = req.body;

  // No Asaas, quando o pagamento da assinatura ou fatura é recebido
  if (event === 'PAYMENT_RECEIVED' && payment) {
    try {
      console.log(`Asaas Webhook recebido. Pagamento: ${payment.id}`);
      
      // Obtém o e-mail do cliente cadastrado no Asaas
      // No mundo real, faríamos um GET a /v3/customers/{customer_id} usando o ASAAS_API_KEY
      const customerEmail = payment.customerEmail || req.body.email;

      if (customerEmail) {
        const planName = req.body.plan_name || 'premium';
        const planRes = await db.query("SELECT name, duration_days FROM plans WHERE name = $1", [planName]);
        const planInfo = planRes.rows[0] || { name: 'premium', duration_days: 30 };

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + planInfo.duration_days);

        await db.query(
          "UPDATE users SET plan = $1, premium_expires_at = $2 WHERE email = $3",
          [planInfo.name, expiresAt, customerEmail.toLowerCase().trim()]
        );
        console.log(`Plano ${planInfo.name} ativado via Asaas para: ${customerEmail}`);
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

// Inicialização do servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando com sucesso em http://0.0.0.0:${PORT}`);
});
