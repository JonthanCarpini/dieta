# Guia de Desenvolvimento - Nutrir Diet Tracker (Arquitetura Completa)

Este documento serve como um guia completo do projeto **Nutrir Diet Tracker** para orientar desenvolvedores e modelos de linguagem (LLMs) que darão continuidade ao desenvolvimento, refinamento e manutenção da plataforma SaaS.

---

## 1. Visão Geral do Projeto
O Nutrir é uma plataforma SaaS de nutrição responsiva com design moderno e futurista. Ele foi migrado de um protótipo local para uma aplicação full-stack Dockerizada profissional, implantada no domínio real **`https://nutrir.online`**.

O app gerencia o acompanhamento de calorias, macronutrientes, hidratação e jejum diários com suporte de IA (Gemini para escaneamento de fotos e geração de receitas) e permite a vinculação de usuários Premium com profissionais de saúde (Nutricionistas e Personal Trainers), além de possuir controle administrativo completo.

---

## 2. Tecnologias Utilizadas

### Frontend:
1. **HTML5**: Single Page Application (SPA) baseada em abas com controle de classe `.active`.
2. **CSS3 (Vanilla)**: Design system com variáveis de cor, glassmorphism, sombras neon e sliders estilizados em `style.css`.
3. **JavaScript (ES6+)**: Orquestração e controle visual em `app.js`.
4. **Google Identity Services SDK**: Login Social integrado.
5. **Lucide Icons & Chart.js**: Ícones modernos e gráfico de barras.

### Backend & Banco de Dados:
1. **Node.js & Express**: API RESTful autenticada.
2. **PostgreSQL**: Persistência relacional de dados.
3. **jsonwebtoken (JWT) & bcryptjs**: Geração de tokens de sessão seguros e hashing de senhas.
4. **google-auth-library**: Validação oficial das credenciais do Google Login no backend.

