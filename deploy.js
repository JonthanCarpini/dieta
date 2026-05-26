/**
 * deploy.js — Script de deploy automático para a VPS via SSH
 * Uso: node deploy.js
 *
 * Pré-requisito: chave SSH em C:/Users/admin/.ssh/disparo_vps
 */

const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

const config = {
    host: '178.238.236.103',
    port: 22,
    username: 'root',
    privateKey: fs.readFileSync('C:/Users/admin/.ssh/disparo_vps')
};

const script = `
    set -e

    echo "=== 1. Atualizando repositorio ==="
    if [ -d "/root/dieta" ]; then
        cd /root/dieta
        git reset --hard
        git pull origin master
    else
        git clone https://github.com/JonthanCarpini/dieta.git /root/dieta
        cd /root/dieta
    fi

    echo "=== 2. Configurando .env ==="
    cat << 'EOF' > /root/dieta/backend/.env
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://postgres:c11560011@db:5432/nutrir
JWT_SECRET=super_secret_jwt_key_nutrir_2026_change_me
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-your_mercado_pago_token_here
ASAAS_API_KEY=your_asaas_api_key_here
EOF

    echo "=== 3. Verificando certificados SSL ==="
    if [ ! -f /etc/letsencrypt/live/nutrir.online/fullchain.pem ]; then
        echo "Criando certificados autoassinados provisorios..."
        mkdir -p /etc/letsencrypt/live/nutrir.online
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /etc/letsencrypt/live/nutrir.online/privkey.pem \
            -out /etc/letsencrypt/live/nutrir.online/fullchain.pem \
            -subj "/CN=nutrir.online"
    fi

    echo "=== 4. Rebuilding Docker Compose ==="
    cd /root/dieta
    docker compose down || true
    docker compose up -d --build

    echo "=== 5. Renovando certificado SSL (se necessario) ==="
    mkdir -p /var/www/certbot
    if certbot certonly --webroot -w /var/www/certbot -d nutrir.online -d www.nutrir.online \
        --agree-tos -m jcarpini.dev@gmail.com --no-eff-email --keep-until-expiring --non-interactive; then
        echo "SSL OK. Recarregando Nginx..."
        docker exec nutrir_nginx nginx -s reload || true
    else
        echo "AVISO: Certificado SSL nao renovado. Nginx usa certificado atual."
    fi

    echo "=== 6. Configurando Cron de renovacao SSL ==="
    (crontab -l 2>/dev/null | grep -qF "certbot renew") || \
        (crontab -l 2>/dev/null; echo '0 3 * * * certbot renew --post-hook "docker exec nutrir_nginx nginx -s reload"') | crontab -

    echo ""
    echo "=========================================="
    echo "  DEPLOY CONCLUIDO! https://nutrir.online"
    echo "=========================================="
`;

conn.on('ready', () => {
    console.log('\n✔ Conectado à VPS via SSH\n');

    conn.exec(script, { pty: true }, (err, stream) => {
        if (err) {
            console.error('✘ Erro ao executar script:', err.message);
            conn.end();
            return;
        }

        stream.on('data', (data) => process.stdout.write(data.toString()));
        stream.stderr.on('data', (data) => process.stderr.write(data.toString()));

        stream.on('close', (code) => {
            console.log(`\nScript encerrado com código: ${code}`);
            if (code === 0) {
                console.log('✔ Deploy finalizado com sucesso!\n');
            } else {
                console.error('✘ Deploy encerrado com erro. Verifique os logs acima.\n');
            }
            conn.end();
        });
    });
});

conn.on('error', (err) => {
    console.error('✘ Erro de conexão SSH:', err.message);
});

console.log(`Iniciando deploy em ${config.username}@${config.host}...`);
conn.connect(config);
