/**
 * pro-energy.js — Cálculo Energético (TMB/GET)
 * Portado diretamente das fórmulas do WebDiet (webdiet_calculo_energetico.py)
 */
import { adminState } from './state.js';

// ── Fórmulas adulto ───────────────────────────────────────────────────────────
const FORMULAS_ADULTO = [
    { id: 1,  nome: 'Harris-Benedict (1919)',           req_mlg: false },
    { id: 2,  nome: 'Harris-Benedict revisada (1984)',  req_mlg: false },
    { id: 3,  nome: 'Katch-McArdle (1996)',             req_mlg: true  },
    { id: 4,  nome: 'Cunningham (1980)',                req_mlg: true  },
    { id: 6,  nome: 'Mifflin-St Jeor (1990)',           req_mlg: false },
    { id: 8,  nome: 'FAO/WHO (2004)',                   req_mlg: false },
    { id: 9,  nome: 'Henry & Rees (1991)',              req_mlg: false },
    { id: 11, nome: 'GET por fórmula de bolso',         req_mlg: false },
    { id: 12, nome: 'Tinsley — por peso (2018)',        req_mlg: false },
    { id: 13, nome: 'Tinsley — por MLG (2018)',        req_mlg: true  },
];

const FATORES_ATIVIDADE = [
    { valor: 1.000, desc: 'Não utilizar' },
    { valor: 1.200, desc: 'Sedentário' },
    { valor: 1.375, desc: 'Leve' },
    { valor: 1.550, desc: 'Moderada' },
    { valor: 1.725, desc: 'Intensa' },
    { valor: 1.900, desc: 'Muito intensa' },
];

const FATORES_INJURIA = [
    { id: 0,  fator: 1.000, desc: 'Não utilizar' },
    { id: 1,  fator: 1.000, desc: 'Paciente não complicado' },
    { id: 2,  fator: 1.100, desc: 'Pós-operatório de câncer' },
    { id: 3,  fator: 1.200, desc: 'Fratura' },
    { id: 4,  fator: 1.300, desc: 'Sepse' },
    { id: 5,  fator: 1.400, desc: 'Peritonite' },
    { id: 6,  fator: 1.500, desc: 'Multitrauma + Reabilitação' },
    { id: 7,  fator: 1.600, desc: 'Multitrauma + Sepse' },
    { id: 8,  fator: 1.250, desc: 'Queimadura até 20%' },
    { id: 9,  fator: 1.700, desc: 'Queimadura 30–50%' },
    { id: 10, fator: 1.800, desc: 'Queimadura 50–70%' },
    { id: 11, fator: 2.000, desc: 'Queimadura 70–90%' },
    { id: 12, fator: 2.100, desc: 'Queimadura 100%' },
    { id: 13, fator: 1.270, desc: 'Câncer' },
    { id: 14, fator: 1.100, desc: 'Cirurgia eletiva' },
    { id: 15, fator: 1.500, desc: 'Desnutrição grave' },
    { id: 16, fator: 0.900, desc: 'Doença cardiopulmonar' },
    { id: 17, fator: 1.420, desc: 'Doença cardiopulmonar com cirurgia' },
    { id: 18, fator: 1.270, desc: 'Fraturas múltiplas' },
    { id: 19, fator: 1.320, desc: 'Infecção grave' },
    { id: 20, fator: 1.400, desc: 'Insuficiência cardíaca' },
    { id: 21, fator: 1.420, desc: 'Insuficiência hepática' },
    { id: 22, fator: 1.300, desc: 'Insuficiência renal aguda' },
    { id: 23, fator: 1.500, desc: 'Politrauma' },
    { id: 24, fator: 1.200, desc: 'Pós-operatório geral' },
    { id: 25, fator: 1.300, desc: 'TCE — Trauma crânio-encefálico' },
    { id: 26, fator: 1.350, desc: 'Tumor cerebral' },
    { id: 27, fator: 1.150, desc: 'Ventilação mecânica' },
];

