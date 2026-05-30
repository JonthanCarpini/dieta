# Gerador Automático de Cardápios — Plano de Implementação

> Documento vivo. Cada fase é **independente e executável em sessões separadas**.
> Ao concluir uma tarefa, marque o checkbox e atualize o **Log de Execução** no topo.
> Uma sessão nova deve ler: (1) este topo, (2) "Contexto do Sistema", (3) a fase atual.

---

## 🔖 Log de Execução (atualizar a cada sessão)

| Data | Fase | O que foi feito | Commit |
|------|------|-----------------|--------|
| 2026-05-29 | — | Documento criado | — |
| 2026-05-29 | **Refino distribuição** | MEAL_DISTRIBUTION concentra ~84% nas 3 principais (café 25/almoço 32/jantar 27); lanches 5-6% só fruta; ceia 5% = laticínio magro + oleaginosa/semente (sem carbo, alta fibra). Fix clamp dairy (queijo 30g, não 120g). Itens gerados editáveis. Desvio kcal ~3%. | (vários) |
| 2026-05-29 | **Fase 5 (parcial) ✅** | Substituição de item por equivalente: GET /curated-substitutes (banco curado, mesmo papel+refeição, kcal similar, troca iso-calórica) + POST /ai/substitute-food (LLM). Builder: botão "trocar" por alimento → modal com equivalentes + "Sugerir com IA". | (vários) |
| 2026-05-29 | **Fase 0 ✅** | Auditoria de micros na `alimentos`, DRI confirmada, UL + piso definidos, decisão **GO** (ver "Fase 0 — Resultados") | — (sem código) |
| 2026-05-29 | **Fase 1 ✅** | Criado `backend/nutrition/planner.js` (funções puras): deriveTargetKcal, macros, distribuição/refeição, exclusões clínicas, buildGenerationConfig. Validado com 3 casos. | 8c9e91b |
| 2026-05-29 | **Fase 2 ✅** | Criado `backend/nutrition/generator.js` (pool TACO por papel, templates, fillMeal com carbo fechando kcal, correção final) + endpoint `POST /professional/patients/:id/generate-plan`. Testado: desvio médio kcal 8%, alimentos coerentes. | 0653980 |
| 2026-05-29 | **Fase 3 ✅** | Criados `limits.js` (DRI/UL/piso/tiers) + `micros.js` (panorama, compensação iso-calórica com trava UL, relatório). Testado: Vit E 37%→105%, Cálcio 86%→95% reforçando dias específicos; Tier C sinalizado; UL não piorado. | 345d7c1 |
| 2026-05-29 | **Fase 4 ✅** | UI no builder: botão "Gerar Automático" na aba Cardápio do paciente, modal de config, `loadGeneratedPlan` carrega rascunho no builder, `_renderGenReport` mostra banner + painel de adequação (chips coloridos por status). | 5d58f78 |

| 2026-05-29 | **Fase 6 ✅** | `curated_foods` (94 alimentos comuns, FK→TACO) semeada via `seed_curated.json` + `match-curated.js` (matching por palavras-AND + penalidades). `fetchFoodPool` agora é POR REFEIÇÃO (curated, fallback TACO); compensação de micros meal-aware; porção caseira. Café deixou de ter arroz; só staples nacionais; variedade por fonte (incl. moela/coração/fígado). | (vários) |
| 2026-05-29 | **Fase 8** | Realismo de "brasileiro médio": despensa da semana (arroz/feijão `staple` fixos por blocos 3+4 dias), bebida obrigatória no café e no almoço (suco natural padrão + leve na rotação), 3 sucos no seed com `id` TACO fixo, `match-curated` aceita `id` explícito. | (deploy) |

