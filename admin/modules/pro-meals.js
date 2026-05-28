/**
 * pro-meals.js — Gerenciamento de Cardápios (estilo WebDiet)
 */

import { API_URL, adminState } from './state.js';

// ==========================================
// CONSTANTES
// ==========================================

const MEAL_TYPES = [
    { type: 'cafe_da_manha',  label: 'Café da Manhã',   time: '06:00' },
    { type: 'lanche_manha',   label: 'Lanche da Manhã', time: '09:00' },
    { type: 'almoco',         label: 'Almoço',           time: '12:00' },
    { type: 'lanche_tarde',   label: 'Lanche da Tarde',  time: '15:00' },
    { type: 'jantar',         label: 'Jantar',            time: '18:00' },
    { type: 'ceia',           label: 'Ceia',              time: '21:00' },
];

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAY_FULL  = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const MICRO_KEYS = ['ca','mg','p','fe','na','k','co','zn','se','re','rea','tiamina','riboflavina','piridoxina','niacina','vitc','vitb12','vitb9','vite','vitd'];

// ==========================================
// DRI — Dietary Reference Intakes (IOM)
// ==========================================
const DRI_TABLE = {
    female: {
        '14-18': { ca:1300,mg:360,p:1250,fe:15,na:1500,k:2300,co:0.89,zn:9, se:55,rea:700,tiamina:1.0,riboflavina:1.0,piridoxina:1.2,niacina:14,vitc:65, vitb12:2.4,vitb9:400,vite:15,vitd:15,fibras:26 },
        '19-30': { ca:1000,mg:310,p:700, fe:18,na:1500,k:2600,co:0.9, zn:8, se:55,rea:700,tiamina:1.1,riboflavina:1.1,piridoxina:1.3,niacina:14,vitc:75, vitb12:2.4,vitb9:400,vite:15,vitd:15,fibras:25 },
        '31-50': { ca:1000,mg:320,p:700, fe:18,na:1500,k:2600,co:0.9, zn:8, se:55,rea:700,tiamina:1.1,riboflavina:1.1,piridoxina:1.3,niacina:14,vitc:75, vitb12:2.4,vitb9:400,vite:15,vitd:15,fibras:25 },
        '51-70': { ca:1200,mg:320,p:700, fe:8, na:1300,k:2600,co:0.9, zn:8, se:55,rea:700,tiamina:1.1,riboflavina:1.1,piridoxina:1.5,niacina:14,vitc:75, vitb12:2.4,vitb9:400,vite:15,vitd:20,fibras:21 },
        '70+':   { ca:1200,mg:320,p:700, fe:8, na:1200,k:2600,co:0.9, zn:8, se:55,rea:700,tiamina:1.1,riboflavina:1.1,piridoxina:1.5,niacina:14,vitc:75, vitb12:2.4,vitb9:400,vite:15,vitd:20,fibras:21 },
    },
    male: {
        '14-18': { ca:1300,mg:410,p:1250,fe:11,na:1500,k:3000,co:0.89,zn:11,se:55,rea:900,tiamina:1.2,riboflavina:1.3,piridoxina:1.3,niacina:16,vitc:75, vitb12:2.4,vitb9:400,vite:15,vitd:15,fibras:38 },
        '19-30': { ca:1000,mg:400,p:700, fe:8, na:1500,k:3400,co:0.9, zn:11,se:55,rea:900,tiamina:1.2,riboflavina:1.3,piridoxina:1.3,niacina:16,vitc:90, vitb12:2.4,vitb9:400,vite:15,vitd:15,fibras:38 },
        '31-50': { ca:1000,mg:420,p:700, fe:8, na:1500,k:3400,co:0.9, zn:11,se:55,rea:900,tiamina:1.2,riboflavina:1.3,piridoxina:1.3,niacina:16,vitc:90, vitb12:2.4,vitb9:400,vite:15,vitd:15,fibras:38 },
        '51-70': { ca:1000,mg:420,p:700, fe:8, na:1300,k:3400,co:0.9, zn:11,se:55,rea:900,tiamina:1.2,riboflavina:1.3,piridoxina:1.7,niacina:16,vitc:90, vitb12:2.4,vitb9:400,vite:15,vitd:20,fibras:30 },
        '70+':   { ca:1200,mg:420,p:700, fe:8, na:1200,k:3400,co:0.9, zn:11,se:55,rea:900,tiamina:1.2,riboflavina:1.3,piridoxina:1.7,niacina:16,vitc:90, vitb12:2.4,vitb9:400,vite:15,vitd:20,fibras:30 },
    }
};

const MICRO_DEFS = [
    { key:'ca',         label:'Cálcio',          unit:'mg',  dri:'ca'         },
    { key:'co',         label:'Cobre',            unit:'mg',  dri:'co'         },
    { key:'fe',         label:'Ferro',            unit:'mg',  dri:'fe'         },
    { key:'_fiber',     label:'Fibras',           unit:'g',   dri:'fibras'     },
    { key:'p',          label:'Fósforo',          unit:'mg',  dri:'p'          },
    { key:'mg',         label:'Magnésio',         unit:'mg',  dri:'mg'         },
    { key:'niacina',    label:'Niacina',          unit:'mg',  dri:'niacina'    },
    { key:'na',         label:'Sódio',            unit:'mg',  dri:'na'         },
    { key:'piridoxina', label:'Piridoxina (B6)',  unit:'mg',  dri:'piridoxina' },
    { key:'k',          label:'Potássio',         unit:'mg',  dri:'k'          },
    { key:'riboflavina',label:'Riboflavina (B2)', unit:'mg',  dri:'riboflavina'},
    { key:'se',         label:'Selênio',          unit:'mcg', dri:'se'         },
    { key:'rea',        label:'Vitamina A (REA)', unit:'mcg', dri:'rea'        },
    { key:'vitb9',      label:'Vitamina B9',      unit:'mcg', dri:'vitb9'      },
    { key:'vitb12',     label:'Vitamina B12',     unit:'mcg', dri:'vitb12'     },
    { key:'vitc',       label:'Vitamina C',       unit:'mg',  dri:'vitc'       },
    { key:'vitd',       label:'Vitamina D',       unit:'mcg', dri:'vitd'       },
    { key:'vite',       label:'Vitamina E',       unit:'mg',  dri:'vite'       },
    { key:'tiamina',    label:'Tiamina (B1)',     unit:'mg',  dri:'tiamina'    },
    { key:'zn',         label:'Zinco',            unit:'mg',  dri:'zn'         },
];

// ==========================================
// ESTADO LOCAL DO MÓDULO
// ==========================================
let _expandedMeal = null;  // { dow, type }
let _foodSearchTarget = null;  // { dow, type }
let _currentFoodResults = [];
let _currentGeneratedRecipe = null;
let _currentGeneratedRecipeTarget = null;

// ==========================================
// UTILITÁRIOS
// ==========================================

function getDRI(age, gender) {
    const tbl = DRI_TABLE[gender === 'male' ? 'male' : 'female'];
    if (!age || age < 14) return tbl['19-30'];
    if (age <= 18) return tbl['14-18'];
    if (age <= 30) return tbl['19-30'];
    if (age <= 50) return tbl['31-50'];
    if (age <= 70) return tbl['51-70'];
    return tbl['70+'];
}

function rnd(v, d = 1) { return parseFloat((v || 0).toFixed(d)); }
function calcFactor(grams) { return (grams || 0) / 100; }

function calcItemMacrosAndMicros(per100, grams) {
    const f = calcFactor(grams);
    const result = {
        calories: Math.round(per100.calories * f * 10) / 10,
        protein:  Math.round(per100.protein  * f * 10) / 10,
        carbs:    Math.round(per100.carbs    * f * 10) / 10,
        fat:      Math.round(per100.fat      * f * 10) / 10,
        fiber:    Math.round(per100.fiber    * f * 10) / 10,
    };
    MICRO_KEYS.forEach(k => {
        result[k] = Math.round((per100[k] || 0) * f * 10) / 10;
    });
    return result;
}