// ── Funções FAO/WHO e Henry & Rees (por faixa etária) ────────────────────────
function _faoWho(peso, alturaM, idadeMeses, genero) {
    if (genero === 'M') {
        if (idadeMeses < 36)  return (0.255 * peso - 0.141 * alturaM + 2.690) * 239;
        if (idadeMeses < 120) return (0.0937 * peso + 2.150 * alturaM + 0.325) * 239;
        if (idadeMeses < 180) return (0.082 * peso + 0.545 * alturaM + 1.736) * 239;
        if (idadeMeses < 240) return (0.092 * peso + 0.218 * alturaM + 1.472) * 239;
        if (idadeMeses < 360) return (0.063 * peso - 0.042 * alturaM + 2.953) * 239;
        if (idadeMeses < 720) return 58.317 * peso - 31.1;
        return (0.049 * peso + 2.459 * alturaM + 0.077) * 239;
    }
    if (idadeMeses < 36)  return (0.246 * peso - 0.130 * alturaM + 2.191) * 239;
    if (idadeMeses < 120) return (0.085 * peso + 2.033 * alturaM - 0.651) * 239;
    if (idadeMeses < 180) return (0.071 * peso + 0.677 * alturaM + 1.553) * 239;
    if (idadeMeses < 240) return (0.063 * peso + 2.015 * alturaM - 0.786) * 239;
    if (idadeMeses < 360) return (0.062 * peso + 2.036 * alturaM + 0.069) * 239;
    if (idadeMeses < 720) return 20.315 * peso + 485.9;
    return (0.038 * peso + 2.755 * alturaM + 0.167) * 239;
}

function _henryRees(peso, alturaM, idadeMeses, genero) {
    if (genero === 'M') {
        if (idadeMeses < 36)  return (0.118 * peso + 3.59 * alturaM - 1.55) * 239;
        if (idadeMeses < 120) return (0.0632 * peso + 1.31 * alturaM + 1.28) * 239;
        if (idadeMeses < 180) return (0.0651 * peso + 1.11 * alturaM + 1.25) * 239;
        if (idadeMeses < 240) return (0.0600 * peso + 1.31 * alturaM + 0.473) * 239;
        if (idadeMeses < 360) return (0.0600 * peso + 1.31 * alturaM + 0.473) * 239;
        if (idadeMeses < 720) return (0.0476 * peso + 2.26 * alturaM - 0.574) * 239;
        return (0.0478 * peso + 2.26 * alturaM - 1.07) * 239;
    }
    if (idadeMeses < 36)  return (0.127 * peso + 2.94 * alturaM - 1.20) * 239;
    if (idadeMeses < 120) return (0.0666 * peso + 0.878 * alturaM + 1.46) * 239;
    if (idadeMeses < 180) return (0.0532 * peso + 1.69 * alturaM + 0.0165) * 239;
    if (idadeMeses < 240) return (0.0510 * peso + 2.70 * alturaM - 0.654) * 239;
    if (idadeMeses < 360) return (0.0510 * peso + 2.70 * alturaM - 0.654) * 239;
    if (idadeMeses < 720) return (0.0630 * peso + 2.466) * 239;
    return (0.0510 * peso + 2.26 * alturaM - 0.574) * 239;
}

// ── Núcleo do cálculo de TMB ──────────────────────────────────────────────────
function calcTmb(formulaId, peso, altura, idade, genero, mlg) {
    const idadeMeses = idade * 12;
    const alturaM = altura / 100;
    let tmb = 0;
    let obs = null;

    if (formulaId === 1) {
        tmb = genero === 'M'
            ? 66.4730 + 13.7516 * peso + 5.0033 * altura - 6.7550 * idade
            : 655.0955 + 9.5634 * peso + 1.8494 * altura - 4.6756 * idade;

    } else if (formulaId === 2) {
        tmb = genero === 'M'
            ? 88.362 + 13.397 * peso + 4.799 * altura - 5.677 * idade
            : 447.593 + 9.247 * peso + 3.098 * altura - 4.330 * idade;

    } else if (formulaId === 3) {
        if (!mlg) return null;
        tmb = 370 + 21.6 * mlg;

    } else if (formulaId === 4) {
        if (!mlg) return null;
        tmb = genero === 'M' ? 500 + 22 * mlg : 481 + 22 * mlg;

    } else if (formulaId === 6) {
        tmb = genero === 'M'
            ? 9.99 * peso + 6.25 * altura - 4.92 * idade + 5
            : 9.99 * peso + 6.25 * altura - 4.92 * idade - 161;

    } else if (formulaId === 8) {
        tmb = _faoWho(peso, alturaM, idadeMeses, genero);

    } else if (formulaId === 9) {
        tmb = _henryRees(peso, alturaM, idadeMeses, genero);

    } else if (formulaId === 11) {
        tmb = genero === 'M' ? peso * 25 : peso * 20;
        obs = 'Fórmula de bolso — valor já representa o GET direto (sem multiplicar por fator de atividade)';

    } else if (formulaId === 12) {
        tmb = 24.8 * peso + 10;

    } else if (formulaId === 13) {
        if (!mlg) return null;
        tmb = 25.9 * mlg + 284;

    } else {
        return null;
    }

    return { tmb: Math.round(tmb * 10) / 10, obs };
}

