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

### 2. Painel Profissional & Frontend (`video-call.html`, `app.js`, `pro-patients.js`)
- **Tratamento de Autoplay/Mute:** Aplicado no painel da nutricionista (`pro-patients.js`) e no portal geral (`app.js`). Se a reprodução remota de áudio for bloqueada pelo navegador, exibe-se um overlay interativo para que a profissional clique e ative o áudio do paciente.
- **Deploy:** Deploy das modificações do frontend e backend efetuado com sucesso na VPS (https://nutrir.online).

### 3. Backend e Banco de Dados (`backend`)
- **Rotas de Agenda:** `/api/user/appointments/available` ativa para filtragem inteligente de horários disponíveis dos nutricionistas em português.
- **Rotas de Receitas:** Rotas para leitura de receitas individuais e plano semanal de IA ativas e persistidas no banco PostgreSQL.
- **Rotas de Exames:**
  - Migração executada para adicionar colunas `category` (tipo do exame) e `size_kb` (tamanho) na tabela `patient_exams`.
  - Endpoint `POST /api/user/exams` e `GET /api/user/exams` atualizados para receber as chaves enviadas pelo mobile (`name`, `base64`, `mime_type`, `category`, `size_kb`) e retornar a resposta formatada como a interface TypeScript `Exam`, garantindo também compatibilidade retrógrada com os payloads legados.

---

## 🚀 Próximos Passos (Pendências)

*Nenhuma pendência crítica de alta prioridade ativa no momento. Aguardando novos feedbacks de teste do usuário no APK compilado com suporte nativo de áudio/vídeo.*

---

*Última atualização: 29 de Maio de 2026 às 13:55 (Gemini - Antigravity)*
