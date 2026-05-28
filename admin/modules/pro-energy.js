/**
 * pro-energy.js — Cálculo Energético (TMB/GET) com histórico por paciente
 */
import { API_URL, adminState } from './state.js';

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
    { id: 13, nome: 'Tinsley — por MLG (2018)',         req_mlg: true  },
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

// ── Utilitários ───────────────────────────────────────────────────────────────
function _calcAge(birthdate) {
    if (!birthdate) return null;
    const today = new Date();
    const birth = new Date(birthdate);
    if (isNaN(birth)) return null;
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age > 0 ? age : null;
}

function _normalizeGender(raw) {
    if (!raw) return 'F';
    const v = String(raw).toLowerCase();
    return (v === 'm' || v === 'male' || v === 'masculino' || v === 'masc') ? 'M' : 'F';
}

function _fmtDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Fórmulas FAO/WHO e Henry & Rees ──────────────────────────────────────────
function _faoWho(peso, alturaM, idadeMeses, g) {
    if (g === 'M') {
        if (idadeMeses < 36)  return (0.255*peso - 0.141*alturaM + 2.690)*239;
        if (idadeMeses < 120) return (0.0937*peso + 2.150*alturaM + 0.325)*239;
        if (idadeMeses < 180) return (0.082*peso + 0.545*alturaM + 1.736)*239;
        if (idadeMeses < 240) return (0.092*peso + 0.218*alturaM + 1.472)*239;
        if (idadeMeses < 360) return (0.063*peso - 0.042*alturaM + 2.953)*239;
        if (idadeMeses < 720) return 58.317*peso - 31.1;
        return (0.049*peso + 2.459*alturaM + 0.077)*239;
    }
    if (idadeMeses < 36)  return (0.246*peso - 0.130*alturaM + 2.191)*239;
    if (idadeMeses < 120) return (0.085*peso + 2.033*alturaM - 0.651)*239;
    if (idadeMeses < 180) return (0.071*peso + 0.677*alturaM + 1.553)*239;
    if (idadeMeses < 240) return (0.063*peso + 2.015*alturaM - 0.786)*239;
    if (idadeMeses < 360) return (0.062*peso + 2.036*alturaM + 0.069)*239;
    if (idadeMeses < 720) return 20.315*peso + 485.9;
    return (0.038*peso + 2.755*alturaM + 0.167)*239;
}

function _henryRees(peso, alturaM, idadeMeses, g) {
    if (g === 'M') {
        if (idadeMeses < 36)  return (0.118*peso + 3.59*alturaM - 1.55)*239;
        if (idadeMeses < 120) return (0.0632*peso + 1.31*alturaM + 1.28)*239;
        if (idadeMeses < 180) return (0.0651*peso + 1.11*alturaM + 1.25)*239;
        if (idadeMeses < 240) return (0.0600*peso + 1.31*alturaM + 0.473)*239;
        if (idadeMeses < 360) return (0.0600*peso + 1.31*alturaM + 0.473)*239;
        if (idadeMeses < 720) return (0.0476*peso + 2.26*alturaM - 0.574)*239;
        return (0.0478*peso + 2.26*alturaM - 1.07)*239;
    }
    if (idadeMeses < 36)  return (0.127*peso + 2.94*alturaM - 1.20)*239;
    if (idadeMeses < 120) return (0.0666*peso + 0.878*alturaM + 1.46)*239;
    if (idadeMeses < 180) return (0.0532*peso + 1.69*alturaM + 0.0165)*239;
    if (idadeMeses < 240) return (0.0510*peso + 2.70*alturaM - 0.654)*239;
    if (idadeMeses < 360) return (0.0510*peso + 2.70*alturaM - 0.654)*239;
    if (idadeMeses < 720) return (0.0630*peso + 2.466)*239;
    return (0.0510*peso + 2.26*alturaM - 0.574)*239;
}