function svgDonut(ptn_g, lip_g, cho_g, size = 80) {
    const ptn_k = ptn_g * 4, lip_k = lip_g * 9, cho_k = cho_g * 4;
    const total = ptn_k + lip_k + cho_k;
    const cx = size / 2, cy = size / 2, r = size * 0.32, sw = size * 0.22;
    const C = 2 * Math.PI * r;

    if (total <= 0) {
        return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="${sw}"/></svg>`;
    }

    const pLen = C * (ptn_k / total);
    const lLen = C * (lip_k / total);
    const cLen = C * (cho_k / total);

    const seg = (len, color, off) => len > 0 ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"/>` : '';

    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="${sw}"/>
        ${seg(pLen, '#ef4444', C)}
        ${seg(lLen, '#f59e0b', C - pLen)}
        ${seg(cLen, '#3b82f6', C - pLen - lLen)}
    </svg>`;
}

function renderCaloricDensityBar(density) {
    const max = 10;
    const pct = Math.min(density / max * 100, 100);
    let cls, txt;
    if (density < 0.5)      { cls = 'dens-vlow';   txt = `Muito leve (< 0.5 Kcal/g)`; }
    else if (density < 1.5) { cls = 'dens-low';    txt = `Baixa densidade (0.5 a 1.5 Kcal/g)`; }
    else if (density < 4.0) { cls = 'dens-mid';    txt = `Densidade média (1.5 a 3.9 Kcal/g)`; }
    else if (density < 9.0) { cls = 'dens-high';   txt = `Alta densidade (4.0 a 9.0 Kcal/g)`; }
    else                     { cls = 'dens-vhigh';  txt = `Muito alta (> 9.0 Kcal/g)`; }

    return `
    <div class="wd-density-wrap">
        <h5 class="wd-analysis-h5">Densidade calórica da refeição <span class="wd-help-tip" title="Kcal por grama total da refeição">?</span></h5>
        <div class="wd-density-bar-outer">
            <div class="wd-density-bar-grad"></div>
            <div class="wd-density-marker" style="left:${pct.toFixed(1)}%"></div>
        </div>
        <div class="wd-density-value">${density.toFixed(2)}</div>
        <p class="wd-density-class ${cls}">${txt}</p>
    </div>`;
}

// ==========================================
// DADOS
// ==========================================

export function getEmptyPlanData() {
    return {
        days: [1,2,3,4,5,6,0].map(dow => ({
            dow,
            meals: MEAL_TYPES.map(mt => ({
                type: mt.type, label: mt.label, time: mt.time,
                items: [], instructions: '',
                total: { calories:0, protein:0, carbs:0, fat:0, fiber:0, grams:0 }
            }))
        }))
    };
}

function recalcMealTotal(dayIdx, mealIdx) {
    const items = adminState._editingPlanData.days[dayIdx].meals[mealIdx].items;
    const total = { calories:0, protein:0, carbs:0, fat:0, fiber:0, grams:0 };
    MICRO_KEYS.forEach(k => { total[k] = 0; });
    items.forEach(item => {
        total.calories += item.calories || 0;
        total.protein  += item.protein  || 0;
        total.carbs    += item.carbs    || 0;
        total.fat      += item.fat      || 0;
        total.fiber    += item.fiber    || 0;
        total.grams    += item.grams    || 0;
        MICRO_KEYS.forEach(k => { total[k] += item[k] || 0; });
    });
    adminState._editingPlanData.days[dayIdx].meals[mealIdx].total = total;
}

function calcDayTotals(dayData) {
    const t = { calories:0, protein:0, carbs:0, fat:0, fiber:0, grams:0 };
    MICRO_KEYS.forEach(k => { t[k] = 0; });
    (dayData.meals || []).forEach(meal => {
        t.calories += meal.total?.calories || 0;
        t.protein  += meal.total?.protein  || 0;
        t.carbs    += meal.total?.carbs    || 0;
        t.fat      += meal.total?.fat      || 0;
        t.fiber    += meal.total?.fiber    || 0;
        t.grams    += meal.total?.grams    || 0;
        MICRO_KEYS.forEach(k => { t[k] += meal.total?.[k] || 0; });
    });
    return t;
}

function recalcItemFromMeasure(dayIdx, mealIdx, itemIdx, medidaGrams, medidaLabel, quantidade) {
    const item = adminState._editingPlanData.days[dayIdx].meals[mealIdx].items[itemIdx];
    if (!item.per100) return false;
    const totalGrams = medidaGrams * quantidade;
    item.medida_grams = medidaGrams;
    item.medida_label = medidaLabel;
    item.quantidade   = quantidade;
    item.grams        = totalGrams;
    const calc = calcItemMacrosAndMicros(item.per100, totalGrams);
    Object.assign(item, calc);
    return true;
}

// ==========================================
// LISTA DE PLANOS
// ==========================================

export async function loadMealPlansData() {
    const tbody = document.getElementById('meal-plans-table-body');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Carregando...</td></tr>`;
    try {
        const res = await fetch(`${API_URL}/professional/weekly-plans`, {
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        if (!res.ok) throw new Error();
        const plans = await res.json();
        adminState._weeklyPlans = plans;
        renderMealPlansTable(plans);
        await populatePlanPatientSelect();
    } catch {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--color-danger);">Erro ao carregar.</td></tr>`;
    }
}

function renderMealPlansTable(plans) {
    const tbody = document.getElementById('meal-plans-table-body');
    if (!tbody) return;
    if (!plans.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--color-text-muted);">Nenhum cardápio criado ainda.</td></tr>`;
        return;
    }
    tbody.innerHTML = '';
    plans.forEach(p => {
        const tr = document.createElement('tr');
        const dt = new Date(p.updated_at).toLocaleDateString('pt-BR');
        tr.innerHTML = `
            <td><strong>${p.name}</strong></td>
            <td>${p.patient_name ? `<span class="badge-role user">${p.patient_name}</span>` : '<span style="color:var(--color-text-muted)">—</span>'}</td>
            <td><small>${dt}</small></td>
            <td><span class="badge-role ${p.is_active ? 'nutritionist' : ''}" style="${p.is_active ? '' : 'background:rgba(255,80,80,0.1);color:#ff5050;border-color:rgba(255,80,80,0.2);'}">${p.is_active ? 'Ativo' : 'Inativo'}</span></td>
            <td style="display:flex;gap:6px;">
                <button class="btn-sm btn-primary btn-edit-plan" data-id="${p.id}">Editar</button>
                <button class="btn-sm btn-danger btn-delete-plan" data-id="${p.id}">Excluir</button>
            </td>`;
        tr.querySelector('.btn-edit-plan').addEventListener('click', () => openMealPlanBuilder(p.id));
        tr.querySelector('.btn-delete-plan').addEventListener('click', () => deleteMealPlan(p.id, p.name));
        tbody.appendChild(tr);
    });
}

async function populatePlanPatientSelect() {
    const sel = document.getElementById('plan-patient-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">Sem paciente (template)</option>';
    (adminState.allPatients || []).forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        sel.appendChild(opt);
    });
}

// ==========================================
// ABRIR EDITOR
// ==========================================

export async function openMealPlanBuilder(planId) {
    _expandedMeal = null;
    document.getElementById('meal-plans-list-view').classList.add('hidden');
    document.getElementById('meal-plans-builder-view').classList.remove('hidden');

    if (planId) {
        try {
            const res = await fetch(`${API_URL}/professional/weekly-plans/${planId}`, {
                headers: { 'Authorization': `Bearer ${adminState.token}` }
            });
            const plan = await res.json();
            adminState._editingPlanId   = plan.id;
            adminState._editingPlanData = typeof plan.plan_data === 'string' ? JSON.parse(plan.plan_data) : plan.plan_data;
            adminState._editingPlanActive = plan.is_active !== false;
            document.getElementById('plan-name-input').value = plan.name;
            document.getElementById('plan-patient-select').value = plan.patient_id || '';
            updateBuilderClinicalBanner(plan.patient_id);
        } catch {
            alert('Erro ao carregar cardápio.');
            return;
        }
    } else {
        adminState._editingPlanId     = null;
        adminState._editingPlanData   = getEmptyPlanData();
        adminState._editingPlanActive = true;
        document.getElementById('plan-name-input').value = '';
        document.getElementById('plan-patient-select').value = '';
        updateBuilderClinicalBanner(null);
    }

    if (!adminState._editingPlanData?.days || adminState._editingPlanData.days.length < 7) {
        adminState._editingPlanData = getEmptyPlanData();
    }

    const togBtn = document.getElementById('btn-toggle-active-plan');
    if (togBtn) {
        togBtn.textContent = adminState._editingPlanActive ? 'Desativar' : 'Ativar';
        togBtn.className = adminState._editingPlanActive ? 'btn-secondary btn-sm' : 'btn-danger btn-sm';
    }

    document.querySelectorAll('.plan-day-tab').forEach(t => t.classList.remove('active'));
    const seg = document.querySelector('.plan-day-tab[data-dow="1"]');
    if (seg) seg.classList.add('active');
    renderPlanDayEditor(1);
    await populatePlanPatientSelect();
    if (planId) {
        try {
            const r2 = await fetch(`${API_URL}/professional/weekly-plans/${planId}`, { headers: { 'Authorization': `Bearer ${adminState.token}` } });
            const p2 = await r2.json();
            document.getElementById('plan-patient-select').value = p2.patient_id || '';
            updateBuilderClinicalBanner(p2.patient_id);
        } catch {}
    } else if (adminState._newPlanPatientId) {
        // Pré-seleciona o paciente quando o cardápio é criado a partir da aba do paciente
        const patientSelect = document.getElementById('plan-patient-select');
        if (patientSelect) patientSelect.value = adminState._newPlanPatientId;
        updateBuilderClinicalBanner(adminState._newPlanPatientId);
        adminState._newPlanPatientId = null;
    }
    if (window.lucide) window.lucide.createIcons();
}