**Fase atual:** Fase 8 (Realismo de despensa e bebidas — em validação). Concluídas 0–4 + 6 + 7(núcleo) + 5(parcial).
**Fase 8 — feito:** (1) **Despensa da semana** — arroz/feijão viraram `staple` nos arquétipos; o gerador fixa o TIPO por blocos de 3+4 dias (~2 cozimentos/semana, como brasileiro real); a quantidade ainda varia. (2) **Bebida obrigatória no café** (café/chá; iogurte conta como líquido). (3) **Bebida no almoço** com escala suco-natural-padrão (5 dias) + leve/refri zero (2 dias) — sucos entregam vit C/folato/K e aliviam a compensação semanal. (4) Seed ganhou 3 sucos naturais (acerola/caju/abacaxi) com `id` fixo da TACO; `match-curated.js` agora aceita `id` explícito (fim do chute de match p/ itens difíceis — sucos, sementes). Motivo: sustentabilidade/aderência/saúde > variedade artificial de restaurante.
**Fase 8 — feito (cont.):** **Refino #1 (porção de arroz invertida) RESOLVIDO.** (a) clamp caseiro do staple arroz `[80,180]g` aplicado na resolução E na correção final (clamp por-item no `fillMeal` via `pick.clamp`/`item._clamp`); bebida clamp `[100,250]` (copo real). (b) **MEAL_DISTRIBUTION rebalanceada** p/ almoço principal: café 25 / almoço **36** / jantar **21** / lanches 6+6 / ceia 6 (antes almoço 32 ≈ jantar 27). Agora almoço é a refeição forte (arroz ~110-120g) e jantar é leve, como o brasileiro real.
**Fase 8 — pendente:** validar no painel; depois refinos #2 (dias ~10-14% fora da meta em arquétipos leves) e #3 (`semente de abóbora` match ruim — pode usar `id` fixo no seed agora).
**Fase 7 — feito:** `archetypes.js` (combos por refeição), gerador POR ARQUÉTIPO, `fillMeal` por `slot.owns`, role `bebida` (refri zero/café/chá/suco/água de coco), proteína no café (ovo/queijo), muçarela liberada p/ almoço/jantar. Resultado: café com ovo, almoço arroz+feijão+proteína+salada, jantar idiomático, lanches leves, ceia leve; kcal ~±5%.
**Fase 7 — feito (cont.):** slots ganharam campo **`only`** (palavras-chave que fixam os alimentos-âncora do combo). Cafés saem idiomáticos (pão+ovo, tapioca+omelete, iogurte+aveia), almoço arroz+feijão+proteína ancorados. Afinidade (arroz↔feijão) resolvida via `only` no arquétipo. Validado: 7 cafés idiomáticos e variados.
**Fase 7 — refinos pendentes:** (2) 1-2 dias ~10% abaixo da meta em arquétipos leves (lanche só "Castanhas" c/ clamp de gordura). (3) match ruim de `semente de abóbora` (kcal baixo) — revisar seed. Refino #1 (âncora de alimentos) e #4 (afinidade) RESOLVIDOS pelo `only`.
**Última sessão parou em:** Decidido evoluir para **refeições idiomáticas** (combos brasileiros reais, ex: pão+ovos, arroz+feijão+salada, omelete+queijo). Diagnóstico: hoje escolhemos alimentos por papel ISOLADO; falta a camada de COMBOS. Fase 7 modelada no doc (abaixo). Próximo: executar 7.1 (tabela `meal_archetypes`). **Filosofia acordada: sistema complexo, multi-sessão, sem simplificar/pressa.**

---

## 🎯 Objetivo

Permitir que o nutricionista **gere um rascunho de cardápio semanal (7 dias) automaticamente** a partir dos dados do paciente, respeitando:
- Meta calórica e split de macros **por dia**
- Restrições clínicas (alergias, intolerâncias, comorbidades)
- Adequação de micronutrientes avaliada na **média semanal** (compensação entre dias)
- Tetos diários (UL) que **nunca** são compensáveis (ex: sódio)

**Princípio de segurança (inegociável):** o resultado é um **RASCUNHO** carregado no builder existente para o nutricionista revisar, ajustar e aprovar. Nunca é aplicado automaticamente ao paciente. É decisão clínica.

---

## 🧪 Modelo Nutricional (decisões já tomadas)

Discutido e definido. Não rediscutir sem motivo:

1. **Por dia (restrição rígida):** kcal + macros (P/C/G) dentro de tolerância (±~10%).
2. **Por semana (restrição relaxada):** média de cada micronutriente ≥ alvo (RDA/DRI). É isto que torna o problema tratável — 7 dias de liberdade para distribuir.
3. **Compensação entre dias:** se um micro está baixo na semana, reforça-se em dias com folga de macro (ex: ferro baixo seg → reforça ter/qui). **Este é o coração do sistema.**
4. **Teto diário (UL):** nutrientes com limite superior (sódio, etc.) **não se compensam** — nenhum dia pode passar do teto. Trava de segurança em todo swap.
5. **Piso diário para hidrossolúveis:** vitamina C e complexo B têm pouco estoque corporal → manter um mínimo diário, não só média semanal.
6. **Compensam bem na semana:** ferro, cálcio, zinco, lipossolúveis (A, D, E, K) — têm estoque corporal.
7. **Framing honesto na UI:** "bate kcal/macros ✓; adequação de micros: X% na média semanal, lista do que ficou baixo/alto". Nunca prometer "dieta perfeita".

---

## 🗂️ Contexto do Sistema (para sessões novas)

**Stack:** Express + PostgreSQL (`slimo`) na VPS `178.238.236.103`, Docker. Deploy: `git push` → `node deploy.js` (push SEMPRE antes). Frontend: vanilla JS ES modules em `admin/`.

