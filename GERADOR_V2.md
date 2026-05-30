# Gerador de Cardápios V2 — Plano de Reestruturação

> Documento criado em 2026-05-30 após análise crítica do V1 (Fases 0–9).
> Serve como bússola para a próxima geração do sistema. Ler este documento
> INTEIRO antes de escrever qualquer código novo.

---

## Por que V2?

O V1 foi construído de forma incremental e ficou tecnicamente sofisticado
(20 micronutrientes, compensação semanal iso-calórica, archetypes idiomáticos,
biblioteca de receitas decomposta na TACO) mas **clinicamente raso**: os dados
mais ricos do paciente estão no banco e são **ignorados** pelo gerador.

O caso do Marcelo (paciente real, id=7) revelou o problema com precisão:
- TMB 2.373 kcal, GET 2.848 kcal (Harris-Benedict, sedentário) → salvo em `energy_calculations`
- Meta no plano gerado: **1.200 kcal** (58% abaixo do GET — clinicamente perigoso)
- Comorbidade: **Gota** + ácido úrico 7,5 mg/dL (acima do limite)
- Restrição salva: "Purina" — mas o gerador nunca conectou isso a uma lista real de alimentos
- Exames com Triglicerídeos limiar alto, VLDL alto, HDL baixo — nenhum impacto no plano
- Déficit de 1.648 kcal/dia em paciente com Gota = risco real de precipitar crise aguda

**O plano gerado era clinicamente inadequado, mesmo com micronutrientes "compensados".**

---

## Os três dados que devem alimentar o gerador (hoje desconectados)

```
┌─────────────────────────┐
│  Cálculo Energético     │  TMB, GET, fórmula, fator atividade, fator injúria
│  (energy_calculations)  │  → base calórica REAL do paciente
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│  Exames Laboratoriais   │  Ácido úrico, TG, HDL, HbA1c, creatinina...
│  (patient_exam_markers) │  → restrições alimentares derivadas automaticamente
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│  Anamnese de Estilo     │  Nº de refeições/dia, preferências, aversões,
│  (a ser criada)         │  capacidade de preparo, horários, orçamento
└────────────┬────────────┘
             │
             ▼
     ┌───────────────┐
     │   GERADOR V2  │  Síntese clínica → rascunho revisável
     └───────────────┘
```

---

## Problemas do V1 identificados

### 1. Meta calórica sem validação clínica
- `target_calories` vem do `profiles` digitado manualmente
- GET calculado existe em `energy_calculations` mas é ignorado
- Não há alerta quando a meta se afasta perigosamente do GET
- Para Gota: déficit > 30% do GET é contraindicado (cetonemia eleva ácido úrico)
- **V2:** gerador usa GET como base e aplica déficit seguro por objetivo.
  Alerta vermelho quando meta manual diverge > 20% do GET calculado.

### 2. Comorbidades/exames = texto livre sem ação
- "Gota" em `comorbidities` e "Purina" em `dietary_restrictions` são strings
- O gerador faz ILIKE no nome do alimento — não exclui moela, fígado, sardinha,
  frutos do mar, que são os alimentos com alta purina
- Exames laboratoriais (`patient_exam_markers`) nunca foram lidos pelo gerador
- **V2:** mapa de comorbidade → protocolo alimentar (lista curada de exclusões
  e recomendações derivada automaticamente dos marcadores anormais)

### 3. Obsessão com 20 micronutrientes
- TACO/TBCA têm dados incompletos (zeros que não são zeros reais)
- Compensação iso-calórica automática troca alimentos por critérios nutricionais
  mas pode criar combinações culinárias absurdas
- Nenhum nutricionista consegue auditar 20 micros clinicamente
- **V2:** kcal + macros como restrição rígida. 5-6 micros críticos como
  **alerta visual** (ferro, cálcio, sódio, fibra, vitamina C, ácido úrico).
  Nutricionista vê o alerta e DECIDE — sistema não compensa sozinho.

### 4. Archetype ≠ Ingredientes (naming hallucination)
- Nome do arquétipo é definido antes dos alimentos serem escolhidos
- O cursor rotaciona alimentos independentemente do nome
- Resultado: "Iogurte com fruta e granola" com abacate + cottage + flocos de milho
- **V2:** receita é o átomo. Nome = ingredientes = preparo. Sem dissociação.
  Archetypes são apenas fallback quando não há receita disponível.

### 5. Anamnese de estilo de vida ausente
- Hoje: só restrições clínicas (intolerâncias, comorbidades)
- Não capturamos: nº de refeições, preferências, aversões, preparo, horário, orçamento
- Um plano que respeita "faço só 3 refeições" tem mais chance de ser seguido
  do que um que acertou o selênio da quinta-feira
- **V2:** formulário de anamnese antes de gerar o plano (ou na sessão do paciente)