function calcTmb(formulaId, peso, altura, idade, genero, mlg) {
    const meses = idade * 12;
    const hM    = altura / 100;
    let tmb = 0, obs = null;
    if (formulaId === 1) {
        tmb = genero === 'M'
            ? 66.4730 + 13.7516*peso + 5.0033*altura - 6.7550*idade
            : 655.0955 + 9.5634*peso + 1.8494*altura - 4.6756*idade;
    } else if (formulaId === 2) {
        tmb = genero === 'M'
            ? 88.362 + 13.397*peso + 4.799*altura - 5.677*idade
            : 447.593 + 9.247*peso + 3.098*altura - 4.330*idade;
    } else if (formulaId === 3) {
        if (!mlg) return null;
        tmb = 370 + 21.6*mlg;
    } else if (formulaId === 4) {
        if (!mlg) return null;
        tmb = genero === 'M' ? 500 + 22*mlg : 481 + 22*mlg;
    } else if (formulaId === 6) {
        tmb = genero === 'M'
            ? 9.99*peso + 6.25*altura - 4.92*idade + 5
            : 9.99*peso + 6.25*altura - 4.92*idade - 161;
    } else if (formulaId === 8) {
        tmb = _faoWho(peso, hM, meses, genero);
    } else if (formulaId === 9) {
        tmb = _henryRees(peso, hM, meses, genero);
    } else if (formulaId === 11) {
        tmb = genero === 'M' ? peso * 25 : peso * 20;
        obs = 'Fórmula de bolso — valor já representa o GET direto.';
    } else if (formulaId === 12) {
        tmb = 24.8*peso + 10;
    } else if (formulaId === 13) {
        if (!mlg) return null;
        tmb = 25.9*mlg + 284;
    } else return null;
    return { tmb: Math.round(tmb * 10) / 10, obs };
}

function _applyFactors(tmb, formulaId, fatAtiv, fatInj) {
    if (formulaId === 11) return Math.round(tmb * 10) / 10;
    return Math.round(tmb * (fatAtiv || 1) * (fatInj || 1) * 10) / 10;
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

// ── Carregar e renderizar histórico ──────────────────────────────────────────
async function _loadHistory(patientId) {
    const wrap = document.getElementById('ec-history-wrap');
    const body = document.getElementById('ec-history-body');
    if (!wrap || !body) return;

    body.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-2);">Carregando...</td></tr>`;

    try {
        const res = await fetch(`${API_URL}/professional/patients/${patientId}/energy-calculations`, {
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        const rows = await res.json();

        if (!rows.length) {
            body.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-2);">Nenhum cálculo registrado ainda.</td></tr>`;
            return;
        }

        body.innerHTML = rows.map(r => {
            const genLabel  = r.genero === 'M' ? 'Masc.' : 'Fem.';
            const mlgLabel  = r.mlg ? `${parseFloat(r.mlg).toFixed(1)} kg` : '—';
            const fatLabel  = r.fator_atividade_desc ? `${r.fator_atividade} (${r.fator_atividade_desc})` : r.fator_atividade || '—';
            return `<tr>
                <td style="white-space:nowrap;font-size:11px;color:var(--text-2);">${_fmtDate(r.calculated_at)}</td>
                <td style="font-weight:600;font-size:12px;">${r.formula_name || '—'}</td>
                <td style="font-size:12px;">${r.peso ?? '—'} kg / ${r.altura ?? '—'} cm</td>
                <td style="font-size:12px;">${r.idade ?? '—'} anos · ${genLabel}</td>
                <td style="font-size:12px;">${mlgLabel}</td>
                <td style="font-size:12px;">${fatLabel}</td>
                <td style="font-weight:700;color:var(--accent);font-size:13px;white-space:nowrap;">${parseFloat(r.tmb).toFixed(0)} kcal</td>
                <td>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-weight:800;color:var(--accent);font-size:14px;white-space:nowrap;">${parseFloat(r.get_value).toFixed(0)} kcal</span>
                        <button class="btn-danger btn-sm ec-del-btn" data-id="${r.id}" title="Excluir"
                            style="padding:3px 7px;font-size:10px;">✕</button>
                    </div>
                </td>
            </tr>`;
        }).join('');

        // Botões de excluir
        body.querySelectorAll('.ec-del-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('Excluir este registro?')) return;
                await fetch(`${API_URL}/professional/patients/${patientId}/energy-calculations/${btn.dataset.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${adminState.token}` }
                });
                _loadHistory(patientId);
            });
        });

    } catch (err) {
        body.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--color-danger);padding:20px;">Erro ao carregar histórico.</td></tr>`;
    }
}