function _applyFactors(tmb, formulaId, fatAtiv, fatInj) {
    if (formulaId === 11) return Math.round(tmb * 10) / 10; // bolso = GET direto
    const fa = fatAtiv === 1.0 ? 1 : fatAtiv;
    const fi = fatInj  === 1.0 ? 1 : fatInj;
    return Math.round(tmb * fa * fi * 10) / 10;
}

function _getFormValues() {
    return {
        peso:      parseFloat(document.getElementById('ec-peso')?.value),
        altura:    parseFloat(document.getElementById('ec-altura')?.value),
        idade:     parseFloat(document.getElementById('ec-idade')?.value),
        genero:    document.getElementById('ec-genero')?.value || 'F',
        mlg:       parseFloat(document.getElementById('ec-mlg')?.value) || null,
        formulaId: parseInt(document.getElementById('ec-formula')?.value),
        fatAtiv:   parseFloat(document.getElementById('ec-atividade')?.value || '1.55'),
        fatInj:    parseFloat(document.getElementById('ec-injuria')?.value || '1.0'),
    };
}

// ── Ação: Calcular e exibir resultado ─────────────────────────────────────────
function _calcAndRender() {
    const { peso, altura, idade, genero, mlg, formulaId, fatAtiv, fatInj } = _getFormValues();
    if (!peso || !altura || !idade) {
        alert('Preencha Peso, Altura e Idade para calcular.');
        return;
    }
    const formula = FORMULAS_ADULTO.find(f => f.id === formulaId);
    if (formula?.req_mlg && !mlg) {
        alert(`A fórmula "${formula.nome}" requer MLG (Massa Livre de Gordura). Preencha o campo correspondente.`);
        return;
    }
    const result = calcTmb(formulaId, peso, altura, idade, genero, mlg);
    if (!result) return;

    const { tmb, obs } = result;
    const get = _applyFactors(tmb, formulaId, fatAtiv, fatInj);
    const fatAtivDesc = FATORES_ATIVIDADE.find(f => f.valor == fatAtiv)?.desc || '';
    const fatInjDesc  = FATORES_INJURIA.find(f => f.fator == fatInj)?.desc || '';

    const box = document.getElementById('ec-result-box');
    if (!box) return;
    box.classList.remove('hidden');
    box.innerHTML = `
        <div class="ec-result-header"><strong>${formula.nome}</strong></div>
        <div class="ec-result-grid">
            <div class="ec-result-item ec-tmb">
                <span class="ec-result-label">TMB</span>
                <span class="ec-result-value">${tmb.toFixed(0)}<small> kcal/dia</small></span>
                <span class="ec-result-sub">${(tmb / peso).toFixed(1)} kcal/kg</span>
            </div>
            <div class="ec-result-item ec-get">
                <span class="ec-result-label">GET</span>
                <span class="ec-result-value">${get.toFixed(0)}<small> kcal/dia</small></span>
                <span class="ec-result-sub">${(get / peso).toFixed(1)} kcal/kg</span>
            </div>
            <div class="ec-result-item">
                <span class="ec-result-label">Fat. Atividade</span>
                <span class="ec-result-value" style="font-size:16px;">${fatAtiv}</span>
                <span class="ec-result-sub">${fatAtivDesc}</span>
            </div>
            <div class="ec-result-item">
                <span class="ec-result-label">Fat. Injúria</span>
                <span class="ec-result-value" style="font-size:16px;">${fatInj}</span>
                <span class="ec-result-sub">${fatInjDesc}</span>
            </div>
        </div>
        ${obs ? `<p class="description" style="margin-top:8px; font-size:11px; color:var(--color-primary);">${obs}</p>` : ''}
    `;
}

