# Guia de Desenvolvimento - Slimo AI Diet Tracker

Este documento serve como um guia completo do projeto **Slimo AI Diet Tracker** para orientar desenvolvedores e modelos de linguagem (LLMs) que darão continuidade ao desenvolvimento e refinamento do aplicativo.

---

## 1. Visão Geral do Projeto
O Slimo AI é uma Single Page Application (SPA) responsiva com design moderno e futurista (tema escuro com glassmorphism, gradientes vibrantes e micro-animações). Ele é inspirado no aplicativo de nutrição premium **Slimo** (https://www.slimo.app/).

A principal funcionalidade é o acompanhamento diário de calorias e macronutrientes do usuário, suportado por recursos de inteligência artificial (reconhecimento de alimentos em fotos de pratos e geração/planejamento de receitas personalizadas) e utilitários de saúde (jejum intermitente e controle de água).

---

## 2. Tecnologias Utilizadas
1. **HTML5**: Estrutura semântica para Single Page Application (todas as telas residem em seções `<section class="screen">` com controle de classe `.active`).
2. **CSS3 (Vanilla)**: Design system customizado em `style.css` com variáveis de cor, transições suaves, sombras de neon e sliders personalizados.
3. **JavaScript (ES6+)**: Orquestração de navegação, lógica matemática de macros/ingredientes, gerenciamento de estado e chamadas de API.
4. **Lucide Icons**: Biblioteca de ícones moderna (`https://unpkg.com/lucide@latest`).
5. **Chart.js**: Renderização do gráfico de evolução semanal de calorias (`https://cdn.jsdelivr.net/npm/chart.js`).
6. **Google Gemini API**: Integração direta via requisições fetch HTTP para o modelo **gemini-2.5-flash**.

---

## 3. Estrutura de Arquivos no Espaço de Trabalho
A base de código é mantida de forma enxuta nos três arquivos principais na raiz do projeto:

* **[index.html](file:///c:/Users/admin/Desktop/Dieta/index.html)**: Contém toda a estrutura SPA das 9 sub-telas e os respectivos modais de configuração/ajuste.
* **[style.css](file:///c:/Users/admin/Desktop/Dieta/style.css)**: Folha de estilo do app contendo layout responsivo, sistema de HSL, anéis SVG e laser de escaneamento.
* **[app.js](file:///c:/Users/admin/Desktop/Dieta/app.js)**: Centraliza a inteligência do app, gerenciando o estado global, persistência, cálculo de Mifflin-St Jeor, webcam, lógica do timer de jejum e chamadas de API.

---

## 4. Estado da Aplicação e Persistência
No arquivo `app.js`, o estado do aplicativo é mantido no objeto global `state`:
```javascript
const state = {
    userProfile: null,       // Perfil do usuário (peso, metas, onboarding, data de início)
    mealsLog: [],           // Histórico de refeições: Array de objetos { id, date, time, name, items, total }
    geminiApiKey: '',       // Chave da API do Gemini obtida nas configurações
    waterConsumed: 0,       // Consumo de água hoje (ml)
    waterTarget: 2500,      // Meta diária de água (ml)
    fastingActive: false,   // Status atual do cronômetro de jejum
    fastingStartTime: null, // Data/Hora do início do ciclo de jejum atual
    fastingDurationGoal: 14, // Objetivo de horas (12, 14, 16, 18)
    currentCameraStream: null, // Referência ao stream ativo da webcam
    currentCapturedImage: '',  // Imagem capturada (base64) para envio ao Gemini
    currentAnalyzingMeal: null, // Dados estruturados da refeição sendo analisada (antes de salvar)
    editingItemIndex: -1,       // Índice do ingrediente detectado sendo editado no modal
    activeRecipe: null,      // Receita aberta no modal de adaptação
    recipeScaleFactor: 100,  // Porcentagem de ajuste de calorias (50% a 150%)
    recipePortionCount: 1,   // Quantidade de porções a preparar
    selectedSearchFood: null, // Alimento da busca em processo de adição
    weeklyChart: null,        // Instância do gráfico Chart.js
    fastingInterval: null,   // Timer do setInterval de jejum
    savedAiRecipes: [],      // Lista de receitas diárias individuais salvas geradas por IA
    savedWeeklyPlans: []     // Lista de planos alimentares semanais de 7 dias salvos geradas por IA
};
```

### Persistência no LocalStorage
O estado do usuário é persistido automaticamente nas seguintes chaves:
- `slimo_profile`: Perfil do usuário.
- `slimo_meals_log`: Histórico completo de refeições.
- `slimo_gemini_key`: Chave da API do Gemini.
- `slimo_water_consumed`: Água consumida no dia (reseta de forma automatizada ao detectar mudança de dia no carregamento).
- `slimo_water_target`: Meta de água diária.
- `slimo_fasting_active`, `slimo_fasting_start_time`, `slimo_fasting_goal`: Estado e dados de jejum.
- `slimo_saved_ai_recipes`: Array JSON de receitas avulsas geradas por IA.
- `slimo_saved_weekly_plans`: Array JSON de planos semanais de 7 dias gerados por IA.
- `slimo_last_date_reset`: Mantém a data do último carregamento da aplicação para resetar o log de água no novo dia.

---

## 5. Funcionalidades Detalhadas

### A. Onboarding Interativo
* **TMB e TDEE**: O cálculo de calorias e taxa metabólica basal baseia-se na fórmula científica de **Mifflin-St Jeor**.
* **Sliders Científicos**: O usuário ajusta o peso alvo e a velocidade semanal da dieta (entre `0.2 kg` e `1.5 kg` por semana).
* **Atualização em Tempo Real**: Conforme o usuário mexe nos sliders, o app calcula dinamicamente a meta calórica recomendada e prevê a data de encerramento da dieta baseando-se no déficit calórico ($TDEE \pm (velocidade \times 1100)$).
* **Parâmetros de Macros Padrão**:
  - Proteína: `2.0g/kg` para ganho ou perda de peso, `1.8g/kg` para manutenção.
  - Gordura: `1.0g/kg` para ganho, `0.8g/kg` para perda, `0.9g/kg` para manutenção.
  - Carboidrato: Preenchido com o saldo das calorias restantes ($kcal_{carb} = kcal_{total} - (prot \times 4) - (fat \times 9)$).

### B. Controle Flexível de Metas (Acompanhamento Profissional)
Na tela **Perfil**, o usuário tem duas opções de personalização que simulam a prescrição de um nutricionista profissional:
1. **Ajustar Calorias Livres**: Altera a meta de calorias exata e redistribui os macros proporcionalmente.
2. **Ajustar Macronutrientes em Gramas**: O usuário edita diretamente as gramas de Carbo, Proteína e Gordura. A meta calórica diária é calculada em tempo real com a fórmula clássica ($4 \times Carbo + 4 \times Prot + 9 \times Fat$).
* **Restaurar Padrão**: Limpa as metas customizadas e aplica novamente a fórmula baseada no peso e atividade física atuais.

### C. Busca de Alimentos Brasileiros (Base Local)
* Contém um dicionário robusto em JavaScript (`BR_FOOD_DATABASE`) de alimentos tipicamente nacionais e marcas populares no Brasil (iogurtes Molico, Yorgus, Danone, pratos típicos como tapioca, açaí puro, pão de queijo, requeijão light Nestlé, whey, arroz agulhinha e feijão carioca).
* Ao buscar e selecionar um item, abre-se um modal de prévia para digitar a quantidade consumida (g), calculando e exibindo os macros proporcionalmente antes de lançar no diário de refeições.

### D. Reconhecimento Visual de Alimentos por Foto
* Utiliza a API de Câmera nativa do navegador (`getUserMedia`) para capturar uma foto quadrada com linha de escaneamento animada (ou permite o envio de imagem por arquivo).
* A imagem em base64 é enviada diretamente ao Gemini 2.5 Flash, que retorna o prato desmembrado em alimentos com pesos aproximados e macros estruturados em JSON.
* O usuário visualiza a lista gerada no painel de resultados e pode abrir o modal de edição para ajustar gramas, calorias e macros de cada ingrediente individualmente, além de excluir itens detectados incorretamente ou adicionar itens manuais antes de registrar a refeição final.

### E. Planejador de Receitas por IA (Diário & Semanal)
Localizado na aba de Receitas (sub-aba "Planejador IA"), permite:
1. **Seleção de Tipo**: Qualquer tipo, Café da Manhã, Almoço, Jantar, ou Lanches.
2. **Período**:
   - **Diário**: Gera **uma** única receita estruturada adaptada estritamente às calorias e macronutrientes restantes do usuário no dia atual.
   - **Semanal**: Envia as metas do usuário à API do Gemini para gerar **uma única resposta JSON contendo um plano estruturado de 7 receitas diferentes** para a semana inteira (Dia 1 a Dia 7), otimizando chamadas de rede.
3. **Visualização Collapsible**: Os planos semanais são salvos em formato de sanfona expansível. Ao expandir o plano, o usuário vê os 7 dias, podendo clicar em qualquer dia para abrir o modal de detalhes e preparar/escalar a refeição.
4. **Slider de Escala Nutricional (Slimo Scale)**:
   - Ao abrir qualquer receita, o usuário dispõe de um controle deslizante de porção/calorias que varia de `50%` a `150%`.
   - Modifica em tempo real a quantidade de ingredientes em gramas, além de fazer a conversão de frações bonitas para unidades inteiras ou quebradas (ex: de `1.4` banana para `7/5 unidades` de banana) e recalculando os macros instantaneamente.
   - Fornece botão de registro rápido no diário de refeições para **Hoje** ou programado para os **Próximos 7 dias**.

### F. Jejum Intermitente com Fases Metabólicas
* Implementa quatro protocolos clássicos: 12h (Jejum Simples), 14h (Jejum Moderado), 16h (Lean Gains) e 18h (Avançado).
* Um timer circular com anel SVG é atualizado a cada segundo quando o jejum está ativo.
* Exibe mensagens explicativas dinâmicas baseadas na fase de jejum atual:
  - `< 4 horas`: **Digestão Recente** (Nutrientes e glicose em circulação, insulina alta).
  - `4 a 12 horas`: **Transição Lipídica** (Queda da insulina, liberação de glucagon para usar estoques).
  - `12 a 18 horas`: **Queima de Gordura** (Cetose leve, gordura corporal utilizada como combustível).
  - `>= Meta`: **Meta Atingida / Autofagia** (Renovação celular ativa).

### G. Avaliação Semanal Automática (Mascote Slimo)
* Um painel de check-in semanal que solicita o peso atual do usuário.
* Ao comparar com o peso de onboarding, se o usuário estiver estagnado (platô de perda ou ganho de peso), o robô mascote Slimo oferece duas alternativas: manter a conduta ou acionar um **corte inteligente de -5% de calorias diárias** (deduzidos do carboidrato para proteger a massa muscular).

---

## 6. Integração com a API do Gemini (Especificação dos Prompts)
Toda a inteligência do aplicativo consome o endpoint oficial do Google AI Studio usando o modelo **gemini-2.5-flash**:
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={API_KEY}`

Os payloads enviam requisições exigindo respostas estritamente estruturadas em JSON:
`generationConfig: { responseMimeType: "application/json" }`

### Prompts Utilizados

#### 1. Escaner de Fotos de Comida
```
Você é um nutricionista especialista em identificar pratos de comida por imagem. Analise a imagem fornecida e retorne um objeto JSON contendo os alimentos identificados, o peso estimado (g), e os macronutrientes (calorias, carboidratos (g), proteínas (g), gorduras (g)) de cada um.
Responda ESTRITAMENTE em formato JSON puro obedecendo a esta exata estrutura (não coloque em bloco de código de markdown como ```json, apenas envie a string JSON limpa e direta):
{
  "items": [
    { "name": "Nome do Alimento", "weight_g": 150, "calories": 210, "protein": 24, "carbs": 2, "fat": 12 }
  ],
  "total": { "calories": 210, "protein": 24, "carbs": 2, "fat": 12 }
}
```

#### 2. Receita Diária por IA (Restante do Dia)
```
Você é um chef e nutricionista experiente. Crie uma receita saudável, rápida e realista em português para ser consumida como {Café da Manhã/Almoço/Jantar/Lanche/Qualquer}.
A receita deve utilizar aproximadamente o seguinte limite nutricional:
- Calorias: {cal} kcal
- Proteínas: {p}g
- Carboidratos: {c}g
- Gorduras: {f}g

Responda ESTRITAMENTE em formato JSON puro (sem formatar bloco de código markdown como ```json, apenas a string JSON limpa e direta) contendo os seguintes campos:
{
  "name": "Nome descritivo e gostoso da receita",
  "time_min": 15,
  "calories": 320,
  "protein": 24,
  "carbs": 30,
  "fat": 8,
  "ingredients": [
    { "name": "Nome exato do ingrediente", "amount": 100, "unit": "g" }
  ],
  "directions": "Modo de preparo passo a passo resumido."
}
```

#### 3. Planejamento Semanal (7 Receitas)
```
Você é um chef e nutricionista. Crie um plano de 7 dias completos com 7 receitas saudáveis diferentes e variadas em português (uma receita para cada dia da semana, identificados de dia 1 a dia 7).
O tipo de refeição deve ser: {Tipo_Selecionado}.
Cada receita deve ter aproximadamente o seguinte valor nutricional médio:
- Calorias: {calPerMeal} kcal
- Proteínas: {protPerMeal}g
- Carboidratos: {carbsPerMeal}g
- Gorduras: {fatPerMeal}g

Responda ESTRITAMENTE em formato JSON (sem bloco de código markdown, apenas a string JSON limpa) que seja um array contendo exatamente 7 objetos seguindo esta estrutura:
[
  {
    "day": 1,
    "name": "Nome da receita do dia 1",
    "time_min": 20,
    "calories": 400,
    "protein": 30,
    "carbs": 40,
    "fat": 10,
    "ingredients": [
      { "name": "Ingrediente", "amount": 100, "unit": "g" }
    ],
    "directions": "Modo de preparo rápido."
  }
]
```

---

## 7. Como Executar e Testar Localmente

### A. Contexto Seguro
Devido a restrições do navegador relativas ao uso de APIs de câmera (`navigator.mediaDevices.getUserMedia`) e requisições HTTP seguras para a API Gemini, a página **não deve ser executada dando dois cliques no arquivo index.html**. Ela exige um servidor web rodando localmente (HTTP Localhost é tratado como contexto seguro).

### B. Inicializando o Servidor Local
Você pode inicializar um servidor com o Node.js instalado na pasta do projeto:
```bash
npx http-server -p 8000 ./
```
E acessar através do navegador no endereço: **`http://localhost:8000`**.

> [!NOTE]
> Se você receber o erro `EADDRINUSE: address already in use 0.0.0.0:8000`, significa que o servidor já está ativo em segundo plano. Basta abrir o navegador e navegar diretamente para a URL. Para alternar a porta do servidor caso queira rodar outra instância, mude a flag `-p` (ex: `npx http-server -p 8001 ./`).

---

## 8. Próximos Passos e Sugestões de Melhorias
Se você estiver dando continuidade ao projeto, aqui estão ótimos caminhos para expandir a aplicação:
1. **Edição de Refeições no Diário**: Atualmente, é possível deletar refeições lançadas no Diário, mas não editá-las diretamente após o registro. Uma melhoria útil seria permitir reabrir o modal de edição ao clicar nas refeições do diário.
2. **Crop de Imagem**: Integrar um corte (crop) manual de imagem ou filtro canvas no scanner para permitir que o usuário foque exatamente no prato de comida e descarte as bordas antes de enviar ao Gemini.
3. **Gráficos Adicionais**: Implementar gráficos extras no painel de evolução mostrando o peso corporal ao longo do tempo (obtidos a partir do check-in semanal) e proporção média de macros ingeridos.
4. **Modo Offline PWA**: Configurar um `service worker` básico com manifesto para transformar a SPA em um Progressive Web App instalável no celular.