// ── Salvar registro completo ──────────────────────────────────────────────────
async function _saveRecord(calcData) {
    const patient = adminState._currentPatient;
    if (!patient) return;

    const btn = document.getElementById('btn-ec-registrar');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

    try {
        const res = await fetch(`${API_URL}/professional/patients/${patient.id}/energy-calculations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminState.token}` },
            body: JSON.stringify(calcData)
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Erro ao salvar'); }

        if (btn) {
            btn.textContent = '✓ Registrado!';
            btn.style.background = '#22c55e';
            setTimeout(() => {
                if (btn) { btn.disabled = false; btn.textContent = 'Registrar no Histórico'; btn.style.background = ''; }
            }, 2200);
        }
        // Recarrega histórico
        _loadHistory(patient.id);

    } catch (err) {
        alert('Erro ao salvar: ' + err.message);
        if (btn) { btn.disabled = false; btn.textContent = 'Registrar no Histórico'; }
    }
}

// ── Calcular e exibir resultado ───────────────────────────────────────────────
function _calcAndRender() {
    const { peso, altura, idade, genero, mlg, formulaId, fatAtiv, fatInj } = _getFormValues();
    if (!peso || !altura || !idade) {
        alert('Preencha Peso, Altura e Idade para calcular.');
        return;
    }
    const formula = FORMULAS_ADULTO.find(f => f.id === formulaId);
    if (formula?.req_mlg && !mlg) {
        alert(`A fórmula "${formula.nome}" requer MLG. Preencha o campo MLG.`);
        return;
    }
    const result = calcTmb(formulaId, peso, altura, idade, genero, mlg);
    if (!result) return;

    const { tmb, obs } = result;
    const get         = _applyFactors(tmb, formulaId, fatAtiv, fatInj);
    const fatAtivDesc = FATORES_ATIVIDADE.find(f => f.valor == fatAtiv)?.desc || '';
    const fatInjDesc  = FATORES_INJURIA.find(f => f.fator == fatInj)?.desc || '';

    const box = document.getElementById('ec-result-box');
    if (!box) return;

    box.classList.remove('hidden');
    box.innerHTML = `
        <div style="margin-bottom:14px;">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-2);margin-bottom:3px;">Fórmula</div>
            <div style="font-size:15px;font-weight:700;color:var(--text);">${formula.nome}</div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
            <div style="background:var(--bg-surface-alt);border:1px solid var(--border);border-radius:10px;padding:16px;text-align:center;">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-2);margin-bottom:5px;">TMB</div>
                <div style="font-size:30px;font-weight:800;color:var(--text);letter-spacing:-0.03em;">${tmb.toFixed(0)}</div>
                <div style="font-size:11px;color:var(--text-2);">kcal/dia · ${(tmb/peso).toFixed(1)} kcal/kg</div>
            </div>
            <div style="background:var(--accent-dim);border:1px solid rgba(245,193,77,0.3);border-radius:10px;padding:16px;text-align:center;">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--accent);margin-bottom:5px;">GET</div>
                <div style="font-size:30px;font-weight:800;color:var(--accent);letter-spacing:-0.03em;">${get.toFixed(0)}</div>
                <div style="font-size:11px;color:var(--text-2);">kcal/dia · ${(get/peso).toFixed(1)} kcal/kg</div>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">
            <div style="background:var(--bg-surface-alt);border:1px solid var(--border);border-radius:8px;padding:10px 12px;">
                <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-2);margin-bottom:2px;">Atividade</div>
                <div style="font-size:13px;font-weight:600;color:var(--text);">${fatAtiv} — <span style="font-weight:400;color:var(--text-2);">${fatAtivDesc}</span></div>
            </div>
            <div style="background:var(--bg-surface-alt);border:1px solid var(--border);border-radius:8px;padding:10px 12px;">
                <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-2);margin-bottom:2px;">Injúria</div>
                <div style="font-size:13px;font-weight:600;color:var(--text);">${fatInj} — <span style="font-weight:400;color:var(--text-2);">${fatInjDesc}</span></div>
            </div>
        </div>

        ${obs ? `<p style="font-size:11px;color:var(--accent);background:var(--accent-dim);border-radius:8px;padding:8px 12px;margin-bottom:14px;">${obs}</p>` : ''}

        <button id="btn-ec-registrar" class="btn-primary w-full" style="font-size:13px;padding:12px;">
            Registrar no Histórico do Paciente
        </button>
    `;

    // Dados completos para salvar
    const calcData = {
        formula_id: formulaId, formula_name: formula.nome,
        peso, altura, idade, genero, mlg,
        fator_atividade: fatAtiv, fator_atividade_desc: fatAtivDesc,
        fator_injuria: fatInj, fator_injuria_desc: fatInjDesc,
        tmb, get_value: get
    };

    document.getElementById('btn-ec-registrar')?.addEventListener('click', () => _saveRecord(calcData));

    if (window.lucide) window.lucide.createIcons();
}

