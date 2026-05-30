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

## Anamnese Obrigatória no Onboarding (APK + Web)

> Decisão de 2026-05-30: sem anamnese completa o sistema gera planos para um
> "paciente genérico" que não existe. A anamnese é o portão de segurança clínica.
> OBRIGATÓRIA na criação de conta — paciente não acessa o plano sem preenchê-la.

### Fluxo no APK (onboarding multi-etapas)
```
Criar conta → Etapa 1/5 → Etapa 2/5 → Etapa 3/5 → Etapa 4/5 → Etapa 5/5 → App
```
Progresso visual. Não pode pular. Pode revisar depois em "Meu Perfil".
Nutricionista pode complementar/corrigir na ficha do paciente (web admin).

### Etapa 1 — Dados biométricos (já existe, manter)
- Nome, data de nascimento, gênero
- Peso atual, altura, peso desejado
- Objetivo: emagrecer / ganhar massa / manter / orientação terapêutica

### Etapa 2 — Estrutura alimentar do dia a dia
```
Quantas refeições você faz por dia?
  ○ 3   ○ 4   ○ 5   ○ 6 ou mais

Horários aproximados (preencha os que se aplicam):
  Café da manhã [__:__]   Lanche manhã [__:__]   Almoço [__:__]
  Lanche tarde  [__:__]   Jantar       [__:__]   Ceia   [__:__]

Você costuma comer fora de casa?
  ○ Nunca / raramente   ○ Algumas vezes   ○ Todo dia

Você sabe cozinhar?
  ○ Não cozinho (só esquento)   ○ Coisas simples   ○ Cozinho bem
```

### Etapa 3 — Histórico de saúde (checklist, não texto livre)
```
Marque o que um médico já te disse ou você já sabe:

METABÓLICO
□ Diabetes tipo 2 ou pré-diabetes
□ Colesterol alto (LDL elevado)
□ Triglicerídeos altos
□ Pressão alta (hipertensão)
□ Gota ou ácido úrico elevado

DIGESTIVO / RENAL
□ Doença celíaca (intolerância ao glúten)
□ Síndrome do intestino irritável (SII)
□ Doença inflamatória intestinal (Crohn / Colite)
□ Doença renal crônica
□ Cálculo renal (pedra nos rins)

HORMONAL / OUTRO
□ Hipotireoidismo (tireoide lenta)
□ Hipertireoidismo (tireoide acelerada)
□ SOP — Síndrome dos Ovários Policísticos
□ Doença cardíaca / insuficiência cardíaca
□ Anemia (ferro baixo diagnosticado)

□ Nenhuma das anteriores
```

### Etapa 4 — Restrições e preferências alimentares
```
O QUE VOCÊ NÃO COME (por saúde ou escolha):
□ Sou vegetariano       □ Sou vegano
□ Não como carne vermelha   □ Não como frango
□ Não como peixe / frutos do mar
□ Intolerância à lactose    □ Intolerância ao glúten
□ Não como porco        □ Restrição religiosa (halal / kosher)

O QUE VOCÊ NÃO GOSTA (aversões):
[campo livre — ex: "odeio fígado, não como beterraba"]

O QUE VOCÊ MAIS GOSTA:
[campo livre — ex: "adoro frango, como muito arroz e feijão"]
```

### Etapa 5 — Exames laboratoriais
```
Você tem resultados de exames de sangue dos últimos 6 meses?

  ○ SIM → [Enviar PDF ou foto]  — sistema extrai valores automaticamente

  ○ NÃO → Responda para personalizar seu plano:

    Médico já disse que seu colesterol ou triglicerídeos estão altos?
      ○ Sim   ○ Não   ○ Nunca fiz exame

    Médico já disse que seu ácido úrico está alto ou você tem gota?
      ○ Sim   ○ Não   ○ Nunca fiz exame

    Sua glicemia (açúcar no sangue) já esteve acima do normal?
      ○ Sim   ○ Não   ○ Nunca fiz exame

    Você já teve pedra nos rins?
      ○ Sim   ○ Não

    Toma algum medicamento de uso contínuo?
      [campo livre — ex: "metformina, losartana"]
```

