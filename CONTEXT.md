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

### Alta prioridade
- **Fase 0 — Anamnese obrigatória no APK (Expo/React Native):**
  - Criar 5 telas de onboarding obrigatórias após cadastro (antes de acessar o plano).
  - Etapa 1: biometria (já existe — integrar). Etapa 2: estrutura alimentar (nº refeições, horários, culinária). Etapa 3: checklist de condições de saúde. Etapa 4: restrições/preferências. Etapa 5: upload de exame (já existe em `app/exams.tsx`) ou 4 perguntas proxy.
  - Gravar em `patient_anamnesis` + `patient_exam_proxy` (tabelas já criadas no backend).
  - **Atenção Gemini:** Não modificar `app/exams.tsx` — apenas reutilizar o fluxo de upload existente dentro do onboarding.

### Média prioridade
- **Fase B — Recipe-first:** receita como átomo primário no gerador (nome = ingredientes = preparo). Archetypes como fallback.
- **Fase B — Crédito às receitas:** `author_name` + `source_url` na tabela `recipes`. JSON-LD do Receiteria já tem `author.name`. Exibir "Receita de [autor]" no app e no PDF.
- **Fase C — Alertas clínicos em vez de compensação automática:** transformar `micros.js` de swaps automáticos para alertas visuais no builder.

---

*Última atualização: 30 de Maio de 2026 — Claude (VS Code) — Gerador V2 Fases 0+A deployadas*
