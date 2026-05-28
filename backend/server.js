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