**Tabelas relevantes:**
- `alimentos` (TACO/WebDiet, ~22k): `id, nome, grupo, kcal, ptn, cho, lip, fibras, origem, tipo` + micros: `ca, mg, p, fe, na, k, co, zn, se, re, rea, tiamina, riboflavina, piridoxina, niacina, vitc, vitb12, vitb9, vite, vitd`. **É a única fonte com micros.**
- `medidas_caseiras`: `alimento_id, nome_mc, peso_g`
- `foods` (importados/custom): `id, name, category, energy_kcal, protein_g, carbs_g, fat_g, fiber_g, source ('extra'|'tabela'|'custom'), created_by` — **sem micros** (só macros).
- `pro_foods` (banco do nutri): macros + `measures` JSONB, sem micros completos.
- `profiles`: `user_id, weight, height, goal ('lose'|'gain'|'maintain'), target_calories, birthdate, gender, goal_weight`
- Ficha clínica (endpoint `/professional/patients/:id/clinical`): `comorbidities, intolerances, dietary_restrictions, notes`
- `weekly_plans`: `id, name, patient_id, plan_data (JSONB), is_active, updated_at, professional_id`
- `energy_calculations`: histórico de TMB/GET por paciente.

**Código existente que vamos reutilizar:**
- `admin/modules/pro-meals.js`: já contém `DRI_TABLE` (RDA por gênero/faixa etária), `MICRO_DEFS`, `MICRO_KEYS`, `calcDayTotals`, `recalcMealTotal`, `MEAL_TYPES`, e o **formato `plan_data`**.
- `admin/modules/pro-energy.js`: cálculo de TMB/GET (fórmulas Mifflin, Harris-Benedict, etc.).
- `backend/routes/professional.js`: endpoints do nutricionista (incluindo `weekly-plans`).
- `backend/routes/ai.js`: proxy LLM (`callLLM`, `getLLMConfig`) com fallback Gemini/OpenAI/Mistral.
- `backend/routes/admin.js`: `/admin/food-db` (busca de alimentos + medidas caseiras).

**Formato `plan_data` (manter compatível com o builder):**
```js
{
  days: [
    { dow: 1, meals: [
      { type: 'almoco', label: 'Almoço', time: '12:00',
        items: [ { food_id, name, grams, calories, protein, carbs, fat, fiber, /*+micros: ca,fe,...*/ } ],
        instructions: '',
        total: { calories, protein, carbs, fat, fiber, grams, /*+micros*/ } }
    ]}
    // ... dows 1..6,0
  ]
}
```

**Tipos de refeição** (`MEAL_TYPES`): `cafe_da_manha, lanche_manha, almoco, lanche_tarde, jantar, ceia`.

---

## 📋 FASE 0 — Preparação e Validação de Dados
**Status:** ✅ CONCLUÍDA (2026-05-29)
**Por que primeiro:** todo o motor de micros depende da qualidade dos dados.

### Tarefas
- [x] **0.1** Auditar completude de micros em `alimentos`. _(feito — ver tabela abaixo)_
- [x] **0.2** Definir critério de "alimento micro-completo". _(feito — `minerais_core`)_
- [x] **0.3** Confirmar cobertura da `DRI_TABLE`. _(confirmado: female/male × 5 faixas 14-18→70+, 20 campos + fibras, lookup por idade em pro-meals.js linhas 28-88)_
- [x] **0.4** Tabela UL definida _(abaixo)_.
- [x] **0.5** Piso hidrossolúvel definido _(abaixo)_.
- [x] **0.6** Decisão GO/NO-GO: **GO com tiers** _(abaixo)_.

---

### 🔬 FASE 0 — RESULTADOS

**Base:** `alimentos` = 22.003 registros, **20.294** são `alimento` (resto = receitas/medidas).

**Completude por micronutriente** (não-nulo E > 0, sobre 20.294):

| Micro | Qtd | % | Micro | Qtd | % |
|-------|-----|---|-------|-----|---|
| Na (sódio) | 16.583 | 82% | Vit B1 | 10.616 | 52% |
| Ca (cálcio) | 13.448 | 66% | Vit E | 10.061 | 50% |
| Fe (ferro) | 12.706 | 63% | B2 | 9.530 | 47% |
| Fibras | 12.827 | 63% | B3 (niacina) | 9.533 | 47% |
| Zn (zinco) | 12.143 | 60% | B6 | 9.338 | 46% |
| Mg | 12.089 | 60% | Vit C | 8.767 | 43% |
| K (potássio) | 12.023 | 59% | Vit A (rea) | 7.765 | 38% |
| | | | B12 | 7.104 | 35% |
| | | | **Vit D** | **5.111** | **25%** |

