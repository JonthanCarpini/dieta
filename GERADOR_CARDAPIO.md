# Gerador Automático de Cardápios — Plano de Implementação

> Documento vivo. Cada fase é **independente e executável em sessões separadas**.
> Ao concluir uma tarefa, marque o checkbox e atualize o **Log de Execução** no topo.
> Uma sessão nova deve ler: (1) este topo, (2) "Contexto do Sistema", (3) a fase atual.

---

## 🔖 Log de Execução (atualizar a cada sessão)

| Data | Fase | O que foi feito | Commit |
|------|------|-----------------|--------|
| 2026-05-29 | — | Documento criado | — |
| 2026-05-29 | **Fase 0 ✅** | Auditoria de micros na `alimentos`, DRI confirmada, UL + piso definidos, decisão **GO** (ver "Fase 0 — Resultados") | — (sem código) |
| 2026-05-29 | **Fase 1 ✅** | Criado `backend/nutrition/planner.js` (funções puras): deriveTargetKcal, macros, distribuição/refeição, exclusões clínicas, buildGenerationConfig. Validado com 3 casos. | _(commitar)_ |

**Fase atual:** Fase 2 (não iniciada) — Fases 0 e 1 concluídas
**Última sessão parou em:** Fase 1 fechada. `planner.js` pronto e testado, **ainda NÃO plugado em endpoint** (vai ao ar com a Fase 2). Próximo: Fase 2 (endpoint `POST /professional/patients/:id/generate-plan` que usa o planner + monta pool + preenche porções).

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
**Status:** ⬜ não iniciada
**Depende de:** Fase 1.
**Entrega:** rascunho de 7 dias que bate kcal+macros (ainda SEM otimização de micro).

### Tarefas
- [ ] **2.1** Endpoint `POST /professional/patients/:id/generate-plan` — recebe `GenerationConfig` (ou gera default), **retorna `plan_data` (não salva)**.
- [ ] **2.2** Montar **pool de alimentos** por grupo/categoria, aplicando exclusões clínicas. Priorizar `alimentos` (TACO) por terem micros.
- [ ] **2.3** **Templates de refeição** por tipo: estrutura de grupos (ex: almoço = 1 proteína + 1 carbo + 1 vegetal + 1 gordura). Evita combinações intragáveis.
- [ ] **2.4** Para cada dia × refeição: escolher alimentos do template e **ajustar gramas** para bater o alvo de kcal+macros da refeição (greedy + ajuste proporcional, ou LP simples por refeição).
- [ ] **2.5** Variedade entre dias: não repetir o mesmo alimento todo dia (rotacionar pool).
- [ ] **2.6** Calcular `total` por refeição e por dia (reusar lógica de `recalcMealTotal`/`calcDayTotals`, incluindo micros que vierem da TACO).
- [ ] **2.7** Devolver no formato `plan_data` exato do builder.

### Critério de aceite
Resposta com 7 dias, cada dia dentro de ±10% de kcal e macros, refeições coerentes, respeitando exclusões.

---

## 📋 FASE 3 — Camada de Micronutrientes (compensação semanal)
**Status:** ⬜ não iniciada
**Depende de:** Fase 2 + Fase 0 GO.
**Entrega:** o diferencial do produto — balanceamento semanal de micros.

### Tarefas
- [ ] **3.1** `computeWeeklyPanorama(plan_data)`: soma cada micro na semana, calcula média/dia e % da RDA.
- [ ] **3.2** **Passada de compensação** (algoritmo central):
  1. Ordenar micros por maior déficit semanal.
  2. Para o mais deficiente, achar dia com folga de macro + alimento rico naquele micro.
  3. Fazer **swap** (trocar/ajustar alimento) mantendo kcal+macros do dia na tolerância.
  4. Repetir até convergir ou esgotar melhorias (limite de N iterações).
- [ ] **3.3** **Trava UL**: a cada swap, validar que nenhum dia ultrapassa o teto (Fase 0.4). Se passar, rejeitar swap.
- [ ] **3.4** **Piso hidrossolúvel**: garantir mínimo diário dos da Fase 0.5 (não só média).
- [ ] **3.5** `buildAdequacyReport(plan_data)`: por micro → % da RDA semanal, status (ok/baixo/alto), e em quais dias foi reforçado. Anexar ao retorno do endpoint.
- [ ] **3.6** Fallback: se pool de micros for insuficiente (Fase 0 NO-GO), pular compensação e só gerar o relatório de adequação informativo.

### Critério de aceite
Plano com micros melhorados na média semanal vs Fase 2, sem violar UL diário, com relatório transparente.

---

## 📋 FASE 4 — Frontend: UI no builder
**Status:** ⬜ não iniciada
**Depende de:** Fase 2 (mínimo) / Fase 3 (completo).

### Tarefas
- [ ] **4.1** Botão **"Gerar automaticamente"** na aba Cardápio do paciente (`patient-tab-content-meal-plan`).
- [ ] **4.2** Modal de configuração: objetivo (pré-preenchido do perfil), split de macros, distribuição por refeição, fonte de alimentos. Tudo com defaults sensatos.
- [ ] **4.3** Chamar o endpoint → carregar o `plan_data` retornado **no builder existente** para revisão/edição.
- [ ] **4.4** **Painel de adequação**: mostrar relatório (kcal/macros por dia + micros na média semanal, verde/amarelo/vermelho).
- [ ] **4.5** Banner claro: "Rascunho gerado — revise e ajuste antes de salvar."

### Critério de aceite
Nutricionista clica, configura, recebe o cardápio no builder com relatório, edita e salva normalmente.

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

## ⚠️ Lembretes Permanentes
- **Deploy:** `git push` ANTES de `node deploy.js`. SSH key: `C:/Users/admin/.ssh/disparo_vps`. Container backend: `nutrir_backend`, DB: `nutrir_db` (db `slimo`, user `postgres`).
- **Segredos:** nunca commitar credenciais; chaves de IA só no backend.
- **Micros só existem na TACO** (`alimentos`) — o motor de micro deve puxar de lá.
- **Rascunho sempre revisado pelo profissional** — nunca aplicar direto.
- **Reusar** `DRI_TABLE`, `MICRO_DEFS`, `calcDayTotals` de `pro-meals.js` (não duplicar).
