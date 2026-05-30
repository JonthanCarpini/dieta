# Contexto Ativo de Desenvolvimento — Dieta (Nutrir.online)

Este arquivo é a fonte única da verdade para sincronização entre múltiplos agentes de IA (Gemini na IDE Antigravity e Claude no VS Code). **Sempre leia este arquivo no início de cada tarefa e atualize-o ao terminar.**

---

## 📋 Regras de Sincronização para as IAs

1. **Antes de Programar:**
   - Leia as seções **Estado Atual dos Componentes** e **Próximos Passos** deste arquivo.
   - Execute `git status` e `git log -n 3 --oneline` no terminal para verificar modificações locais recentes.
2. **Após Concluir uma Tarefa:**
   - Faça o commit das suas alterações com mensagens claras e objetivas.
   - Atualize este arquivo (`CONTEXT.md`), registrando o que foi feito na seção **Estado Atual** e movendo os itens para **Concluído**.

---

## 🛠️ Estado Atual dos Componentes

### 1. Aplicativo Mobile (`nutrir-mobile`)
- **Videochamada Nativa WebRTC (`app/video-call.tsx`):**
  - Carregada de forma 100% nativa dentro do APK através de uma WebView integrada.
  - Permissões de câmera e microfone solicitadas via `expo-camera` e concedidas à WebView via propriedade `onPermissionRequest`.
  - Permissões de rede (`ACCESS_NETWORK_STATE` e `CHANGE_NETWORK_STATE`) adicionadas no `AndroidManifest.xml` e no `app.json` para estabilizar conexões ICE/WebRTC e evitar quedas após poucos segundos.
  - Tratamento de Autoplay/Mute: Se a WebView bloquear o autoplay com som, um overlay de toque na tela é mostrado para reativar o áudio com segurança.
  - Ponte de Fechamento: Clique em "Fechar Guia" envia uma mensagem via `ReactNativeWebView.postMessage` para fechar a tela e retornar via `router.back()`.
- **Tela Profissional (`app/(tabs)/profissional.tsx`):**
  - Mapeamento de consultas corrigido (data brasileira, hora com `end_time`, status em português).
  - Alerta nativo ao clicar no card da consulta exibindo detalhes e botão para iniciar chamada.
- **Diário (`app/(tabs)/index.tsx`):**
  - Círculo de calorias modificado para exibir apenas calorias consumidas (sem subtrair calorias gastas).
- **Atividades Físicas:**
  - Histórico diário de passos integrado com o `stepTrackerStore.ts` ativo em segundo plano.
- **Perfil:**
  - Correção aplicada no fluxo de registro e atualização de peso.
  - Tela redesenhada para permitir a edição de todos os dados da conta e biometria (Nome, E-mail, Telefone com máscara, Nascimento com máscara, Altura, Peso, Sexo biológico, Objetivo e Nível de Atividade física).
  - Exibição da foto real do usuário carregada em base64 no círculo do avatar com iniciais como fallback.
- **Cadastro & Foto de Perfil (`app/(auth)/register.tsx`):**
  - Adicionado campo de Telefone obrigatório com máscara e validação no formato `(xx)xxxxx-xxxx`.
  - Seletor de imagem (via `expo-image-picker`) integrado diretamente no topo do cadastro para definir a foto de perfil inicial.
- **Anamnese - Velocidades Dinâmicas Baseadas na TMB (`app/onboarding.tsx`):**
  - O layout foi reorganizado para que o Nível de Atividade Física seja preenchido antes da Velocidade.
  - A seleção de velocidade de perda de peso foi reestruturada para ser calculada diretamente a partir de limites metabólicos: Muito Leve (consumo médio entre GET e TMB), Leve (consumo igual à TMB), Moderado (10% abaixo da TMB), Intenso (20% abaixo da TMB) e Pesado (30% abaixo da TMB).
  - O peso perdido por semana é estimado a partir do déficit calórico de cada opção, sem restrições ou bloqueios, garantindo que o usuário visualize a taxa de emagrecimento real correspondente a esses percentuais.
- **Rebuild do APK:**
  - APK reconstruído com sucesso em modo de release (`npx expo run:android --variant release`).
- **Meus Exames (`app/exams.tsx`):**
  - Rota corrigida de `/profile/exams` para a rota real `/user/exams`.
  - Mapeamento de upload unificado e tipos de dados de arquivos (PDF e imagens) suportados com sucesso.
  - Correção aplicada para importar o módulo `expo-file-system/legacy`, eliminando a falha de upload nativa do SDK 56.
  - Adicionada exibição em sanfona/accordion dos biomarcadores extraídos por IA diretamente no card do exame.