// ── Ação: Tabela comparativa de todas as fórmulas ─────────────────────────────
function _renderComparison() {
    const { peso, altura, idade, genero, mlg, fatAtiv, fatInj } = _getFormValues();
    if (!peso || !altura || !idade) {
        alert('Preencha Peso, Altura e Idade para comparar.');
        return;
    }

    const tbody = document.getElementById('ec-comparison-body');
    if (!tbody) return;

    const rows = [];
    for (const f of FORMULAS_ADULTO) {
        if (f.req_mlg && !mlg) continue;
        const result = calcTmb(f.id, peso, altura, idade, genero, mlg);
        if (!result) continue;
        const { tmb } = result;
        const get = _applyFactors(tmb, f.id, fatAtiv, fatInj);
        rows.push({ nome: f.nome, tmb, tmbPerKg: tmb / peso, get, getPerKg: get / peso });
    }
    rows.sort((a, b) => a.tmb - b.tmb);

    tbody.innerHTML = rows.map((r, i) => {
        const isMiddle = i === Math.floor(rows.length / 2);
        return `<tr style="${isMiddle ? 'background:rgba(245,193,77,0.05);' : ''}">
            <td>${r.nome}</td>
            <td style="font-weight:600; color:var(--color-primary);">${r.tmb.toFixed(0)} kcal</td>
            <td style="color:var(--color-text-muted);">${r.tmbPerKg.toFixed(1)}</td>
            <td style="font-weight:600;">${r.get.toFixed(0)} kcal</td>
            <td style="color:var(--color-text-muted);">${r.getPerKg.toFixed(1)}</td>
        </tr>`;
    }).join('');

    document.getElementById('ec-comparison-col')?.classList.remove('hidden');
}