**Pool micro-completo:**
- `minerais_core` (ca,fe,mg,na,k,zn todos >0): **10.989** (54%) ← **pool utilizável para compensação de minerais**
- core + vitc + fibra: 8.659 (43%)
- quase-completo (com B1/B2/B3): 5.136 (25%)

**Cobertura por grupo (minerais) — os grupos-base do cardápio são ÓTIMOS:**

| Grupo | Cobertura |
|-------|-----------|
| Carnes / Pescados | 96% |
| Cereais | 94% |
| Leguminosas | 92% |
| Vegetais | 90% |
| Ovos | 95% |
| Frutas | 67% |
| Leite e derivados | 48% (mais fraco) |
| Industrializados | 10% (ignorar p/ micro) |

### ✅ DECISÃO: GO — com **3 tiers de confiança**

O motor de micros (Fase 3) trabalha em camadas, conforme a qualidade do dado:

- **Tier A — compensação semanal completa:** `na, ca, fe, mg, k, zn` (minerais). Cobertura 54-82% e grupos-base 90%+. Compensação entre dias plenamente viável.
- **Tier B — compensação parcial + relatório:** `vitc, b1, b2, b3, b6, vite, fibras` (43-52%). Compensa usando o subconjunto coberto; reporta adequação.
- **Tier C — só relatório + flag "monitorar/suplementar":** `vitd (25%), b12 (35%), vita/rea (38%)`. Baixa cobertura **e** são justamente os classicamente suplementados (D=sol, B12=animal). Não tentar otimizar; apenas sinalizar.

**Regra de ouro do pool:** o gerador só usa `alimentos` (TACO) com `minerais_core` preenchido para o cálculo de micro. Alimentos `foods`/`pro_foods` (sem micro) podem entrar no plano mas entram como "micro desconhecido" no relatório.

### 📐 Tabela UL (tetos diários — adulto, IOM/ANVISA) — para Fase 3.3
Nenhum dia pode ultrapassar (não compensável):
```
na:  2300 mg     ca:  2500 mg     fe:  45 mg
zn:  40 mg       se:  400 mcg     rea: 3000 mcg (vit A)
vitd:100 mcg     niacina: 35 mg   piridoxina(b6): 100 mg
vitc:2000 mg     vite:1000 mg
// mg (magnésio): UL 350mg só vale p/ SUPLEMENTO, não de alimento → ignorar via comida
// k (potássio): sem UL estabelecido → sem teto
```

### 📐 Piso diário hidrossolúveis (≥ 70% da RDA/dia) — para Fase 3.4
Não basta média semanal (pouco estoque corporal):
```
vitc, tiamina(b1), riboflavina(b2), niacina(b3), piridoxina(b6), vitb12, vitb9(folato)
```

> **Origem destes valores:** quando a Fase 3 for implementada, transcrever UL e piso para uma constante no backend (`backend/nutrition/limits.js`), espelhando o formato da `DRI_TABLE`. Ainda NÃO criado (evita código órfão).

---

## 📋 FASE 1 — Modelo de Parâmetros e Alvos
**Status:** ✅ CONCLUÍDA (2026-05-29) — `backend/nutrition/planner.js`
**Depende de:** Fase 0.

### Tarefas
- [x] **1.1** `deriveTargetKcal({profile, latestEnergyCalc})`: GET salvo → `target_calories` → fallback Mifflin×`activity`.
- [x] **1.2** `MACRO_SPLITS` por objetivo (lose 30/40/30, gain 25/50/25, maintain 20/50/30). **Novidade:** se o perfil já tem `target_protein/carbs/fat`, usa-os direto.
- [x] **1.3** `MEAL_DISTRIBUTION` (café 20 · lanche 10 · almoço 30 · lanche 10 · jantar 25 · ceia 5).
- [x] **1.4** `buildGenerationConfig({profile, latestEnergyCalc, clinical, overrides})` → `{ objetivo, kcal, macroTargets, perMeal, exclusions, meta }`.
- [x] **1.5** `buildClinicalExclusions(clinical)` + `isExcluded(food, exclusions)` — regras regex para lactose, glúten, amendoim, frutos do mar, ovo, soja, vegano, vegetariano, carne vermelha/porco → `{keywords[], grupos[]}` (grupos reais da TACO).

### Notas de implementação
- `profiles` tem **`age`** (não precisa calcular de birthdate) e **`activity`** (fator) — usados no fallback.
- Funções **puras** (sem DB). A Fase 2 busca `profile` + último `energy_calculations` + `clinical` e chama `buildGenerationConfig`.
- `perMeal` já traz alvo de kcal/P/C/G por refeição (proporcional à distribuição) — pronto para a Fase 2 preencher.
- Validado: emagrecer/fallback, ganho/GET+macros explícitos, vegano+amendoim, `isExcluded` ok.

### Critério de aceite ✅
`buildGenerationConfig` gera config completa e correta (kcal, macros, alvo por refeição, exclusões) a partir dos dados do paciente.