// ── Tabela comparativa ────────────────────────────────────────────────────────
function _renderComparison() {
    const { peso, altura, idade, genero, mlg, fatAtiv, fatInj } = _getFormValues();
    if (!peso || !altura || !idade) { alert('Preencha Peso, Altura e Idade para comparar.'); return; }

    const tbody = document.getElementById('ec-comparison-body');
    if (!tbody) return;

    const rows = [];
    for (const f of FORMULAS_ADULTO) {
        if (f.req_mlg && !mlg) continue;
        const result = calcTmb(f.id, peso, altura, idade, genero, mlg);
        if (!result) continue;
        const { tmb } = result;
        const get = _applyFactors(tmb, f.id, fatAtiv, fatInj);
        rows.push({ nome: f.nome, tmb, tmbPerKg: tmb/peso, get, getPerKg: get/peso });
    }
    rows.sort((a, b) => a.tmb - b.tmb);

    tbody.innerHTML = rows.map((r, i) => `
        <tr style="${i === Math.floor(rows.length/2) ? 'background:rgba(245,193,77,0.05);' : ''}">
            <td>${r.nome}</td>
            <td style="font-weight:600;color:var(--accent);">${r.tmb.toFixed(0)} kcal</td>
            <td style="color:var(--text-2);">${r.tmbPerKg.toFixed(1)}</td>
            <td style="font-weight:600;">${r.get.toFixed(0)} kcal</td>
            <td style="color:var(--text-2);">${r.getPerKg.toFixed(1)}</td>
        </tr>`
    ).join('');

    document.getElementById('ec-comparison-wrap')?.classList.remove('hidden');
}