// ==========================================
// RENDERIZAÇÃO DO DIA
// ==========================================

export function renderPlanDayEditor(dow) {
    const container = document.getElementById('plan-day-content');
    if (!container || !adminState._editingPlanData) return;
    const dayData = adminState._editingPlanData.days.find(d => d.dow === dow);
    if (!dayData) return;

    const totals = calcDayTotals(dayData);

    container.innerHTML = `
    <div class="wd-day-view">
        <div class="wd-day-header">
            <div class="wd-day-title">
                <h3>${DAY_FULL[dow]}</h3>
                <div class="wd-day-total-chips">
                    ${totals.protein > 0 ? `<span class="wd-chip ptn">• ${rnd(totals.protein)}g Ptn</span>` : ''}
                    ${totals.fat > 0     ? `<span class="wd-chip lip">• ${rnd(totals.fat)}g Lip</span>`     : ''}
                    ${totals.carbs > 0   ? `<span class="wd-chip cho">• ${rnd(totals.carbs)}g Carb</span>`  : ''}
                    ${totals.calories > 0 ? `<span class="wd-chip kcal">${Math.round(totals.calories)} Kcal</span>` : ''}
                </div>
            </div>
            <div class="wd-day-header-btns">
                <button class="btn-sm btn-secondary" id="btn-expand-all">expandir tudo</button>
            </div>
        </div>

        <div class="wd-meals-list">
            ${dayData.meals.map(meal => renderMealRow(dow, meal)).join('')}
        </div>

        <button class="wd-btn-nova-refeicao" data-dow="${dow}">+ nova refeição ou hábito</button>

        ${renderDayAnalysis(dow, dayData, totals)}
    </div>`;

    bindDayViewEvents(dow, dayData);

    // Re-expandir refeição se estava expandida antes do re-render
    if (_expandedMeal && _expandedMeal.dow === dow) {
        const detail = container.querySelector(`.wd-meal-detail[data-dow="${dow}"][data-meal-type="${_expandedMeal.type}"]`);
        const btn    = container.querySelector(`.btn-ver-alimentos[data-dow="${dow}"][data-meal-type="${_expandedMeal.type}"]`);
        if (detail) {
            detail.classList.remove('wd-hidden');
            renderMealDetail(dow, _expandedMeal.type, detail);
            if (btn) { btn.classList.add('open'); btn.textContent = '▲ fechar'; }
        }
    }

    if (window.lucide) window.lucide.createIcons();
}

function renderMealRow(dow, meal) {
    const tot = meal.total || {};
    const isOpen = _expandedMeal && _expandedMeal.dow === dow && _expandedMeal.type === meal.type;
    return `
    <div class="wd-meal-row" data-dow="${dow}" data-meal-type="${meal.type}">
        <div class="wd-meal-row-bar">
            <span class="wd-meal-time">${meal.time}</span>
            <span class="wd-meal-label">${meal.label}</span>
            <div class="wd-meal-macro-chips">
                <span class="wd-chip ptn" title="Proteínas">• ${rnd(tot.protein || 0)}g</span>
                <span class="wd-chip lip" title="Lipídios">• ${rnd(tot.fat || 0)}g</span>
                <span class="wd-chip cho" title="Carboidratos">• ${rnd(tot.carbs || 0)}g</span>
                <span class="wd-chip kcal">${Math.round(tot.calories || 0)} Kcal</span>
            </div>
            <div class="wd-meal-row-actions">
                <button class="btn-ver-alimentos${isOpen ? ' open' : ''}" data-dow="${dow}" data-meal-type="${meal.type}">
                    ${isOpen ? '▲ fechar' : '▼ ver alimentos'}
                </button>
                <button class="wd-icon-btn danger btn-clear-meal" title="Limpar refeição" data-dow="${dow}" data-meal-type="${meal.type}">
                    <i data-lucide="trash-2" style="width:13px;height:13px;"></i>
                </button>
            </div>
        </div>
        <div class="wd-meal-detail${isOpen ? '' : ' wd-hidden'}" data-dow="${dow}" data-meal-type="${meal.type}">
            <!-- preenchido por renderMealDetail() -->
        </div>
    </div>`;
}

function renderMealDetail(dow, mealType, container) {
    const dayIdx  = adminState._editingPlanData.days.findIndex(d => d.dow === dow);
    if (dayIdx === -1) return;
    const mealIdx = adminState._editingPlanData.days[dayIdx].meals.findIndex(m => m.type === mealType);
    if (mealIdx === -1) return;
    const meal    = adminState._editingPlanData.days[dayIdx].meals[mealIdx];

    container.innerHTML = `
    <div class="wd-meal-detail-inner">
        <div class="wd-add-food-bar">
            <button class="btn-primary wd-btn-add-alimento" data-dow="${dow}" data-meal-type="${mealType}">+ adicionar alimento</button>
        </div>

        <div class="wd-section">
            <div class="wd-section-hdr">
                <span>Alimentos prescritos</span>
                <button class="wd-section-toggle">▲</button>
            </div>
            <div class="wd-section-body">
                ${renderFoodsTable(dow, meal)}
            </div>
        </div>

        <div class="wd-section">
            <div class="wd-section-hdr">
                <span>Análise de nutrientes</span>
                <button class="wd-section-toggle">▲</button>
            </div>
            <div class="wd-section-body">
                ${renderMealAnalysis(meal)}
            </div>
        </div>

        <div class="wd-section">
            <div class="wd-section-hdr">
                <span>Observações da refeição</span>
                <button class="wd-section-toggle">▲</button>
            </div>
            <div class="wd-section-body">
                <p class="wd-obs-info">Campo livre para orientações de preparo, dicas e observações que aparecem no aplicativo e no PDF do paciente.</p>
                <textarea class="plan-meal-instructions wd-obs-textarea" data-dow="${dow}" data-meal-type="${mealType}" placeholder="Orientações de preparo, dicas, observações...">${meal.instructions || ''}</textarea>
            </div>
        </div>
    </div>`;

    bindMealDetailEvents(dow, mealType, dayIdx, mealIdx, container);
    if (window.lucide) window.lucide.createIcons();
}

function renderFoodsTable(dow, meal) {
    if (!meal.items || meal.items.length === 0) {
        return `<p class="wd-empty-msg">Nenhum alimento prescrito. Clique em "+ adicionar alimento" acima.</p>`;
    }
    const tot = meal.total || {};
    return `
    <div class="wd-table-wrap">
        <table class="wd-foods-table">
            <thead>
                <tr>
                    <th>Nome do alimento</th>
                    <th>Medida caseira</th>
                    <th style="text-align:center;">Qtd</th>
                    <th class="ptn-col">Proteínas</th>
                    <th class="lip-col">Lipídios</th>
                    <th class="cho-col">Carboidratos</th>
                    <th class="kcal-col">Calorias</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${meal.items.map((item, idx) => renderFoodRow(dow, meal.type, item, idx)).join('')}
            </tbody>
            <tfoot>
                <tr class="wd-foods-tfoot">
                    <td colspan="3" style="text-align:right;font-weight:700;font-size:12px;">Total:</td>
                    <td class="ptn-col"><strong>${rnd(tot.protein || 0)}g</strong></td>
                    <td class="lip-col"><strong>${rnd(tot.fat || 0)}g</strong></td>
                    <td class="cho-col"><strong>${rnd(tot.carbs || 0)}g</strong></td>
                    <td class="kcal-col"><strong>${Math.round(tot.calories || 0)} Kcal</strong></td>
                    <td></td>
                </tr>
            </tfoot>
        </table>
    </div>`;
}