### 6. Objetivos rasos
- Hoje: lose / maintain / gain — sem nuance terapêutica
- Não há: diabetes (baixo IG), hipertensão (baixo Na), Gota (baixa purina),
  gestante, atleta, doença renal (fósforo/potássio), hipotireoidismo, etc.
- **V2:** perfis de objetivo com splits de macro distintos e filtros alimentares
  específicos por condição

### 7. Crédito às receitas (ética)
- O Receiteria é um blog colaborativo — as receitas são de pessoas reais
  (ex: Jaqueline Souza, que cultiva numa chácara e ama mesa posta)
- Parafrasear a receita dela sem citar = plagiarismo disfarçado, pior que copiar
- **V2:** armazenar `author_name` + `source_url` em cada receita. Exibir
  "Receita de Jaqueline Souza" com link no plano do paciente e no app.
  Usar o texto original de preparo com atribuição.

---

## Arquitetura V2

### Camada 1 — Síntese Clínica (novo `planner_v2.js`)

```
buildClinicalConfig(patientId) {
  1. Busca GET mais recente de energy_calculations
  2. Calcula meta calórica = GET × fator_objetivo
     - lose:     GET × 0.80 (déficit 20%) — cap: nunca < TMB
     - lose_gota: GET × 0.88 (déficit 12%) — Gota não tolera deficit agressivo
     - gain:     GET × 1.10 a 1.15
     - maintain: GET × 1.00
  3. Alerta se target_calories do perfil diverge > 20% do GET calculado
  4. Lê patient_exam_markers → deriva protocolos:
     - acido_urico > 7.0 → protocolo_gota (exclusão de lista curada)
     - triglicerideos > 150 → protocolo_tg (sem suco natural, sem açúcar simples)
     - hdl < 40 → protocolo_hdl (priorizar gordura mono/polinsaturada)
     - hba1c > 5.7 → protocolo_glicemia (baixo IG, distribuir carbo)
     - creatinina alta → protocolo_renal (moderar proteína animal)
  5. Lê anamnese de estilo → nº refeições, aversões, horários
  6. Retorna config com: kcal, macros, exclusions, protocols, mealCount, preferences
}
```

### Camada 2 — Seleção de Receitas (recipe-first)

- Para cada refeição, selecionar receita da biblioteca que:
  - Respeite os protocolos clínicos derivados
  - Respeite as aversões do paciente
  - Esteja na faixa de kcal da refeição (± escalar)
- Fallback: montagem por archetype (manter V1 para quando não há receita)
- Receita = nome fixo + ingredientes fixos + autor + link
- Sem dissociação nome/ingredientes

### Camada 3 — Alertas (não compensação automática)

```
buildClinicalAlerts(plan_data, config, exam_markers) {
  - kcal muito abaixo do GET → alerta vermelho
  - déficit perigoso para Gota → alerta vermelho
  - proteína acima do limite para renal → alerta
  - sódio acima do UL → alerta
  - 5-6 micros críticos criticamente baixos → alerta amarelo
  - NÃO faz swap automático — exibe para o nutricionista decidir
}
```

### Camada 4 — Anamnese de Estilo (nova tabela `patient_lifestyle`)

