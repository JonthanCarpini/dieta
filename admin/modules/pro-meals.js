/**
 * pro-meals.js — Gerenciamento de Cardápios Semanais, busca Spoonacular e Receitas via IA
 */

import { API_URL, adminState } from './state.js';

const MEAL_TYPES = [
    { type: 'cafe_da_manha',  label: 'Café da Manhã',    time: '07:00', icon: '☀️' },
    { type: 'lanche_manha',   label: 'Lanche da Manhã',  time: '10:00', icon: '🍎' },
    { type: 'almoco',         label: 'Almoço',            time: '12:00', icon: '🍽️' },
    { type: 'lanche_tarde',   label: 'Lanche da Tarde',   time: '15:30', icon: '🍊' },
    { type: 'jantar',         label: 'Jantar',             time: '19:00', icon: '🌙' },
    { type: 'ceia',           label: 'Ceia',               time: '21:00', icon: '🌛' },
];

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAY_FULL  = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

// Variáveis de escopo do módulo para o gerador de receitas
let currentGeneratedRecipe = null;
let currentGeneratedRecipeTarget = null;

export function getEmptyPlanData() {
    return {
        days: [1,2,3,4,5,6,0].map(dow => ({
            dow,
            meals: MEAL_TYPES.map(mt => ({
                type: mt.type, label: mt.label, time: mt.time,
                items: [], instructions: '',
                total: { calories: 0, protein: 0, carbs: 0, fat: 0 }
            }))
        }))
    };
}

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
        // Preencher select de pacientes no builder
        await populatePlanPatientSelect();
    } catch {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--color-danger);">Erro ao carregar.</td></tr>`;
    }
}