### Infraestrutura & Deploy:
1. **Docker & Docker Compose**: Contêineres isolados para banco, API, frontend e proxy.
2. **Nginx**: Servidor de arquivos estáticos e Proxy Reverso seguro.
3. **Certbot (Let's Encrypt)**: Geração e renovação automática de certificados SSL HTTPS.

---

## 3. Estrutura de Arquivos no Espaço de Trabalho

O projeto é dividido entre a raiz (frontend e configurações) e o diretório `/backend` (API e banco):

```
dieta/
├── admin/                   # Painel Administrativo Independente
│   ├── index.html           # Estrutura HTML do Painel Admin
│   ├── admin.css            # Estilo do Painel Admin (Dark Glassmorphism)
│   └── admin.js             # Lógica e controle de APIs do Painel Admin
├── deploy.js                # Script Node.js de deploy automático via SSH para a VPS
├── Dockerfile.frontend      # Dockerfile do Nginx que serve a SPA estática
├── docker-compose.yml       # Orquestração (db, backend, frontend, nginx)
├── nginx.conf               # Configurações do Proxy Reverso com HTTPS SSL
├── index.html               # Estrutura HTML da SPA (todas as telas e modais)
├── style.css                # Estilo visual moderno do app
├── app.js                   # Lógica da aplicação frontend e integração com API
├── backend/
│   ├── Dockerfile           # Dockerfile para o container do Node.js
│   ├── package.json         # Dependências da API Express
│   ├── server.js            # Arquivo de inicialização, middlewares e webhooks
│   ├── db.js                # Cliente de conexão com o PostgreSQL
│   ├── schema.sql           # Script de definição das tabelas do banco de dados
│   ├── middleware/
│   │   └── auth.js          # Middleware de autenticação JWT e validação de roles
│   └── routes/
│       ├── auth.js          # Cadastro, login tradicional e login Google
│       ├── user.js          # Sincronização do diário do paciente e orientações
│       ├── professional.js  # Gestão de diários e feedbacks por nutricionistas/personals
│       └── admin.js         # Controle de planos, roles, chaves, agenda e planos do sistema
```

---

## 4. Banco de Dados e Persistência

O dados do usuário agora são sincronizados diretamente com o PostgreSQL por meio de requisições Fetch autenticadas com `Authorization: Bearer <JWT_token>`. O `localStorage` é utilizado de forma secundária e como cache local.

### Tabelas Principais (`backend/schema.sql`):
1. **`users`**: Armazena e-mail, senha hashed (ou null se Google), plano (`trial` ou `premium`), datas de expiração, cargo (`user`, `nutritionist`, `trainer`, `admin`) e percentual de comissão (`commission_percentage`).
2. **`profiles`**: Dados de onboarding Mifflin-St Jeor do usuário e metas diárias calculadas de calorias e macros.
3. **`meals`**: Registro detalhado das refeições do usuário contendo itens e totais em JSONB.
4. **`water_log`**: Quantidade consumida diária de água vs meta do usuário.
5. **`fasting_log`**: Data e hora de início, objetivo e status do ciclo de jejum ativo.
6. **`ai_recipes`**: Receitas individuais ou planos de 7 dias estruturados gerados pela IA do Gemini.
7. **`professional_links`**: Mapeamento exclusivo entre pacientes Premium e seus nutricionistas ou personal trainers.
8. **`professional_messages`**: Mensagens de feedback, orientações e prescrições enviadas pelos profissionais.
9. **`system_settings`**: Armazena pares chave/valor globais dinâmicos para tokens de API externa (Gemini, Google OAuth Client ID, Mercado Pago, Asaas).
10. **`plans`**: Armazena planos comerciais configuráveis (identificador, preço, duração, descrição, benefícios).
11. **`payments`**: Histórico detalhado das transações de pagamento da plataforma, integrando o cálculo e a distribuição das comissões aos profissionais vinculados (nutricionista/personal trainer).
12. **`professional_availability`**: Horários disponíveis de cada profissional para consultas online, com `day_of_week` (0=Dom a 6=Sáb), `start_time` e `end_time` por slot.

---

## 5. Funcionalidades Detalhadas

### A. Autenticação e Perfis de Usuários
* **Login/Registro Tradicional**: Com verificação de e-mails duplicados e hashes de senha bcrypt.
* **Login Social (Google)**: O token fornecido pelo SDK oficial do Google no frontend é validado pelo backend por meio da `google-auth-library` para autenticar ou registrar usuários de forma transparente.

### B. Gestão de Planos & Gateway de Pagamentos
* **Tolerância Trial**: Novos usuários iniciam no plano `trial` por 7 dias.
* **Upgrade Premium (Mercado Pago & Asaas)**: Na página do Perfil, o botão de upgrade dispara um webhook simulado no backend (`/api/payments/mercadopago-webhook` ou `/api/payments/asaas-webhook`) para simular a compra via Pix e atualizar o plano do usuário para `premium` por 30 dias.

### C. Acompanhamento e Vinculação Profissional
* **Vincular Profissional**: Usuários premium podem selecionar, a partir de uma lista dinâmica obtida do banco, um Nutricionista e/ou Personal Trainer.
* **Painel Profissional do App**: Área no frontend do usuário principal (`screen-professional`) onde ele vê orientações enviadas pelo seu nutricionista/personal trainer.

### D. Painel de Administração e Portal do Profissional (`/admin/`)
* **Painel de Controle Compartilhado**: Acesso unificado em `https://nutrir.online/admin/` para administradores e profissionais de saúde (nutricionistas e personal trainers):
  * **Administradores**: Controle completo de usuários (promoção de cargo, plano, trial), cadastro de profissionais de saúde com comissão de vendas e inline editing, criação/gestão de planos e chaves/credenciais do sistema (Gemini, MP, Google Client ID, Asaas). Acessam também a aba global de **Faturamento** com o montante bruto de vendas, total de comissões pagas e lucro líquido da plataforma.
  * **Profissionais**: Acesso restrito e personalizado às seguintes abas:
    * **Meus Pacientes**: Permite visualizar a lista completa de pacientes vinculados a ele, inspecionar o diário recente de alimentação (refeições, hidratação diária, jejum ativo) e enviar feedback/prescrições em tempo real.
    * **Faturamento**: Exibe as métricas de comissões acumuladas, total de pacientes ativos e lista detalhada das comissões geradas a partir das assinaturas dos seus clientes vinculados.
    * **Agenda**: Permite ao profissional configurar sua disponibilidade semanal para consultas online — ativando dias da semana e definindo um ou mais intervalos de horário por dia. Os dados são persistidos na tabela `professional_availability` via `GET/POST /api/admin/availability`.

---

## 6. Integração com a API do Gemini

Consumida pelo frontend através da chave de API configurada no Perfil. Retorna dados estruturados em JSON que o app manipula diretamente:

* **Escaner**: Analisa a foto do prato em base64 e retorna ingredientes detalhados em JSON com macros específicos.
* **Receitas diárias**: Cria uma sugestão de refeição com ingredientes adaptada estritamente às calorias e macronutrientes restantes do usuário no dia.
* **Planejador Semanal**: Retorna um array JSON contendo 7 receitas diferentes (uma para cada dia da semana) otimizando chamadas de rede.

---

## 7. Configurações de Deploy (VPS Docker + SSL)

A plataforma é orquestrada por completo usando Docker Compose na VPS (`178.238.236.103`):

* **Proxy Nginx**: Encaminha as requisições normais no domínio `https://nutrir.online` para o container do frontend. Requisições em `https://nutrir.online/api` (ou no subdomínio `api.nutrir.online`) são encaminhadas para o container do backend.
* **Segurança HTTPS**: A pasta `/etc/letsencrypt/` é mapeada diretamente do host para o Nginx.
* **Certbot**: Script de deploy automatizado via SSH que obtém os certificados Let's Encrypt reais e configura uma tarefa cron de renovação diária no sistema.

---

## 8. Como Executar o Projeto Localmente

### Pré-requisitos:
* Docker e Docker Compose instalados.

### Passos:
1. Altere o arquivo `docker-compose.yml` localmente caso queira expor portas públicas para teste (por padrão, as portas do backend e do db estão isoladas internamente por segurança).
2. Configure o seu arquivo `backend/.env` local a partir de `backend/.env.example` inserindo suas chaves de teste.
3. Suba a aplicação inteira com o comando:
   ```bash
   docker compose up -d --build
   ```
4. Acesse a aplicação no seu navegador: **`http://localhost:8080`** (ou a porta exposta pelo frontend).

---

## 9. Próximos Passos e Sugestões de Melhorias

1. **Gateways Reais de Produção**: Substituir as rotas simuladas dos webhooks de pagamento por credenciais reais do Mercado Pago / Asaas integradas em produção.
2. **Upload Direto de Fotos para a VPS**: Atualmente, as fotos do escaner são convertidas em base64 e enviadas direto para o Gemini. Criar um serviço de storage/upload (como AWS S3 ou pasta local estática no Express) para arquivar fotos dos pratos.
3. **Edição do Diário**: Permitir que usuários cliquem nas refeições registradas no Dashboard para reabrir o modal de edição e salvar as alterações no banco.

---

## 10. Diretrizes de Desenvolvimento (Padrões do Projeto)

* **Idioma Obrigatório**: Todas as documentações (`.md`), comentários no código, mensagens de erro, logs do terminal e, principalmente, **mensagens de commits do Git DEVEM obrigatoriamente ser escritos em português (Brasil)**. commits em outros idiomas não serão aceitos.

* **Sistema de Design — Obsidian**: O layout visual de todo o projeto segue o **design system Obsidian** definido na pasta `Nutrir/`. Os tokens principais são:
  - Cor de fundo: `#0a0a0c`
  - Acento âmbar: `#f5c14d` (primário) / `#e0a13a` (hover)
  - Texto principal: `#f4f1ec`; texto secundário: `rgba(244,241,236,0.45)`
  - Cards glass: `background: rgba(255,250,240,0.04)`, `border: rgba(255,250,240,0.08)`, `backdrop-filter: blur(20px)`
  - Fontes: `Geist` (sans) e `Geist Mono` (numérico/mono) — carregadas via Google Fonts
  - Grain de fundo ativo por padrão via pseudo-elemento `::after` no `body` / `app-container`
  - Não alterar os nomes de classe existentes no HTML (`screen-dashboard`, `calorie-card`, etc.) — apenas os estilos CSS são substituídos.

* **Fluxo Obrigatório Pós-Alteração**: Ao finalizar qualquer conjunto de alterações no projeto, o seguinte fluxo DEVE ser executado obrigatoriamente, nesta ordem:

  1. **Commit Git** — Criar um commit descritivo com todas as alterações realizadas:
     ```bash
     git add <arquivos-alterados>
     git commit -m "tipo: descrição clara do que foi feito"
     ```

  2. **Push para o repositório remoto**:
     ```bash
     git push origin master
     ```

  3. **Deploy na VPS** — Executar o script `deploy.js` na raiz do projeto:
     ```bash
     node deploy.js
     ```
     O script conecta automaticamente via chave SSH (`C:/Users/admin/.ssh/disparo_vps`), executa `git pull`, recria os containers Docker e recarrega o Nginx. Requer a dependência `ssh2` instalada (`npm install ssh2`).

  4. **Atualizar o PROJECT_GUIDE.md** — Após o deploy, revise este documento e adicione/atualize as seções necessárias para refletir as novas implementações, rotas, tabelas ou funcionalidades introduzidas. O guia deve sempre representar o estado atual e real da plataforma em produção.

  > **Nunca** entregue uma tarefa como concluída sem executar este fluxo completo. Alterações locais sem deploy equivalem a alterações incompletas. Um PROJECT_GUIDE.md desatualizado é tão problemático quanto código sem deploy.