function renderFoodRow(dow, mealType, item, idx) {
    const hasMeasures = item.per100 && item.available_measures && item.available_measures.length > 0;

    const medidaCell = hasMeasures
        ? `<select class="wd-medida-select" data-dow="${dow}" data-meal-type="${mealType}" data-idx="${idx}">
               ${item.available_measures.map(m =>
                   `<option value="${m.grams}" data-label="${m.label}" ${m.grams === item.medida_grams && m.label === item.medida_label ? 'selected' : ''}>${m.label}</option>`
               ).join('')}
           </select>`
        : `<span class="wd-medida-static">${item.medida_label || '—'}</span>`;

    const qtyCell = hasMeasures
        ? `<input type="number" class="wd-qty-input" value="${rnd(item.quantidade || 1, 2)}" min="0.25" step="0.25" data-dow="${dow}" data-meal-type="${mealType}" data-idx="${idx}">`
        : `<span style="font-size:12px;color:var(--color-text-muted);">${item.quantidade || 1}</span>`;

    return `
    <tr class="wd-food-row" data-idx="${idx}">
        <td class="wd-food-name-cell">${item.name}</td>
        <td class="wd-food-medida-cell">${medidaCell}</td>
        <td class="wd-food-qty-cell" style="text-align:center;">${qtyCell}</td>
        <td class="ptn-col wd-food-ptn">${rnd(item.protein || 0)}g</td>
        <td class="lip-col wd-food-lip">${rnd(item.fat || 0)}g</td>
        <td class="cho-col wd-food-cho">${rnd(item.carbs || 0)}g</td>
        <td class="kcal-col wd-food-kcal">${Math.round(item.calories || 0)} Kcal</td>
        <td class="wd-food-actions-cell">
            <button class="wd-icon-btn danger btn-remove-wd-food" data-dow="${dow}" data-meal-type="${mealType}" data-idx="${idx}" title="Remover">
                <i data-lucide="trash-2" style="width:12px;height:12px;"></i>
            </button>
        </td>
    </tr>`;
}

function renderMealAnalysis(meal) {
    const t = meal.total || {};
    const ptn = t.protein || 0, lip = t.fat || 0, cho = t.carbs || 0;
    const kcal = t.calories || 0, fiber = t.fiber || 0, grams = t.grams || 0;
    const density = grams > 0 ? kcal / grams : 0;
    const ptn_k = ptn * 4, lip_k = lip * 9, cho_k = cho * 4;
    const total_k = ptn_k + lip_k + cho_k || 1;
    const pPct = (ptn_k / total_k * 100).toFixed(1);
    const lPct = (lip_k / total_k * 100).toFixed(1);
    const cPct = (cho_k / total_k * 100).toFixed(1);

    return `
    <div class="wd-analysis-grid">
        <div class="wd-analysis-macros">
            <h5 class="wd-analysis-h5">Macronutrientes da refeição</h5>
            <div class="wd-macro-list">
                <div class="wd-macro-row"><span class="wd-macro-dot ptn"></span><span class="wd-macro-lbl">Proteínas</span><span class="wd-macro-val">${rnd(ptn)}g</span></div>
                <div class="wd-macro-row"><span class="wd-macro-dot lip"></span><span class="wd-macro-lbl">Lipídios</span><span class="wd-macro-val">${rnd(lip)}g</span></div>
                <div class="wd-macro-row"><span class="wd-macro-dot cho"></span><span class="wd-macro-lbl">Carboidratos</span><span class="wd-macro-val">${rnd(cho)}g</span></div>
                <div class="wd-macro-row"><span class="wd-macro-dot kcal"></span><span class="wd-macro-lbl">Calorias</span><span class="wd-macro-val">${Math.round(kcal)} Kcal</span></div>
                <div class="wd-macro-row"><span class="wd-macro-dot gray"></span><span class="wd-macro-lbl">Peso total</span><span class="wd-macro-val">${Math.round(grams)}g</span></div>
            </div>
        </div>
        <div class="wd-analysis-density">${renderCaloricDensityBar(density)}</div>
        <div class="wd-analysis-chart">
            <h5 class="wd-analysis-h5">Distribuição calórica (% do VET)</h5>
            <div class="wd-chart-wrap">
                <div class="wd-donut-wrap">${svgDonut(ptn, lip, cho)}</div>
                <div class="wd-chart-legend">
                    <div class="wd-legend-row"><span class="wd-macro-dot ptn"></span>Proteínas - ${rnd(ptn)}g (${pPct}%)</div>
                    <div class="wd-legend-row"><span class="wd-macro-dot lip"></span>Lipídios - ${rnd(lip)}g (${lPct}%)</div>
                    <div class="wd-legend-row"><span class="wd-macro-dot cho"></span>Carbo - ${rnd(cho)}g (${cPct}%)</div>
                </div>
            </div>
        </div>
    </div>`;
}

function renderDayAnalysis(dow, dayData, totals) {
    const ptn  = totals.protein || 0, lip = totals.fat || 0, cho = totals.carbs || 0;
    const kcal = totals.calories || 0, fiber = totals.fiber || 0, grams = totals.grams || 0;
    const cho_livres  = Math.max(0, cho - fiber);
    const density     = grams > 0 ? kcal / grams : 0;
    const kcal_np_gN  = ptn > 0  ? (kcal - ptn * 4) / (ptn / 6.25) : 0;

    const patientId = document.getElementById('plan-patient-select')?.value;
    const patient   = (adminState.allPatients || []).find(p => String(p.id) === String(patientId));
    const tc = patient?.target_calories || 0, tp = patient?.target_protein || 0;
    const tf = patient?.target_fat || 0, tcho = patient?.target_carbs || 0;

    const ptn_k = ptn * 4, lip_k = lip * 9, cho_k = cho * 4;
    const total_k = ptn_k + lip_k + cho_k || 1;

    const diffRow = (val, target, unit='g') => {
        if (!target) return '<td>—</td><td>—</td>';
        const diff = val - target;
        const cls  = diff > 0 ? 'wd-diff-pos' : diff < 0 ? 'wd-diff-neg' : '';
        return `<td>${target}${unit}</td><td class="${cls}">${diff > 0 ? '+' : ''}${rnd(diff)}${unit}</td>`;
    };

    return `
    <div class="wd-day-analysis" id="wd-day-analysis-${dow}">
        <div class="wd-day-analysis-hdr">
            <h3>Análise de nutrientes do cardápio</h3>
            <button class="btn-sm btn-secondary" id="btn-ver-todos-nutrientes">ver todos os nutrientes</button>
        </div>
        <div class="wd-day-analysis-body">
            <div class="wd-day-analysis-table-wrap">
                <table class="wd-day-analysis-table">
                    <thead><tr><th>Parâmetro</th><th>Prescrito</th><th>Teórico</th><th>Diferença</th></tr></thead>
                    <tbody>
                        <tr><td>Proteínas totais</td><td class="ptn-col">${rnd(ptn)}g</td>${diffRow(ptn, tp)}</tr>
                        <tr><td>Lipídios totais</td><td class="lip-col">${rnd(lip)}g</td>${diffRow(lip, tf)}</tr>
                        <tr><td>Carboidratos totais</td><td class="cho-col">${rnd(cho)}g</td>${diffRow(cho, tcho)}</tr>
                        <tr><td>Fibras totais</td><td>${rnd(fiber)}g</td><td>—</td><td>—</td></tr>
                        <tr><td>Carboidratos livres</td><td>${rnd(cho_livres)}g</td><td>—</td><td>—</td></tr>
                        <tr><td>Calorias totais</td><td class="kcal-col">${Math.round(kcal)} Kcal</td>${diffRow(kcal, tc, ' Kcal')}</tr>
                        <tr><td>Kcal não proteica / gN</td><td>${ptn > 0 ? rnd(kcal_np_gN) : '—'}</td><td>—</td><td>—</td></tr>
                        <tr><td>Densidade calórica</td><td>${density > 0 ? density.toFixed(2)+' Kcal/g' : '—'}</td><td>—</td><td>—</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="wd-day-analysis-chart">
                ${kcal > 0 ? `
                ${svgDonut(ptn, lip, cho, 100)}
                <div class="wd-chart-legend" style="margin-top:12px;">
                    <div class="wd-legend-row"><span class="wd-macro-dot ptn"></span>Proteínas ${(ptn_k/total_k*100).toFixed(1)}% · ${Math.round(ptn_k)} Kcal</div>
                    <div class="wd-legend-row"><span class="wd-macro-dot lip"></span>Lipídios ${(lip_k/total_k*100).toFixed(1)}%</div>
                    <div class="wd-legend-row"><span class="wd-macro-dot cho"></span>Carboidratos ${(cho_k/total_k*100).toFixed(1)}%</div>
                </div>` : '<p style="color:var(--color-text-muted);font-size:13px;">Adicione alimentos para ver a análise.</p>'}
            </div>
        </div>
    </div>`;
}