function renderMealPlansTable(plans) {
    const tbody = document.getElementById('meal-plans-table-body');
    if (!tbody) return;
    if (plans.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--color-text-muted);">Nenhum cardápio criado ainda. Clique em "Novo Cardápio" para começar.</td></tr>`;
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
            </td>
        `;
        tr.querySelector('.btn-edit-plan').addEventListener('click', () => openMealPlanBuilder(p.id));
        tr.querySelector('.btn-delete-plan').addEventListener('click', () => deleteMealPlan(p.id, p.name));
        tbody.appendChild(tr);
    });
    if (window.lucide) window.lucide.createIcons();
}

async function populatePlanPatientSelect() {
    const sel = document.getElementById('plan-patient-select');
    if (!sel) return;
    const patients = adminState.allPatients || [];
    sel.innerHTML = '<option value="">Sem paciente (template)</option>';
    patients.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        sel.appendChild(opt);
    });
}

export async function openMealPlanBuilder(planId) {
    document.getElementById('meal-plans-list-view').classList.add('hidden');
    document.getElementById('meal-plans-builder-view').classList.remove('hidden');

    if (planId) {
        try {
            const res = await fetch(`${API_URL}/professional/weekly-plans/${planId}`, {
                headers: { 'Authorization': `Bearer ${adminState.token}` }
            });
            const plan = await res.json();
            adminState._editingPlanId = plan.id;
            adminState._editingPlanData = typeof plan.plan_data === 'string' ? JSON.parse(plan.plan_data) : plan.plan_data;
            adminState._editingPlanActive = plan.is_active !== false;
            document.getElementById('plan-name-input').value = plan.name;
            document.getElementById('plan-patient-select').value = plan.patient_id || '';
            updateBuilderClinicalBanner(plan.patient_id);
            const togBtn = document.getElementById('btn-toggle-active-plan');
            if (togBtn) {
                togBtn.textContent = adminState._editingPlanActive ? 'Desativar' : 'Ativar';
                togBtn.className = adminState._editingPlanActive ? 'btn-secondary btn-sm' : 'btn-danger btn-sm';
            }
        } catch {
            alert('Erro ao carregar cardápio.');
            return;
        }
    } else {
        adminState._editingPlanId = null;
        adminState._editingPlanData = getEmptyPlanData();
        adminState._editingPlanActive = true;
        document.getElementById('plan-name-input').value = '';
        document.getElementById('plan-patient-select').value = '';
        updateBuilderClinicalBanner(null);
        const togBtn = document.getElementById('btn-toggle-active-plan');
        if (togBtn) { togBtn.textContent = 'Desativar'; togBtn.className = 'btn-secondary btn-sm'; }
    }

    // Garantir que plan_data tem todos os 7 dias
    if (!adminState._editingPlanData?.days || adminState._editingPlanData.days.length < 7) {
        adminState._editingPlanData = getEmptyPlanData();
    }

    // Resetar para Seg
    document.querySelectorAll('.plan-day-tab').forEach(t => t.classList.remove('active'));
    const seg = document.querySelector('.plan-day-tab[data-dow="1"]');
    if (seg) seg.classList.add('active');
    renderPlanDayEditor(1);
    await populatePlanPatientSelect();
    if (planId) {
        try {
            const res2 = await fetch(`${API_URL}/professional/weekly-plans/${planId}`, { headers: { 'Authorization': `Bearer ${adminState.token}` } });
            const plan2 = await res2.json();
            document.getElementById('plan-patient-select').value = plan2.patient_id || '';
            updateBuilderClinicalBanner(plan2.patient_id);
        } catch {}
    }
    if (window.lucide) window.lucide.createIcons();
}

function renderPlanDayEditor(dow) {
    const container = document.getElementById('plan-day-content');
    if (!container || !adminState._editingPlanData) return;
    const dayData = adminState._editingPlanData.days.find(d => d.dow === dow);
    if (!dayData) return;

    let dailyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    dayData.meals.forEach(m => {
        dailyTotals.calories += m.total?.calories || 0;
        dailyTotals.protein  += m.total?.protein  || 0;
        dailyTotals.carbs    += m.total?.carbs    || 0;
        dailyTotals.fat      += m.total?.fat      || 0;
    });

    container.innerHTML = `
        <div class="plan-day-header">
            <h3>${DAY_FULL[dow]}</h3>
            <div class="plan-day-totals">
                <span>${Math.round(dailyTotals.calories)} kcal</span>
                <span>P: ${Math.round(dailyTotals.protein)}g</span>
                <span>C: ${Math.round(dailyTotals.carbs)}g</span>
                <span>G: ${Math.round(dailyTotals.fat)}g</span>
            </div>
        </div>
        ${dayData.meals.map(meal => renderMealSection(dow, meal)).join('')}
    `;

    // Bind events
    container.querySelectorAll('.btn-remove-plan-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const { dow: d, mealType, itemIdx } = btn.dataset;
            removePlanItem(parseInt(d), mealType, parseInt(itemIdx));
        });
    });
    container.querySelectorAll('.plan-meal-instructions').forEach(ta => {
        ta.addEventListener('change', () => {
            const { dow: d, mealType } = ta.dataset;
            const dayIdx = adminState._editingPlanData.days.findIndex(day => day.dow === parseInt(d));
            if (dayIdx === -1) return;
            const mealIdx = adminState._editingPlanData.days[dayIdx].meals.findIndex(m => m.type === mealType);
            if (mealIdx === -1) return;
            adminState._editingPlanData.days[dayIdx].meals[mealIdx].instructions = ta.value;
        });
    });
    container.querySelectorAll('.btn-add-food-to-meal').forEach(btn => {
        btn.addEventListener('click', () => {
            adminState._targetMealDow  = parseInt(btn.dataset.dow);
            adminState._targetMealType = btn.dataset.mealType;
            document.getElementById('calorie-search-input')?.focus();
        });
    });
    if (window.lucide) window.lucide.createIcons();
}

function renderMealSection(dow, meal) {
    const mt = MEAL_TYPES.find(m => m.type === meal.type) || {};
    const hasItems = meal.items && meal.items.length > 0;
    const totalCal = Math.round(meal.total?.calories || 0);
    return `
    <div class="plan-meal-card">
        <div class="plan-meal-header">
            <div class="plan-meal-title">
                <span class="plan-meal-icon">${mt.icon || '🍴'}</span>
                <strong>${meal.label}</strong>
                <span class="plan-meal-time">${meal.time}</span>
                ${totalCal > 0 ? `<span class="plan-meal-cal-badge">${totalCal} kcal</span>` : ''}
            </div>
            <button class="btn-sm btn-secondary btn-add-food-to-meal" data-dow="${dow}" data-meal-type="${meal.type}">
                <i data-lucide="plus"></i> Adicionar Alimento
            </button>
        </div>
        <div class="plan-meal-items">
            ${hasItems ? meal.items.map((item, idx) => `
                <div class="plan-item-row">
                    <span class="plan-item-name">${item.name}${item.qty ? ` <small>(${item.qty})</small>` : ''}</span>
                    <span class="plan-item-macros">${Math.round(item.calories)} kcal · P:${Math.round(item.protein)}g · C:${Math.round(item.carbs)}g · G:${Math.round(item.fat)}g</span>
                    <button class="btn-remove-plan-item" data-dow="${dow}" data-meal-type="${meal.type}" data-item-idx="${idx}">×</button>
                </div>
            `).join('') : `<p class="plan-meal-empty">Nenhum alimento adicionado.</p>`}
        </div>
        ${hasItems ? `<div class="plan-meal-total">Total: ${Math.round(meal.total?.calories||0)} kcal · P:${Math.round(meal.total?.protein||0)}g · C:${Math.round(meal.total?.carbs||0)}g · G:${Math.round(meal.total?.fat||0)}g</div>` : ''}
        <textarea class="plan-meal-instructions" data-dow="${dow}" data-meal-type="${meal.type}" placeholder="Instruções de preparo (opcional)...">${meal.instructions || ''}</textarea>
    </div>`;
}

function removePlanItem(dow, mealType, itemIdx) {
    const dayIdx = adminState._editingPlanData.days.findIndex(d => d.dow === dow);
    if (dayIdx === -1) return;
    const mealIdx = adminState._editingPlanData.days[dayIdx].meals.findIndex(m => m.type === mealType);
    if (mealIdx === -1) return;
    adminState._editingPlanData.days[dayIdx].meals[mealIdx].items.splice(itemIdx, 1);
    recalcMealTotal(dayIdx, mealIdx);
    renderPlanDayEditor(dow);
}

function addItemToPlan(dow, mealType, item) {
    const dayIdx = adminState._editingPlanData.days.findIndex(d => d.dow === dow);
    if (dayIdx === -1) return;
    const mealIdx = adminState._editingPlanData.days[dayIdx].meals.findIndex(m => m.type === mealType);
    if (mealIdx === -1) return;
    adminState._editingPlanData.days[dayIdx].meals[mealIdx].items.push(item);
    recalcMealTotal(dayIdx, mealIdx);
    renderPlanDayEditor(dow);
}

function recalcMealTotal(dayIdx, mealIdx) {
    const items = adminState._editingPlanData.days[dayIdx].meals[mealIdx].items;
    adminState._editingPlanData.days[dayIdx].meals[mealIdx].total = {
        calories: items.reduce((s, i) => s + (i.calories || 0), 0),
        protein:  items.reduce((s, i) => s + (i.protein  || 0), 0),
        carbs:    items.reduce((s, i) => s + (i.carbs    || 0), 0),
        fat:      items.reduce((s, i) => s + (i.fat      || 0), 0),
    };
}

export async function runCalorieSearch() {
    const input = document.getElementById('calorie-search-input');
    const resultsDiv = document.getElementById('calorie-search-results');
    if (!input || !resultsDiv) return;
    const q = input.value.trim();
    if (!q) return;
    resultsDiv.innerHTML = '<p style="padding:8px;color:var(--color-text-muted);">Buscando...</p>';
    resultsDiv.classList.remove('hidden');
    try {
        const res = await fetch(`${API_URL}/admin/calorie-search?q=${encodeURIComponent(q)}`, {
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro na busca');
        if (!data.items || data.items.length === 0) {
            resultsDiv.innerHTML = '<p style="padding:8px;color:var(--color-text-muted);">Nenhum resultado encontrado.</p>';
            return;
        }
        // Spoonacular retorna receitas completas com macros por porção
        resultsDiv.innerHTML = data.items.map((item, idx) => {
            const meta = [
                item.servings ? `${item.servings} porção(ões)` : null,
                item.ready_in_minutes ? `${item.ready_in_minutes} min` : null,
            ].filter(Boolean).join(' · ');
            return `
            <div class="calorie-result-item" data-idx="${idx}">
                <div class="calorie-result-name">${item.name}</div>
                ${meta ? `<div class="calorie-result-meta">${meta}</div>` : ''}
                <div class="calorie-result-macros">
                    <span class="usda-per100">por porção:</span>
                    ${Math.round(item.calories)} kcal ·
                    P:${Math.round(item.protein_g)}g ·
                    C:${Math.round(item.carbohydrates_total_g)}g ·
                    G:${Math.round(item.fat_total_g)}g
                </div>
                <div class="calorie-result-actions" style="display:flex; align-items:center; gap:8px;">
                    <input type="number" class="calorie-qty-input" value="1" min="1" max="99" step="0.5" data-idx="${idx}"> <span style="font-size:11px;color:var(--color-text-muted);">porção(ões)</span>
                    <button class="btn-sm btn-primary calorie-add-btn" data-idx="${idx}">+ Adicionar</button>
                    <button class="btn-sm btn-secondary calorie-recipe-btn" data-idx="${idx}">
                        <i data-lucide="sparkles" style="width:11px; height:11px; vertical-align:middle; margin-right:4px;"></i>Receita IA
                    </button>
                </div>
            </div>`;
        }).join('');
        
        if (window.lucide) window.lucide.createIcons();

        resultsDiv.querySelectorAll('.calorie-add-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                const item = data.items[idx];
                const portions = parseFloat(resultsDiv.querySelector(`.calorie-qty-input[data-idx="${idx}"]`)?.value) || 1;
                const targetDow  = adminState._targetMealDow  ?? 1;
                const targetType = adminState._targetMealType ?? 'cafe_da_manha';
                const qtyLabel = portions === 1 ? '1 porção' : `${portions} porções`;
                addItemToPlan(targetDow, targetType, {
                    name:     item.name,
                    qty:      qtyLabel,
                    calories: Math.round(item.calories * portions * 10) / 10,
                    protein:  Math.round(item.protein_g * portions * 10) / 10,
                    carbs:    Math.round(item.carbohydrates_total_g * portions * 10) / 10,
                    fat:      Math.round(item.fat_total_g * portions * 10) / 10,
                });
                resultsDiv.classList.add('hidden');
                input.value = '';
            });
        });

        resultsDiv.querySelectorAll('.calorie-recipe-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                const item = data.items[idx];
                generateAIRecipe(item);
            });
        });

    } catch (err) {
        resultsDiv.innerHTML = `<p style="padding:8px;color:var(--color-danger);">${err.message}</p>`;
    }
}

export async function saveMealPlan() {
    const name = document.getElementById('plan-name-input')?.value?.trim();
    if (!name) { alert('Dê um nome ao cardápio.'); return; }
    const patientId = document.getElementById('plan-patient-select')?.value || null;
    const payload = {
        name,
        patient_id: patientId ? parseInt(patientId) : null,
        plan_data: adminState._editingPlanData,
        is_active: adminState._editingPlanActive !== false,
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

export async function generateAIRecipe(spoonacularItem) {
    const modal = document.getElementById('admin-recipe-generator-modal');
    const loadingDiv = document.getElementById('recipe-generator-loading');
    const contentDiv = document.getElementById('recipe-generator-content');
    const footerDiv = document.getElementById('recipe-generator-footer');
    
    if (!modal || !loadingDiv || !contentDiv || !footerDiv) return;

    currentGeneratedRecipe = null;
    currentGeneratedRecipeTarget = spoonacularItem;

    modal.style.display = 'flex';
    loadingDiv.style.display = 'flex';
    contentDiv.style.display = 'none';
    footerDiv.style.display = 'none';

    try {
        const patientId = document.getElementById('plan-patient-select')?.value || null;
        let profile = null;

        if (patientId) {
            try {
                const clinicalRes = await fetch(`${API_URL}/professional/patients/${patientId}/clinical`, {
                    headers: { 'Authorization': `Bearer ${adminState.token}` }
                });
                if (clinicalRes.ok) {
                    const clinical = await clinicalRes.json();
                    profile = {
                        goal: 'maintain',
                        comorbidities: clinical.comorbidities,
                        intolerances: clinical.intolerances,
                        dietary_restrictions: clinical.dietary_restrictions,
                        notes: clinical.notes
                    };

                    const patientObj = (adminState.allPatients || []).find(p => p.id == patientId);
                    if (patientObj) {
                        profile.goal = patientObj.goal || 'maintain';
                        profile.weight = patientObj.weight;
                        profile.height = patientObj.height;
                        profile.targetCalories = patientObj.target_calories;
                        profile.age = patientObj.age;
                        profile.gender = patientObj.gender;
                    }
                }
            } catch (e) {
                console.error('Erro ao buscar dados clínicos do paciente para IA:', e);
            }
        }

        const payload = {
            mealType: adminState._targetMealType || 'all',
            cal: Math.round(spoonacularItem.calories),
            protein: Math.round(spoonacularItem.protein_g),
            carbs: Math.round(spoonacularItem.carbohydrates_total_g),
            fat: Math.round(spoonacularItem.fat_total_g),
            recipeName: spoonacularItem.name,
            profile: profile
        };

        const res = await fetch(`${API_URL}/ai/generate-recipe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminState.token}`
            },
            body: JSON.stringify(payload)
        });

        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || 'Erro ao gerar receita.');

        const recipe = resData.recipe;
        if (!recipe) throw new Error('Formato de resposta inválido.');

        currentGeneratedRecipe = recipe;

        document.getElementById('recipe-gen-title').textContent = recipe.name || spoonacularItem.name;
        document.getElementById('recipe-gen-meta').textContent = `Tempo de Preparo: ${recipe.time_min || 20} min`;
        document.getElementById('recipe-gen-calories').textContent = `${Math.round(recipe.calories || spoonacularItem.calories)} kcal`;
        document.getElementById('recipe-gen-protein').textContent = `${Math.round(recipe.protein || spoonacularItem.protein_g)}g`;
        document.getElementById('recipe-gen-carbs').textContent = `${Math.round(recipe.carbs || spoonacularItem.carbohydrates_total_g)}g`;
        document.getElementById('recipe-gen-fat').textContent = `${Math.round(recipe.fat || spoonacularItem.fat_total_g)}g`;

        const ingredientsUl = document.getElementById('recipe-gen-ingredients-list');
        ingredientsUl.innerHTML = '';
        if (recipe.ingredients && recipe.ingredients.length > 0) {
            recipe.ingredients.forEach(ing => {
                const li = document.createElement('li');
                li.textContent = `${ing.amount || ''} ${ing.unit || ''} de ${ing.name}`;
                ingredientsUl.appendChild(li);
            });
        } else {
            ingredientsUl.innerHTML = '<li>Nenhum ingrediente listado.</li>';
        }

        document.getElementById('recipe-gen-directions').textContent = recipe.directions || '';

        loadingDiv.style.display = 'none';
        contentDiv.style.display = 'flex';
        footerDiv.style.display = 'flex';
        
        if (window.lucide) window.lucide.createIcons();

    } catch (err) {
        alert(`Erro ao gerar receita: ${err.message}`);
        modal.style.display = 'none';
    }
}

// ==========================================
// BUSCA TACO — banco de alimentos brasileiro
// ==========================================

export async function runTacoSearch() {
    const input  = document.getElementById('taco-search-input');
    const results = document.getElementById('taco-search-results');
    if (!input || !results) return;
    const q = input.value.trim();
    if (!q) return;
    results.innerHTML = '<p style="padding:8px;color:var(--color-text-muted);">Buscando...</p>';
    results.classList.remove('hidden');
    try {
        const res = await fetch(`${API_URL}/admin/food-db?q=${encodeURIComponent(q)}`, {
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro na busca');
        if (!data.items || data.items.length === 0) {
            results.innerHTML = '<p style="padding:8px;color:var(--color-text-muted);">Nenhum alimento encontrado. Tente o painel "Alimento Manual".</p>';
            return;
        }
        results.innerHTML = data.items.map((food, idx) => {
            const measuresHtml = (food.measures && food.measures.length > 0)
                ? `<div class="taco-measures">
                    ${food.measures.slice(0, 5).map(m =>
                        `<button class="taco-measure-btn" data-taco-idx="${idx}" data-grams="${m.grams}" title="${m.grams}g">${m.label}</button>`
                    ).join('')}
                   </div>`
                : '';
            return `
            <div class="calorie-result-item" data-taco-idx="${idx}">
                <div class="calorie-result-name">${food.name}</div>
                <div class="calorie-result-meta">${food.category} · ${food.source}</div>
                <div class="calorie-result-macros">
                    <span class="usda-per100">por 100g:</span>
                    ${Math.round(food.energy_kcal)} kcal ·
                    P:${parseFloat(food.protein_g).toFixed(1)}g ·
                    C:${parseFloat(food.carbs_g).toFixed(1)}g ·
                    G:${parseFloat(food.fat_g).toFixed(1)}g
                    ${food.fiber_g != null ? `· Fibra:${parseFloat(food.fiber_g).toFixed(1)}g` : ''}
                </div>
                ${measuresHtml}
                <div class="calorie-result-actions" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <input type="number" class="calorie-qty-input" value="100" min="1" max="2000" step="5" data-taco-idx="${idx}">
                    <span style="font-size:11px;color:var(--color-text-muted);">g</span>
                    <button class="btn-sm btn-primary taco-add-btn" data-taco-idx="${idx}">+ Adicionar</button>
                </div>
            </div>`;
        }).join('');

        // Bind: medidas caseiras — preenche o campo de gramas ao clicar
        results.querySelectorAll('.taco-measure-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.tacoIdx);
                const grams = parseFloat(btn.dataset.grams) || 100;
                const qtyInput = results.querySelector(`.calorie-qty-input[data-taco-idx="${idx}"]`);
                if (qtyInput) qtyInput.value = grams;
            });
        });

        // Bind: add button
        results.querySelectorAll('.taco-add-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx  = parseInt(btn.dataset.tacoIdx);
                const food = data.items[idx];
                const grams = parseFloat(results.querySelector(`.calorie-qty-input[data-taco-idx="${idx}"]`)?.value) || 100;
                const factor = grams / 100;
                const targetDow  = adminState._targetMealDow  ?? 1;
                const targetType = adminState._targetMealType ?? 'cafe_da_manha';
                addItemToPlan(targetDow, targetType, {
                    name:     `${food.name} (${grams}g)`,
                    qty:      `${grams}g`,
                    calories: Math.round(food.energy_kcal * factor * 10) / 10,
                    protein:  Math.round(food.protein_g  * factor * 10) / 10,
                    carbs:    Math.round(food.carbs_g    * factor * 10) / 10,
                    fat:      Math.round(food.fat_g      * factor * 10) / 10,
                });
                results.classList.add('hidden');
                input.value = '';
            });
        });

    } catch (err) {
        results.innerHTML = `<p style="padding:8px;color:var(--color-danger);">${err.message}</p>`;
    }
}

// Alterna abas de busca de alimentos
function initFoodSearchTabs() {
    const tabs = document.querySelectorAll('.food-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const key = tab.dataset.ftab;
            document.querySelectorAll('.food-search-panel').forEach(p => p.classList.add('hidden'));
            const panel = document.getElementById(`food-panel-${key}`);
            if (panel) panel.classList.remove('hidden');
            // Fechar resultados abertos da outra aba
            document.getElementById('taco-search-results')?.classList.add('hidden');
            document.getElementById('calorie-search-results')?.classList.add('hidden');
        });
    });
}

function initCustomFoodPanel() {
    const btn = document.getElementById('btn-add-custom-food');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        const name = document.getElementById('custom-food-name')?.value.trim();
        const kcal = parseFloat(document.getElementById('custom-food-kcal')?.value) || 0;
        const prot = parseFloat(document.getElementById('custom-food-prot')?.value) || 0;
        const carb = parseFloat(document.getElementById('custom-food-carb')?.value) || 0;
        const fat  = parseFloat(document.getElementById('custom-food-fat')?.value)  || 0;
        const grams = parseFloat(document.getElementById('custom-food-qty')?.value) || 100;
        const doSave = document.getElementById('custom-food-save')?.checked;

        if (!name) { alert('Informe o nome do alimento.'); return; }

        const factor = grams / 100;
        const targetDow  = adminState._targetMealDow  ?? 1;
        const targetType = adminState._targetMealType ?? 'cafe_da_manha';

        addItemToPlan(targetDow, targetType, {
            name:     `${name} (${grams}g)`,
            qty:      `${grams}g`,
            calories: Math.round(kcal * factor * 10) / 10,
            protein:  Math.round(prot * factor * 10) / 10,
            carbs:    Math.round(carb * factor * 10) / 10,
            fat:      Math.round(fat  * factor * 10) / 10,
        });

        if (doSave) {
            try {
                await fetch(`${API_URL}/admin/food-db`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminState.token}` },
                    body: JSON.stringify({ name, energy_kcal: kcal, protein_g: prot, carbs_g: carb, fat_g: fat })
                });
            } catch (e) { console.warn('Erro ao salvar alimento personalizado:', e); }
        }

        // Limpar campos
        ['custom-food-name','custom-food-kcal','custom-food-prot','custom-food-carb','custom-food-fat'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = id === 'custom-food-qty' ? '100' : '';
        });
        document.getElementById('custom-food-qty').value = '100';
    });
}