### 2. Painel Profissional & Frontend (`video-call.html`, `app.js`, `pro-patients.js`)
- **Tratamento de Autoplay/Mute:** Aplicado no painel da nutricionista (`pro-patients.js`) e no portal geral (`app.js`). Se a reprodução remota de áudio for bloqueada pelo navegador, exibe-se um overlay interativo para que a profissional clique e ative o áudio do paciente.
- **Visualização de Exames Extraídos (`admin/modules/pro-patients.js`):**
  - Implementada exibição dos biomarcadores extraídos do PDF do exame de forma colorida e segmentada por status (verde para normal, vermelho para alto/abormal, azul para baixo) com exibição dos limites de referência.
- **Deploy:** Deploy das modificações do frontend e backend efetuado com sucesso na VPS (https://nutrir.online).

### 3. Backend e Banco de Dados (`backend`)
- **Cadastro, Login e Perfil do Usuário**:
  - Migração adicionada na inicialização do servidor para criar colunas `phone` (VARCHAR) e `profile_image` (TEXT, armazenando base64) na tabela `users`.
  - Atualização do middleware de token e das rotas de autenticação (`routes/auth.js`) para salvar e expor `phone` e `profile_image` nas respostas da API.
  - Rota de atualização do perfil (`saveProfileHandler` em `routes/user.js`) expandida para atualizar simultaneamente as tabelas `profiles` e `users` (nome, e-mail com verificação única, telefone e foto).
  - Adicionado endpoint `POST /user/avatar` para salvar atualizações de foto de perfil via aplicativo.
- **Rotas de Agenda:** `/api/user/appointments/available` ativa para filtragem inteligente de horários disponíveis dos nutricionistas em português.
- **Rotas de Receitas:** Rotas para leitura de receitas individuais e plano semanal de IA ativas e persistidas no banco PostgreSQL.
- **Rotas de Exames & Análise automática:**
  - Migração executada para adicionar colunas `category` (tipo do exame) e `size_kb` (tamanho) na tabela `patient_exams`.
  - Tabela `patient_exam_markers` criada para armazenar os biomarcadores extraídos com valor, unidade, limites e status de normalidade.
  - Processo assíncrono em background integrado com a API do Gemini (`gemini_api_key`) para extrair os resultados e salvá-los automaticamente ao fazer upload de um arquivo PDF ou imagem.
  - Endpoints `GET /exams/markers` e `GET /exams/:id/markers` adicionados para recuperação dos marcadores estruturados.

---

### 4. Gerador de Cardápios V2 (`backend/nutrition/`)
- **GERADOR_V2.md** criado como documento-bússola da reestruturação. Ler antes de qualquer código novo no gerador.
- **`protocols.js`** (novo): mapa clínico marcador/comorbidade/proxy → protocolos alimentares concretos (baixa_purina, baixo_tg, hdl_boost, baixo_ig, renal, baixo_na, baixo_colesterol, baixo_oxalato). Cada protocolo tem exclusões, prioridades e `deficit_cap`.
- **`planner_v2.js`** (novo): `buildClinicalConfig(db, patientId, overrides)` — conecta as três camadas antes ignoradas: `energy_calculations` (GET real), `patient_exam_markers` (marcadores de exame), `patient_anamnesis` + `patient_exam_proxy`. Meta calórica = GET × fator_objetivo respeitando `deficit_cap` do protocolo e floor(TMB, mínimo absoluto).
- **`generate-plan` endpoint** atualizado para usar `plannerV2`. Retorna `alerts[]`, `protocols`, `anamnesisStatus`, `clinicalSource`. Cria tabelas `patient_anamnesis` e `patient_exam_proxy` sob demanda.
- **Builder** (`pro-meals.js`): painel de alertas clínicos visível antes do cardápio (erro vermelho = déficit perigoso, warning = atenção) + status da anamnese + fonte do GET.
- **Validado no Marcelo (id=7):** GET real 2848 kcal detectado. Meta gerada: 2506 kcal (vs 1200 kcal que o V1 usava — 58% abaixo). 5 protocolos ativos: baixa_purina, baixo_tg, hdl_boost, baixo_colesterol, baixo_oxalato. Exclusões automáticas: fígado, moela, sardinha, embutidos, etc.

---

## 🚀 Próximos Passos (Pendências)

### Fase 0 — Anamnese obrigatória no APK ✅ CONCLUÍDA
- `app/onboarding.tsx` criado: 5 etapas obrigatórias com barra de progresso. Etapa 1: confirmação biometria. Etapa 2: estrutura alimentar (meal_count, eats_out, cooking_level) com checklist de seleção obrigatória e exata das refeições diárias (Café, Lanche da manhã, Almoço, Lanche da tarde, Jantar, Ceia). Etapa 3: checklist 14 condições de saúde. Etapa 4: restrições/preferências/medicamentos (texto livre). Etapa 5: upload exame (reusa `exams.tsx`) ou 4 perguntas proxy que ativam os mesmos protocolos que marcadores laboratoriais.
- `_layout.tsx`: AuthGuard checa `/user/anamnesis/status` ao entrar do grupo `(auth)` → redireciona para `/onboarding` se incompleta. `gestureEnabled: false` (não pode voltar com swipe).
- `register.tsx`: redireciona para `/onboarding` após cadastro.
- **Tabelas criadas:** `patient_anamnesis` + `patient_exam_proxy`
- **Backend:** `GET /user/anamnesis/status`, `GET /user/anamnesis`, `POST /user/anamnesis`, `POST /user/exam-proxy`
- **Atenção Gemini:** `app/exams.tsx` não foi modificado. `app/onboarding.tsx` é arquivo novo.

### Onboarding — cálculo automático de metas ✅ CONCLUÍDA
- `saveProfileHandler` (`user.js`): ao salvar perfil, calcula automaticamente `target_calories`, `target_protein/carbs/fat` e `water_target_ml` (35ml/kg). `birthdate` (DATE) é a fonte da idade — recalculada dinamicamente.
- Velocidade de perda/ganho: campo `speed` (kg/semana) com níveis Muito leve/Leve/Moderado/Intenso/Pesado (até 1,5 kg/sem). Déficit/superávit = speed × 7700 ÷ 7.
- **Piso de segurança**: meta nunca abaixo da TMB nem do mínimo (♂1500/♀1200). Corrigiu o bug dos 79 kcal.
- Perfil Clínico (aba `clinico.tsx`) preenchido automaticamente a partir da anamnese.

### Fórmulas energéticas ✅ CONCLUÍDA
- `backend/nutrition/formulas.js`: módulo único com as 10 fórmulas + `selectFormula()` automático por perfil (Mifflin p/ IMC≥25, Cunningham/Tinsley p/ atletas, H-B revisada p/ eutróficos). Usado por `planner_v2` e `user.js`.
- **Atenção Gemini:** `pro-energy.js` (painel web) mantém sua própria cópia das fórmulas — coeficientes idênticos. Se alterar uma, sincronizar a outra.

### Fase B — Recipe-first ✅ EM ANDAMENTO
- **Crédito (concluído):** `recipes.author_name` + preparo ORIGINAL do JSON-LD (sem parafrasear). Comando `update-preparo`. Gerador injeta "Receita de [autor] — [url]". Builder mostra `.wd-meal-author`.
- **goals[] (concluído):** `recipes.goals` (lose/maintain/gain) derivado de macros via `computeGoals()`. Substitui o binário `healthy`. Gerador filtra por objetivo do paciente. Acervo: **465 receitas** (lose 99, maintain 298, gain 144). +12 categorias scrapadas (alta-proteina, baixa-caloria, low-carb, etc.).
- **clinical_tags (concluído):** `recipes.clinical_tags` lista os protocolos que a receita RESPEITA, via `protocols.clinicalTagsFor()` com match por **palavra inteira** (`wordHit` — corrige falso positivo "nata"≠"natural"). Gerador filtra `clinical_tags @> protocolIds`. Restrições do paciente separadas em `exclusions.patientKeywords`. Acervo (de 465 ativas): baixa_purina 254, baixo_tg 345, baixo_ig 342, baixo_na 216, renal 460, baixo_colesterol 225. Validado: Marcelo (Gota) → 77 receitas, sem camarão/sardinha, com escondidinho de frango.

### Fase C — Alertas clínicos ✅ CONCLUÍDA
- `micros.buildMicroAlerts()`: UL sódio = erro; micro <70% da meta = warning com sugestão de alimentos (`MICRO_FOOD_SOURCES`); piso hidrossolúvel consolidado. Sem compensação automática — só alerta, nutricionista decide.
- Endpoint `generate-plan` mescla microAlerts em `alerts[]`; builder exibe no painel.

### Painel ADMIN — CRUD de Usuários ✅ CONCLUÍDA
- `GET /admin/users` com nutricionista vinculado + filtros; `GET /admin/professionals`; `POST /users/:id/assign-professional`; `POST/PUT/DELETE /users`.
- Frontend: filtros (cargo/plano/nutricionista), coluna Nutricionista com atribuição inline, modal criar/editar, excluir. **Atenção Gemini:** `professional_links` (type='nutritionist') é a tabela de vínculo paciente↔nutri.

### Fase D — Objetivos terapêuticos ✅ CONCLUÍDA
- `backend/nutrition/macros.js` (`resolveMacros`): macros clínicos por **g/kg de peso** (não % fixo). Proteína: lose 1.8 / maintain 1.2 / gain 2.0 g/kg (+0.2 atleta, piso idoso 1.2). **Peso ajustado** para obesos (IMC>30) evita superestimar. Renal limita a 0.8 g/kg; diabetes controla carbo ≤45%; colesterol/TG limitam gordura. `planner_v2` usa e expõe `macroBasis`.
- **V2 COMPLETO** (Fases 0, A, A+, B, C, D). Pronto para teste integrado de geração de cardápio.

---

*Última atualização: 30 de Maio de 2026 — Claude (VS Code) — Fase D: macros clínicos por g/kg (macros.js). V2 completo.*