// ==========================================
// BIND DE EVENTOS
// ==========================================

function bindDayViewEvents(dow, dayData) {
    const container = document.getElementById('plan-day-content');
    if (!container) return;

    // Expandir / fechar refeição
    container.querySelectorAll('.btn-ver-alimentos').forEach(btn => {
        btn.addEventListener('click', () => {
            const d = parseInt(btn.dataset.dow);
            const t = btn.dataset.mealType;
            const detail = container.querySelector(`.wd-meal-detail[data-dow="${d}"][data-meal-type="${t}"]`);
            if (!detail) return;

            const isOpen = !detail.classList.contains('wd-hidden');
            if (isOpen) {
                detail.classList.add('wd-hidden');
                btn.classList.remove('open');
                btn.textContent = '▼ ver alimentos';
                _expandedMeal = null;
            } else {
                // Fechar o anterior
                container.querySelectorAll('.wd-meal-detail:not(.wd-hidden)').forEach(el => el.classList.add('wd-hidden'));
                container.querySelectorAll('.btn-ver-alimentos.open').forEach(b => { b.classList.remove('open'); b.textContent = '▼ ver alimentos'; });
                detail.classList.remove('wd-hidden');
                btn.classList.add('open');
                btn.textContent = '▲ fechar';
                _expandedMeal = { dow: d, type: t };
                renderMealDetail(d, t, detail);
            }
        });
    });

    // Limpar refeição
    container.querySelectorAll('.btn-clear-meal').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!confirm('Limpar todos os alimentos desta refeição?')) return;
            const d = parseInt(btn.dataset.dow), t = btn.dataset.mealType;
            const dayIdx  = adminState._editingPlanData.days.findIndex(x => x.dow === d);
            const mealIdx = adminState._editingPlanData.days[dayIdx]?.meals.findIndex(m => m.type === t);
            if (dayIdx === -1 || mealIdx === -1) return;
            adminState._editingPlanData.days[dayIdx].meals[mealIdx].items = [];
            recalcMealTotal(dayIdx, mealIdx);
            if (_expandedMeal?.dow === d && _expandedMeal?.type === t) _expandedMeal = null;
            renderPlanDayEditor(d);
        });
    });

    // Expandir tudo
    container.querySelector('#btn-expand-all')?.addEventListener('click', () => {
        container.querySelectorAll('.wd-meal-detail').forEach((detail, i) => {
            detail.classList.remove('wd-hidden');
            const dow_  = parseInt(detail.dataset.dow);
            const type_ = detail.dataset.mealType;
            renderMealDetail(dow_, type_, detail);
        });
        container.querySelectorAll('.btn-ver-alimentos').forEach(b => { b.classList.add('open'); b.textContent = '▲ fechar'; });
        _expandedMeal = null; // null = qualquer, não rastreamos quando todos estão abertos
    });

    // Nova refeição
    container.querySelector('.wd-btn-nova-refeicao')?.addEventListener('click', () => {
        const label = prompt('Nome da nova refeição (ex: Pré-treino):');
        if (!label?.trim()) return;
        const time  = prompt('Horário (ex: 17:00):', '17:00') || '17:00';
        const dayIdx = adminState._editingPlanData.days.findIndex(d => d.dow === dow);
        if (dayIdx === -1) return;
        const type = 'custom_' + Date.now();
        adminState._editingPlanData.days[dayIdx].meals.push({
            type, label: label.trim(), time,
            items: [], instructions: '',
            total: { calories:0, protein:0, carbs:0, fat:0, fiber:0, grams:0 }
        });
        renderPlanDayEditor(dow);
    });

    // Ver todos os nutrientes
    container.querySelector('#btn-ver-todos-nutrientes')?.addEventListener('click', openMicroModal);
}

function bindMealDetailEvents(dow, mealType, dayIdx, mealIdx, container) {
    // Adicionar alimento
    container.querySelector('.wd-btn-add-alimento')?.addEventListener('click', () => {
        openFoodSearchModal(dow, mealType);
    });

    // Remover alimento
    container.querySelectorAll('.btn-remove-wd-food').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx);
            adminState._editingPlanData.days[dayIdx].meals[mealIdx].items.splice(idx, 1);
            recalcMealTotal(dayIdx, mealIdx);
            renderPlanDayEditor(dow);
        });
    });

    // Medida caseira mudou
    container.querySelectorAll('.wd-medida-select').forEach(sel => {
        sel.addEventListener('change', () => {
            const idx         = parseInt(sel.dataset.idx);
            const medidaGrams = parseFloat(sel.value) || 1;
            const selectedOpt = sel.options[sel.selectedIndex];
            const medidaLabel = selectedOpt?.dataset.label || selectedOpt?.text || 'grama(s)';
            const qtyInput    = container.querySelector(`.wd-qty-input[data-idx="${idx}"]`);
            const quantidade  = parseFloat(qtyInput?.value || 1);
            if (recalcItemFromMeasure(dayIdx, mealIdx, idx, medidaGrams, medidaLabel, quantidade)) {
                recalcMealTotal(dayIdx, mealIdx);
                refreshFoodRowCells(container, dayIdx, mealIdx, idx);
            }
        });
    });

    // Quantidade mudou
    container.querySelectorAll('.wd-qty-input').forEach(inp => {
        inp.addEventListener('change', () => {
            const idx         = parseInt(inp.dataset.idx);
            const sel         = container.querySelector(`.wd-medida-select[data-idx="${idx}"]`);
            const medidaGrams = parseFloat(sel?.value || 1);
            const selectedOpt = sel?.options[sel.selectedIndex];
            const medidaLabel = selectedOpt?.dataset.label || selectedOpt?.text || 'grama(s)';
            const quantidade  = parseFloat(inp.value || 1);
            if (recalcItemFromMeasure(dayIdx, mealIdx, idx, medidaGrams, medidaLabel, quantidade)) {
                recalcMealTotal(dayIdx, mealIdx);
                refreshFoodRowCells(container, dayIdx, mealIdx, idx);
            }
        });
    });

    // Instruções
    container.querySelector('.plan-meal-instructions')?.addEventListener('change', e => {
        adminState._editingPlanData.days[dayIdx].meals[mealIdx].instructions = e.target.value;
    });

    // Sections toggle
    container.querySelectorAll('.wd-section-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const body = btn.closest('.wd-section')?.querySelector('.wd-section-body');
            if (!body) return;
            const collapsed = body.style.display === 'none';
            body.style.display = collapsed ? '' : 'none';
            btn.textContent = collapsed ? '▲' : '▼';
        });
    });

    if (window.lucide) window.lucide.createIcons();
}