export function initProMeals() {
    // Cardápios: botão Novo Plano
    const btnNewPlan = document.getElementById('btn-new-meal-plan');
    if (btnNewPlan) btnNewPlan.addEventListener('click', () => openMealPlanBuilder(null));

    // Cardápios: Voltar à lista
    const btnBackToPlans = document.getElementById('btn-back-to-plans');
    if (btnBackToPlans) btnBackToPlans.addEventListener('click', () => {
        document.getElementById('meal-plans-builder-view').classList.add('hidden');
        document.getElementById('meal-plans-list-view').classList.remove('hidden');
    });

    // Cardápios: Salvar plano
    const btnSavePlan = document.getElementById('btn-save-meal-plan');
    if (btnSavePlan) btnSavePlan.addEventListener('click', saveMealPlan);

    // Busca TACO
    const btnTacoSearch = document.getElementById('btn-taco-search');
    const tacoInput = document.getElementById('taco-search-input');
    if (btnTacoSearch) btnTacoSearch.addEventListener('click', runTacoSearch);
    if (tacoInput) tacoInput.addEventListener('keydown', e => { if (e.key === 'Enter') runTacoSearch(); });

    // Busca Spoonacular (mantida como fallback)
    const btnCalSearch = document.getElementById('btn-calorie-search');
    const calInput = document.getElementById('calorie-search-input');
    if (btnCalSearch) btnCalSearch.addEventListener('click', runCalorieSearch);
    if (calInput) calInput.addEventListener('keydown', e => { if (e.key === 'Enter') runCalorieSearch(); });

    // Abas de busca de alimentos
    initFoodSearchTabs();

    // Painel de alimento manual
    initCustomFoodPanel();

    // Cardápios: Toggle ativo/inativo
    const btnToggleActive = document.getElementById('btn-toggle-active-plan');
    if (btnToggleActive) btnToggleActive.addEventListener('click', () => {
        adminState._editingPlanActive = !adminState._editingPlanActive;
        btnToggleActive.textContent = adminState._editingPlanActive ? 'Desativar' : 'Ativar';
        btnToggleActive.className = adminState._editingPlanActive ? 'btn-secondary btn-sm' : 'btn-danger btn-sm';
    });

    // Cardápios: day tabs
    document.querySelectorAll('.plan-day-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.plan-day-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderPlanDayEditor(parseInt(tab.dataset.dow));
        });
    });

    const patientSelect = document.getElementById('plan-patient-select');
    if (patientSelect) {
        patientSelect.addEventListener('change', (e) => {
            const patientId = e.target.value;
            updateBuilderClinicalBanner(patientId);
        });
    }

    // Configura listeners do modal de receita
    document.getElementById('btn-close-recipe-generator')?.addEventListener('click', () => {
        document.getElementById('admin-recipe-generator-modal').style.display = 'none';
    });
    document.getElementById('btn-close-recipe-generator-footer')?.addEventListener('click', () => {
        document.getElementById('admin-recipe-generator-modal').style.display = 'none';
    });
    document.getElementById('btn-apply-recipe')?.addEventListener('click', () => {
        if (!currentGeneratedRecipe || !currentGeneratedRecipeTarget) return;

        const targetDow  = adminState._targetMealDow  ?? 1;
        const targetType = adminState._targetMealType ?? 'cafe_da_manha';

        addItemToPlan(targetDow, targetType, {
            name:     currentGeneratedRecipe.name || currentGeneratedRecipeTarget.name,
            qty:      "1 porção (Receita IA)",
            calories: Math.round(currentGeneratedRecipe.calories),
            protein:  Math.round(currentGeneratedRecipe.protein),
            carbs:    Math.round(currentGeneratedRecipe.carbs),
            fat:      Math.round(currentGeneratedRecipe.fat),
        });

        const dayIdx = adminState._editingPlanData.days.findIndex(day => day.dow === targetDow);
        if (dayIdx !== -1) {
            const mealIdx = adminState._editingPlanData.days[dayIdx].meals.findIndex(m => m.type === targetType);
            if (mealIdx !== -1) {
                const existing = adminState._editingPlanData.days[dayIdx].meals[mealIdx].instructions || '';
                const ingredientsText = (currentGeneratedRecipe.ingredients || []).map(ing => `- ${ing.amount || ''}${ing.unit || ''} de ${ing.name}`).join('\n');
                const recipeText = `\n\n--- RECEITA: ${currentGeneratedRecipe.name} ---\nIngredientes:\n${ingredientsText}\n\nModo de Preparo:\n${currentGeneratedRecipe.directions}`;
                adminState._editingPlanData.days[dayIdx].meals[mealIdx].instructions = (existing + recipeText).trim();
            }
        }

        document.getElementById('admin-recipe-generator-modal').style.display = 'none';
        document.getElementById('calorie-search-results').classList.add('hidden');
        const input = document.getElementById('calorie-search-input');
        if (input) input.value = '';

        renderPlanDayEditor(targetDow);
    });
}

export async function updateBuilderClinicalBanner(patientId) {
    const banner = document.getElementById('builder-clinical-banner');
    const info = document.getElementById('builder-clinical-info');
    if (!banner || !info) return;

    if (!patientId) {
        banner.classList.add('hidden');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/professional/patients/${patientId}/clinical`, {
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        if (!res.ok) throw new Error('Não foi possível carregar a ficha clínica para o banner.');
        const clinical = await res.json();

        let textParts = [];
        if (clinical.comorbidities) textParts.push(`<strong>Comorbidades:</strong> ${clinical.comorbidities}`);
        if (clinical.intolerances) textParts.push(`<strong>Intolerâncias/Alergias:</strong> ${clinical.intolerances}`);
        if (clinical.dietary_restrictions) textParts.push(`<strong>Restrições:</strong> ${clinical.dietary_restrictions}`);
        
        if (textParts.length > 0) {
            info.innerHTML = textParts.join(' | ');
            banner.classList.remove('hidden');
        } else {
            banner.classList.add('hidden');
        }
    } catch (err) {
        console.error(err);
        banner.classList.add('hidden');
    }
}
