# Guia de Desenvolvimento - Nutrir Diet Tracker (Arquitetura Completa)

Este documento serve como um guia completo do projeto **Nutrir Diet Tracker** para orientar desenvolvedores e modelos de linguagem (LLMs) que darão continuidade ao desenvolvimento, refinamento e manutenção da plataforma SaaS.

---

## 1. Visão Geral do Projeto
O Nutrir é uma plataforma SaaS de nutrição responsiva com design moderno e futurista. Ele foi migrado de um protótipo local para uma aplicação full-stack Dockerizada profissional, implantada no domínio real **`https://nutrir.online`**.

O app gerencia o acompanhamento de calorias, macronutrientes, hidratação e jejum diários com suporte de IA multi-provedor (Gemini, OpenAI, Mistral — configurável via painel admin) e permite a vinculação de usuários Premium com profissionais de saúde (Nutricionistas e Personal Trainers), além de possuir controle administrativo completo.

---

## 2. Tecnologias Utilizadas

### Frontend:
1. **HTML5**: Single Page Application (SPA) baseada em abas com controle de classe `.active`.
2. **CSS3 (Vanilla)**: Design system Obsidian com variáveis de cor, glassmorphism e grain texture em `style.css`.
3. **JavaScript (ES6+)**: Orquestração e controle visual em `app.js`.
4. **Google Identity Services SDK**: Login Social integrado (requer Client ID válido terminado em `.apps.googleusercontent.com`).
5. **Lucide Icons & Chart.js**: Ícones modernos e gráfico de barras.
6. **Geist & Geist Mono**: Fontes via Google Fonts (substituíram Outfit/Plus Jakarta Sans).

### Backend & Banco de Dados:
1. **Node.js & Express**: API RESTful autenticada com JWT.
2. **PostgreSQL**: Persistência relacional de dados.
3. **jsonwebtoken (JWT) & bcryptjs**: Geração de tokens de sessão seguros e hashing de senhas.
4. **google-auth-library**: Validação oficial das credenciais do Google Login no backend.
5. **Native fetch (Node 18)**: Usado nas chamadas HTTP para as APIs de IA — sem dependências extras.