```sql
CREATE TABLE patient_lifestyle (
  patient_id      INTEGER PRIMARY KEY,
  meal_count      INTEGER DEFAULT 6,        -- quantas refeições/dia
  avoids          TEXT[],                   -- alimentos que não come
  prefers         TEXT[],                   -- alimentos favoritos
  cooking_level   VARCHAR(20),              -- nao_cozinha, basico, avancado
  has_airfryer    BOOLEAN,
  meal_times      JSONB,                    -- {cafe:"07:00", almoco:"12:00"...}
  budget          VARCHAR(20),              -- baixo, medio, alto
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Mapa de Comorbidades → Protocolos (a implementar)

| Marcador / Comorbidade | Limiar | Protocolo | Ação concreta |
|---|---|---|---|
| Ácido Úrico > 7,0 mg/dL ou "Gota" | — | baixa_purina | Excluir: fígado, moela, coração, rim, sardinha, anchova, atum em excesso, frutos do mar, embutidos, cerveja |
| Triglicerídeos > 150 mg/dL | abnormal | baixo_tg | Sem suco natural em excesso, sem açúcar simples, sem álcool, carbo complexo apenas |
| HDL < 40 mg/dL | low | hdl_boost | Priorizar: azeite, abacate, oleaginosas, peixe gordo (exceto alta purina) |
| HbA1c > 5,7% ou "Diabetes" | — | baixo_ig | Carbo distribuído, sem açúcar, baixo IG, fibra em toda refeição |
| Creatinina alta / "Doença Renal" | — | renal | Moderar proteína animal ≤ 0.8g/kg, excluir alto fósforo/potássio |
| Sódio > 145 ou "Hipertensão" | — | baixo_na | Sem sal extra, sem embutidos, sem enlatados, sem queijos curados |
| Ferritina > 300 ou "Hemocromatose" | — | baixo_fe | Evitar carne vermelha diária, sem suplemento de ferro |
| Colesterol Total > 240 | high | baixo_colesterol | Reduzir gordura saturada, sem vísceras, sem gema em excesso |

---

## O que manter do V1

| Componente | Status |
|---|---|
| `backend/nutrition/planner.js` | Manter como base, EVOLUIR para V2 |
| `backend/nutrition/limits.js` (DRI/UL) | Manter como REFERÊNCIA para alertas |
| `backend/nutrition/micros.js` | Transformar em ALERTAS, não compensação automática |
| `backend/nutrition/archetypes.js` | Manter como FALLBACK quando não há receita |
| `backend/nutrition/generator.js` | Refatorar — recipe-first como primário |
| Tabelas `recipes` / `recipe_ingredients` | Manter e EXPANDIR (+ author, source_url) |
| `scrape-receiteria.js` | Manter, adicionar coleta de author/source |
| Builder de revisão (pro-meals.js) | Manter — nunca auto-aplicar é inegociável |
| `curated_foods` / seed | Manter como pool de ingredientes |

---

## O que mudar / criar no V2

| O que | Onde | Prioridade |
|---|---|---|
| `buildClinicalConfig` (GET + exames → meta real) | `nutrition/planner_v2.js` | 🔴 Alta |
| Mapa comorbidade/marcador → protocolo alimentar | `nutrition/protocols.js` | 🔴 Alta |
| Alerta de déficit perigoso (Gota + restrição calórica) | `nutrition/alerts.js` | 🔴 Alta |
| Tabela `patient_lifestyle` + UI de anamnese | DB + admin | 🟡 Média |
| Recipe-first no gerador (receita como átomo) | `nutrition/generator.js` | 🟡 Média |
| `author_name` + `source_url` em `recipes` | DB + scraper + UI | 🟡 Média |
| Alertas clínicos em vez de compensação automática | `nutrition/micros.js` | 🟡 Média |
| Perfis de objetivo expandidos (terapêuticos) | `nutrition/planner_v2.js` | 🟢 Baixa |
| Receitas com atributos clínicos (low_purina, low_tg) | `recipes` + `reclassify` | 🟢 Baixa |

---

## Exemplo: o plano CORRETO para o Marcelo

**Dados disponíveis:**
- GET = 2.848 kcal (Harris-Benedict, sedentário)
- Gota + ácido úrico 7,5 → protocolo baixa_purina
- TG 172 + VLDL 34 → protocolo baixo_tg
- HDL 31 → protocolo hdl_boost
- Peso 117kg, meta 100,5kg

**O que o V2 deveria gerar:**
- **Meta calórica: ~2.300 kcal** (déficit de ~20% sobre GET — seguro para Gota)
- Alerta: "meta digitada (1.200 kcal) é 58% abaixo do GET calculado (2.848 kcal).
  Para pacientes com Gota, déficit > 20% aumenta risco de crise aguda."
- Exclusões automáticas: fígado bovino, moela, coração de frango, sardinha,
  frutos do mar, embutidos, suco natural em excesso (TG alto), açúcar simples
- Prioridades: azeite, abacate, oleaginosas, peixe branco (tilápia, merluza),
  leguminosas, vegetais, frutas de baixo IG (sem banana/manga em excesso)
- Hidratação: flag "paciente com cristais de oxalato — mínimo 2L/dia"

---

## Ordem de implementação sugerida

### Fase A — Fundação clínica (implementar antes de tudo)
1. `protocols.js` — mapa marcador/comorbidade → restrições concretas
2. `planner_v2.js` — lê GET + exames + protocolo → config com meta real + exclusions
3. Alerta de déficit no endpoint `generate-plan` (não bloqueia, avisa)
4. Integrar no gerador existente sem quebrar o V1

### Fase B — Anamnese de estilo
5. Tabela `patient_lifestyle` + formulário na ficha do paciente
6. Número de refeições como parâmetro real do MEAL_DISTRIBUTION

### Fase C — Crédito às receitas
7. Colunas `author_name` + `source_url` em `recipes`
8. Coletar ao scrapear (JSON-LD tem `author.name`)
9. Exibir no builder e no app

### Fase D — Recipe-first
10. Receitas como primário, archetypes como fallback
11. Atributos clínicos em receitas (low_purina, low_tg, etc.)

### Fase E — Alertas em vez de compensação
12. Transformar `micros.js` de compensação → alertas visuais
13. Painel de alertas clínicos no builder (além do painel de adequação)

---

## Princípios que não mudam

- **Rascunho revisável, nunca auto-aplicado** (decisão clínica é do nutricionista)
- **Transparência nos alertas** (mostrar por que o sistema alerta, não esconder)
- **Crédito às fontes** (receitas com autor e link)
- **Dados factuais** (nutrição calculada por nós na TACO, não copiada do site)
- **Não prometer perfeição** ("atenção: déficit elevado para Gota" é mais honesto
  que um plano "otimizado" que ignora o ácido úrico)