---

## 📋 FASE 2 — Motor Base: kcal + macros por dia
**Status:** ✅ CONCLUÍDA (2026-05-29) — `backend/nutrition/generator.js`
**Depende de:** Fase 1.

### Tarefas
- [x] **2.1** Endpoint `POST /professional/patients/:id/generate-plan` (retorna `plan_data`, NÃO salva). Busca profile + último GET + clinical (do próprio profiles).
- [x] **2.2** `fetchFoodPool`: pool por papel da TACO, micro-completo (exceto gordura), filtros de sanidade macro + blacklist de nomes, aplica exclusões clínicas.
- [x] **2.3** `MEAL_TEMPLATES`: composição por papéis (almoço = proteína+leguminosa+vegetal+gordura+carbo, etc.).
- [x] **2.4** `fillMeal`: fixos (veg/fruta/leguminosa/laticínio) → proteína bate P → gordura bate G → **carbo fecha a KCAL** → correção final de energia.
- [x] **2.5** Variedade: shuffle determinístico + cursor rotativo por papel entre dias.
- [x] **2.6** `sumTotals`: totais por refeição/dia (macros + micros) no padrão do builder.
- [x] **2.7** `plan_data` no formato EXATO do builder (item: `alimento_id, name, medida_label/grams, per100, +macros/micros escalados`).

### 🔬 FASE 2 — RESULTADOS
- **Precisão de kcal:** desvio médio **8%** (5/7 dias ≤ 6%; 2 outliers ~18-19%).
- **Qualidade dos alimentos:** boa após filtros (Acém cozido, Feijão preto, Camarão, Mingau de aveia, Arroz integral, Azeite, Manteiga). Ainda aparecem alguns pratos preparados como carbo ("Arroz com X") — aceitável para rascunho.
- **⚠️ Limitação conhecida:** **carboidratos tendem a ficar acima do alvo.** O carbo é o "fechador de kcal" — quando sobra budget, ele infla os carbos (proteína/gordura batem melhor). É o trade-off do problema sobredeterminado.
  - **Mitigações futuras:** Fase 3 rebalanceia ao trocar alimentos por micro; nutricionista ajusta na revisão; Fase 5 pode adicionar balanceamento de razão de macro.
- **Decisões de design:** carbo-fecha-kcal prioriza kcal+proteína+gordura; pool limitado a 200/papel; gordura isenta de micro-completude (óleos não têm micro).

### Critério de aceite — ✅ parcial (aceito)
7 dias gerados, kcal ±8% médio, alimentos coerentes, exclusões respeitadas, formato do builder OK. Macro de carbo fora de faixa em parte dos dias — **aceito como rascunho revisável** (princípio de segurança do projeto), com mitigação nas fases seguintes.

---

## 📋 FASE 3 — Camada de Micronutrientes (compensação semanal)
**Status:** ✅ CONCLUÍDA (2026-05-29) — `backend/nutrition/limits.js` + `micros.js`
**Depende de:** Fase 2 + Fase 0 GO.

### Tarefas
- [x] **3.1** `computeWeeklyPanorama`: soma semanal + média/dia + % RDA por micro (perDay também).
- [x] **3.2** `compensateMicros`: **swap ISO-CALÓRICO** — troca item por alimento rico no micro mais deficiente, no dia onde está mais baixo, mantendo ~kcal. Loop até convergir (máx 90 iter).
- [x] **3.3** **Trava UL**: swap rejeitado se estoura UL diário OU piora micro já alto (guarda `ulAfter ≤ max(UL, ulBefore)`); + guarda de kcal/dia ±20%.
- [x] **3.4** **Piso hidrossolúvel**: REPORTADO (alertas de dias abaixo de 70% RDA). _Não enforce duro nesta versão._
- [x] **3.5** `buildAdequacyReport`: status por micro (ok/baixo/muito_baixo/monitorar/alto), tier, dias reforçados, alertas de piso, resumo.
- [x] **3.6** Fallback: `req.body.micro=false` desliga compensação; Tier C sempre só relatório.

### 🔬 FASE 3 — RESULTADOS (teste real)
- **Compensação funciona:** Vit E **37%→105%** (reforçada dias 1,2,3,5); Cálcio **86%→95%** (dias 5,6). 7 swaps / 8 iterações. Todos Tier A+B ficaram ≥95%.
- **Trava UL ativa:** sódio ficou "alto" (120%) mas a compensação **não o agravou**.
- **Tier C** (Vit D 26%, B12, Vit A) corretamente marcado **"monitorar"** (não tenta otimizar).
- **Honestidade:** a base TACO já é nutricionalmente rica → muitos micros já vinham ≥100%; a compensação focou os reais déficits (Ca, Vit E).