function refreshFoodRowCells(container, dayIdx, mealIdx, itemIdx) {
    const meal = adminState._editingPlanData.days[dayIdx].meals[mealIdx];
    const item = meal.items[itemIdx];
    const row  = container.querySelector(`.wd-food-row[data-idx="${itemIdx}"]`);
    if (row) {
        row.querySelector('.wd-food-ptn').textContent = rnd(item.protein || 0) + 'g';
        row.querySelector('.wd-food-lip').textContent = rnd(item.fat    || 0) + 'g';
        row.querySelector('.wd-food-cho').textContent = rnd(item.carbs  || 0) + 'g';
        row.querySelector('.wd-food-kcal').textContent = Math.round(item.calories || 0) + ' Kcal';
    }
    // Atualiza tfoot
    const tfoot = container.querySelector('.wd-foods-tfoot');
    if (tfoot) {
        const cells = tfoot.querySelectorAll('td');
        if (cells[3]) cells[3].innerHTML = `<strong>${rnd(meal.total.protein||0)}g</strong>`;
        if (cells[4]) cells[4].innerHTML = `<strong>${rnd(meal.total.fat||0)}g</strong>`;
        if (cells[5]) cells[5].innerHTML = `<strong>${rnd(meal.total.carbs||0)}g</strong>`;
        if (cells[6]) cells[6].innerHTML = `<strong>${Math.round(meal.total.calories||0)} Kcal</strong>`;
    }
    // Atualiza chips da linha de refeição
    const dow = parseInt(container.closest('.wd-meal-detail')?.dataset.dow ?? _expandedMeal?.dow ?? 1);
    const mealType = container.closest('.wd-meal-detail')?.dataset.mealType ?? _expandedMeal?.type;
    const bar = document.querySelector(`.wd-meal-row[data-dow="${dow}"][data-meal-type="${mealType}"] .wd-meal-macro-chips`);
    if (bar) {
        bar.querySelector('.wd-chip.ptn').textContent = `• ${rnd(meal.total.protein||0)}g`;
        bar.querySelector('.wd-chip.lip').textContent = `• ${rnd(meal.total.fat||0)}g`;
        bar.querySelector('.wd-chip.cho').textContent = `• ${rnd(meal.total.carbs||0)}g`;
        bar.querySelector('.wd-chip.kcal').textContent = `${Math.round(meal.total.calories||0)} Kcal`;
    }
    // Atualiza análise da refeição
    const analysisGrid = container.querySelector('.wd-analysis-grid');
    if (analysisGrid) {
        const tmp = document.createElement('div');
        tmp.innerHTML = renderMealAnalysis(meal);
        analysisGrid.replaceWith(tmp.firstElementChild);
    }
    // Atualiza análise do dia
    const dayData = adminState._editingPlanData.days[dayIdx];
    const totals  = calcDayTotals(dayData);
    const dayAnalysis = document.getElementById(`wd-day-analysis-${dow}`);
    if (dayAnalysis) {
        const tmp = document.createElement('div');
        tmp.innerHTML = renderDayAnalysis(dow, dayData, totals);
        const newEl = tmp.firstElementChild;
        dayAnalysis.replaceWith(newEl);
        newEl.querySelector('#btn-ver-todos-nutrientes')?.addEventListener('click', openMicroModal);
    }
    // Atualiza totais no cabeçalho do dia
    const dayChips = document.querySelector('.wd-day-total-chips');
    if (dayChips) {
        dayChips.innerHTML = `
            ${totals.protein > 0 ? `<span class="wd-chip ptn">• ${rnd(totals.protein)}g Ptn</span>` : ''}
            ${totals.fat > 0     ? `<span class="wd-chip lip">• ${rnd(totals.fat)}g Lip</span>`     : ''}
            ${totals.carbs > 0   ? `<span class="wd-chip cho">• ${rnd(totals.carbs)}g Carb</span>`  : ''}
            ${totals.calories > 0 ? `<span class="wd-chip kcal">${Math.round(totals.calories)} Kcal</span>` : ''}`;
    }
}

// ==========================================
// CRUD DE ALIMENTOS
// ==========================================

function addItemToPlan(dow, mealType, item) {
    const dayIdx  = adminState._editingPlanData.days.findIndex(d => d.dow === dow);
    if (dayIdx === -1) return;
    const mealIdx = adminState._editingPlanData.days[dayIdx].meals.findIndex(m => m.type === mealType);
    if (mealIdx === -1) return;
    adminState._editingPlanData.days[dayIdx].meals[mealIdx].items.push(item);
    recalcMealTotal(dayIdx, mealIdx);
    _expandedMeal = { dow, type: mealType };
    renderPlanDayEditor(dow);
}

// ==========================================
// MODAL DE BUSCA DE ALIMENTOS
// ==========================================

function openFoodSearchModal(dow, mealType) {
    _foodSearchTarget = { dow, mealType };
    const mt = MEAL_TYPES.find(m => m.type === mealType);
    const lbl = document.getElementById('fsm-meal-label');
    if (lbl) lbl.textContent = mt ? `— ${mt.label}` : '';

    const modal = document.getElementById('food-search-modal');
    if (modal) { modal.style.display = 'flex'; }

    document.getElementById('fsm-search-input')?.focus();
}

function closeFoodSearchModal() {
    const modal = document.getElementById('food-search-modal');
    if (modal) modal.style.display = 'none';
    _currentFoodResults = [];
    const results = document.getElementById('fsm-results');
    if (results) results.innerHTML = '';
    document.getElementById('fsm-results-header').style.display = 'none';
}

async function runFoodSearch() {
    const input      = document.getElementById('fsm-search-input');
    const resultsDiv = document.getElementById('fsm-results');
    const hdrDiv     = document.getElementById('fsm-results-header');
    if (!input || !resultsDiv) return;
    const q = input.value.trim();
    if (!q) return;

    resultsDiv.innerHTML = '<p style="padding:20px;text-align:center;color:var(--color-text-muted);">Buscando...</p>';
    hdrDiv.style.display = 'none';

    try {
        const res  = await fetch(`${API_URL}/admin/food-db?q=${encodeURIComponent(q)}&limit=20`, {
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro na busca');
        _currentFoodResults = data.items || [];

        if (!_currentFoodResults.length) {
            resultsDiv.innerHTML = '<p style="padding:20px;text-align:center;color:var(--color-text-muted);">Nenhum alimento encontrado. Tente a aba "Alimento Manual".</p>';
            return;
        }

        hdrDiv.style.display = 'grid';
        resultsDiv.innerHTML = _currentFoodResults.map((food, idx) => {
            const measures  = food.measures || [];
            const defM      = measures[0] || { label: 'grama(s)', grams: 1 };
            const measOpts  = measures.length
                ? measures.slice(0, 10).map(m => `<option value="${m.grams}" data-label="${m.label}">${m.label} (${m.grams}g)</option>`).join('')
                : '<option value="1" data-label="grama(s)">grama(s) (1g)</option>';

            return `
            <div class="fsm-result-row">
                <div class="fsm-food-name-col">
                    <strong>${food.name}</strong>
                    <small class="fsm-food-cat">${food.category} · ${food.source}</small>
                    <small class="fsm-per100">${Math.round(food.energy_kcal||0)} kcal · P:${rnd(food.protein_g||0)} · L:${rnd(food.fat_g||0)} · C:${rnd(food.carbs_g||0)} /100g</small>
                </div>
                <div class="fsm-medida-col">
                    <select class="fsm-med-sel" data-fidx="${idx}">${measOpts}</select>
                </div>
                <div class="fsm-qty-col">
                    <input type="number" class="fsm-qty-inp" value="1" min="0.25" step="0.25" data-fidx="${idx}">
                    <small class="fsm-total-g" data-fidx="${idx}">${defM.grams}g</small>
                </div>
                <div class="fsm-ptn-col">${rnd(food.protein_g||0)}g</div>
                <div class="fsm-lip-col">${rnd(food.fat_g||0)}g</div>
                <div class="fsm-cho-col">${rnd(food.carbs_g||0)}g</div>
                <div class="fsm-kcal-col">${Math.round(food.energy_kcal||0)}</div>
                <div class="fsm-add-col">
                    <button class="btn-sm btn-primary fsm-add-btn" data-fidx="${idx}">Adicionar</button>
                </div>
            </div>`;
        }).join('');

        // Atualiza display de gramas ao mudar medida ou qty
        resultsDiv.querySelectorAll('.fsm-med-sel').forEach(sel => {
            sel.addEventListener('change', () => updateGramsDisplay(sel.dataset.fidx, resultsDiv));
        });
        resultsDiv.querySelectorAll('.fsm-qty-inp').forEach(inp => {
            inp.addEventListener('input', () => updateGramsDisplay(inp.dataset.fidx, resultsDiv));
        });

        resultsDiv.querySelectorAll('.fsm-add-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx   = parseInt(btn.dataset.fidx);
                const food  = _currentFoodResults[idx];
                const sel   = resultsDiv.querySelector(`.fsm-med-sel[data-fidx="${idx}"]`);
                const inp   = resultsDiv.querySelector(`.fsm-qty-inp[data-fidx="${idx}"]`);
                const opt   = sel?.options[sel.selectedIndex];
                const medGr = parseFloat(sel?.value || 1);
                const medLb = opt?.dataset.label || opt?.text || 'grama(s)';
                const qty   = parseFloat(inp?.value || 1);
                const grams = medGr * qty;
                const f     = grams / 100;

                const per100 = {
                    calories: parseFloat(food.energy_kcal) || 0,
                    protein:  parseFloat(food.protein_g)   || 0,
                    carbs:    parseFloat(food.carbs_g)     || 0,
                    fat:      parseFloat(food.fat_g)       || 0,
                    fiber:    parseFloat(food.fiber_g)     || 0,
                };
                MICRO_KEYS.forEach(k => { per100[k] = parseFloat(food[k]) || 0; });

                const item = {
                    alimento_id:       food.id,
                    name:              food.name,
                    medida_label:      medLb,
                    medida_grams:      medGr,
                    quantidade:        qty,
                    grams:             grams,
                    available_measures: food.measures || [],
                    per100,
                    ...calcItemMacrosAndMicros(per100, grams),
                };

                addItemToPlan(_foodSearchTarget.dow, _foodSearchTarget.mealType, item);

                btn.textContent = '✓ Adicionado';
                btn.disabled = true;
                btn.style.background = '#22c55e';
                setTimeout(() => { btn.textContent = 'Adicionar'; btn.disabled = false; btn.style.background = ''; }, 2000);
            });
        });

    } catch (err) {
        resultsDiv.innerHTML = `<p style="padding:16px;color:var(--color-danger);">${err.message}</p>`;
    }
}