### Respostas proxy → protocolos (sem exame)
| Resposta "Sim" | Protocolo | Equivalente laboratorial |
|---|---|---|
| Colesterol/TG altos | baixo_tg + baixo_colesterol | TG > 150, HDL < 40 |
| Ácido úrico alto / Gota | baixa_purina | Ácido úrico > 7,0 |
| Glicemia acima do normal | baixo_ig | HbA1c > 5,7% |
| Pedra nos rins | baixo_oxalato | Cristais oxalato |
| Medicamento metformina | protocolo_diabetes | — |
| Medicamento losartana/enalapril | protocolo_has | Sódio alto |

### Status no painel do nutricionista (antes de gerar)
```
⚠️  Anamnese incompleta — etapas 3 e 5 não preenchidas
✅  Anamnese sem exames — protocolos derivados de respostas proxy
✅  Anamnese completa — exames de 29/05/2026 disponíveis
```
Gerador não bloqueia por anamnese incompleta — avisa, nutricionista decide.

### Tabelas novas necessárias
```sql
CREATE TABLE patient_anamnesis (
  patient_id      INTEGER PRIMARY KEY REFERENCES users(id),
  meal_count      INTEGER DEFAULT 5,
  meal_times      JSONB,           -- {"cafe":"07:00","almoco":"12:00",...}
  eats_out        VARCHAR(20),     -- never / sometimes / always
  cooking_level   VARCHAR(20),     -- none / basic / good
  conditions      TEXT[],          -- ['diabetes','gota','hipertensao',...]
  restrictions    TEXT[],          -- ['vegetariano','sem_lactose',...]
  avoids_text     TEXT,
  prefers_text    TEXT,
  medications     TEXT,
  completed_at    TIMESTAMPTZ,     -- NULL = incompleta
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE patient_exam_proxy (
  patient_id      INTEGER PRIMARY KEY REFERENCES users(id),
  cholesterol_high  BOOLEAN,
  uric_acid_high    BOOLEAN,
  glucose_high      BOOLEAN,
  kidney_stones     BOOLEAN,
  answered_at       TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Ordem de implementação sugerida (REVISADA)

### Fase 0 — Anamnese no onboarding (PRÉ-REQUISITO de tudo)
> Sem anamnese o V2 não tem dados para funcionar.
1. Tabelas `patient_anamnesis` + `patient_exam_proxy`
2. Telas de onboarding no APK (5 etapas, obrigatório)
3. Formulário de anamnese na ficha do paciente (web admin)
4. Status da anamnese visível antes de gerar o plano

### Fase A — Fundação clínica
5. `protocols.js` — mapa marcador/comorbidade/proxy → restrições concretas
6. `planner_v2.js` — lê GET + exames + proxy + anamnese → config com meta real
7. Alerta de déficit no `generate-plan`
8. Integrar sem quebrar o V1 em produção

### Fase B — Recipe-first
9. Receitas como primário (nome = ingredientes = preparo), archetypes como fallback
10. ✅ Atributos clínicos: `recipes.clinical_tags` (protocolos respeitados) via `clinicalTagsFor()` com `wordHit` (palavra inteira, sem falso positivo). `recipes.goals[]` (lose/maintain/gain). Gerador filtra por objetivo + `clinical_tags @> protocolIds`. 465 receitas ativas; cobertura por protocolo: purina 254, tg 345, ig 342, na 216, renal 460, colesterol 225.
11. ✅ Crédito: `author_name` + `source_url` coletados do JSON-LD; `srcAuthor()` + `srcPreparo()` no scraper; `update-preparo` re-fetcha sem re-decompor; gerador injeta "Receita de [autor] — [url]" nas `instructions`; builder mostra `.wd-meal-author`. 38/45 receitas fit com autor+preparo original coletados.

### Fase A+ — Fórmulas energéticas (✅ concluído)
- `backend/nutrition/formulas.js`: módulo único com 10 fórmulas (H-B 1919/1984,
  Katch-McArdle, Cunningham, Mifflin-St Jeor, FAO/WHO, Henry&Rees, Bolso,
  Tinsley peso/MLG) — coeficientes idênticos ao painel web (`pro-energy.js`).
- `selectFormula(profile)` escolhe automaticamente pela diretriz clínica:
  - IMC ≥ 25 → **Mifflin-St Jeor** (sobrepeso/obesidade)
  - atleta (atividade ≥ 1.725) com MLG → **Cunningham**; sem MLG → **Tinsley**
  - eutrófico → **Harris-Benedict revisada**
- `planner_v2` e `user.js/calcNutritionTargets` usam `formulas.autoCalc()`.
- **Piso de segurança**: meta nunca abaixo de TMB nem do mínimo absoluto
  (♂1500/♀1200). Corrige o bug dos 79 kcal (Nathila) e o déficit perigoso
  do Marcelo (limitado à TMB Mifflin = 2162, em vez de 945).
- Validado: Marcelo (IMC 31.7)→Mifflin, Nathila (23.9)→H-B, atleta→Tinsley/Cunningham.

### Fase C — Alertas clínicos (✅ concluído)
12. ✅ `micros.js` não compensa mais automaticamente — endpoint só gera relatório + alertas.
13. ✅ `buildMicroAlerts()`: UL ultrapassado (sódio) = **erro**; micro <70% da meta semanal = **warning com sugestão de alimentos-fonte** (`MICRO_FOOD_SOURCES`); piso diário hidrossolúvel consolidado num único alerta (dedupe). Mesclado em `alerts[]` e exibido no painel do builder junto com déficit/protocolos. Validado no Marcelo: 5 alertas acionáveis (fibra 43%, vit E 41%, folato 56%, B6 67%, piso hidrossolúvel).
**Princípio**: o sistema NUNCA corrige sozinho — apenas alerta; o nutricionista decide (decisão clínica).

### Fase D — Objetivos terapêuticos (✅ concluído)
14. ✅ `macros.js` (`resolveMacros`): macros clínicos por **g/kg de peso** (não % fixo).
    - Proteína: lose 1.8 / maintain 1.2 / gain 2.0 g/kg; +0.2 atleta (ativ≥1.725); piso idoso 1.2
    - **Peso de referência ajustado** para obesos (IMC>30): ideal + 0.25×(atual−ideal) — evita superestimar proteína
    - **Renal** limita proteína a 0.8 g/kg (domina o objetivo)
    - **Diabetes** (baixo_ig): carbo ≤45% das kcal, + gordura boa
    - **Colesterol/TG**: gordura total limitada; piso de gordura 0.8 g/kg (saúde hormonal)
    - Carbo fecha o restante; piso ~1 g/kg (SNC)
15. ✅ `planner_v2` usa `resolveMacros` + expõe `macroBasis`. Restrições por protocolo já cobertas em `protocols.js` (Fases A/B). Validado: 5 perfis (obeso, atleta, renal, diabético, eutrófico) com macros coerentes.

---

## ✅ V2 COMPLETO — todas as fases entregues (0, A, A+, B, C, D)
O gerador agora conecta: anamnese → GET (fórmula por perfil) → meta segura (speed+pisos) →
protocolos clínicos (exames/comorbidades) → macros por g/kg → receitas filtradas por
objetivo+protocolo (com crédito ao autor) → alertas de micros. Tudo como rascunho revisável.

---

## Princípios que não mudam

- **Rascunho revisável, nunca auto-aplicado** (decisão clínica é do nutricionista)
- **Transparência nos alertas** (mostrar por que o sistema alerta, não esconder)
- **Crédito às fontes** (receitas com autor e link)
- **Dados factuais** (nutrição calculada por nós na TACO, não copiada do site)
- **Não prometer perfeição** ("atenção: déficit elevado para Gota" é mais honesto
  que um plano "otimizado" que ignora o ácido úrico)