### ⚠️ Limitações conhecidas (honestas)
- **Sódio alto** no plano base (alimentos TACO com sal) — só teto/UL, reportado; não há redução ativa de sódio nesta versão.
- **Piso hidrossolúvel** (B1/B6/B9) abaixo em alguns dias — reportado, não corrigido ativamente.
- Swap iso-calórico com carregadores de baixa caloria (folhas) bate o clamp → ganho parcial.

### Critério de aceite — ✅
Micros melhorados na média semanal vs Fase 2, sem violar UL diário, relatório transparente com tiers e alertas. ✓

---

## 📋 FASE 4 — Frontend: UI no builder
**Status:** ✅ CONCLUÍDA (2026-05-29) — `pro-meals.js` + `pro-patients.js` + `index.html`
**Depende de:** Fase 2/3.

### Tarefas
- [x] **4.1** Botão **"Gerar Automático"** ao lado de "Novo Cardápio" na lista de cardápios do paciente (`_renderPatientPlansInTab`).
- [x] **4.2** `openGenerateModal`: modal com objetivo (auto/lose/gain/maintain), meta kcal opcional, toggle "compensar micros". Macros/distribuição/exclusões vêm do perfil (backend).
- [x] **4.3** `loadGeneratedPlan`: POST → carrega `plan_data` no builder existente (rascunho sem id), pré-seleciona paciente, renderiza.
- [x] **4.4** `_renderGenReport`: painel de adequação — chips por micro coloridos (ok=verde, baixo=âmbar, muito_baixo/alto=vermelho, monitorar=cinza), dias reforçados (⤴), kcal/dia, alertas de piso.
- [x] **4.5** Banner "Rascunho gerado por IA — revise e ajuste antes de salvar".

### Critério de aceite ✅
Fluxo completo: paciente → Cardápio → Gerar Automático → config → rascunho no builder com relatório → revisa e salva pelo fluxo normal.
**Pendente de verificação:** teste manual pelo navegador com paciente real (recomendado antes de usar em produção).

---

## 📋 FASE 5 — Refinamento e IA opcional
**Status:** ⬜ não iniciada
**Depende de:** Fases 2–4 estáveis.

### Tarefas
- [ ] **5.1** Camada LLM opcional: dar variedade/nomes/preferências às refeições — **a matemática continua no nosso código**, IA só sugere seleção/apresentação.
- [ ] **5.2** Salvar `GenerationConfig` como preset reutilizável por nutricionista.
- [ ] **5.3** "Regenerar só este dia" / "regenerar só esta refeição".
- [ ] **5.4** Considerar preferências do paciente (alimentos favoritos/rejeitados — exigiria novo campo).
- [ ] **5.5** Telemetria: quão perto dos alvos os planos gerados ficam, para calibrar.

### Critério de aceite
Recurso polido, com variedade e ajustes finos, mantendo precisão numérica.

---

## 📋 FASE 6 — Camada Culinária Curada (cultura + regionalidade)
**Status:** ✅ CONCLUÍDA (2026-05-29) — `curated_foods` + `seed_curated.json` + `match-curated.js`; `fetchFoodPool`/`micros` meal-aware.
**Resultado:** café sem arroz, só staples nacionais, variedade por fonte. **Seed = 192 itens** (de ~196 no JSON; 4 sem match na TACO são pulados). Pool de almoço ~39 proteínas / 37 vegetais → ótima variedade entre dias. Re-semear após editar `seed_curated.json`: `docker exec nutrir_backend node nutrition/match-curated.js`.
**Por quê:** a TACO é banco **nutricional**, não **culinário**. Gera "arroz no café" (cultura) e
alimentos exóticos/indisponíveis (regionalidade). Solução: uma camada curada por cima da TACO.

### Princípio central
Tabela curada = **camada de anotação** que aponta para a TACO (FK `alimento_id`). **NÃO duplica
nutrição** — macros/micros continuam vindo de `alimentos`. Só adiciona a dimensão cultural/prática.

### Tabela `curated_foods` (proposta)
```
id | alimento_id (FK alimentos) | display_name (nome limpo) | role (proteina/carbo/leguminosa/
vegetal/fruta/laticinio/gordura) | meals (array: cafe/lanche/almoco/jantar/ceia) |
region (default 'nacional') | default_portion_g | active
```

### ⭐ Regra da VARIEDADE POR FONTE (apontada pelo usuário)
Cada fonte precisa de MÚLTIPLAS formas/cortes, senão a rotação semanal repete:
- **Frango:** peito, coxa, sobrecoxa, **moela**, **coração**, **fígado**, desfiado, caipira
- **Boi:** patinho, acém, músculo, **moída de 2ª**, **fígado**, coração, costela
- **Ovo:** cozido, mexido, omelete, pochê
- **Carbo café:** pão, tapioca, cuscuz, aveia, crepioca (NUNCA arroz)
- **Carbo almoço:** arroz, batata, mandioca, macarrão, inhame, polenta
Miúdos = baratos, nacionais, proteicos → ótimos para variedade econômica.

