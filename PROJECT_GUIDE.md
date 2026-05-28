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
5. **Native fetch (Node 18)**: Usado nas chamadas HTTP para as APIs de IA e Spoonacular — sem dependências extras.

### Infraestrutura & Deploy:
1. **Docker & Docker Compose**: Contêineres isolados para banco, API, frontend e proxy.
2. **Nginx**: Servidor de arquivos estáticos e Proxy Reverso seguro.
3. **Certbot (Let's Encrypt)**: Geração e renovação automática de certificados SSL HTTPS.

---

## 3. Estrutura de Arquivos no Espaço de Trabalho

```
dieta/
├── admin/                   # Painel Administrativo Independente
│   ├── index.html           # Estrutura HTML do Painel Admin (carrega admin.js como module)
│   ├── admin.css            # Estilo Obsidian do Painel Admin
│   ├── admin.js             # Entrypoint principal que orquestra as dependências e roteia abas
│   └── modules/             # Submódulos JavaScript (ES6 Modules nativos)
│       ├── state.js         # Estado global compartilhado e configurações de API
│       ├── auth.js          # Controle de autenticação, login e validação de sessão
│       ├── admin-features.js# Painel geral: usuários, profissionais, planos, faturamento e LLM keys
│       ├── pro-schedule.js  # Controle da grade visual de disponibilidade semanal
│       ├── pro-patients.js  # Prontuário em tempo real, evolução de peso e WebRTC
│       ├── pro-appointments.js# Listagem e cancelamento de consultas
│       └── pro-meals.js     # Construtor de cardápios semanais e receitas via IA
├── deploy.js                # Script Node.js de deploy automático via SSH para a VPS
├── Dockerfile.frontend      # Dockerfile do Nginx que serve a SPA estática (inclui favicon.svg)
├── docker-compose.yml       # Orquestração (db, backend, frontend, nginx)
├── nginx.conf               # Configurações do Proxy Reverso com HTTPS SSL
├── favicon.svg              # Ícone do site (copiado para o container via Dockerfile.frontend)
├── index.html               # Estrutura HTML da SPA (todas as telas e modais)
├── style.css                # Design system Obsidian — tokens, glassmorphism, grain
├── app.js                   # Lógica da aplicação frontend e integração com API
├── mobile-android/          # Projeto Android (WebView wrapper de https://nutrir.online)
│   └── app/build/outputs/apk/debug/app-debug.apk  # APK de debug (forçado no git)
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
│       ├── user.js          # Sincronização do diário do paciente, orientações e cardápio semanal
│       ├── professional.js  # Gestão de diários, feedbacks e cardápios semanais por profissionais
│       └── admin.js         # Controle de planos, roles, chaves, agenda, faturamento e busca Spoonacular
```

---

## 4. Banco de Dados e Persistência

Os dados do usuário são sincronizados com o PostgreSQL por meio de requisições Fetch autenticadas com `Authorization: Bearer <JWT_token>`. O `localStorage` é usado como cache local secundário.

### Tabelas Principais (`backend/schema.sql`):
1. **`users`**: E-mail, senha hashed, plano (`trial`/`premium`), datas de expiração, cargo (`user`, `nutritionist`, `trainer`, `admin`) e percentual de comissão (`commission_percentage`).
2. **`profiles`**: Dados de onboarding Mifflin-St Jeor, metas diárias calculadas de calorias e macros, além de dados clínicos: `comorbidities`, `intolerances`, `dietary_restrictions` e `notes` (anotações gerais do nutricionista).
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
   - `spoonacular_api_key` → chave **obrigatória** para busca de receitas fitness no construtor de cardápios (150 req/dia no plano gratuito; cadastro em spoonacular.com/food-api)
10. **`plans`**: Planos comerciais configuráveis (identificador, preço, duração, benefícios).
11. **`payments`**: Histórico de transações com cálculo de comissões por profissional vinculado.
12. **`professional_availability`**: Horários de disponibilidade semanal dos profissionais.
13. **`appointments`**: Agendamentos de consultas por vídeo com patient_id, professional_id, data, hora_inicio, hora_fim, link do Jitsi e status.
14. **`weekly_plans`**: Cardápios nutricionais semanais criados pelos profissionais e atribuídos a pacientes. Estrutura:
    ```sql
    CREATE TABLE weekly_plans (
        id SERIAL PRIMARY KEY,
        professional_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        patient_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL DEFAULT 'Cardápio Semanal',
        plan_data JSONB NOT NULL DEFAULT '{"days":[]}',
        notes TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ```
    O campo `plan_data` é JSONB com estrutura `{ days: [ { dow: 0..6, meals: { breakfast, morning_snack, lunch, afternoon_snack, dinner, supper } } ] }`. Cada refeição contém `{ items: [{name, qty, calories, protein, carbs, fat}], instructions }`.

15. **`patient_exams`**: Armazena metadados de exames laboratoriais enviados pelos pacientes (`id`, `patient_id`, `file_name`, `file_path`, `mime_type`, `notes`, `created_at`). O arquivo físico correspondente fica armazenado de forma segura no disco da VPS em `backend/uploads/exams/` com controle de download autenticado JWT.

    > **Atenção — Migração Manual**: O `schema.sql` só é executado na criação inicial do volume Docker. Para aplicar tabelas novas em VPS existente, use:
    > ```bash
    > # Tabela de cardápios semanais
    > docker exec nutrir_db psql -U postgres -d slimo -c "CREATE TABLE IF NOT EXISTS weekly_plans (...)"
    > # Tabela de exames laboratoriais
    > docker exec nutrir_db psql -U postgres -d slimo -c "CREATE TABLE IF NOT EXISTS patient_exams (...)"
    > # Colunas clínicas na tabela profiles (se ausentes)
    > docker exec nutrir_db psql -U postgres -d slimo -c "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS comorbidities TEXT; ADD COLUMN IF NOT EXISTS intolerances TEXT; ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT; ADD COLUMN IF NOT EXISTS notes TEXT;"
    > ```

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

### D. Acompanhamento e Vinculação Profissional e Vídeo Chamadas
- Usuários premium vinculam Nutricionista e/ou Personal Trainer.
- **Meu Acompanhamento (`screen-my-professionals`)**: Tela dedicada exclusiva para usuários Premium que permite a vinculação de profissionais, exibição estruturada das orientações/recomendações recebidas e agendamento de consultas por vídeo.
- **Videoconferências Gratuitas (Jitsi Meet)**: Agendamentos geram automaticamente um link único e gratuito hospedado no Jitsi Meet no formato `https://meet.jit.si/nutrir-consultation-<patient_id>-<professional_id>-<timestamp>`, permitindo chamadas diretas pela plataforma por meio de um botão "Iniciar Chamada".
- **Tela de Vídeo Chamada Split Screen (Profissional)**: Ao iniciar a consulta, o profissional é direcionado para a tela dividida `#screen-video-call`. A coluna da esquerda exibe o feed de vídeo (40%) e a coluna da direita (60%) atua como prontuário eletrônico em tempo real, organizado em abas:
  - **Diário Alimentar**: Exibe o diário do paciente detalhado e agrupado por dias, incluindo macros e fotos de refeições escaneadas.
  - **Evolução de Peso**: Painel de acompanhamento físico do paciente com:
    - KPIs de Peso Inicial, Peso Atual e Meta de Peso.
    - Card de conquista dinâmico (`#vc-w-achievement-card`) indicando o progresso de peso com base no objetivo (`lose`, `gain`, `maintain`).
    - Gráfico interativo de linha (`#vc-weight-chart`) renderizado via **Chart.js** comparando o histórico de pesagens com a meta.
    - Tabela de medições listando datas, pesos e delta de variação entre pesagens consecutivas (ganho em vermelho e perda em verde).
    - Rotinas automáticas de limpeza e destruição do gráfico e campos ao encerrar a chamada (`closeVideoCall()`) ou antes de recarregar consultas.
  - **Prescrições e Orientações**: Formulário de envio de novas recomendações e histórico de orientações enviadas.
- **Cancelamento**: Tanto o paciente quanto o profissional podem cancelar consultas diretamente na interface, mudando o status para `cancelled`.

### E. Aba "Receitas do Nutricionista" (App do Paciente)

A aba **Receitas do Nutricionista** (anteriormente "Receitas Fit") exibe o cardápio semanal prescrito pelo profissional vinculado ao paciente. É acessada via `btn-tab-recipes-pro` / `section-recipes-pro` no `index.html`.

**Fluxo de dados**:
1. `loadStateFromAPI()` em `app.js` chama `GET /api/user/weekly-plan` — retorna o plano mais recente e ativo atribuído pelo profissional vinculado.
2. O resultado é armazenado em `state.proWeeklyPlan`.
3. `renderProRecipesTab()` renderiza abas por dia da semana (Seg–Dom) com `renderProPlanDay(dow)` para cada dia.

**Estados de exibição**:
- `#pro-plan-loading`: spinner enquanto carrega.
- `#pro-plan-empty`: mensagem de "nenhum cardápio prescrito" quando não há plano ativo.
- `#pro-plan-content`: conteúdo do plano com abas `.pro-day-tab` e `.pro-meal-card` para cada refeição.

**Rota backend** (`backend/routes/user.js`):
```
GET /api/user/weekly-plan
```
Retorna o plano mais recente (`is_active = true`) do profissional vinculado via JOIN em `professional_links`.

### F. Painel de Administração (`/admin/`)
Acesso unificado em `https://nutrir.online/admin/` para admins e profissionais. O painel foi modularizado utilizando ES6 Modules nativos (`type="module"`), dividindo a antiga base monolítica `admin.js` de ~3.6k linhas em componentes específicos focados (armazenados em `admin/modules/`), o que facilita a manutenção e a escalabilidade do código sem a necessidade de build steps complexos (como Webpack/Vite).

**Administradores**:
- Controle de usuários (promoção de cargo, plano, trial).
- Cadastro de profissionais com comissão de vendas e inline editing.
- Criação e gestão de planos comerciais.
- **Aba Credenciais**: Seleção visual do provedor de IA ativo (cards clicáveis para Gemini/OpenAI/Mistral), cadastro individual de chaves por provedor, botão "Testar provedor ativo" que chama `/api/ai/test` e exibe provedor, modelo, latência e nome da receita de exemplo. Campo de chave Spoonacular API (`spoonacular_api_key`) para busca de receitas no construtor de cardápios.
- **Aba Faturamento**: Montante bruto, total de comissões e lucro líquido.
- **Aba Consultas (Global)**: Visualização de todas as consultas agendadas na plataforma e permissão para cancelá-las.

**Profissionais**:
- **Visão Geral (Meu Painel)**: Card de saudação personalizado + 4 métricas (pacientes ativos, consultas agendadas, slots disponíveis hoje, comissões do mês) + tabela de próximas consultas. Dados via `GET /api/admin/pro-overview`.
- **Meus Pacientes**: Lista com barra de filtro por nome/e-mail e objetivo, contador de resultados, coluna "Objetivo". Ao abrir detalhes: gráfico de evolução de peso (Chart.js), filtro de período nas refeições (7 dias / 30 dias / Tudo) com indicador de aderência calórica, histórico completo de orientações enviadas ao paciente carregado automaticamente.
- **Faturamento**: Comissões acumuladas e pacientes ativos.
- **Agenda**: Grade visual interativa de disponibilidade semanal (ver seção abaixo).
- **Aba Consultas**: Acompanhamento de todas as videochamadas agendadas por seus pacientes vinculados e opção de cancelamento.
- **Aba Cardápios**: Construtor visual de planos nutricionais semanais (ver seção G abaixo).

### G. Aba Cardápios — Construtor de Planos Semanais (Profissional)

A aba **Cardápios** (`#tab-meal-plans`, botão `#nav-meal-plans`) permite ao profissional criar, editar e atribuir cardápios nutricionais semanais completos aos pacientes.

#### Visão de lista:
- Tabela com nome do plano, paciente atribuído, status (Ativo/Inativo) e ações (editar/excluir).
- Botão "Novo Cardápio" abre o construtor.
- Dados via `GET /api/professional/weekly-plans`.

#### Construtor visual:
- **Barra superior** (`#builder-topbar`): campo de nome do plano, seletor de paciente (`#builder-patient-select`) e botão Salvar.
- **Abas por dia** (`.plan-day-tabs`): Segunda a Domingo, cada dia com 6 tipos de refeição (Café da Manhã, Lanche da Manhã, Almoço, Lanche da Tarde, Jantar, Ceia).
- **Cards de refeição** (`.plan-meal-card`): campo de instruções gerais + lista de itens + totais de macros calculados automaticamente.
- **Busca Spoonacular Traduzida**: campo de texto + botão buscar chamam `GET /api/admin/calorie-search?q=<termo>`. Resultados exibem nome da receita, número de porções, tempo de preparo e macros por porção. 
- **Gerador de Receitas por IA**: Para cada item retornado na busca, o botão **Receita IA** (ícone Sparkles) abre o modal `#admin-recipe-generator-modal` e chama `POST /api/ai/generate-recipe` passando os macros, calorias e nome do prato. Ao clicar em **Usar Receita no Plano**, o item em si é adicionado à lista e os ingredientes + modo de preparo detalhados gerados pela IA são injetados nas instruções gerais da refeição automaticamente.

#### Rotas backend (`backend/routes/professional.js`):
| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/professional/weekly-plans` | GET | Lista todos os planos do profissional logado |
| `/api/professional/weekly-plans` | POST | Cria novo plano |
| `/api/professional/weekly-plans/:id` | GET | Retorna plano completo por ID |
| `/api/professional/weekly-plans/:id` | PUT | Atualiza plano (nome, paciente, dados, notas) |
| `/api/professional/weekly-plans/:id` | DELETE | Remove plano |

Todas as rotas requerem `authenticateToken` + `requireRole(['nutritionist','trainer'])`.

#### Proxy Spoonacular Traduzido (`backend/routes/admin.js`):
```
GET /api/admin/calorie-search?q=<termo>
```
- Posicionada **antes** do middleware `requireRole(['admin'])` para que profissionais também possam acessar.
- Lê `spoonacular_api_key` de `system_settings`. **Sem chave configurada retorna 503**.
- **Tradução Bidirecional via IA**: Se a IA estiver configurada (Gemini/OpenAI/Mistral), a rota traduz automaticamente o termo de busca em português para o inglês antes de enviar a requisição ao Spoonacular. Quando os resultados retornam do Spoonacular (em inglês), a IA é utilizada para traduzir em lote (batch) os títulos das receitas de volta para o português (Brasil) antes de enviar a resposta ao frontend.
- Chama `https://api.spoonacular.com/recipes/complexSearch?query=...&addRecipeNutrition=true&number=8&apiKey=...`.
- Normaliza a resposta para `{ items: [{name, servings, ready_in_minutes, calories, protein_g, carbohydrates_total_g, fat_total_g}] }`.
- Macros são **por porção** (não por 100g). O frontend exibe um input de porções e escala os valores antes de inserir no plano.

### H. Agenda de Disponibilidade (Profissional) — Grade Visual

A aba **Minha Agenda** do painel profissional usa uma grade clicável 7×28 (dias × slots de 30 min, 07h–20h30):

- **Interação**: clique para alternar livre/bloqueado; arraste para selecionar múltiplos slots de uma vez; botão no cabeçalho de cada coluna alterna o dia inteiro.
- **Presets**: "Dias Úteis 8h–18h", "Semana Completa 8h–18h", "Limpar Tudo".
- **Contador ao vivo**: exibe quantos slots estão selecionados e total de horas/semana.
- **Persistência no banco**: o backend (`POST /api/admin/availability`) expande cada intervalo recebido em slots individuais de 30 minutos antes de inserir em `professional_availability`. Ex: `08:00–10:00` gera 4 linhas: `08:00–08:30`, `08:30–09:00`, `09:00–09:30`, `09:30–10:00`.
- **Motivo**: cada linha no banco representa exatamente 1 vaga de consulta de 30 minutos, permitindo que o frontend de agendamento exiba slots individuais diretamente.
- **Validação de agendamento**: ao criar uma consulta, o backend normaliza os horários para `HH:MM` (`.substring(0,5)`) antes de comparar com os slots do banco — necessário porque o PostgreSQL retorna colunas `time` no formato `HH:MM:SS`.

### I. Dashboard do Profissional — `GET /api/admin/pro-overview`

Endpoint exclusivo para nutricionistas e personal trainers (`requireRole(['nutritionist','trainer'])`). Executa 4 queries em paralelo via `Promise.all`:

1. **Contagem de pacientes**: `COUNT(*)` da tabela `professional_links` pelo `professional_id`.
2. **Próximas consultas**: até 8 agendamentos futuros (`status != 'cancelled'`) com nome do paciente.
3. **Slots disponíveis hoje**: conta linhas em `professional_availability` para o `day_of_week` atual.
4. **Comissões do mês**: soma de `commission_amount` em `payments` para o mês corrente.

Retorna: `{ totalPatients, consultationsToday, slotsToday, commissionsMonth, nextAppointments[] }`.

**Componentes front-end** (`admin/admin.js` → `loadProOverviewData()`):
- `.pro-greeting-card` com saudação dinâmica por horário (manhã/tarde/noite).
- 4 stat cards com ícones Lucide.
- Tabela de próximas consultas com badge de status.
- Filtros de pacientes: `#patient-search-input` (nome/e-mail) + `#patient-goal-filter` (objetivo) com `applyPatientFilters()` em tempo real.
- Gráfico de peso: `renderPatientWeightChart(weights)` destrói instância anterior (`adminState._patientWeightChart`) e cria Chart.js `line` com tema escuro/âmbar.
- Aderência calórica: `applyMealFilter(days)` calcula média de `% meta atingida por dia` e exibe em `#detail-caloric-adherence`. Os listeners dos botões de filtro (7 dias / 30 dias / Tudo) são registrados em `setupEventListeners()` — não dentro de callbacks async — para garantir funcionamento independente de falhas de carregamento.
- Histórico de feedback: `loadFeedbackHistory(patientId)` chama `GET /professional/patients/:id/feedbacks` e renderiza lista `.fhi-item`.

### J. Tela de Análise Nutricional (Scanner)
A tela `screen-results` exibe após análise de imagem:
- **Card de calorias**: Total em âmbar + barra de progresso vs meta diária (fica vermelha acima de 90%).
- **Card de macros**: Barras horizontais para Proteína (verde), Carboidratos (azul) e Gordura (laranja) mostrando valor atual vs meta diária com percentual.
- **Cards de alimentos**: Nome + kcal em âmbar no topo; badge de peso + tags coloridas (P/C/G/Fibra) embaixo. Clicável para edição.
- **Compressão de imagem**: Frontend redimensiona para max 900px e comprime em JPEG 0.80 antes de enviar — câmera e upload de arquivo. Botão "Analisar" fica bloqueado com "Processando..." durante o resize (evita race condition).

### K. Tela Diário (Dashboard)
- **Painel de macros**: substituiu o grid de 3 colunas por um card único com 3 linhas horizontais — nome + barra de progresso + `consumido/meta g`. Todos os valores arredondados (`Math.round`).
- **Refeições expandíveis**: clicar no cabeçalho ou no botão chevron revela a lista de alimentos individuais com peso e calorias. Tags coloridas P/C/G em cada refeição.

### L. Tela Histórico
- **Card de meta**: badge com o objetivo do usuário (`Emagrecer` / `Ganhar Massa` / `Manutenção`); macros com cores por tipo.
- **Cards de dia**: nome do dia + data, calorias com cor semântica (verde = 85–105% da meta, azul = abaixo, vermelho = acima), barra de progresso, tags P/C/G e botão expandir para ver refeições individuais do dia com horário e macros.

### M. Gestão Clínica e Particularidades do Paciente

A plataforma evoluiu para um sistema completo de gestão clínica, permitindo acompanhar particularidades de saúde do paciente de forma integrada:

1. **Particularidades do Perfil Clínico** (`index.html` + `app.js` + `backend/routes/user.js`):
   - Pacientes informam comorbidades (ex: Diabetes, Hipertensão), intolerâncias/alergias alimentares (ex: lactose, glúten) e restrições alimentares no menu Perfil (`screen-settings`).
   - Esses dados clínicos são persistidos nas colunas `comorbidities`, `intolerances`, `dietary_restrictions` e `notes` da tabela `profiles`.
   - Rotas backend: `GET /api/user/clinical-profile` e `PUT /api/user/clinical-profile`.

2. **Envio e Gestão Segura de Exames Laboratoriais** (`backend/routes/user.js` + `backend/routes/professional.js`):
   - Pacientes Premium fazem upload de exames (PDF ou imagens) na tela Meu Acompanhamento (`screen-my-professionals`).
   - **Fluxo de upload**: `FileReader` lê o arquivo como Base64 no frontend → JSON `{ file_name, mime_type, data_base64, notes }` enviado para `POST /api/user/exams` → backend decodifica o Base64 e grava o arquivo binário em `backend/uploads/exams/<uuid>.<ext>` → metadados persistidos em `patient_exams`.
   - **Download autenticado**: `GET /api/user/exams/:id/download` exige JWT válido, serve o arquivo com `Content-Disposition: attachment`.
   - **Visão do profissional**: `GET /api/professional/patients/:id/exams` lista exames; `PATCH /api/professional/patients/:id/exams/:examId/notes` salva observações médicas por exame.

3. **Prontuário com Três Abas (Profissional)** (`admin/index.html` + `admin/modules/pro-patients.js`):
   - O painel lateral do paciente (`patient-details-view`) é dividido em três abas de navegação:
     - **Diário Alimentar**: Histórico detalhado de refeições com filtros de período (7 dias / 30 dias / Tudo), aderência calórica diária e gráfico de evolução de peso Chart.js.
     - **Ficha Clínica**: Formulário editável em tempo real para comorbidades, intolerâncias e notas clínicas do profissional sobre o paciente. Salva via `PUT /api/professional/patients/:id/clinical`.
     - **Exames**: Lista de exames enviados pelo paciente, botão de download seguro e textarea de observações médicas por exame.

4. **Banner de Alerta Clínico no Construtor de Cardápios** (`admin/modules/pro-meals.js`):
   - Ao selecionar um paciente no construtor, um banner fixo no topo exibe em destaque as comorbidades, intolerâncias e restrições dietéticas daquele paciente.
   - Objetivo: lembrar o profissional das restrições de saúde durante toda a montagem do cardápio, evitando erros clínicos.

5. **Integração com a IA — Restrições Clínicas** (`backend/routes/ai.js`):
   - Quando um profissional solicita geração de receita no construtor, as informações clínicas do paciente selecionado são injetadas no payload de `POST /api/ai/generate-recipe` e `POST /api/ai/generate-weekly`.
   - Os prompts do backend instruem a IA a respeitar rigorosamente essas restrições (ex: sem lactose, sem glúten, adaptações para diabetes) e a indicar substituições seguras nos ingredientes.

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

### Migrações de Schema
O `schema.sql` **só é executado na criação inicial do volume**. Para tabelas adicionadas após o primeiro deploy, aplicar manualmente via SSH:
```bash
docker exec nutrir_db psql -U postgres -d slimo -c "SQL_AQUI"
```

---

## 8. APK Android

### 8.1 WebView Wrapper (legado)
O projeto `mobile-android/` é um **WebView wrapper** que carrega `https://nutrir.online`. Não contém lógica nativa — todas as funcionalidades estão no frontend web.

- Alterações de frontend/backend **não requerem rebuild do APK**.
- Para gerar novo APK: `./gradlew clean assembleDebug` dentro de `mobile-android/`.
- O APK de debug está em `mobile-android/app/build/outputs/apk/debug/app-debug.apk` (forçado no git com `git add -f`).

### 8.2 React Native — Build Local via Gradle (recomendado para desenvolvimento)

O projeto `nutrir-mobile/` é o app React Native nativo. O build local é preferível ao EAS Build para desenvolvimento pois é mais rápido (~3–5 min) e exibe erros em tempo real.

#### Pré-requisitos
- Android Studio instalado
- `ANDROID_HOME` apontando para `%LOCALAPPDATA%\Android\Sdk`
- Java 17+

#### Fluxo de build local

```powershell
# 1. Gera o projeto Android nativo (só precisa rodar quando mudar plugins do app.json)
cd nutrir-mobile
npx expo prebuild --platform android --clean

# 2. Builda o APK de debug
cd android
.\gradlew.bat assembleDebug
```

O APK gerado fica em:
```
nutrir-mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Envie o arquivo para o celular por qualquer meio (USB, WhatsApp, Google Drive) e instale normalmente.

#### Build de release (assinado)
```powershell
cd nutrir-mobile/android
.\gradlew.bat assembleRelease
```
Requer keystore configurado em `nutrir-mobile/android/app/build.gradle`. O keystore gerado está em `nutrir-mobile/nutrir-release.keystore` (senha: ver `credentials.json`).

#### Arquivos de configuração de build
| Arquivo | Finalidade |
|---------|-----------|
| `nutrir-mobile/.npmrc` | `legacy-peer-deps=true` — necessário devido a conflitos de peer deps entre react-native-reanimated e expo-modules-core |
| `nutrir-mobile/credentials.json` | Keystore local para assinatura (não commitar) |
| `nutrir-mobile/nutrir-release.keystore` | Certificado de assinatura Android (não commitar) |
| `nutrir-mobile/eas.json` | Configuração EAS Build (cloud) como alternativa ao build local |

> **Atenção**: `credentials.json` e `nutrir-release.keystore` **nunca devem ser commitados** no git — contêm a chave privada de assinatura do app.

---

## 9. Como Executar o Projeto Localmente

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

## 10. Limites e Configurações Críticas

| Camada | Parâmetro | Valor atual | Observação |
|--------|-----------|-------------|------------|
| Nginx | `client_max_body_size` | `20m` | Bloco `http` em `nginx.conf` |
| Express | `express.json({ limit })` | `15mb` | `backend/server.js` |
| Express | `express.urlencoded({ limit })` | `15mb` | `backend/server.js` |
| Frontend | Resize de imagem scanner | max 900px, JPEG 0.80 | `resizeImageToBase64()` em `app.js` |
| Gemini | Modelos disponíveis para a chave atual | `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-2.0-flash-001`, `gemini-2.0-flash-lite`, `gemini-2.0-flash-lite-001`, `gemini-flash-latest`, `gemini-2.5-flash-lite`, `gemini-pro-latest` | Verificado via ListModels — **não** inclui `gemini-1.5-*` |
| Spoonacular | Plano gratuito | 150 req/dia | Chave obrigatória — sem fallback. Cadastro em spoonacular.com/food-api |

---

## 11. Próximos Passos e Sugestões de Melhorias

1. **Gateways Reais de Produção**: Substituir webhooks simulados de pagamento por integrações reais com Mercado Pago / Asaas.
2. **Google OAuth Configurado**: Cadastrar um Client ID real (formato `xxxx.apps.googleusercontent.com`) no painel admin para habilitar o login social.
3. **Upload de Fotos**: Criar serviço de storage (S3 ou pasta estática no Express) para arquivar fotos dos pratos analisados.
4. **Edição do Diário**: Permitir que usuários cliquem nas refeições registradas no Dashboard para editar e salvar no banco.
5. **Notificações de Fallback de IA visíveis ao usuário**: Exibir um aviso discreto quando o sistema usou fallback automático de provedor de IA.
6. **Notificação de novo cardápio**: Alertar o paciente via badge ou push notification quando o profissional atribuir ou atualizar o cardápio semanal.
7. **Impressão / PDF do Cardápio**: Botão "Exportar PDF" no construtor para que o profissional possa imprimir e entregar ao paciente.

---

## 12. Diretrizes de Desenvolvimento (Padrões do Projeto)

- **Idioma Obrigatório**: Todas as documentações (`.md`), comentários no código, mensagens de erro, logs do terminal e **mensagens de commits do Git DEVEM obrigatoriamente ser escritas em português (Brasil)**. Commits em outros idiomas não serão aceitos.

- **Sistema de Design — Obsidian**: Seguir os tokens definidos na seção 6. Não alterar nomes de classe existentes no HTML.

- **Listeners de eventos**: Registrar sempre em `setupEventListeners()` — nunca dentro de callbacks `async` ou funções de carregamento de dados. Isso garante que os handlers funcionem mesmo que chamadas à API falhem.

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

---

## 13. Plano de Migração — React Native (App Mobile Nativo)

### Por que React Native?

O app atual (`mobile-android/`) é um **WebView wrapper** — uma casca Android que carrega `https://nutrir.online` dentro de um navegador embutido. Isso traz limitações estruturais que impedem evoluir o produto para um nível profissional:

| Limitação atual (WebView) | Solução com React Native |
|---|---|
| `localStorage` some entre sessões (bug já vivenciado) | `expo-secure-store` — storage nativo, permanente |
| Push notifications via bridge manual frágil | `expo-notifications` + FCM nativo real |
| Vídeo chamada abre browser externo (Jitsi) | SDK nativo Agora.io/ZEGOCLOUD embutido no app |
| Maps não suportado | `react-native-maps` com Google Maps nativo |
| Performance limitada (renderiza HTML) | Componentes compilados para nativo real |
| iOS requer projeto Xcode separado | Um único código → Android + iOS via Expo EAS |
| Câmera/biometria via bridges manuais | `expo-camera`, `expo-local-authentication` nativos |

**Vantagem estratégica**: toda a lógica de negócio do `app.js` (chamadas de API, autenticação JWT, transformações de dados, cálculos de macros) será **reaproveitada quase integralmente** — apenas a camada de UI (HTML → componentes RN) precisará ser reescrita.

---

### Stack Tecnológica React Native

| Camada | Tecnologia | Justificativa |
|---|---|---|
| **Framework** | Expo SDK 52+ (Managed Workflow) | EAS Build gera APK/IPA sem Xcode/Android Studio |
| **Linguagem** | TypeScript | Tipagem previne bugs de runtime; autocomplete da API |
| **Navegação** | React Navigation 7 (Stack + Bottom Tabs) | Padrão de mercado; suporta drawer, modais e deep links |
| **Estado global** | Zustand | Substituto direto do `state` object atual; simples e sem boilerplate |
| **Chamadas API** | TanStack Query (React Query) | Cache automático, retry, loading/error states prontos |
| **Token/auth** | `expo-secure-store` | Keychain (iOS) + Keystore (Android) — à prova de limpeza de cache |
| **Push nativo** | `expo-notifications` + Firebase FCM | Notificações reais em background e foreground |
| **Scanner IA** | `expo-camera` + `expo-image-picker` | Camera e galeria nativos; envia base64 para `/api/ai/analyze-food` |
| **Vídeo chamada** | `react-native-agora` | SDK nativo; substitui Jitsi externo; plano gratuito: 10k min/mês |
| **Maps** | `react-native-maps` + Google Maps SDK | Para futuras funcionalidades de localização de profissionais |
| **Gráficos** | `victory-native` ou `react-native-gifted-charts` | Substitui Chart.js; roda no thread nativo via Skia |
| **UI/Ícones** | `lucide-react-native` | Mesmo set de ícones do web app |
| **Build/Deploy** | Gradle local + EAS Build (cloud) | Local: rápido para dev; EAS: CI/CD e iOS |

---

### Estrutura de Pastas Proposta

```
nutrir-mobile/
├── app/                         # Telas (Expo Router — file-based routing)
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Bottom tab navigator (Diário, Receitas, Profissional, Clínico)
│   │   ├── diario.tsx
│   │   ├── receitas.tsx
│   │   ├── profissional.tsx
│   │   └── clinico.tsx
│   ├── (drawer)/                # Telas acessadas via menu lateral
│   │   ├── perfil.tsx
│   │   ├── historico.tsx
│   │   └── jejum.tsx
│   ├── scanner.tsx              # Câmera IA (modal sobre o diário)
│   ├── video-call.tsx           # Vídeo consulta (Agora)
│   └── _layout.tsx              # Root layout + auth guard
├── src/
│   ├── api/                     # Camada de chamadas HTTP (reaproveitada do app.js)
│   │   ├── client.ts            # axios instance com baseURL + interceptor JWT
│   │   ├── auth.ts              # login, register, google
│   │   ├── user.ts              # profile, meals, water, weight, clinical
│   │   ├── ai.ts                # analyze-food, generate-recipe, generate-weekly
│   │   └── professional.ts      # links, appointments, feedbacks, exams
│   ├── store/                   # Zustand stores (equivalentes ao `state` do app.js)
│   │   ├── authStore.ts         # token, user — persiste via SecureStore
│   │   ├── profileStore.ts      # userProfile, weightHistory
│   │   ├── mealsStore.ts        # mealsLog, waterConsumed
│   │   └── fastingStore.ts      # fastingActive, fastingStart, protocol
│   ├── components/
│   │   ├── ui/                  # Componentes base do design system Obsidian
│   │   │   ├── Card.tsx         # Equivalente ao .settings-card
│   │   │   ├── Button.tsx       # btn-primary, btn-secondary, btn-danger
│   │   │   ├── Input.tsx
│   │   │   └── Badge.tsx
│   │   ├── dashboard/
│   │   ├── meals/
│   │   ├── scanner/
│   │   └── charts/
│   ├── hooks/
│   │   ├── useAuth.ts           # Guarda de autenticação
│   │   ├── useDashboard.ts      # React Query + cálculos de macros
│   │   └── useNotifications.ts  # Registro FCM + agendamento local
│   ├── constants/
│   │   └── theme.ts             # Tokens Obsidian traduzidos para RN StyleSheet
│   └── utils/
│       ├── macros.ts            # Cálculos nutricionais (copiados do app.js)
│       └── imageResize.ts       # Resize antes de enviar para a IA
├── assets/
│   ├── icon.png
│   └── splash.png
├── app.json                     # Configuração Expo
├── eas.json                     # Configuração EAS Build (dev/preview/production)
└── package.json
```

---

### Design System Obsidian — Tradução para React Native

```typescript
// src/constants/theme.ts
export const colors = {
  bgApp:        '#0a0a0c',
  bgSurface:    'rgba(255,250,240,0.04)',
  borderColor:  'rgba(255,250,240,0.08)',
  borderHover:  'rgba(255,250,240,0.14)',
  primary:      '#f5c14d',   // âmbar
  primaryHover: '#e0a13a',
  textMain:     '#f4f1ec',
  textMuted:    'rgba(244,241,236,0.45)',
  danger:       '#e0734a',
  secondary:    '#60a5fa',
};

export const radii = {
  card:   18,
  button: 12,
  input:  10,
};
```

---

### Mapeamento de Funcionalidades: Web → React Native

| Funcionalidade web | Equivalente RN | Observação |
|---|---|---|
| `showScreen('screen-X')` | `router.push('/x')` (Expo Router) | Navegação declarativa por arquivo |
| `state.userProfile` | `profileStore.userProfile` (Zustand) | Persiste via `AsyncStorage` |
| `localStorage.getItem('nutrir_token')` | `SecureStore.getItemAsync('nutrir_token')` | Criptografado no Keychain/Keystore |
| `lucide` icons | `lucide-react-native` | Mesmo nome de ícone |
| `Chart.js` gráficos | `victory-native` | Roda via Skia no thread nativo |
| Scanner câmera | `expo-camera` + `expo-image-picker` | Mesma API `/api/ai/analyze-food` |
| Jitsi Meet (browser externo) | `react-native-agora` | Vídeo embutido no app |
| `AlarmManager` (notificações) | `expo-notifications` (FCM) | Notificações reais em background |
| `WebView.setWebContentsDebuggingEnabled` | Removido — não necessário | |
| `AndroidApp.saveToken()` (bridge atual) | `SecureStore` direto | Elimina o bridge manual |

---

### Fases de Implementação

#### Fase 1 — Fundação ✅ CONCLUÍDA (2026-05-27)
**Meta**: App roda, faz login, exibe o dashboard com dados reais.

- [x] `npx create-expo-app nutrir-mobile --template expo-template-blank-typescript`
- [x] Configurar Expo Router v56 + Bottom Tabs (4 abas: Diário, Receitas, Profissional, Clínico)
- [x] Design system Obsidian: `src/constants/theme.ts` — cores, tipografia, espaçamento, raios
- [x] `src/store/authStore.ts` — Zustand + `expo-secure-store` (token JWT persistente no Keystore)
- [x] Auth guard em `app/_layout.tsx` — redireciona automaticamente entre login e tabs
- [x] Tela Login (`app/(auth)/login.tsx`) — formulário com validação e feedback de erro
- [x] Tela Registro (`app/(auth)/register.tsx`) — cadastro com confirmação de senha
- [x] Tela Diário/Dashboard (`app/(tabs)/index.tsx`) — anel SVG de calorias, macros com barra de progresso, lista de refeições
- [x] Tela Receitas (`app/(tabs)/receitas.tsx`) — listagem com busca local
- [x] Tela Profissional (`app/(tabs)/profissional.tsx`) — card do nutricionista e consultas
- [x] Tela Clínico (`app/(tabs)/clinico.tsx`) — perfil clínico com modo leitura/edição
- [x] `src/api/client.ts` — axios com interceptor JWT automático e logout em 401
- [x] `src/components/CalorieRing.tsx` — anel SVG animável com react-native-svg

**Arquitetura de arquivos criada:**
```
nutrir-mobile/
├── app/
│   ├── _layout.tsx              # Root layout + QueryClient + Auth guard
│   ├── (auth)/
│   │   ├── _layout.tsx          # Stack sem header
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── (tabs)/
│       ├── _layout.tsx          # Bottom tab navigator
│       ├── index.tsx            # Diário (Dashboard)
│       ├── receitas.tsx
│       ├── profissional.tsx
│       └── clinico.tsx
└── src/
    ├── api/client.ts
    ├── store/authStore.ts
    ├── constants/theme.ts
    └── components/CalorieRing.tsx
```

#### Fase 2 — Core de Rastreamento ✅ CONCLUÍDA (2026-05-27)
**Meta**: Usuário consegue registrar tudo que registra hoje no web app.

- [x] Scanner IA: `app/scanner.tsx` — `CameraView` (expo-camera v56), compressão com `expo-image-manipulator`, envio base64 → `/api/ai/analyze-food`
- [x] Tela de resultados: `app/scan-results.tsx` — seleção de alimentos, escolha de refeição, adicionar ao diário via `POST /diario/add-foods`
- [x] Busca manual de alimentos: `app/add-food.tsx` — busca debounced com `GET /user/food-search`, seleção de quantidade e refeição
- [x] Registro de água: `src/components/WaterTracker.tsx` — botões de adição rápida (200/300/500ml), barra de progresso visual
- [x] Tela Histórico: `app/historico.tsx` — gráficos de linha SVG nativos (sem victory-native), períodos 7/14/30 dias para calorias, proteína, água e peso
- [x] Tela Jejum: `app/jejum.tsx` — timer em tempo real com anel SVG, persistência do timestamp via `expo-secure-store`, histórico de sessões, meta 16h configurável

**Novas rotas registradas no root layout (Stack):**
- `app/scanner.tsx` — `fullScreenModal`
- `app/scan-results.tsx`
- `app/add-food.tsx`
- `app/historico.tsx`
- `app/jejum.tsx`

**Novos componentes:**
- `src/components/LineChart.tsx` — gráfico de linha SVG reutilizável (labels, dots, gradiente)
- `src/components/WaterTracker.tsx` — tracker de hidratação com react-query

**Pacote adicionado:** `expo-image-manipulator ~56.0.15`

#### Fase 3 — Receitas e Plano Nutricional ✅ CONCLUÍDA (2026-05-27)
**Meta**: Receitas IA e cardápio do nutricionista funcionando.

- [x] **Tela Receitas com 3 abas internas** (`app/(tabs)/receitas.tsx`):
  - **Aba Nutricionista** — lista filtrada com busca, pull-to-refresh, `GET /recipes?source=nutricionista`
  - **Aba Gerador IA** — formulário com preferências, objetivo, tipo de refeição, porções → `POST /ai/generate-recipe` → resultado inline com opção de regenerar ou abrir detalhe
  - **Aba Cardápio** — picker de dia da semana com indicador do dia atual, `GET /meal-plan/weekly`, `POST /ai/generate-weekly`, total de kcal por dia, lista de refeições clicáveis
- [x] **Tela detalhe de receita** (`app/recipe-detail.tsx`):
  - Lista de ingredientes com quantidades
  - Passos numerados de preparo
  - Card de macros (kcal, proteína, carb, gordura)
  - Meta chips: tempo de preparo, porções, dificuldade com cor
  - Suporte a receitas da API (por ID) e receitas geradas pela IA (via `params.data`)
  - "Adicionar ao diário" com picker de refeição, "Salvar receita" para receitas IA
- [x] **Componente `RecipeCard`** (`src/components/RecipeCard.tsx`) — card reutilizável com macros, badge de dificuldade colorido, tag "IA"

**Endpoints utilizados:**
- `GET /recipes` + `GET /recipes/:id`
- `POST /ai/generate-recipe` — { preferences, restrictions, goal, meal_type, servings }
- `GET /meal-plan/weekly` + `POST /ai/generate-weekly`
- `POST /recipes/save` — salvar receita IA no perfil
- `POST /diario/add-recipe` — adicionar receita ao diário do dia

#### Fase 4 — Perfil e Dados Clínicos ✅ CONCLUÍDA (2026-05-27)
**Meta**: Toda a seção de perfil funcional.

- [x] **Drawer lateral animado** (`src/components/AppDrawer.tsx`):
  - Slide-in da esquerda com `Animated.spring` + backdrop com fade
  - Itens: Meu Perfil, Histórico, Jejum, Meus Exames, Painel Admin (condicional por role)
  - Avatar com iniciais, nome, email, badge de plano
  - Botão "Sair" com logout + redirect para login
  - `src/store/drawerStore.ts` — Zustand: `open()`, `close()`, `toggle()`
- [x] **Hamburger em todas as abas** — `src/components/ScreenHeader.tsx` (reutilizável, prop `right` opcional)
  - Dashboard: hamburger à esquerda + greeting centralizado
  - Receitas, Profissional, Clínico: `<ScreenHeader />` substituindo títulos inline
- [x] **Tela Perfil** (`app/perfil.tsx`):
  - Avatar com tap-to-change via `expo-image-picker` (POST `/user/avatar` com base64)
  - Grid de stats: idade, altura, peso, IMC calculado
  - Widget de registro de peso (input + botão Salvar → `POST /profile/weight`)
  - Gráfico de evolução do peso 30 dias com `LineChart` SVG
  - Links para Perfil Clínico e Meus Exames
  - Edição inline do nome via ícone Edit3
- [x] **Tela Exames** (`app/exams.tsx`):
  - Upload de PDF e imagens via `expo-document-picker` + leitura base64 com `expo-file-system`
  - Validação de tamanho (máx 10 MB)
  - Seletor de categoria: Hemograma, Bioquímica, Hormônios, Urina, Imagem, Outro
  - Listagem com tipo, data, tamanho e botão de exclusão com confirmação
- [x] **Tela Clínico atualizada** — link para Exames + `ScreenHeader` com botão Editar
- [x] **Rotas adicionadas ao Stack**: `perfil`, `exams`

**Novos arquivos:**
- `src/store/drawerStore.ts`
- `src/components/AppDrawer.tsx`
- `src/components/ScreenHeader.tsx`
- `app/perfil.tsx`
- `app/exams.tsx`

#### Fase 5 — Área Profissional e Vídeo (Semana 7–8) ✅ CONCLUÍDA
**Meta**: Pacientes premium interagem com profissionais nativamente.

- [x] **Tela Agendamento de Consultas** (`app/schedule-appointment.tsx`)
  - Calendário nativo com `react-native-calendars`, tema Obsidian customizado
  - `minDate=hoje`, `maxDate=hoje+60 dias`
  - Ao selecionar data: `GET /appointments/available?date=YYYY-MM-DD` retorna slots
  - Grade de horários disponíveis/indisponíveis com chip visual
  - Seletor de tipo: Vídeo chamada / Presencial (com ícone e check badge)
  - Campo de Observações opcional (multiline)
  - Card de Resumo e botão Confirmar: `POST /appointments`
  - Sucesso: Alert + router.back()

- [x] **Tela Vídeo Chamada Nativa** (`app/video-call.tsx`)
  - Integração com `react-native-agora ^4.5.4`
  - Import com guard dinâmico (require dentro de try/catch) — evita crash no Expo Go
  - Fallback visual informativo quando `Constants.appOwnership === 'expo'`
  - Vídeo remoto em tela cheia com `RtcSurfaceView`
  - PiP de vídeo local (canto superior direito, 100×140)
  - Controles: Mudo, Câmera off, Encerrar chamada (vermelho)
  - Estados gerenciados: `connecting → connected`, `remoteUid`, `micMuted`, `camOff`
  - Cleanup no unmount: `leaveChannel`, `unregisterEventHandler`, `release`
  - Params via `useLocalSearchParams`: `channelName`, `token`, `appointmentId`

- [x] **Tela Profissional atualizada** (`app/(tabs)/profissional.tsx`)
  - Botão "Agendar consulta" → navega para `/schedule-appointment`
  - `AppointmentCard` com botão "Entrar na consulta" para consultas de vídeo agendadas → navega para `/video-call` com params
  - Seção "Meu Acompanhamento" com orientações do nutricionista (`GET /user/nutritionist-notes`)
  - Interface `NutritionistNote` e cards de notas com data e conteúdo

- [x] **Rotas adicionadas ao Stack** (`app/_layout.tsx`):
  - `schedule-appointment` — `slide_from_right`
  - `video-call` — `fullScreenModal + slide_from_bottom`

**Pacotes instalados (Fase 5):**
- `react-native-agora ^4.5.4` — vídeo chamada nativa (requer EAS Build)
- `react-native-calendars ^1.1314.0` — calendário de agendamento

**Permissões adicionadas ao `app.json`:**
- iOS: `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`
- Android: `CAMERA`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `BLUETOOTH`, `BLUETOOTH_CONNECT`

**Novos arquivos:**
- `app/schedule-appointment.tsx`
- `app/video-call.tsx`

#### Fase 6 — Push Notifications (Semana 9)
**Meta**: Notificações reais que funcionam com app fechado.

- [ ] Configurar Firebase FCM: `expo-notifications` + `google-services.json`
- [ ] Backend: rota `POST /api/notifications/send` usando Firebase Admin SDK
- [ ] Notificações implementadas:
  - Lembrete de registrar refeição (scheduled local)
  - Alerta de nova consulta agendada
  - Aviso de novo cardápio prescrito pelo profissional
  - Lembrete de registro de peso semanal

#### Fase 7 — iOS + Produção (Semana 10)
**Meta**: App publicado nas duas lojas.

- [ ] Testar tudo no simulador iOS (via EAS Build)
- [ ] Configurar `eas.json` para perfis `development`, `preview`, `production`
- [ ] Gerar APK/AAB para Google Play:
  - **Local**: `cd android && .\gradlew.bat bundleRelease`
  - **Cloud**: `eas build --platform android --profile production`
- [ ] Gerar IPA para App Store: `eas build --platform ios --profile production` (requer Mac ou EAS)
- [ ] Submissão automática: `eas submit`

---

### .gitignore recomendado para `nutrir-mobile/`

```gitignore
node_modules/
android/
ios/
dist/
.expo/
*.keystore
credentials.json
```

> A pasta `android/` é gerada automaticamente por `npx expo prebuild` e **não deve ser versionada** — ela é recriada a partir do `app.json` e dos plugins. Versionar causaria conflitos ao rodar prebuild novamente.

---

### Backend: Zero Alterações Necessárias nas Fases 1–5

O backend Node.js/Express/PostgreSQL existente é 100% compatível. O app RN consome as mesmas rotas `/api/*` com os mesmos tokens JWT. Apenas na Fase 6 (push notifications) será necessário adicionar:

```javascript
// backend/routes/notifications.js (novo arquivo — Fase 6)
// POST /api/notifications/register-token   → salva FCM token do dispositivo
// POST /api/notifications/send             → dispara push via Firebase Admin SDK
```

E uma nova coluna no banco:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;
```

---

### Comparação de Esforço

| Abordagem | Tempo estimado | Resultado |
|---|---|---|
| Continuar no WebView | 0 | Limitado, bugs de storage, sem iOS real |
| Migrar para Capacitor | 1–2 semanas | Resolve bugs, mantém web UI, sem RN |
| **React Native (este plano)** | **8–10 semanas** | **App nativo profissional iOS + Android** |
| Flutter | 10–14 semanas | App nativo mas reescreve tudo em Dart |

---

### Repositório Sugerido

O projeto RN deve viver em repositório separado (`nutrir-mobile`) para não misturar com o backend/web. O backend permanece em `https://github.com/JonthanCarpini/dieta`.

```bash
# Inicializar o projeto RN
npx create-expo-app nutrir-mobile --template expo-template-blank-typescript
cd nutrir-mobile

# Dependências principais (versões compatíveis com Expo SDK 56)
npx expo install expo-router expo-secure-store expo-camera expo-image-picker \
  expo-notifications expo-document-picker expo-file-system expo-image-manipulator \
  expo-linking expo-constants expo-modules-core expo-system-ui \
  react-native-reanimated react-native-worklets react-native-gesture-handler \
  react-native-svg react-native-safe-area-context react-native-screens \
  react-native-agora react-native-calendars

npm install zustand @tanstack/react-query axios lucide-react-native \
  @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack \
  --legacy-peer-deps

# Criar .npmrc para resolver conflitos de peer deps
echo "legacy-peer-deps=true" > .npmrc
```

> **Nota importante**: O peer conflict entre `react-native-reanimated` (que exige `react-native-worklets@0.9.x`) e `expo-modules-core` (que quer `worklets@^0.7||^0.8`) é resolvido com `.npmrc`. Sempre instale novos pacotes com `--legacy-peer-deps` ou via `npx expo install`.

---

## 14. Arquitetura Modular do Painel Admin (ES6 Modules)

Com o crescimento do painel de administração, o arquivo monolítico `admin/admin.js` original foi reestruturado para utilizar **ES6 Modules nativos** (`type="module"`), dividindo as responsabilidades em arquivos menores e focados sem necessidade de ferramentas de empacotamento adicionais (como Vite, Webpack ou Babel).

### Princípios da Arquitetura:
1. **Sem Build Step**: Todos os submódulos são scripts JavaScript padrão carregados diretamente pelo browser via declaração `<script type="module" src="admin.js"></script>` no `admin/index.html`.
2. **Estado Centralizado**: Todo o estado mutável do painel é armazenado e exportado pelo `state.js`. Nenhum módulo declara variáveis globais — todos importam `adminState` de `state.js`.
3. **Escopo Limpo**: Funções e variáveis internas de cada submódulo ficam protegidas sob o escopo do próprio módulo, expondo apenas o estritamente necessário via `export`.
4. **Entrypoint único**: `admin.js` orquestra o ciclo de vida — chama `initAuth()`, `initProSchedule()`, `initProPatients()` e `initProMeals()` no `DOMContentLoaded`, registra os listeners de navegação e delega a carga de dados de cada aba para o módulo responsável via `loadTab(tabId)`.

### Estrutura de Imports (`admin/admin.js`):
```javascript
import { adminState } from './modules/state.js';
import { initAuth, checkSession, showLoginScreen, handleLogin } from './modules/auth.js';
import { initAdminFeatures, loadOverviewData, loadUsersData, loadProfessionalsData,
         loadPlansData, loadSettingsData, loadBillingData, setupVisibilityToggles,
         resetPlanForm, handlePlanSave, handleProRegistration, handleSettingsSave
       } from './modules/admin-features.js';
import { initProSchedule, loadScheduleData } from './modules/pro-schedule.js';
import { initProPatients, loadPatientsData } from './modules/pro-patients.js';
import { loadAppointmentsData } from './modules/pro-appointments.js';
import { initProMeals, loadMealPlansData, openMealPlanBuilder, saveMealPlan } from './modules/pro-meals.js';
```

### Descrição dos Submódulos (`admin/modules/`):

- **`state.js`**:
  - Exporta `API_URL` (detecta `localhost` para dev vs produção automaticamente).
  - Exporta `adminState` — objeto mutável compartilhado: `token`, `user`, dados em cache de pacientes/planos/settings e referências a instâncias Chart.js ativas.

- **`auth.js`**:
  - `initAuth(callback)`: verifica token salvo no `localStorage`, valida com `GET /api/auth/me` e executa o callback com o tab padrão correto (`overview` para admin, `patients` para profissional).
  - `handleLogin(e)`: captura submit do form de login, chama `POST /api/auth/login`, armazena token e inicia dashboard.
  - `showLoginScreen()` / `showDashboard()`: alterna visibilidade entre `#login-container` e `#admin-dashboard`.

- **`admin-features.js`**:
  - Exclusivo do perfil `admin`. Gerencia: listagem/edição de usuários, cadastro de profissionais com comissão, CRUD de planos comerciais, aba de credenciais (IA + Spoonacular + gateways de pagamento), teste de latência de IA e faturamento geral.
  - Exporta `setupVisibilityToggles()` — inicializa botões de toggle de visibilidade em campos de senha (`.toggle-visibility-btn`) e é chamado pelo entrypoint antes da autenticação.

- **`pro-schedule.js`**:
  - Grade visual 7×28 de disponibilidade semanal (slots de 30 min, 07h–20h30).
  - `initProSchedule()`: registra listeners de clique/drag na grade e nos botões de preset.
  - `loadScheduleData()`: carrega slots salvos de `GET /api/admin/availability` e marca células ativas.

- **`pro-appointments.js`**:
  - `loadAppointmentsData()`: busca consultas agendadas do profissional em `GET /api/professional/appointments` e renderiza tabela com badge de status e botão cancelar/iniciar chamada.

- **`pro-patients.js`**:
  - `initProPatients()`: registra listeners para filtros de refeição, busca de pacientes e navegação de abas do prontuário.
  - `loadPatientsData()`: carrega lista de pacientes vinculados com filtros nome/e-mail e objetivo.
  - `viewPatientDetails(patientId)`: carrega prontuário completo — diário alimentar (com `applyMealFilter`), gráfico de peso (Chart.js `line`), ficha clínica e exames laboratoriais nas três abas do `patient-details-view`.
  - `renderPatientWeightChart(weights)`: destrói instância anterior (`adminState._patientWeightChart`) e recria o gráfico com tema escuro/âmbar.

- **`pro-meals.js`**:
  - `initProMeals()`: registra listeners da barra de busca Spoonacular (`#btn-calorie-search`, `#calorie-search-input`) e do modal de receitas IA (`#admin-recipe-generator-modal`).
  - `loadMealPlansData()`: busca planos de `GET /api/professional/weekly-plans` e renderiza tabela de lista.
  - `openMealPlanBuilder(planId?)`: abre o construtor visual, exibe banner de alertas clínicos do paciente selecionado e renderiza as abas de dias com cards de refeição.
  - `runCalorieSearch()`: chama proxy Spoonacular (`GET /api/admin/calorie-search?q=...`), renderiza resultados com porções e botões "Adicionar" / "Receita IA".
  - `saveMealPlan()`: persiste o plano via `POST` ou `PUT /api/professional/weekly-plans/:id`.

### Diretrizes para Novas Implementações no Painel Admin:
- **Importações**: Sempre use caminhos relativos com extensão completa: `import { adminState } from './state.js'` (sem omitir `.js`).
- **Listeners estáticos**: Registre em funções `init*()` chamadas no `DOMContentLoaded` do `admin.js`. Nunca dentro de funções `load*()` que executam após chamadas à API.
- **Listeners dinâmicos**: Se o elemento é gerado em tempo de execução (ex: botão de linha de tabela), associe o listener diretamente no momento da renderização do HTML.
- **Novo módulo**: crie o arquivo em `admin/modules/`, exporte as funções públicas, importe no `admin.js` e adicione a chamada de init e load no fluxo de `initAdmin()` / `loadTab()`.

---

## 14. ✅ BUG RESOLVIDO — Scanner Mobile React Native crasha após upload

> **Status:** RESOLVIDO em 2026-05-28.
> **Arquivos envolvidos:** `nutrir-mobile/app/scanner.tsx`, `nutrir-mobile/app/scan-results.tsx`, `backend/routes/ai.js`.

### 14.1. Causa do Bug
O crash nativo ("nutrir-mobile parou") ocorria por dois motivos principais:
1. **Erro de Desmontagem/Hardware da Câmera:** Ao manter a `CameraView` ativa em background durante o upload e análise (que leva de 15 a 20 segundos), o hardware da câmera e recursos de GPU/memória causavam crashes nativos em alguns aparelhos Android.
2. **Erro de Tipagem/Mapeamento no JS (Hermes):** O backend (Gemini Vision) respondia com um objeto JSON no formato `{"items": [...], "total": {...}}`. Na tela `ScanResultsScreen` (`scan-results.tsx`), o código original fazia `JSON.parse(results)` assumindo que a resposta era diretamente uma lista (Array), tentando rodar `foods.map()` sobre um objeto. Isso disparava um `TypeError` fatal não tratado que derrubava a thread do Hermes/React Native, fechando o app imediatamente.

### 14.2. Correção Aplicada
1. **Desmontagem da Câmera:** Modificamos o `scanner.tsx` para desmontar completamente o componente `<CameraView>` enquanto `capturing` for verdadeiro (durante a análise), liberando os recursos de hardware do dispositivo.
2. **Tratamento Robusto de JSON:** Ajustamos o parsing no `scan-results.tsx` para suportar de forma segura tanto um array direto de alimentos quanto o objeto encapsulado da IA (`items`), tratando erros com `try/catch` e fallback para array vazio, eliminando qualquer `TypeError` que crashava o Hermes.
3. **Endpoint Binário e Sincronização:** Ajustamos o endpoint de upload para `/api/ai/analyze-food-binary` no backend para aceitar dados brutos (evitando bridge de base64 lento), criamos a rota de inserção correta (`POST /api/user/meals`) no app mobile, realizamos o push e deploy completo na VPS, e rebuildamos o APK de release assinado com sucesso.

### 14.3. Como testar
1. Instale o novo APK gerado em `nutrir-mobile/android/app/build/outputs/apk/release/app-release.apk`.
2. Abra o scanner de alimentos com IA, capture uma foto ou envie uma imagem da galeria.
3. Aguarde o processamento. A tela de resultados será aberta exibindo os alimentos identificados sem qualquer travamento.

### 14.4. Hipóteses descartadas

- ❌ **Tamanho da imagem em base64 (~178 KB)**: testado — o problema persiste mesmo com imagem pequena
- ❌ **Hermes não suporta `JSON.stringify` de string grande**: o log mostra que `JSON.stringify` completa OK
- ❌ **Bridge JS↔Native do RN Networking**: a tentativa #4 usa `FileSystem.uploadAsync` que utiliza OkHttp nativo DIRETO (a mesma abordagem que o app Kotlin nativo em `mobile-android/` usa e funciona) — ainda assim crashou
- ❌ **Backend não respondendo**: nas tentativas 2 e 3 vemos HTTP 200 chegando antes do crash
- ❌ **Memória excessiva (OOM)**: o telefone tem 12+ GB livres no momento do teste
- ❌ **Permissão de câmera/galeria**: ambas estão concedidas e funcionando
- ❌ **`expo-file-system` deprecado**: corrigido com `import * as FileSystem from 'expo-file-system/legacy'`
- ❌ **API fluente nova do `ImageManipulator`**: corrigido voltando para `manipulateAsync` (API estável)

### 14.5. Pistas que podem ajudar o próximo agente

1. **A versão Kotlin nativa (`mobile-android/`) já existe e funciona** com o mesmo backend. Comparar como ela manda imagem e processa resposta.
2. **`backend/routes/ai.js` log mostra `Gemini OK: gemini-2.5-flash (v1beta)`** — então o backend SEMPRE responde com sucesso. O crash é puramente no client.
3. O endpoint `POST /api/ai/analyze-food-binary` foi adicionado e está funcional (retorna `401` sem token, `200` com token). Pode ser usado.
4. **Pode ser um native crash** (não JS). Vale rodar `adb logcat` enquanto reproduz o crash para capturar o stack trace nativo. Não foi feito ainda.
5. **Verificar limit de memória do Hermes**: app pode estar segurando referências de bitmaps antigos da câmera. Talvez `cameraRef.current.pausePreview()` antes do upload ajude.
6. Configuração relevante de `app.json`:
   - SDK Expo 56
   - `jsEngine: 'hermes'` (padrão)
   - Permissões: `CAMERA`, `READ_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES`
7. **Modelo do device de teste:** Android com Realme/Oppo UI — pode ter restrições agressivas de OEM (background killing, OOM agressivo).

### 14.6. Build do APK

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
Set-Location "C:\Users\admin\Desktop\Dieta\nutrir-mobile\android"
.\gradlew.bat assembleRelease
# APK em: app\build\outputs\apk\release\app-release.apk (372 MB devido Agora SDK)
```

### 14.7. Outras correções APLICADAS na mesma sessão (essas funcionam!)

1. **Tab bar respeitando navbar do Android** — `_layout.tsx` usa `useSafeAreaInsets().bottom`
2. **Perfil mostrando `--`** — `r.data.profile.height/weight` (não `height_cm/weight_kg`)
3. **Perfil Clínico não salvando** — rota correta `/user/clinical` (não `/profile/clinical`), método POST, `useEffect` em vez de `onSuccess` (deprecated no TanStack v5)
4. **Coluna `medications` / `health_goals`** — adicionada migração idempotente em `backend/server.js` (`ALTER TABLE IF NOT EXISTS`)
5. **Macros invisíveis no dashboard** — `MacroCard` redesenhado com `/240g` na mesma cor do macro e percentual abaixo da barra
6. **Galeria adicionada ao scanner** — botão `ImagePicker.launchImageLibraryAsync` ao lado do botão de captura
7. **Suporte à Safe Area Bottom nas telas avulsas e rodapés:** Adicionado suporte a `edges={['top', 'bottom']}` nas `SafeAreaView` de todas as telas avulsas e cálculo dinâmico com `useSafeAreaInsets()` nos rodapés/modais (`scan-results.tsx` e `add-food.tsx`) para evitar que botões ou campos fossem cobertos pela barra de navegação/ações nativa do Android.

### 14.8. Memória/contexto importante

- **Deploy workflow obrigatório:** `git add` → `git commit` → **`git push`** → `node deploy.js`. O `deploy.js` faz `git pull origin master` na VPS, então sem push o servidor pega código antigo.
- Container Docker mantém versão antiga rodando se o novo build falha. Bug com `const` duplicado fez SyntaxError silencioso — a rota nova retornava 404 enquanto outras funcionavam.