// ── Renderiza a aba completa ──────────────────────────────────────────────────
export function renderEnergyCalcTab(container, patient) {
    const profile   = adminState._currentPatientProfile || {};
    const birthdate = profile.birthdate || profile.birth_date || null;
    const age       = _calcAge(birthdate) ?? (profile.age ? parseInt(profile.age) : '');
    const genderVal = _normalizeGender(profile.gender || profile.sex || profile.biological_sex || '');

    const measurements = adminState._currentPatientMeasurements || [];
    let mlgAuto = '', pesoAuto = patient?.weight || '', alturaAuto = patient?.height || '';
    if (measurements.length > 0) {
        const lat = measurements[0];
        if (lat.muscle_mass_kg) {
            mlgAuto = parseFloat(lat.muscle_mass_kg).toFixed(1);
        } else if (lat.body_fat_pct && lat.weight_kg) {
            mlgAuto = (lat.weight_kg * (1 - lat.body_fat_pct / 100)).toFixed(1);
        }
        if (!pesoAuto   && lat.weight_kg) pesoAuto   = parseFloat(lat.weight_kg).toFixed(1);
        if (!alturaAuto && lat.height_cm) alturaAuto = parseFloat(lat.height_cm).toFixed(1);
    }

    container.innerHTML = `
        <div class="pp-header">
            <h1>Cálculo Energético — TMB / GET</h1>
            <p>Calcule e registre a Taxa Metabólica Basal e o Gasto Energético Total. Acompanhe a evolução ao longo do tratamento.</p>
        </div>

        <!-- ── LINHA SUPERIOR: Formulário + Resultado ── -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:flex-start;margin-bottom:24px;">

            <!-- Formulário -->
            <div class="pp-section">
                <div class="pp-section-title"><i data-lucide="calculator"></i> Parâmetros do Cálculo</div>
                <div class="energy-form-grid">
                    <div class="energy-field">
                        <label>Peso (kg)</label>
                        <input type="number" id="ec-peso" step="0.1" min="1" value="${pesoAuto}" placeholder="Ex: 72.5">
                    </div>
                    <div class="energy-field">
                        <label>Altura (cm)</label>
                        <input type="number" id="ec-altura" step="0.1" min="1" value="${alturaAuto}" placeholder="Ex: 168">
                    </div>
                    <div class="energy-field">
                        <label>Idade (anos)</label>
                        <input type="number" id="ec-idade" step="1" min="1" max="120" value="${age}" placeholder="Ex: 35">
                    </div>
                    <div class="energy-field">
                        <label>Sexo biológico</label>
                        <select id="ec-genero">
                            <option value="F"${genderVal === 'F' ? ' selected' : ''}>Feminino</option>
                            <option value="M"${genderVal === 'M' ? ' selected' : ''}>Masculino</option>
                        </select>
                    </div>
                    <div class="energy-field energy-field-span2">
                        <label>MLG — Massa Livre de Gordura (kg) <span style="font-weight:400;color:var(--text-2);">opcional, obrigatório em *</span></label>
                        <input type="number" id="ec-mlg" step="0.1" min="0" value="${mlgAuto}" placeholder="Calculado da antropometria se disponível">
                    </div>
                    <div class="energy-field energy-field-span2">
                        <label>Fórmula de Cálculo</label>
                        <select id="ec-formula">
                            ${FORMULAS_ADULTO.map(f => `<option value="${f.id}"${f.id===6?' selected':''}>${f.nome}${f.req_mlg?' *':''}</option>`).join('')}
                        </select>
                    </div>
                    <div class="energy-field energy-field-span2">
                        <label>Fator de Atividade Física</label>
                        <select id="ec-atividade">
                            ${FATORES_ATIVIDADE.map(f => `<option value="${f.valor}"${f.valor===1.55?' selected':''}>${f.valor} — ${f.desc}</option>`).join('')}
                        </select>
                    </div>
                    <div class="energy-field energy-field-span2">
                        <label>Fator de Injúria / Estresse Clínico</label>
                        <select id="ec-injuria">
                            ${FATORES_INJURIA.map(f => `<option value="${f.fator}">${f.fator} — ${f.desc}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div style="display:flex;gap:10px;margin-top:18px;">
                    <button class="btn-primary" id="btn-ec-calcular" style="flex:1;">
                        <i data-lucide="calculator" style="width:14px;height:14px;display:inline;vertical-align:middle;margin-right:4px;"></i>
                        Calcular TMB / GET
                    </button>
                    <button class="btn-secondary" id="btn-ec-comparar">
                        <i data-lucide="bar-chart-2" style="width:14px;height:14px;display:inline;vertical-align:middle;margin-right:4px;"></i>
                        Comparar
                    </button>
                </div>
                <p style="margin-top:14px;font-size:11px;color:var(--text-2);border-top:1px solid var(--border);padding-top:10px;line-height:1.5;">
                    * Requerem MLG. Calcule: MLG = Peso × (1 − %Gordura ÷ 100). Fonte: WebDiet — Motor de Cálculo Energético.
                </p>
            </div>

            <!-- Resultado + Comparação -->
            <div style="display:flex;flex-direction:column;gap:16px;">
                <div id="ec-result-box" class="pp-section hidden"></div>
                <div id="ec-comparison-wrap" class="pp-section hidden">
                    <div class="pp-section-title"><i data-lucide="bar-chart-2"></i> Comparação entre Fórmulas</div>
                    <p style="font-size:11px;color:var(--text-2);margin-bottom:12px;">Ordenado por TMB crescente. * omitidas se MLG não preenchido.</p>
                    <div class="table-responsive">
                        <table class="data-table" style="font-size:12px;">
                            <thead><tr><th>Fórmula</th><th>TMB</th><th>TMB/kg</th><th>GET</th><th>GET/kg</th></tr></thead>
                            <tbody id="ec-comparison-body"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── HISTÓRICO ── -->
        <div id="ec-history-wrap" class="pp-section">
            <div class="pp-section-title"><i data-lucide="history"></i> Histórico de Cálculos Energéticos</div>
            <div class="table-responsive">
                <table class="data-table" style="font-size:12px;">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Fórmula</th>
                            <th>Peso / Altura</th>
                            <th>Idade / Sexo</th>
                            <th>MLG</th>
                            <th>Atividade</th>
                            <th>TMB</th>
                            <th>GET</th>
                        </tr>
                    </thead>
                    <tbody id="ec-history-body">
                        <tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-2);">Nenhum cálculo registrado ainda.</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('btn-ec-calcular')?.addEventListener('click', _calcAndRender);
    document.getElementById('btn-ec-comparar')?.addEventListener('click', _renderComparison);

    if (window.lucide) window.lucide.createIcons();

    // Carrega histórico imediatamente
    if (patient?.id) _loadHistory(patient.id);
}

export function initProEnergy() {
    // Listeners criados via renderEnergyCalcTab()
}