function updateGramsDisplay(fidx, container) {
    const sel = container.querySelector(`.fsm-med-sel[data-fidx="${fidx}"]`);
    const inp = container.querySelector(`.fsm-qty-inp[data-fidx="${fidx}"]`);
    const lbl = container.querySelector(`.fsm-total-g[data-fidx="${fidx}"]`);
    if (!lbl) return;
    const g = parseFloat(sel?.value || 1) * parseFloat(inp?.value || 1);
    lbl.textContent = `${g.toFixed(1)}g`;
}

function initFoodSearchModalEvents() {
    document.getElementById('btn-close-food-modal')?.addEventListener('click', closeFoodSearchModal);
    document.getElementById('food-search-modal')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeFoodSearchModal();
    });

    const searchInput = document.getElementById('fsm-search-input');
    document.getElementById('btn-fsm-search')?.addEventListener('click', runFoodSearch);
    searchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') runFoodSearch(); });

    // Abas do modal
    document.querySelectorAll('.fsm-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.fsm-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.fsm-panel').forEach(p => p.style.display = 'none');
            const panel = document.getElementById(`fsm-panel-${tab.dataset.fstab}`);
            if (panel) panel.style.display = '';
        });
    });

    // Adicionar alimento manual
    document.getElementById('btn-fsm-add-manual')?.addEventListener('click', async () => {
        const name  = document.getElementById('fsm-man-name')?.value.trim();
        const kcal  = parseFloat(document.getElementById('fsm-man-kcal')?.value) || 0;
        const ptn   = parseFloat(document.getElementById('fsm-man-ptn')?.value)  || 0;
        const lip   = parseFloat(document.getElementById('fsm-man-lip')?.value)  || 0;
        const cho   = parseFloat(document.getElementById('fsm-man-cho')?.value)  || 0;
        const grams = parseFloat(document.getElementById('fsm-man-qty')?.value)  || 100;
        const doSave = document.getElementById('fsm-man-save')?.checked;

        if (!name) { alert('Informe o nome do alimento.'); return; }

        const per100  = { calories: kcal, protein: ptn, fat: lip, carbs: cho, fiber: 0 };
        MICRO_KEYS.forEach(k => { per100[k] = 0; });
        const item = {
            alimento_id: null, name,
            medida_label: 'grama(s)', medida_grams: 1,
            quantidade: grams, grams,
            available_measures: [{ label: 'grama(s)', grams: 1 }],
            per100,
            ...calcItemMacrosAndMicros(per100, grams),
        };
        addItemToPlan(_foodSearchTarget.dow, _foodSearchTarget.mealType, item);

        if (doSave) {
            try {
                await fetch(`${API_URL}/admin/food-db`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminState.token}` },
                    body: JSON.stringify({ name, energy_kcal: kcal, protein_g: ptn, fat_g: lip, carbs_g: cho })
                });
            } catch {}
        }

        // Limpar form
        ['fsm-man-name','fsm-man-kcal','fsm-man-ptn','fsm-man-lip','fsm-man-cho'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const qtyEl = document.getElementById('fsm-man-qty');
        if (qtyEl) qtyEl.value = '100';
    });
}

// ==========================================
// MODAL DE MICRONUTRIENTES
// ==========================================

function openMicroModal() {
    const dow     = parseInt(document.querySelector('.plan-day-tab.active')?.dataset.dow ?? '1');
    const dayData = adminState._editingPlanData?.days?.find(d => d.dow === dow);
    if (!dayData) return;

    const summed = {};
    MICRO_KEYS.forEach(k => { summed[k] = 0; });
    let totalFiber = 0;
    dayData.meals.forEach(meal => {
        totalFiber += meal.total?.fiber || 0;
        MICRO_KEYS.forEach(k => { summed[k] += meal.total?.[k] || 0; });
    });
    summed._fiber = totalFiber;

    const patientId = document.getElementById('plan-patient-select')?.value;
    const patient   = (adminState.allPatients || []).find(p => String(p.id) === String(patientId));
    const dri       = getDRI(patient?.age, patient?.gender);

    const tbody = document.getElementById('micro-table-body');
    if (tbody) {
        tbody.innerHTML = MICRO_DEFS.map(def => {
            const val    = summed[def.key] || 0;
            const driVal = dri[def.dri] || 0;
            const pct    = driVal > 0 ? val / driVal * 100 : 0;
            const inRange = driVal > 0 && pct >= 80 && pct <= 120;
            const barW   = Math.min(pct, 200) / 2; // normaliza para 100px = 100%

            return `
            <tr>
                <td style="font-size:13px;">${def.label}</td>
                <td style="font-size:13px;font-weight:600;">${rnd(val, 1)} ${def.unit}</td>
                <td style="font-size:12px;color:var(--color-text-muted);">${driVal > 0 ? driVal + ' ' + def.unit : '—'}</td>
                <td>
                    <div class="micro-bar-wrap">
                        <div class="micro-bar-track">
                            <div class="micro-bar-fill ${inRange ? 'in-range' : 'out-range'}" style="width:${barW.toFixed(1)}%"></div>
                            <div class="micro-bar-center"></div>
                        </div>
                    </div>
                    <span class="micro-pct-val">${driVal > 0 ? pct.toFixed(0)+'%' : '—'}</span>
                </td>
            </tr>`;
        }).join('');
    }

    document.getElementById('micro-nutrient-modal').style.display = 'flex';
}

function initMicroModalEvents() {
    document.getElementById('btn-close-micro-modal')?.addEventListener('click', () => {
        document.getElementById('micro-nutrient-modal').style.display = 'none';
    });
    document.getElementById('micro-nutrient-modal')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
    });
}

// ==========================================
// SALVAR / EXCLUIR
// ==========================================

export async function saveMealPlan() {
    const name = document.getElementById('plan-name-input')?.value?.trim();
    if (!name) { alert('Dê um nome ao cardápio.'); return; }
    const patientId = document.getElementById('plan-patient-select')?.value || null;
    const payload   = {
        name,
        patient_id: patientId ? parseInt(patientId) : null,
        plan_data:  adminState._editingPlanData,
        is_active:  adminState._editingPlanActive !== false,
    };
    try {
        let res;
        if (adminState._editingPlanId) {
            res = await fetch(`${API_URL}/professional/weekly-plans/${adminState._editingPlanId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminState.token}` },
                body: JSON.stringify(payload),
            });
        } else {
            res = await fetch(`${API_URL}/professional/weekly-plans`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminState.token}` },
                body: JSON.stringify(payload),
            });
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');
        adminState._editingPlanId = data.id;
        alert('Cardápio salvo com sucesso!');
        await loadMealPlansData();
    } catch (err) {
        alert(err.message);
    }
}