### Tarefas
- [ ] **6.1** Criar tabela `curated_foods` (migration/CREATE IF NOT EXISTS).
- [ ] **6.2** Seed: expandir a lista (~145 rascunhada na conversa de 2026-05-29) mirando **variedade por fonte** + cobertura nacional. Meta ~300-400. Guardar como `backend/nutrition/seed_curated.json` ou `.md`.
- [ ] **6.3** Script de **matching nome→`alimentos.id`**: p/ cada item curado, buscar melhor candidato na TACO (preferir cozido/grelhado, não cru), gerar **planilha de revisão** (a parte que exige olho humano — escolher o id certo).
- [ ] **6.4** Importar os matches revisados para `curated_foods`.
- [ ] **6.5** Ajustar `generator.fetchFoodPool`: pool passa a vir de `curated_foods JOIN alimentos`, filtrado por **meal-tag + role** (pool por refeição). Templates/fillMeal/micros NÃO mudam. Exclusões clínicas continuam por cima. Fallback p/ TACO por grupo se pool curado vazio.
- [ ] **6.6** `default_portion_g`: usar como âncora de porção (cardápio mais palatável que gramas puras).
- [ ] **6.7** (Futuro) Campo `region` no `profiles` + whitelists regionais; preferências/aversões do paciente.

### Caveat honesto
O gargalo NÃO é gerar nomes — é o **matching nome→TACO** (nomes da TACO bagunçados/ambíguos:
"Arroz, integral, cozido"). Exige uma rodada de revisão humana. É trabalho único.

### Critério de aceite
Cardápio gerado usa só alimentos comuns/nacionais, culturalmente coerentes por refeição
(café ≠ arroz), com variedade entre os 7 dias (cortes/formas diferentes da mesma fonte).

---

## 📋 FASE 7 — Refeições Idiomáticas (arquétipos/combos + bebidas)
**Status:** ⬜ PLANEJADA (registrada 2026-05-29) — a maior evolução conceitual do gerador.
**Filosofia:** sistema complexo, infinitas variáveis. Atacar em várias sessões, sem simplificar.

### Problema que resolve
Hoje montamos a refeição escolhendo **1 alimento por papel, isoladamente** (carbo+proteína+vegetal…).
Isso dá nutrição correta mas **não idiomatismo**. A mesa brasileira é feita de **COMBOS que andam
juntos**: "pão **com** ovos", "arroz **e** feijão", "omelete **com** mussarela". Precisamos de uma
camada de **arquétipos de refeição** (combos), análoga ao que `curated_foods` fez para alimentos.

### Lacunas concretas (dos exemplos do nutricionista)
1. **Café sem proteína** — template atual `[carbo,laticínio,fruta]` não tem ovo. Café real tem ovo/queijo.
2. **Jantar proteico e leve** possível (omelete+queijo), não só arroz+proteína+vegetal.
3. **Bebidas** não existem — refri zero, café, chá, água saborizada (~0 kcal).
4. **Lanche pode ser laticínio** (1 fatia queijo minas), não só fruta. **Ceia pode ser fruta leve** (mamão) — reconcilia com "ceia leve/digestiva".

### Modelo de dados — tabela `meal_archetypes`
Camada de combos por cima de `curated_foods` (NÃO duplica alimentos/nutrição).
```
id | meal_type (cafe_da_manha|lanche_manha|almoco|lanche_tarde|jantar|ceia)
   | name (ex: "Pão com ovos mexidos")
   | slots (JSONB) | region (default 'nacional') | weight (frequência) | active
```
Cada **slot** (dentro de slots[]):
```
{ role: 'carb|protein|legume|vegetable|fruit|dairy|fat|bebida',
  owns: 'protein'|'fat'|'kcal'|null,   // null = porção fixa; 'kcal' = fecha energia
  required: true|false,                 // false = pode ser omitido (ex: bebida)
  portion: number|null }                // override de porção caseira
```
> Regra: cada arquétipo deve ter **um slot `owns:'kcal'`** (o fechador de energia). Se não tiver
> (ex: omelete+queijo+salada), a correção final de kcal escala o maior slot não-travado.

### Novos papéis / dados
- **`bebida`** (novo role em `curated_foods`): refri zero, café s/ açúcar, chá, água saborizada,
  suco natural. Quase 0 kcal (suco tem kcal). Seed novo + tags de refeição.
- **Proteína no café**: garantir ovo/queijo disponíveis nos arquétipos de café (já existem na curated).