// ── Renderiza a aba de Cálculo Energético no painel do paciente ───────────────
export function renderEnergyCalcTab(container, patient) {
    const peso   = patient?.weight  || '';
    const altura = patient?.height  || '';

    container.innerHTML = `
        <div class="energy-calc-wrap">
            <div class="energy-calc-form-col">
                <h3 style="margin:0 0 4px; font-size:14px; font-weight:700; color:var(--color-text-main);">
                    Cálculo Energético — TMB / GET
                </h3>
                <p class="description" style="margin-bottom:20px; font-size:12px;">
                    Calcule a Taxa Metabólica Basal e o Gasto Energético Total com base nas principais fórmulas clínicas. Dados do paciente são pré-preenchidos automaticamente.
                </p>

                <div class="energy-form-grid">
                    <div class="energy-field">
                        <label>Peso (kg)</label>
                        <input type="number" id="ec-peso" step="0.1" min="1" value="${peso}" placeholder="Ex: 72.5">
                    </div>
                    <div class="energy-field">
                        <label>Altura (cm)</label>
                        <input type="number" id="ec-altura" step="0.1" min="1" value="${altura}" placeholder="Ex: 168">
                    </div>
                    <div class="energy-field">
                        <label>Idade (anos)</label>
                        <input type="number" id="ec-idade" step="1" min="1" max="120" placeholder="Ex: 35">
                    </div>
                    <div class="energy-field">
                        <label>Sexo biológico</label>
                        <select id="ec-genero">
                            <option value="F">Feminino</option>
                            <option value="M">Masculino</option>
                        </select>
                    </div>
                    <div class="energy-field energy-field-span2">
                        <label>MLG — Massa Livre de Gordura (kg) <span style="font-weight:400; color:var(--color-text-muted);">opcional, obrigatório em fórmulas *</span></label>
                        <input type="number" id="ec-mlg" step="0.1" min="0" placeholder="Preenchido automaticamente se houver avaliação antropométrica">
                    </div>
                    <div class="energy-field energy-field-span2">
                        <label>Fórmula de Cálculo</label>
                        <select id="ec-formula">
                            ${FORMULAS_ADULTO.map(f => `<option value="${f.id}"${f.id === 6 ? ' selected' : ''}>${f.nome}${f.req_mlg ? ' *' : ''}</option>`).join('')}
                        </select>
                    </div>
                    <div class="energy-field energy-field-span2">
                        <label>Fator de Atividade Física</label>
                        <select id="ec-atividade">
                            ${FATORES_ATIVIDADE.map(f => `<option value="${f.valor}"${f.valor === 1.55 ? ' selected' : ''}>${f.valor} — ${f.desc}</option>`).join('')}
                        </select>
                    </div>
                    <div class="energy-field energy-field-span2">
                        <label>Fator de Injúria / Estresse Clínico</label>
                        <select id="ec-injuria">
                            ${FATORES_INJURIA.map(f => `<option value="${f.fator}">${f.fator} — ${f.desc}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div style="display:flex; gap:10px; margin-top:18px; flex-wrap:wrap;">
                    <button class="btn-primary" id="btn-ec-calcular" style="flex:1; min-width:140px;">
                        <i data-lucide="calculator" style="width:14px;height:14px;display:inline;vertical-align:middle;margin-right:4px;"></i>
                        Calcular TMB / GET
                    </button>
                    <button class="btn-secondary" id="btn-ec-comparar" style="min-width:140px;">
                        <i data-lucide="bar-chart-2" style="width:14px;height:14px;display:inline;vertical-align:middle;margin-right:4px;"></i>
                        Comparar fórmulas
                    </button>
                </div>

                <div id="ec-result-box" class="ec-result-box hidden" style="margin-top:18px;"></div>
            </div>

            <div id="ec-comparison-col" class="energy-comparison-col hidden">
                <h4 style="margin:0 0 12px; font-size:13px; font-weight:700;">Comparação entre Fórmulas</h4>
                <p class="description" style="font-size:11px; margin-bottom:12px;">
                    Ordenado por TMB crescente. Fórmulas com * requeriam MLG e foram omitidas se não preenchido.
                </p>
                <div class="table-responsive">
                    <table class="data-table" style="font-size:12px;">
                        <thead>
                            <tr>
                                <th>Fórmula</th>
                                <th>TMB</th>
                                <th>TMB/kg</th>
                                <th>GET</th>
                                <th>GET/kg</th>
                            </tr>
                        </thead>
                        <tbody id="ec-comparison-body"></tbody>
                    </table>
                </div>
            </div>
        </div>
        <p class="description" style="margin-top:14px; font-size:11px; border-top:1px solid rgba(255,255,255,0.06); padding-top:10px;">
            * Requerem Massa Livre de Gordura (MLG). Calcule: MLG = Peso × (1 − %Gordura ÷ 100). Fonte: WebDiet — Motor de Cálculo Energético.
        </p>
    `;

    // Auto-fill MLG a partir da avaliação antropométrica mais recente
    const measurements = adminState._currentPatientMeasurements;
    if (measurements?.length > 0) {
        const latest = measurements[0];
        const ecMlgInput = document.getElementById('ec-mlg');
        if (ecMlgInput) {
            if (latest.muscle_mass_kg) {
                ecMlgInput.value = parseFloat(latest.muscle_mass_kg).toFixed(1);
            } else if (latest.body_fat_pct && latest.weight_kg) {
                const mlg = latest.weight_kg * (1 - latest.body_fat_pct / 100);
                ecMlgInput.value = mlg.toFixed(1);
            }
        }
        // Auto-fill peso da avaliação mais recente se não veio do perfil
        const ecPesoInput = document.getElementById('ec-peso');
        if (ecPesoInput && !ecPesoInput.value && latest.weight_kg) {
            ecPesoInput.value = parseFloat(latest.weight_kg).toFixed(1);
        }
        const ecAlturaInput = document.getElementById('ec-altura');
        if (ecAlturaInput && !ecAlturaInput.value && latest.height_cm) {
            ecAlturaInput.value = parseFloat(latest.height_cm).toFixed(1);
        }
    }

    document.getElementById('btn-ec-calcular')?.addEventListener('click', _calcAndRender);
    document.getElementById('btn-ec-comparar')?.addEventListener('click', _renderComparison);

    if (window.lucide) window.lucide.createIcons();
}

export function initProEnergy() {
    // Todos os listeners são criados via renderEnergyCalcTab()
}