export async function deleteMealPlan(id, name) {
    if (!confirm(`Excluir o cardápio "${name}"? Esta ação não pode ser desfeita.`)) return;
    try {
        const res = await fetch(`${API_URL}/professional/weekly-plans/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminState.token}` },
        });
        if (!res.ok) throw new Error();
        await loadMealPlansData();
    } catch {
        alert('Erro ao excluir cardápio.');
    }
}

// ==========================================
// GERADOR DE RECEITAS IA (mantido)
// ==========================================

export async function generateAIRecipe(spoonacularItem) {
    const modal      = document.getElementById('admin-recipe-generator-modal');
    const loadingDiv = document.getElementById('recipe-generator-loading');
    const contentDiv = document.getElementById('recipe-generator-content');
    const footerDiv  = document.getElementById('recipe-generator-footer');
    if (!modal) return;

    _currentGeneratedRecipe       = null;
    _currentGeneratedRecipeTarget = spoonacularItem;
    modal.style.display = 'flex';
    loadingDiv.style.display = 'flex';
    contentDiv.style.display = 'none';
    footerDiv.style.display  = 'none';

    try {
        const patientId = document.getElementById('plan-patient-select')?.value || null;
        let profile = null;
        if (patientId) {
            try {
                const cr = await fetch(`${API_URL}/professional/patients/${patientId}/clinical`, {
                    headers: { 'Authorization': `Bearer ${adminState.token}` }
                });
                if (cr.ok) {
                    const clinical = await cr.json();
                    profile = { goal: 'maintain', ...clinical };
                    const patObj = (adminState.allPatients || []).find(p => p.id == patientId);
                    if (patObj) Object.assign(profile, { goal: patObj.goal, weight: patObj.weight, height: patObj.height, targetCalories: patObj.target_calories, age: patObj.age, gender: patObj.gender });
                }
            } catch {}
        }
        const payload = {
            mealType: adminState._targetMealType || 'all',
            cal: Math.round(spoonacularItem.calories),
            protein: Math.round(spoonacularItem.protein_g),
            carbs: Math.round(spoonacularItem.carbohydrates_total_g),
            fat: Math.round(spoonacularItem.fat_total_g),
            recipeName: spoonacularItem.name,
            profile,
        };
        const res     = await fetch(`${API_URL}/ai/generate-recipe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminState.token}` },
            body: JSON.stringify(payload),
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || 'Erro ao gerar receita.');
        const recipe  = resData.recipe;
        _currentGeneratedRecipe = recipe;

        document.getElementById('recipe-gen-title').textContent    = recipe.name || spoonacularItem.name;
        document.getElementById('recipe-gen-meta').textContent     = `Tempo: ${recipe.time_min || 20} min`;
        document.getElementById('recipe-gen-calories').textContent = `${Math.round(recipe.calories || spoonacularItem.calories)} kcal`;
        document.getElementById('recipe-gen-protein').textContent  = `${Math.round(recipe.protein || spoonacularItem.protein_g)}g`;
        document.getElementById('recipe-gen-carbs').textContent    = `${Math.round(recipe.carbs || spoonacularItem.carbohydrates_total_g)}g`;
        document.getElementById('recipe-gen-fat').textContent      = `${Math.round(recipe.fat || spoonacularItem.fat_total_g)}g`;

        const ul = document.getElementById('recipe-gen-ingredients-list');
        ul.innerHTML = '';
        (recipe.ingredients || []).forEach(ing => {
            const li = document.createElement('li');
            li.textContent = `${ing.amount || ''} ${ing.unit || ''} de ${ing.name}`;
            ul.appendChild(li);
        });
        document.getElementById('recipe-gen-directions').textContent = recipe.directions || '';

        loadingDiv.style.display = 'none';
        contentDiv.style.display = 'flex';
        footerDiv.style.display  = 'flex';
        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        alert(`Erro: ${err.message}`);
        modal.style.display = 'none';
    }
}

// ==========================================
// BANNER CLÍNICO
// ==========================================

export async function updateBuilderClinicalBanner(patientId) {
    const banner = document.getElementById('builder-clinical-banner');
    const info   = document.getElementById('builder-clinical-info');
    if (!banner || !info) return;
    if (!patientId) { banner.classList.add('hidden'); return; }
    try {
        const res = await fetch(`${API_URL}/professional/patients/${patientId}/clinical`, {
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        if (!res.ok) throw new Error();
        const cl = await res.json();
        const parts = [];
        if (cl.comorbidities)        parts.push(`<strong>Comorbidades:</strong> ${cl.comorbidities}`);
        if (cl.intolerances)         parts.push(`<strong>Intolerâncias:</strong> ${cl.intolerances}`);
        if (cl.dietary_restrictions) parts.push(`<strong>Restrições:</strong> ${cl.dietary_restrictions}`);
        if (parts.length) { info.innerHTML = parts.join(' | '); banner.classList.remove('hidden'); }
        else banner.classList.add('hidden');
    } catch {
        banner.classList.add('hidden');
    }
}

// ==========================================
// INIT
// ==========================================

export function initProMeals() {
    // Lista de planos
    document.getElementById('btn-new-meal-plan')?.addEventListener('click', () => openMealPlanBuilder(null));
    document.getElementById('btn-back-to-plans')?.addEventListener('click', () => {
        const fromPatient = adminState._fromPatient;
        adminState._fromPatient = null;

        document.getElementById('meal-plans-builder-view').classList.add('hidden');
        document.getElementById('meal-plans-list-view').classList.remove('hidden');

        if (fromPatient) {
            // Volta para a view do paciente preservando os detalhes abertos
            adminState._preservePatientDetail = true;
            if (window.switchTab) window.switchTab('patients');
            setTimeout(() => {
                const mealPlanTabBtn = document.querySelector('.patient-tab-btn[data-patient-tab="meal-plan"]');
                if (mealPlanTabBtn) mealPlanTabBtn.click();
            }, 150);
        }
    });
    document.getElementById('btn-save-meal-plan')?.addEventListener('click', saveMealPlan);

    // Toggle ativo/inativo
    document.getElementById('btn-toggle-active-plan')?.addEventListener('click', () => {
        adminState._editingPlanActive = !adminState._editingPlanActive;
        const btn = document.getElementById('btn-toggle-active-plan');
        btn.textContent = adminState._editingPlanActive ? 'Desativar' : 'Ativar';
        btn.className   = adminState._editingPlanActive ? 'btn-secondary btn-sm' : 'btn-danger btn-sm';
    });

    // Day tabs
    document.querySelectorAll('.plan-day-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.plan-day-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            _expandedMeal = null;
            renderPlanDayEditor(parseInt(tab.dataset.dow));
        });
    });

    // Patient select
    document.getElementById('plan-patient-select')?.addEventListener('change', e => {
        updateBuilderClinicalBanner(e.target.value);
    });

    // Modais
    initFoodSearchModalEvents();
    initMicroModalEvents();

    // Modal de receita IA
    document.getElementById('btn-close-recipe-generator')?.addEventListener('click', () => {
        document.getElementById('admin-recipe-generator-modal').style.display = 'none';
    });
    document.getElementById('btn-close-recipe-generator-footer')?.addEventListener('click', () => {
        document.getElementById('admin-recipe-generator-modal').style.display = 'none';
    });
    document.getElementById('btn-apply-recipe')?.addEventListener('click', () => {
        if (!_currentGeneratedRecipe || !_currentGeneratedRecipeTarget) return;
        const targetDow  = adminState._targetMealDow  ?? 1;
        const targetType = adminState._targetMealType ?? 'cafe_da_manha';
        addItemToPlan(targetDow, targetType, {
            alimento_id: null,
            name:      _currentGeneratedRecipe.name || _currentGeneratedRecipeTarget.name,
            medida_label: '1 porção (Receita IA)', medida_grams: 1,
            quantidade: 1, grams: 1,
            available_measures: [],
            per100: null,
            calories: Math.round(_currentGeneratedRecipe.calories),
            protein:  Math.round(_currentGeneratedRecipe.protein),
            carbs:    Math.round(_currentGeneratedRecipe.carbs),
            fat:      Math.round(_currentGeneratedRecipe.fat),
            fiber:    0,
        });
        document.getElementById('admin-recipe-generator-modal').style.display = 'none';
    });
}