### Biblioteca inicial de arquétipos (seed — expandir via LLM offline + revisão)
- **Café:** Pão+ovos · Pão+queijo+café · Tapioca+ovo · Cuscuz+ovo · Iogurte+granola+fruta · Mingau de aveia+fruta · Pão+ovos+fruta+café
- **Lanche manhã/tarde:** 1 fruta · 1 fatia de queijo · Iogurte · Castanhas · Fruta+castanhas
- **Almoço:** Arroz+feijão+carne+salada · Arroz+feijão+frango+legume · Arroz+lentilha+ovo+salada · Arroz+feijão+peixe+legume (+ bebida zero opcional)
- **Jantar:** Omelete+queijo+salada · Sopa de legumes+frango · Arroz+frango+legume(leve) · Crepioca recheada · Wrap/tapioca+frango+salada
- **Ceia:** 1 fruta leve (mamão/melancia) · Iogurte · Chá+castanhas · Iogurte+chia

### Mudanças no motor (generator.js)
- `generatePlan`: por refeição, **escolher um arquétipo** (rotacionando p/ variedade entre dias),
  cujos slots `required` sejam todos preenchíveis com o pool atual (respeitando exclusões clínicas);
  senão tenta outro arquétipo.
- `fillMeal`: generalizar para usar `slot.owns` (em vez do mapa fixo `ROLE_OWNS`) — cada arquétipo
  define seus próprios donos de macro/kcal.
- Compensação de micros, UL, distribuição (Fase refino) **permanecem** — só muda a forma de escolher o combo.

### Regras de afinidade (if/else) — onde o arquétipo não basta
- arroz ⇒ preferir feijão no slot leguminosa (par clássico).
- "ovos mexidos"/omelete ⇒ slot carbo do café tende a pão/tapioca.
- Manter simples: a maior parte da afinidade já está embutida no próprio arquétipo.

### Papel da LLM (honesto)
- **Agora:** usar LLM **uma vez, offline**, para SEMEAR a biblioteca de arquétipos (few-shot,
  ela conhece combos BR) → revisar → gravar. Depois roda **determinístico, grátis, offline**.
- **Fine-tuning do Mistral:** lift grande (dataset, infra, custo) e retorno incerto vs few-shot +
  arquétipos curados. **Horizonte distante, não próximo passo.**
- **Por requisição:** refino opcional (variedade/nomes/regional) — o botão "Sugerir com IA" já é a semente.

### Tarefas
- [x] **7.1** Arquétipos como `archetypes.js` (const JS, não tabela — config estática, sem FK; decisão pragmática vs o plano original de tabela).
- [x] **7.2** Role `bebida` em `curated_foods` (café, chá, refrigerante, suco de laranja, água de coco) + re-seed.
- [x] **7.3** Biblioteca de arquétipos por refeição em `archetypes.js` (slots role/owns/required).
- [x] **7.4** `generatePlan` por arquétipo (escolhe combo viável, rotaciona p/ variedade).
- [x] **7.5** `fillMeal` por `slot.owns` (correção trava macro-donos, escala o resto).
- [x] **7.6** Proteína no café (arquétipos com ovo/queijo) + bebidas opcionais.
- [ ] **7.7** Regras de afinidade (arroz↔feijão etc.) — PENDENTE.
- [~] **7.8** Validado parcialmente (combos idiomáticos OK, ~±5% kcal). Refinos pendentes no topo do doc.

### Critério de aceite
Cardápio gerado parece **comida brasileira de verdade** (combos idiomáticos por refeição),
com proteína no café, bebidas quando fizer sentido, mantendo meta de kcal (±~5%), macros e
adequação de micros. Variedade de combos entre os 7 dias.

### Ressalvas / decisões
- Arquétipos NÃO duplicam nutrição (apontam para `curated_foods` → TACO).
- Cada arquétipo precisa de um fechador de kcal (ou a correção final cobre).
- Bebidas ~0 kcal não devem desbalancear a meta (entram como slot opcional).
- Reconciliação ceia: aceitar fruta leve (mamão) OU laticínio+oleaginosa — ambos "leves/digestivos".

---

## ⚠️ Lembretes Permanentes
- **Deploy:** `git push` ANTES de `node deploy.js`. SSH key: `C:/Users/admin/.ssh/disparo_vps`. Container backend: `nutrir_backend`, DB: `nutrir_db` (db `slimo`, user `postgres`).
- **Segredos:** nunca commitar credenciais; chaves de IA só no backend.
- **Micros só existem na TACO** (`alimentos`) — o motor de micro deve puxar de lá.
- **Rascunho sempre revisado pelo profissional** — nunca aplicar direto.
- **Reusar** `DRI_TABLE`, `MICRO_DEFS`, `calcDayTotals` de `pro-meals.js` (não duplicar).