### Infraestrutura & Deploy:
1. **Docker & Docker Compose**: Contêineres isolados para banco, API, frontend e proxy.
2. **Nginx**: Servidor de arquivos estáticos e Proxy Reverso seguro.
3. **Certbot (Let's Encrypt)**: Geração e renovação automática de certificados SSL HTTPS.

---

## 3. Estrutura de Arquivos no Espaço de Trabalho

```
dieta/
├── admin/                   # Painel Administrativo Independente
│   ├── index.html           # Estrutura HTML do Painel Admin
│   ├── admin.css            # Estilo Obsidian do Painel Admin
│   └── admin.js             # Lógica e controle de APIs do Painel Admin
├── deploy.js                # Script Node.js de deploy automático via SSH para a VPS
├── Dockerfile.frontend      # Dockerfile do Nginx que serve a SPA estática (inclui favicon.svg)
├── docker-compose.yml       # Orquestração (db, backend, frontend, nginx)
├── nginx.conf               # Configurações do Proxy Reverso com HTTPS SSL
├── favicon.svg              # Ícone do site (copiado para o container via Dockerfile.frontend)
├── index.html               # Estrutura HTML da SPA (todas as telas e modais)
├── style.css                # Design system Obsidian — tokens, glassmorphism, grain
├── app.js                   # Lógica da aplicação frontend e integração com API
├── backend/
│   ├── Dockerfile           # Dockerfile para o container do Node.js
│   ├── package.json         # Dependências da API Express
│   ├── server.js            # Arquivo de inicialização, middlewares e rotas
│   ├── db.js                # Cliente de conexão com o PostgreSQL
│   ├── schema.sql           # Script de definição das tabelas do banco de dados
│   ├── middleware/
│   │   └── auth.js          # Middleware de autenticação JWT e validação de roles
│   └── routes/
│       ├── auth.js          # Cadastro, login tradicional e login Google
│       ├── ai.js            # Proxy de IA: Gemini/OpenAI/Mistral — receitas, scanner, plano semanal
│       ├── user.js          # Sincronização do diário do paciente e orientações
│       ├── professional.js  # Gestão de diários e feedbacks por nutricionistas/personals
│       └── admin.js         # Controle de planos, roles, chaves, agenda e faturamento
```

---

## 4. Banco de Dados e Persistência

Os dados do usuário são sincronizados com o PostgreSQL por meio de requisições Fetch autenticadas com `Authorization: Bearer <JWT_token>`. O `localStorage` é usado como cache local secundário.

### Tabelas Principais (`backend/schema.sql`):
1. **`users`**: E-mail, senha hashed, plano (`trial`/`premium`), datas de expiração, cargo (`user`, `nutritionist`, `trainer`, `admin`) e percentual de comissão (`commission_percentage`).
2. **`profiles`**: Dados de onboarding Mifflin-St Jeor e metas diárias calculadas de calorias e macros.
3. **`meals`**: Registro detalhado das refeições com itens e totais em JSONB.
4. **`water_log`**: Quantidade consumida diária de água vs meta do usuário.
5. **`fasting_log`**: Início, objetivo e status do ciclo de jejum ativo.
6. **`ai_recipes`**: Receitas individuais ou planos de 7 dias gerados pela IA.
7. **`professional_links`**: Mapeamento entre pacientes Premium e seus profissionais.
8. **`professional_messages`**: Feedbacks, orientações e prescrições dos profissionais.
9. **`system_settings`**: Pares chave/valor globais — chaves de API e configurações do sistema. Chaves relevantes:
   - `gemini_api_key`, `openai_api_key`, `mistral_api_key`
   - `active_llm_provider` → `'gemini'` | `'openai'` | `'mistral'`
   - `google_client_id` (deve terminar em `.apps.googleusercontent.com`)
   - `mercadopago_token`, `asaas_api_key`
10. **`plans`**: Planos comerciais configuráveis (identificador, preço, duração, benefícios).
11. **`payments`**: Histórico de transações com cálculo de comissões por profissional vinculado.
12. **`professional_availability`**: Horários de disponibilidade semanal dos profissionais.
13. **`appointments`**: Agendamentos de consultas por vídeo com patient_id, professional_id, data, hora_inicio, hora_fim, link do Jitsi e status.

---

## 5. Funcionalidades Detalhadas

### A. Autenticação e Perfis de Usuários
- **Login/Registro Tradicional**: Verificação de e-mails duplicados e hashes bcrypt.
- **Login Social (Google)**: Token do SDK validado via `google-auth-library` no backend. O frontend só inicializa o SDK se o `googleClientId` retornado por `/api/auth/config` terminar em `.apps.googleusercontent.com` — valores inválidos são silenciosamente ignorados.

### B. Integração Multi-Provedor de IA (`backend/routes/ai.js`)

Todas as chamadas de IA passam pelo backend em `/api/ai/*`. As chaves de API **nunca chegam ao browser**.

#### Rotas disponíveis:
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/ai/analyze-food` | POST | Analisa imagem base64 e retorna alimentos com macros |
| `/api/ai/generate-recipe` | POST | Gera receita personalizada para uma refeição |
| `/api/ai/generate-weekly` | POST | Gera plano de 7 receitas diferentes |
| `/api/ai/test` | POST | Testa o provedor ativo e retorna amostra de receita |

#### Provedores suportados:
- **Gemini** (padrão): tenta múltiplos modelos em sequência (`gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-2.0-flash-001` → `gemini-2.0-flash-lite` → `gemini-flash-latest` → `gemini-2.5-flash-lite` → `gemini-pro-latest`). Endpoints `v1beta` usam JSON mode (`responseMimeType`); endpoints `v1` não.
- **OpenAI**: `gpt-4o-mini` com `response_format: json_object`.
- **Mistral**: `mistral-small-latest` com `response_format: json_object`.

#### Fallback automático:
Se o provedor ativo falhar completamente (esgota todos os modelos/tentativas), o sistema tenta automaticamente os outros provedores configurados. Ordem: provedor ativo → Mistral → OpenAI (ou qualquer combinação disponível). O campo `_meta.provider` na resposta indica qual provedor efetivamente atendeu a requisição.

#### Resposta `_meta`:
Todas as rotas retornam o campo `_meta` com:
```json
{ "provider": "gemini", "model": "gemini-2.0-flash (v1beta)", "latency_ms": 1430 }
```
O frontend loga essas informações no console via `console.group('[Nutrir IA] ...')`.

#### Personalização por perfil:
As rotas `generate-recipe` e `generate-weekly` aceitam o objeto `profile` no body com os dados do usuário (objetivo, peso, meta calórica, macros). Os prompts adaptam o tipo de receita ao objetivo (`lose` / `gain` / `maintain`), com instruções específicas de ingredientes, porções e estilo de preparo.

#### Cálculo de calorias por refeição:
O frontend calcula a fração calórica adequada por tipo de refeição a partir de `targetCalories` — não do saldo restante do dia:
- Café da manhã: 25% | Almoço: 35% | Jantar: 30% | Lanche: 12% | Qualquer: 30%

### C. Gestão de Planos & Gateway de Pagamentos
- **Tolerância Trial**: Novos usuários iniciam no plano `trial` por 7 dias.
- **Upgrade Premium**: Webhooks simulados para Mercado Pago e Asaas em `/api/payments/*`.

### D. Acompanhamento e Vinculação Profissional
- Usuários premium vinculam Nutricionista e/ou Personal Trainer.
- **Meu Acompanhamento (`screen-my-professionals`)**: Tela dedicada exclusiva para usuários Premium que permite a vinculação de profissionais, exibição estruturada das orientações/recomendações recebidas e agendamento de consultas por vídeo.
- **Videoconferências Gratuitas (Jitsi Meet)**: Agendamentos geram automaticamente um link único e gratuito hospedado no Jitsi Meet no formato `https://meet.jit.si/nutrir-consultation-<patient_id>-<professional_id>-<timestamp>`, permitindo chamadas diretas pela plataforma por meio de um botão "Iniciar Chamada".
- **Cancelamento**: Tanto o paciente quanto o profissional podem cancelar consultas diretamente na interface, mudando o status para `cancelled`.

### E. Painel de Administração (`/admin/`)
Acesso unificado em `https://nutrir.online/admin/` para admins e profissionais:

**Administradores**:
- Controle de usuários (promoção de cargo, plano, trial).
- Cadastro de profissionais com comissão de vendas e inline editing.
- Criação e gestão de planos comerciais.
- **Aba Credenciais**: Seleção visual do provedor de IA ativo (cards clicáveis para Gemini/OpenAI/Mistral), cadastro individual de chaves por provedor, botão "Testar provedor ativo" que chama `/api/ai/test` e exibe provedor, modelo, latência e nome da receita de exemplo.
- **Aba Faturamento**: Montante bruto, total de comissões e lucro líquido.
- **Aba Consultas (Global)**: Visualização de todas as consultas agendadas na plataforma e permissão para cancelá-las.

**Profissionais**:
- **Meus Pacientes**: Lista, diário recente e envio de feedbacks.
- **Faturamento**: Comissões acumuladas e pacientes ativos.
- **Agenda**: Grade visual interativa de disponibilidade semanal (ver seção abaixo).
- **Aba Consultas**: Acompanhamento de todas as videochamadas agendadas por seus pacientes vinculados e opção de cancelamento.

### F. Agenda de Disponibilidade (Profissional) — Grade Visual

A aba **Minha Agenda** do painel profissional usa uma grade clicável 7×28 (dias × slots de 30 min, 07h–20h30):

- **Interação**: clique para alternar livre/bloqueado; arraste para selecionar múltiplos slots de uma vez; botão no cabeçalho de cada coluna alterna o dia inteiro.
- **Presets**: "Dias Úteis 8h–18h", "Semana Completa 8h–18h", "Limpar Tudo".
- **Contador ao vivo**: exibe quantos slots estão selecionados e total de horas/semana.
- **Persistência no banco**: o backend (`POST /api/admin/availability`) expande cada intervalo recebido em slots individuais de 30 minutos antes de inserir em `professional_availability`. Ex: `08:00–10:00` gera 4 linhas: `08:00–08:30`, `08:30–09:00`, `09:00–09:30`, `09:30–10:00`.
- **Motivo**: cada linha no banco representa exatamente 1 vaga de consulta de 30 minutos, permitindo que o frontend de agendamento exiba slots individuais diretamente.
- **Validação de agendamento**: ao criar uma consulta, o backend normaliza os horários para `HH:MM` (`.substring(0,5)`) antes de comparar com os slots do banco — necessário porque o PostgreSQL retorna colunas `time` no formato `HH:MM:SS`.

### G. Tela de Análise Nutricional (Scanner)
A tela `screen-results` exibe após análise de imagem:
- **Card de calorias**: Total em âmbar + barra de progresso vs meta diária (fica vermelha acima de 90%).
- **Card de macros**: Barras horizontais para Proteína (verde), Carboidratos (azul) e Gordura (laranja) mostrando valor atual vs meta diária com percentual.
- **Cards de alimentos**: Nome + kcal em âmbar no topo; badge de peso + tags coloridas (P/C/G/Fibra) embaixo. Clicável para edição.
- **Compressão de imagem**: Frontend redimensiona para max 900px e comprime em JPEG 0.80 antes de enviar — câmera e upload de arquivo. Botão "Analisar" fica bloqueado com "Processando..." durante o resize (evita race condition).

### H. Tela Diário (Dashboard)
- **Painel de macros**: substituiu o grid de 3 colunas por um card único com 3 linhas horizontais — nome + barra de progresso + `consumido/meta g`. Todos os valores arredondados (`Math.round`).
- **Refeições expandíveis**: clicar no cabeçalho ou no botão chevron revela a lista de alimentos individuais com peso e calorias. Tags coloridas P/C/G em cada refeição.

### I. Tela Histórico
- **Card de meta**: badge com o objetivo do usuário (`Emagrecer` / `Ganhar Massa` / `Manutenção`); macros com cores por tipo.
- **Cards de dia**: nome do dia + data, calorias com cor semântica (verde = 85–105% da meta, azul = abaixo, vermelho = acima), barra de progresso, tags P/C/G e botão expandir para ver refeições individuais do dia com horário e macros.

---

## 6. Design System — Obsidian

Todo o layout segue o design system Obsidian definido em `style.css` e `admin/admin.css`:

| Token | Valor |
|-------|-------|
| `--bg-app` | `#0a0a0c` |
| `--color-primary` | `#f5c14d` (âmbar) |
| `--color-primary-hover` | `#e0a13a` |
| `--color-text-main` | `#f4f1ec` |
| `--color-text-muted` | `rgba(244,241,236,0.45)` |
| Cards glass | `background: rgba(255,250,240,0.04)` + `border: rgba(255,250,240,0.08)` + `backdrop-filter: blur(20px)` |
| Fontes | `Geist` (sans) e `Geist Mono` (numérico/mono) |
| Grain | Pseudo-elemento `::after` no `body`/`app-container` |

**Regra**: não renomear classes HTML existentes (ex: `screen-dashboard`, `calorie-card`) — apenas os estilos CSS são substituídos.

---

## 7. Configurações de Deploy (VPS Docker + SSL)

**VPS**: `178.238.236.103` | **Domínio**: `https://nutrir.online`

- **Proxy Nginx**: Roteia `https://nutrir.online` → container frontend; `https://nutrir.online/api` → container backend.
- **Segurança HTTPS**: `/etc/letsencrypt/` mapeada do host para o Nginx.
- **Certbot**: Renovação diária via cron configurado pelo `deploy.js`.
- **Banco de dados**: Volume Docker persistente com nome `slimo`. A variável `POSTGRES_DB` só se aplica na primeira criação do volume — não alterar o nome do banco.
- **SSH Key**: `C:/Users/admin/.ssh/disparo_vps`

---

## 8. Como Executar o Projeto Localmente

### Pré-requisitos:
- Docker e Docker Compose instalados.

### Passos:
1. Configure `backend/.env` a partir de `backend/.env.example` com suas chaves de teste.
2. Suba a aplicação:
   ```bash
   docker compose up -d --build
   ```
3. Acesse: **`http://localhost:8080`**

---

## 9. Limites e Configurações Críticas

| Camada | Parâmetro | Valor atual | Observação |
|--------|-----------|-------------|------------|
| Nginx | `client_max_body_size` | `20m` | Bloco `http` em `nginx.conf` |
| Express | `express.json({ limit })` | `15mb` | `backend/server.js` |
| Express | `express.urlencoded({ limit })` | `15mb` | `backend/server.js` |
| Frontend | Resize de imagem scanner | max 900px, JPEG 0.80 | `resizeImageToBase64()` em `app.js` |
| Gemini | Modelos disponíveis para a chave atual | `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-2.0-flash-001`, `gemini-2.0-flash-lite`, `gemini-2.0-flash-lite-001`, `gemini-flash-latest`, `gemini-2.5-flash-lite`, `gemini-pro-latest` | Verificado via ListModels — **não** inclui `gemini-1.5-*` |

---

## 10. Próximos Passos e Sugestões de Melhorias

1. **Gateways Reais de Produção**: Substituir webhooks simulados de pagamento por integrações reais com Mercado Pago / Asaas.
2. **Google OAuth Configurado**: Cadastrar um Client ID real (formato `xxxx.apps.googleusercontent.com`) no painel admin para habilitar o login social.
3. **Upload de Fotos**: Criar serviço de storage (S3 ou pasta estática no Express) para arquivar fotos dos pratos analisados.
4. **Edição do Diário**: Permitir que usuários cliquem nas refeições registradas no Dashboard para editar e salvar no banco.
5. **Notificações de Fallback de IA visíveis ao usuário**: Exibir um aviso discreto quando o sistema usou fallback automático de provedor de IA.

---

## 11. Diretrizes de Desenvolvimento (Padrões do Projeto)

- **Idioma Obrigatório**: Todas as documentações (`.md`), comentários no código, mensagens de erro, logs do terminal e **mensagens de commits do Git DEVEM obrigatoriamente ser escritas em português (Brasil)**. Commits em outros idiomas não serão aceitos.

- **Sistema de Design — Obsidian**: Seguir os tokens definidos na seção 6. Não alterar nomes de classe existentes no HTML.

- **Fluxo Obrigatório Pós-Alteração**: Ao finalizar qualquer conjunto de alterações, executar obrigatoriamente:

  1. **Commit Git**:
     ```bash
     git add <arquivos-alterados>
     git commit -m "tipo: descrição clara do que foi feito"
     ```

  2. **Push**:
     ```bash
     git push origin master
     ```

  3. **Deploy na VPS**:
     ```bash
     node deploy.js
     ```
     O script conecta via SSH (`C:/Users/admin/.ssh/disparo_vps`), executa `git pull`, recria os containers Docker e recarrega o Nginx.

  4. **Atualizar o PROJECT_GUIDE.md**: Após o deploy, revisar e atualizar este documento para refletir o estado atual em produção.

  > **Nunca** entregue uma tarefa como concluída sem executar este fluxo completo.
