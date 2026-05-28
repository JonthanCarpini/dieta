/**
 * pro-patients.js — Gestão de Pacientes e Videochamada
 */
import { API_URL, adminState } from './state.js';
import { loadAppointmentsData } from './pro-appointments.js';
import { openMealPlanBuilder } from './pro-meals.js';
import { renderEnergyCalcTab } from './pro-energy.js';

let localStream = null;
let peerConnection = null;
let wsSignal = null;
let isMicMuted = false;
let isCamOff = false;
let remoteCandidatesQueue = [];
let vcWeightChartInstance = null;

export async function loadPatientsData() {
    try {
        const res = await fetch(`${API_URL}/professional/patients`, {
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        if (!res.ok) throw new Error('Não foi possível carregar a lista de pacientes.');

        const patients = await res.json();
        adminState.allPatients = patients;
        renderPatientsTable(patients);

        const searchInput = document.getElementById('patient-search-input');
        const goalSelect  = document.getElementById('patient-goal-filter');
        if (searchInput) searchInput.value = '';
        if (goalSelect)  goalSelect.value  = '';
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
}

export function applyPatientFilters() {
    const search = (document.getElementById('patient-search-input')?.value || '').toLowerCase().trim();
    const goal   = document.getElementById('patient-goal-filter')?.value || '';
    const filtered = (adminState.allPatients || []).filter(p => {
        const matchSearch = !search || p.name.toLowerCase().includes(search) || p.email.toLowerCase().includes(search);
        const matchGoal   = !goal   || p.goal === goal;
        return matchSearch && matchGoal;
    });
    renderPatientsTable(filtered);
}

export function renderPatientsTable(patients) {
    const tbody = document.getElementById('patients-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (patients.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted);">Nenhum paciente ou cliente vinculado ao seu perfil.</td></tr>`;
        return;
    }

    const countLabel = document.getElementById('patients-count-label');
    if (countLabel) countLabel.textContent = `${patients.length} paciente${patients.length !== 1 ? 's' : ''}`;

    const goalLabels = { lose: 'Emagrecer', gain: 'Ganhar Massa', maintain: 'Manutenção' };

    patients.forEach(p => {
        const tr = document.createElement('tr');
        const isPremium = p.plan && p.plan !== 'trial';
        const planBadgeClass = isPremium ? 'premium' : 'trial';
        const planLabel = p.plan === 'premium' ? 'Premium' : p.plan;
        const weightHeight = p.weight && p.height ? `${p.weight} kg / ${p.height} cm` : '-';
        const calories = p.target_calories ? `${p.target_calories} kcal` : '-';
        const goalLabel = goalLabels[p.goal] || p.goal || '-';

        tr.innerHTML = `
            <td><strong>${p.name}</strong></td>
            <td>${p.email}</td>
            <td><span class="badge-plan ${planBadgeClass}">${planLabel}</span></td>
            <td><span style="font-size:12px; color:var(--color-text-muted);">${goalLabel}</span></td>
            <td>${weightHeight}</td>
            <td>${calories}</td>
            <td>
                <button class="btn-primary btn-view-diary" data-patient-id="${p.id}" style="font-size: 11px; padding: 4px 8px;">
                    <i data-lucide="book-open" style="width: 12px; height: 12px;"></i> Ver Diário
                </button>
            </td>
        `;

        tr.querySelector('.btn-view-diary').addEventListener('click', () => {
            viewPatientDetails(p);
        });

        tbody.appendChild(tr);
    });
    if (window.lucide) window.lucide.createIcons();
}

export function getMealTypeLabel(meal) {
    if (meal.meal_type) {
        const mealTypes = { breakfast: 'Café da Manhã', lunch: 'Almoço', dinner: 'Jantar', snack: 'Lanche', pre_workout: 'Pré-Treino', post_workout: 'Pós-Treino' };
        return mealTypes[meal.meal_type] || meal.meal_type;
    }
    if (!meal.time) return 'Refeição';
    const hour = parseInt(meal.time.split(':')[0]);
    if (hour >= 5 && hour < 11) return 'Café da Manhã';
    if (hour >= 11 && hour < 14) return 'Almoço';
    if (hour >= 14 && hour < 18) return 'Lanche';
    if (hour >= 18 && hour < 22) return 'Jantar';
    return 'Ceia';
}

export async function viewPatientDetails(patient) {
    adminState._currentPatient = patient;

    const listLayout = document.getElementById('patients-list-view');
    const detailsLayout = document.getElementById('patient-details-view');

    if (listLayout) listLayout.classList.add('hidden');
    if (detailsLayout) detailsLayout.classList.remove('hidden');
    
    const nameLabel = document.getElementById('detail-patient-name');
    const emailLabel = document.getElementById('detail-patient-email');
    const hiddenId = document.getElementById('feedback-patient-id');
    const contentText = document.getElementById('feedback-content');
    
    if (nameLabel) nameLabel.innerText = `Paciente: ${patient.name}`;
    if (emailLabel) emailLabel.innerText = patient.email;
    if (hiddenId) hiddenId.value = patient.id;
    if (contentText) contentText.value = '';

    const weightLabel = document.getElementById('detail-patient-weight');
    const heightLabel = document.getElementById('detail-patient-height');
    const goalLabel = document.getElementById('detail-patient-goal');
    const caloriesLabel = document.getElementById('detail-patient-calories');
    const waterStatus = document.getElementById('detail-water-status');
    const fastingStatus = document.getElementById('detail-fasting-status');
    const mealsBody = document.getElementById('detail-meals-table-body');
    const weightHistoryBody = document.getElementById('detail-weight-history-body');
    
    if (weightLabel) weightLabel.innerText = patient.weight ? `${patient.weight} kg` : '-';
    if (heightLabel) heightLabel.innerText = patient.height ? `${patient.height} cm` : '-';
    if (goalLabel) goalLabel.innerText = patient.goal || '-';
    if (caloriesLabel) caloriesLabel.innerText = patient.target_calories ? `${patient.target_calories} kcal` : '-';
    if (waterStatus) waterStatus.innerText = 'Carregando...';
    if (fastingStatus) fastingStatus.innerText = 'Carregando...';
    if (mealsBody) mealsBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">Carregando diário...</td></tr>`;
    if (weightHistoryBody) weightHistoryBody.innerHTML = `<tr><td colspan="2" style="text-align: center; opacity: 0.5;">Carregando pesos...</td></tr>`;

    fetch(`${API_URL}/professional/patients/${patient.id}/weight-log`, {
        headers: { 'Authorization': `Bearer ${adminState.token}` }
    })
    .then(res => res.json())
    .then(weights => renderPatientWeightChart(weights))
    .catch(err => {
        console.error('Erro ao carregar histórico de peso:', err);
        const emptyEl = document.getElementById('detail-weight-empty');
        if (emptyEl) { emptyEl.textContent = 'Erro ao carregar pesos.'; emptyEl.style.display = 'block'; }
    });

    try {
        const res = await fetch(`${API_URL}/professional/patients/${patient.id}/diary`, {
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        if (!res.ok) throw new Error('Não foi possível carregar os detalhes do diário do paciente.');

        const data = await res.json();
        
        if (data.profile) {
            if (weightLabel) weightLabel.innerText = data.profile.weight ? `${data.profile.weight} kg` : '-';
            if (heightLabel) heightLabel.innerText = data.profile.height ? `${data.profile.height} cm` : '-';
            if (goalLabel) goalLabel.innerText = data.profile.goal || '-';
            if (caloriesLabel) caloriesLabel.innerText = data.profile.target_calories ? `${data.profile.target_calories} kcal` : '-';
        }

        if (data.water) {
            if (waterStatus) waterStatus.innerText = `${data.water.consumed} / ${data.water.target} ml`;
        } else {
            if (waterStatus) waterStatus.innerText = '0 / 2500 ml';
        }

        if (data.fasting && data.fasting.active) {
            const start = new Date(data.fasting.start_time);
            const hrs = data.fasting.duration_goal;
            if (fastingStatus) fastingStatus.innerText = `Ativo (Meta: ${hrs}h, Iniciado às ${start.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})})`;
        } else {
            if (fastingStatus) fastingStatus.innerText = 'Não ativo';
        }

        adminState._allMeals = data.meals || [];
        adminState._patientTargetCalories = data.profile?.target_calories || 0;

        document.querySelectorAll('.diary-filter-btn').forEach(b => b.classList.remove('active'));
        const btn7 = document.querySelector('.diary-filter-btn[data-days="7"]');
        if (btn7) btn7.classList.add('active');
        applyMealFilter(7);
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
    await loadFeedbackHistory(patient.id);

    // Resetar abas de paciente para a aba "Diário" por padrão ao abrir detalhes
    const defaultTabBtn = document.querySelector('.patient-tab-btn[data-patient-tab="diary"]');
    if (defaultTabBtn) {
        document.querySelectorAll('.patient-tab-btn').forEach(b => {
            b.classList.remove('active');
            b.style.borderBottomColor = 'transparent';
            b.style.color = 'var(--color-text-muted)';
        });
        defaultTabBtn.classList.add('active');
        defaultTabBtn.style.borderBottomColor = 'var(--color-primary)';
        defaultTabBtn.style.color = '#fff';
        
        document.querySelectorAll('.patient-tab-content-panel').forEach(panel => {
            panel.classList.add('hidden');
            panel.classList.remove('active');
        });
        const activePanel = document.getElementById('patient-tab-content-diary');
        if (activePanel) {
            activePanel.classList.remove('hidden');
            activePanel.classList.add('active');
        }
    }

    loadPatientClinicalData(patient.id);
    loadPatientExamsData(patient.id);
    loadPatientMeasurements(patient.id);

    if (window.lucide) window.lucide.createIcons();
}

export async function loadPatientClinicalData(patientId) {
    try {
        const res = await fetch(`${API_URL}/professional/patients/${patientId}/clinical`, {
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        if (!res.ok) throw new Error('Não foi possível carregar a ficha clínica.');
        const clinical = await res.json();

        const inputComorbidities = document.getElementById('pro-clinical-comorbidities');
        const inputIntolerances = document.getElementById('pro-clinical-intolerances');
        const inputRestrictions = document.getElementById('pro-clinical-restrictions');
        const inputNotes = document.getElementById('pro-clinical-notes');

        if (inputComorbidities) inputComorbidities.value = clinical.comorbidities || '';
        if (inputIntolerances) inputIntolerances.value = clinical.intolerances || '';
        if (inputRestrictions) inputRestrictions.value = clinical.dietary_restrictions || '';
        if (inputNotes) inputNotes.value = clinical.notes || '';
    } catch (err) {
        console.error('Erro ao carregar dados clínicos:', err);
    }
}

export async function loadPatientExamsData(patientId) {
    const tbody = document.getElementById('pro-patient-exams-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Carregando exames...</td></tr>';

    try {
        const res = await fetch(`${API_URL}/professional/patients/${patientId}/exams`, {
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        if (!res.ok) throw new Error('Não foi possível carregar exames.');
        const exams = await res.json();

        tbody.innerHTML = '';
        if (exams.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--color-text-muted); padding: 20px;">Nenhum exame enviado por este paciente.</td></tr>';
            return;
        }

        exams.forEach(exam => {
            const tr = document.createElement('tr');
            
            const dateStr = new Date(exam.created_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Extrair o nome do arquivo da rota de download segura
            const filename = exam.file_path.substring(exam.file_path.lastIndexOf('/') + 1);
            const downloadUrl = `${API_URL}/professional/exams/download/${filename}`;

            tr.innerHTML = `
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <i data-lucide="file-text" style="color:var(--color-primary); width:16px; height:16px;"></i>
                        <strong>${exam.file_name}</strong>
                    </div>
                </td>
                <td>${dateStr}</td>
                <td>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <input type="text" class="pro-exam-note-input" data-exam-id="${exam.id}" value="${exam.notes || ''}" placeholder="Adicionar notas..." style="flex:1; font-size:12px; padding:4px 8px; height:auto;">
                        <button class="btn-primary btn-save-exam-note" data-exam-id="${exam.id}" style="font-size:10px; padding:4px 8px;">Salvar</button>
                    </div>
                </td>
                <td>
                    <a href="${downloadUrl}" download="${exam.file_name}" class="btn-secondary" style="font-size:11px; padding:4px 8px; text-decoration:none; display:inline-block;">
                        <i data-lucide="download" style="width:12px; height:12px; vertical-align:middle; margin-right:4px;"></i> Baixar
                    </a>
                </td>
            `;

            // Listener para salvar nota do exame
            tr.querySelector('.btn-save-exam-note').addEventListener('click', async (e) => {
                const examId = e.currentTarget.dataset.examId;
                const input = tr.querySelector(`.pro-exam-note-input[data-exam-id="${examId}"]`);
                const notes = input ? input.value : '';

                try {
                    const saveRes = await fetch(`${API_URL}/professional/exams/${examId}/notes`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${adminState.token}`
                        },
                        body: JSON.stringify({ notes })
                    });
                    const data = await saveRes.json();
                    if (!saveRes.ok) throw new Error(data.error || 'Erro ao salvar anotação.');

                    alert('Observação do exame salva com sucesso!');
                } catch (err) {
                    alert(err.message);
                }
            });

            tbody.appendChild(tr);
        });

        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        console.error('Erro ao carregar exames:', err);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--color-danger);">Erro ao carregar exames.</td></tr>';
    }
}

export function applyMealFilter(days) {
    const meals = adminState._allMeals || [];
    const targetCal = adminState._patientTargetCalories || 0;
    const now = new Date();
    const cutoffMs = days > 0 ? now - days * 86400000 : 0;

    const filtered = cutoffMs
        ? meals.filter(m => {
            const dateStr = String(m.date).split('T')[0];
            return new Date(dateStr + 'T00:00:00').getTime() >= cutoffMs;
        })
        : meals;

    const adherenceInfo = document.getElementById('diary-adherence-info');
    const adherenceEl   = document.getElementById('detail-caloric-adherence');
    if (targetCal > 0 && filtered.length > 0) {
        const byDate = {};
        filtered.forEach(m => {
            const d = m.date;
            const cal = (m.total?.calories ?? m.calories ?? 0);
            byDate[d] = (byDate[d] || 0) + cal;
        });
        const vals = Object.values(byDate);
        const avgAdh = vals.reduce((s, c) => s + Math.min(150, Math.round(c / targetCal * 100)), 0) / vals.length;
        if (adherenceEl) {
            adherenceEl.textContent = `${Math.round(avgAdh)}%`;
            adherenceEl.style.color = avgAdh >= 85 && avgAdh <= 110 ? 'var(--color-success)' : avgAdh > 110 ? 'var(--color-danger)' : 'var(--color-primary)';
        }
        if (adherenceInfo) adherenceInfo.style.display = 'flex';
    } else {
        if (adherenceInfo) adherenceInfo.style.display = 'none';
    }

    renderPatientMealsTable(filtered);
}

export function renderPatientMealsTable(meals) {
    const mealsBody = document.getElementById('detail-meals-table-body');
    if (!mealsBody) return;
    mealsBody.innerHTML = '';
    if (!meals || meals.length === 0) {
        mealsBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--color-text-muted); padding:20px;">Nenhuma refeição no período.</td></tr>`;
        return;
    }
    meals.forEach(m => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        const totalObj = m.total && typeof m.total === 'object' ? m.total : {};
        const carbs    = totalObj.carbs    !== undefined ? `${totalObj.carbs}g`    : (m.carbs    ? `${m.carbs}g`    : '-');
        const protein  = totalObj.protein  !== undefined ? `${totalObj.protein}g`  : (m.protein  ? `${m.protein}g`  : '-');
        const fat      = totalObj.fat      !== undefined ? `${totalObj.fat}g`      : (m.fat      ? `${m.fat}g`      : '-');
        const calVal   = totalObj.calories !== undefined ? `${totalObj.calories} kcal` : (m.calories ? `${m.calories} kcal` : '-');
        tr.innerHTML = `
            <td>${new Date(String(m.date).split('T')[0] + 'T00:00:00').toLocaleDateString('pt-BR')} ${m.time.substring(0,5)}</td>
            <td><strong>${m.name}</strong><br><small>${m.description || ''}</small></td>
            <td><span class="badge-role user" style="background-color:rgba(255,255,255,0.05);color:var(--color-text);">${getMealTypeLabel(m)}</span></td>
            <td>${calVal}</td>
            <td><small>C:${carbs} | P:${protein} | F:${fat}</small></td>
        `;
        tr.addEventListener('click', () => openAdminMealDetailsModal(m));
        mealsBody.appendChild(tr);
    });
}

export function renderPatientWeightChart(weights) {
    const canvas   = document.getElementById('detail-weight-chart');
    const emptyEl  = document.getElementById('detail-weight-empty');
    if (!canvas) return;
    if (!weights || weights.length === 0) {
        canvas.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'block';
        return;
    }
    canvas.style.display = 'block';
    if (emptyEl) emptyEl.style.display = 'none';

    if (adminState._patientWeightChart) {
        try { adminState._patientWeightChart.destroy(); } catch(e) {}
    }
    const labels = weights.map(w => { const [y,mo,d] = w.date.split('-'); return `${d}/${mo}`; });
    const values = weights.map(w => parseFloat(w.weight));
    adminState._patientWeightChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Peso (kg)',
                data: values,
                borderColor: '#f5c14d',
                backgroundColor: 'rgba(245,193,77,0.07)',
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: '#f5c14d',
                tension: 0.35,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17,17,22,0.95)',
                    titleColor: '#f4f1ec',
                    bodyColor: 'rgba(244,241,236,0.7)',
                    borderColor: 'rgba(245,193,77,0.2)',
                    borderWidth: 1,
                    callbacks: { label: ctx => `${ctx.raw} kg` }
                }
            },
            scales: {
                x: { grid: { color: 'rgba(255,250,240,0.05)' }, ticks: { color: 'rgba(244,241,236,0.4)', font: { size: 9 } } },
                y: { grid: { color: 'rgba(255,250,240,0.05)' }, ticks: { color: 'rgba(244,241,236,0.4)', font: { size: 9 }, callback: v => `${v}kg` } }
            }
        }
    });
}

export async function loadFeedbackHistory(patientId) {
    const list  = document.getElementById('feedback-history-list');
    const badge = document.getElementById('feedback-history-count');
    if (!list) return;
    list.innerHTML = '<p class="description" style="text-align:center;">Carregando...</p>';
    try {
        const res = await fetch(`${API_URL}/professional/patients/${patientId}/feedbacks`, {
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        if (!res.ok) throw new Error();
        const feedbacks = await res.json();
        if (badge) badge.textContent = feedbacks.length > 0 ? feedbacks.length : '';
        if (feedbacks.length === 0) {
            list.innerHTML = '<p class="description" style="text-align:center;">Nenhuma orientação enviada ainda.</p>';
            return;
        }
        list.innerHTML = feedbacks.map(f => {
            const dt = new Date(f.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
            return `<div class="fhi-item">
                <div class="fhi-header"><span class="fhi-date">${dt}</span></div>
                <p class="fhi-body">${(f.content || '').replace(/\n/g, '<br>')}</p>
            </div>`;
        }).join('');
    } catch {
        list.innerHTML = '<p class="description" style="text-align:center; color:var(--color-danger);">Erro ao carregar.</p>';
    }
}

// ── WEBRTC VIDEO CALLS ──
export async function startVideoCall(link, patient) {
    let roomName = 'nutrir-room';
    try {
        const urlObj = new URL(link);
        roomName = urlObj.pathname.substring(1).split('#')[0].split('?')[0];
    } catch(e) {
        roomName = link.replace('https://meet.jit.si/', '').split('#')[0].split('?')[0];
    }

    remoteCandidatesQueue = [];
    const statusEl = document.getElementById('video-call-status');
    if (statusEl) statusEl.textContent = 'Acessando câmera e microfone...';

    const screenVideoCall = document.getElementById('screen-video-call');
    if (screenVideoCall) screenVideoCall.style.display = 'flex';

    const vcPatientName = document.getElementById('vc-patient-name');
    const vcPatientEmail = document.getElementById('vc-patient-email');
    const vcPatientWeight = document.getElementById('vc-patient-weight');
    const vcPatientHeight = document.getElementById('vc-patient-height');
    const vcPatientGoal = document.getElementById('vc-patient-goal');
    const vcPatientCalories = document.getElementById('vc-patient-calories');
    const vcPatientWater = document.getElementById('vc-patient-water');
    const vcFeedbackContent = document.getElementById('vc-feedback-content');
    const vcBtnSaveFeedback = document.getElementById('vc-btn-save-feedback');

    const tabBtns = document.querySelectorAll('.vc-tab-btn');
    const tabContents = document.querySelectorAll('.vc-tab-content');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetTab = btn.dataset.vcTab;
            const activeContent = document.getElementById(`vc-tab-content-${targetTab}`);
            if (activeContent) activeContent.classList.add('active');
        });
    });

    const btnDiary = document.getElementById('vc-tab-btn-diary');
    const btnFeedback = document.getElementById('vc-tab-btn-feedback');
    const btnWeight = document.getElementById('vc-tab-btn-weight');
    if (btnDiary) btnDiary.classList.add('active');
    if (btnFeedback) btnFeedback.classList.remove('active');
    if (btnWeight) btnWeight.classList.remove('active');
    
    const contentDiary = document.getElementById('vc-tab-content-diary');
    const contentFeedback = document.getElementById('vc-tab-content-feedback');
    const contentWeight = document.getElementById('vc-tab-content-weight');
    if (contentDiary) contentDiary.classList.add('active');
    if (contentFeedback) contentFeedback.classList.remove('active');
    if (contentWeight) contentWeight.classList.remove('active');

    if (patient) {
        if (vcPatientName) vcPatientName.textContent = patient.name;
        if (vcPatientEmail) vcPatientEmail.textContent = patient.email;
        if (vcPatientWeight) vcPatientWeight.textContent = 'Carregando...';
        if (vcPatientHeight) vcPatientHeight.textContent = 'Carregando...';
        if (vcPatientGoal) vcPatientGoal.textContent = 'Carregando...';
        if (vcPatientCalories) vcPatientCalories.textContent = 'Carregando...';
        if (vcPatientWater) vcPatientWater.textContent = 'Carregando...';
        
        const vcDiaryContainer = document.getElementById('vc-diary-container');
        if (vcDiaryContainer) vcDiaryContainer.innerHTML = '<div style="text-align:center; padding:40px; opacity:0.5; font-size:13px;">Carregando diário...</div>';
        
        if (vcFeedbackContent) {
            vcFeedbackContent.value = '';
            vcFeedbackContent.disabled = false;
        }
        if (vcBtnSaveFeedback) vcBtnSaveFeedback.disabled = false;

        (async () => {
            let weights = [];
            let diaryData = null;

            const vcWeightHistoryBody = document.getElementById('vc-weight-history-body');
            const vcTabWeightHistoryBody = document.getElementById('vc-tab-weight-history-body');
            if (vcWeightHistoryBody) {
                vcWeightHistoryBody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding: 12px; opacity:0.5;">Carregando pesos...</td></tr>';
            }
            if (vcTabWeightHistoryBody) {
                vcTabWeightHistoryBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 12px; opacity:0.5;">Carregando pesos...</td></tr>';
            }

            try {
                const weightRes = await fetch(`${API_URL}/professional/patients/${patient.id}/weight-log`, {
                    headers: { 'Authorization': `Bearer ${adminState.token}` }
                });
                if (weightRes.ok) {
                    weights = await weightRes.json();
                }
            } catch (err) {
                console.error("Erro ao buscar weight log:", err);
            }

            try {
                const diaryRes = await fetch(`${API_URL}/professional/patients/${patient.id}/diary`, {
                    headers: { 'Authorization': `Bearer ${adminState.token}` }
                });
                if (diaryRes.ok) {
                    diaryData = await diaryRes.json();
                }
            } catch (err) {
                console.error("Erro ao buscar diário:", err);
            }

            if (vcWeightHistoryBody) {
                vcWeightHistoryBody.innerHTML = '';
                if (!weights || weights.length === 0) {
                    vcWeightHistoryBody.innerHTML = '<tr><td colspan="2" style="text-align:center; opacity:0.5; padding: 12px;">Nenhum peso registrado.</td></tr>';
                } else {
                    const sortedWeights = [...weights].reverse();
                    sortedWeights.forEach(w => {
                        const tr = document.createElement('tr');
                        const [year, month, day] = w.date.split('-');
                        const formattedDate = `${day}/${month}/${year}`;
                        tr.innerHTML = `
                            <td style="padding: 6px 8px;">${formattedDate}</td>
                            <td style="padding: 6px 8px;"><strong>${w.weight} kg</strong></td>
                        `;
                        vcWeightHistoryBody.appendChild(tr);
                    });
                }
            }

            if (diaryData) {
                if (diaryData.profile) {
                    if (vcPatientWeight) vcPatientWeight.textContent = diaryData.profile.weight ? `${diaryData.profile.weight} kg` : '-';
                    if (vcPatientHeight) vcPatientHeight.textContent = diaryData.profile.height ? `${diaryData.profile.height} cm` : '-';
                    if (vcPatientGoal) {
                        const goalLabels = { lose: 'Emagrecer', gain: 'Ganhar Peso', maintain: 'Manter Peso' };
                        vcPatientGoal.textContent = goalLabels[diaryData.profile.goal] || diaryData.profile.goal || '-';
                    }
                    if (vcPatientCalories) vcPatientCalories.textContent = diaryData.profile.target_calories ? `${diaryData.profile.target_calories} kcal` : '-';
                } else {
                    if (vcPatientWeight) vcPatientWeight.textContent = '-';
                    if (vcPatientHeight) vcPatientHeight.textContent = '-';
                    if (vcPatientGoal) vcPatientGoal.textContent = '-';
                    if (vcPatientCalories) vcPatientCalories.textContent = '-';
                }

                if (diaryData.water) {
                    if (vcPatientWater) vcPatientWater.textContent = `${diaryData.water.consumed} / ${diaryData.water.target} ml`;
                } else {
                    if (vcPatientWater) vcPatientWater.textContent = '0 / 2500 ml';
                }
            }

            const vcWInitial = document.getElementById('vc-w-initial');
            const vcWCurrent = document.getElementById('vc-w-current');
            const vcWTarget = document.getElementById('vc-w-target');
            const vcWAchievementCard = document.getElementById('vc-w-achievement-card');
            const vcWAchievementText = document.getElementById('vc-w-achievement-text');

            let goalWeight = null;
            let goalType = 'maintain';
            if (diaryData && diaryData.profile) {
                goalWeight = parseFloat(diaryData.profile.goal_weight);
                goalType = diaryData.profile.goal || 'maintain';
            }

            if (weights && weights.length > 0) {
                const initialWeight = parseFloat(weights[0].weight);
                const currentWeight = parseFloat(weights[weights.length - 1].weight);

                if (vcWInitial) vcWInitial.textContent = `${initialWeight.toFixed(1)} kg`;
                if (vcWCurrent) vcWCurrent.textContent = `${currentWeight.toFixed(1)} kg`;
                if (vcWTarget) vcWTarget.textContent = goalWeight ? `${goalWeight.toFixed(1)} kg` : '-';

                if (vcWAchievementCard && vcWAchievementText) {
                    vcWAchievementCard.style.display = 'flex';
                    if (goalType === 'lose') {
                        const diff = initialWeight - currentWeight;
                        if (diff > 0) {
                            vcWAchievementText.innerHTML = `O paciente já reduziu <strong style="color:var(--color-primary);">${diff.toFixed(1)} kg</strong>. Meta: atingir <strong>${goalWeight ? goalWeight.toFixed(1) : '-'} kg</strong>.`;
                        } else if (diff < 0) {
                            vcWAchievementText.innerHTML = `O paciente aumentou <strong>${Math.abs(diff).toFixed(1)} kg</strong> do peso inicial. Meta: reduzir para <strong>${goalWeight ? goalWeight.toFixed(1) : '-'} kg</strong>.`;
                        } else {
                            vcWAchievementText.innerHTML = `Peso estável em relação ao início. Meta: reduzir para <strong>${goalWeight ? goalWeight.toFixed(1) : '-'} kg</strong>.`;
                        }
                    } else if (goalType === 'gain') {
                        const diff = currentWeight - initialWeight;
                        if (diff > 0) {
                            vcWAchievementText.innerHTML = `O paciente já aumentou <strong style="color:#22c55e;">${diff.toFixed(1)} kg</strong>. Meta: atingir <strong>${goalWeight ? goalWeight.toFixed(1) : '-'} kg</strong>.`;
                        } else if (diff < 0) {
                            vcWAchievementText.innerHTML = `O paciente reduziu <strong>${Math.abs(diff).toFixed(1)} kg</strong> do peso inicial. Meta: aumentar para <strong>${goalWeight ? goalWeight.toFixed(1) : '-'} kg</strong>.`;
                        } else {
                            vcWAchievementText.innerHTML = `Peso estável em relação ao início. Meta: aumentar para <strong>${goalWeight ? goalWeight.toFixed(1) : '-'} kg</strong>.`;
                        }
                    } else {
                        vcWAchievementText.innerHTML = `Manutenção ativa de peso. Meta: manter em <strong>${goalWeight ? goalWeight.toFixed(1) : '-'} kg</strong>.`;
                    }
                }

                if (vcTabWeightHistoryBody) {
                    vcTabWeightHistoryBody.innerHTML = '';
                    const sortedWeightsDesc = [...weights].reverse();
                    sortedWeightsDesc.forEach((w, i) => {
                        const tr = document.createElement('tr');
                        const [year, month, day] = w.date.split('-');
                        const formattedDate = `${day}/${month}/${year}`;
                        
                        let diffStr = '-';
                        const indexInAsc = weights.findIndex(x => x.id === w.id);
                        if (indexInAsc > 0) {
                            const prevWeight = parseFloat(weights[indexInAsc - 1].weight);
                            const currentWVal = parseFloat(w.weight);
                            const diffVal = currentWVal - prevWeight;
                            if (diffVal > 0) {
                                diffStr = `<span style="color:#ef4444; font-weight:600;">+${diffVal.toFixed(1)} kg</span>`;
                            } else if (diffVal < 0) {
                                diffStr = `<span style="color:#22c55e; font-weight:600;">${diffVal.toFixed(1)} kg</span>`;
                            } else {
                                diffStr = '<span style="opacity:0.5;">0.0 kg</span>';
                            }
                        }

                        tr.innerHTML = `
                            <td style="padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.03);">${formattedDate}</td>
                            <td style="padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.03); font-weight:600;">${parseFloat(w.weight).toFixed(1)} kg</td>
                            <td style="padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.03); text-align:right;">${diffStr}</td>
                        `;
                        vcTabWeightHistoryBody.appendChild(tr);
                    });
                }

                const chartCanvas = document.getElementById('vc-weight-chart');
                if (chartCanvas) {
                    if (vcWeightChartInstance) {
                        try {
                            vcWeightChartInstance.destroy();
                        } catch(e) {}
                    }
                    
                    const labels = weights.map(w => {
                        const [y, m, d] = w.date.split('-');
                        return `${d}/${m}`;
                    });
                    const dataPoints = weights.map(w => parseFloat(w.weight));
                    const goalPoints = goalWeight ? weights.map(w => goalWeight) : [];

                    const ctx = chartCanvas.getContext('2d');
                    
                    const datasets = [{
                        label: 'Peso Atual',
                        data: dataPoints,
                        borderColor: '#fee440',
                        backgroundColor: 'rgba(254, 228, 64, 0.03)',
                        borderWidth: 2.5,
                        tension: 0.35,
                        pointRadius: 4,
                        pointBackgroundColor: '#fee440',
                        fill: true
                    }];

                    if (goalWeight) {
                        datasets.push({
                            label: 'Meta de Peso',
                            data: goalPoints,
                            borderColor: '#22c55e',
                            borderDash: [6, 6],
                            borderWidth: 1.5,
                            pointRadius: 0,
                            fill: false
                        });
                    }

                    vcWeightChartInstance = new Chart(ctx, {
                        type: 'line',
                        data: { labels, datasets },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    display: true,
                                    position: 'top',
                                    labels: {
                                        color: '#fff',
                                        font: { size: 10, family: 'Geist' }
                                    }
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            return ` ${context.dataset.label}: ${context.raw} kg`;
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    grid: { color: 'rgba(255,255,255,0.05)' },
                                    ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 9, family: 'Geist' } }
                                },
                                y: {
                                    grid: { color: 'rgba(255,255,255,0.05)' },
                                    ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 9, family: 'Geist' } }
                                }
                            }
                        }
                    });
                }
            } else {
                if (vcWInitial) vcWInitial.textContent = '-';
                if (vcWCurrent) vcWCurrent.textContent = '-';
                if (vcWTarget) vcWTarget.textContent = goalWeight ? `${goalWeight.toFixed(1)} kg` : '-';
                if (vcWAchievementCard) vcWAchievementCard.style.display = 'none';
                if (vcTabWeightHistoryBody) {
                    vcTabWeightHistoryBody.innerHTML = '<tr><td colspan="3" style="text-align:center; opacity:0.5; padding:12px;">Nenhum peso registrado.</td></tr>';
                }
                if (vcWeightChartInstance) {
                    try {
                        vcWeightChartInstance.destroy();
                    } catch(e) {}
                    vcWeightChartInstance = null;
                }
            }

            const vcDiaryContainer = document.getElementById('vc-diary-container');
            if (diaryData && vcDiaryContainer) {
                vcDiaryContainer.innerHTML = '';
                if (!diaryData.meals || diaryData.meals.length === 0) {
                    vcDiaryContainer.innerHTML = '<div style="text-align:center; padding:40px; opacity:0.5; font-size:13px;">Nenhuma refeição registrada nos últimos dias.</div>';
                } else {
                    const mealsByDay = {};
                    diaryData.meals.forEach(m => {
                        const dateVal = m.date.split('T')[0];
                        if (!mealsByDay[dateVal]) mealsByDay[dateVal] = [];
                        mealsByDay[dateVal].push(m);
                    });

                    const sortedDates = Object.keys(mealsByDay).sort().reverse();

                    sortedDates.forEach((dateStr, idx) => {
                        const dayMeals = mealsByDay[dateStr];
                        
                        let dayCal = 0, dayCarbs = 0, dayProtein = 0, dayFat = 0;
                        dayMeals.forEach(m => {
                            const tot = m.total && typeof m.total === 'object' ? m.total : {};
                            dayCal += tot.calories || 0;
                            dayCarbs += tot.carbs || 0;
                            dayProtein += tot.protein || 0;
                            dayFat += tot.fat || 0;
                        });

                        const dateParts = dateStr.split('-');
                        const displayDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

                        const todayStr = new Date().toISOString().split('T')[0];
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        const yesterdayStr = yesterday.toISOString().split('T')[0];

                        let dayLabel = displayDate;
                        if (dateStr === todayStr) {
                            dayLabel = `Hoje (${displayDate})`;
                        } else if (dateStr === yesterdayStr) {
                            dayLabel = `Ontem (${displayDate})`;
                        }

                        const dayGroup = document.createElement('div');
                        dayGroup.className = `vc-diary-day-group${idx === 0 ? ' expanded' : ''}`;

                        dayGroup.innerHTML = `
                            <div class="vc-diary-day-header">
                                <div class="vc-diary-day-title">
                                    <i data-lucide="calendar" style="width:16px; height:16px; color:var(--color-primary);"></i>
                                    <span>${dayLabel}</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <span class="vc-diary-day-summary">${dayCal} kcal | C:${dayCarbs}g P:${dayProtein}g F:${dayFat}g</span>
                                    <i class="vc-diary-day-icon" data-lucide="chevron-down" style="width:16px; height:16px;"></i>
                                </div>
                            </div>
                            <div class="vc-diary-day-details">
                                <table style="width:100%; border-collapse:collapse;">
                                    <thead>
                                        <tr style="border-bottom:1px solid rgba(255,255,255,0.05); text-align:left; font-size:10px; opacity:0.5;">
                                            <th style="padding:6px 4px;">Hora</th>
                                            <th style="padding:6px 4px;">Refeição</th>
                                            <th style="padding:6px 4px;">Tipo</th>
                                            <th style="padding:6px 4px; text-align:right;">Calorias</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                    </tbody>
                                </table>
                            </div>
                        `;

                        const tbody = dayGroup.querySelector('tbody');
                        dayMeals.forEach(m => {
                            const tr = document.createElement('tr');
                            tr.style.borderBottom = '1px solid rgba(255,255,255,0.03)';
                            tr.style.fontSize = '12px';
                            tr.style.cursor = 'pointer';
                            const formattedTime = m.time.substring(0, 5);
                            const typeLabel = getMealTypeLabel(m);
                            const tot = m.total && typeof m.total === 'object' ? m.total : {};
                            const calVal = tot.calories !== undefined ? `${tot.calories} kcal` : '-';
                            
                            tr.innerHTML = `
                                <td style="padding:8px 4px; opacity:0.7;">${formattedTime}</td>
                                <td style="padding:8px 4px;"><strong>${m.name}</strong></td>
                                <td style="padding:8px 4px;"><span style="background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px; font-size:10px;">${typeLabel}</span></td>
                                <td style="padding:8px 4px; text-align:right; font-weight:600;">${calVal}</td>
                            `;
                            
                            tr.addEventListener('click', () => {
                                openAdminMealDetailsModal(m);
                            });
                            tbody.appendChild(tr);
                        });

                        dayGroup.querySelector('.vc-diary-day-header').addEventListener('click', () => {
                            dayGroup.classList.toggle('expanded');
                        });

                        vcDiaryContainer.appendChild(dayGroup);
                    });

                    if (window.lucide) window.lucide.createIcons();
                }
            }
        })();

        loadFeedbackHistory(patient.id);

        if (vcBtnSaveFeedback) {
            const newBtn = vcBtnSaveFeedback.cloneNode(true);
            vcBtnSaveFeedback.parentNode.replaceChild(newBtn, vcBtnSaveFeedback);
            newBtn.addEventListener('click', async () => {
                const content = vcFeedbackContent ? vcFeedbackContent.value.trim() : '';
                if (!content) {
                    alert('Digite as orientações para o paciente antes de salvar.');
                    return;
                }
                newBtn.disabled = true;
                newBtn.textContent = 'Enviando...';
                try {
                    const feedbackRes = await fetch(`${API_URL}/professional/patients/${patient.id}/feedback`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${adminState.token}`
                        },
                        body: JSON.stringify({ content })
                    });
                    const feedbackData = await feedbackRes.json();
                    if (!feedbackRes.ok) throw new Error(feedbackData.error || 'Erro ao enviar feedback.');
                    alert('Orientação enviada com sucesso para o paciente!');
                    if (vcFeedbackContent) vcFeedbackContent.value = '';
                    await loadFeedbackHistory(patient.id);
                } catch(err) {
                    alert(err.message);
                } finally {
                    newBtn.disabled = false;
                    newBtn.textContent = 'Enviar Orientação';
                }
            });
        }
    } else {
        if (vcPatientName) vcPatientName.textContent = 'Paciente Externo';
        if (vcPatientEmail) vcPatientEmail.textContent = 'Nenhum paciente vinculado a esta chamada';
        if (vcPatientWeight) vcPatientWeight.textContent = '-';
        if (vcPatientHeight) vcPatientHeight.textContent = '-';
        if (vcPatientGoal) vcPatientGoal.textContent = '-';
        if (vcPatientCalories) vcPatientCalories.textContent = '-';
        if (vcPatientWater) vcPatientWater.textContent = '-';
        
        const vcDiaryContainer = document.getElementById('vc-diary-container');
        if (vcDiaryContainer) vcDiaryContainer.innerHTML = '<div style="text-align:center; padding:40px; opacity:0.5; font-size:13px;">Chamada avulsa sem paciente associado.</div>';
        
        if (vcFeedbackContent) {
            vcFeedbackContent.value = '';
            vcFeedbackContent.disabled = true;
        }
        if (vcBtnSaveFeedback) vcBtnSaveFeedback.disabled = true;
    }

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const localVideo = document.getElementById('local-video');
        if (localVideo) localVideo.srcObject = localStream;

        isMicMuted = false;
        isCamOff = false;
        updateCallControlsUI();

        setupCallControlsListeners();

        peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        peerConnection.ontrack = (event) => {
            const remoteVideo = document.getElementById('remote-video');
            if (remoteVideo) {
                remoteVideo.srcObject = event.streams[0];
                remoteVideo.play().catch(err => {
                    console.warn("Autoplay bloqueado no stream remoto (Admin). Forçando muted e play...", err);
                    remoteVideo.muted = true;
                    remoteVideo.play().catch(e => console.error("Erro fatal ao reproduzir vídeo:", e));
                });
            }
            if (statusEl) statusEl.textContent = 'Em chamada';
        };

        const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        let host = window.location.host;
        if (typeof API_URL !== 'undefined' && API_URL.includes('http')) {
            try {
                const apiHost = new URL(API_URL).host;
                host = apiHost;
            } catch(e) {}
        }
        const wsUrl = `${protocol}${host}/api/signal`;

        if (statusEl) statusEl.textContent = 'Conectando ao servidor...';

        wsSignal = new WebSocket(wsUrl);

        wsSignal.onopen = () => {
            console.log('Conectado ao servidor de sinalização (Admin)');
            if (statusEl) statusEl.textContent = 'Aguardando paciente...';
            
            wsSignal.send(JSON.stringify({
                type: 'join',
                room: roomName,
                userId: adminState.user ? adminState.user.id : 'profissional-' + Date.now()
            }));
        };

        const processPendingCandidates = async () => {
            if (remoteCandidatesQueue.length > 0) {
                console.log(`[WebRTC-Admin] Aplicando ${remoteCandidatesQueue.length} candidatos ICE acumulados...`);
                for (const candidate of remoteCandidatesQueue) {
                    try {
                        await peerConnection.addIceCandidate(candidate);
                    } catch (e) {
                        console.error("Erro ao aplicar candidato acumulado:", e);
                    }
                }
                remoteCandidatesQueue = [];
            }
        };

        wsSignal.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);
                
                switch (data.type) {
                    case 'new-peer':
                        if (statusEl) statusEl.textContent = 'Iniciando chamada...';
                        const offer = await peerConnection.createOffer();
                        await peerConnection.setLocalDescription(offer);
                        wsSignal.send(JSON.stringify({
                            type: 'offer',
                            offer: offer,
                            room: roomName
                        }));
                        break;

                    case 'offer':
                        if (statusEl) statusEl.textContent = 'Conectando...';
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                        const answer = await peerConnection.createAnswer();
                        await peerConnection.setLocalDescription(answer);
                        wsSignal.send(JSON.stringify({
                            type: 'answer',
                            answer: answer,
                            room: roomName
                        }));
                        await processPendingCandidates();
                        break;

                    case 'answer':
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                        await processPendingCandidates();
                        break;

                    case 'candidate':
                        if (data.candidate) {
                            const candidate = new RTCIceCandidate(data.candidate);
                            if (peerConnection && peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
                                try {
                                    await peerConnection.addIceCandidate(candidate);
                                } catch (e) {
                                    console.error("Erro ao adicionar candidato ICE:", e);
                                }
                            } else {
                                console.log("[WebRTC-Admin] Acumulando candidato ICE (RemoteDescription não definida)");
                                remoteCandidatesQueue.push(candidate);
                            }
                        }
                        break;

                    case 'peer-left':
                        if (statusEl) statusEl.textContent = 'Chamada encerrada pelo paciente.';
                        setTimeout(() => {
                            closeVideoCall();
                        }, 1000);
                        break;

                    case 'error':
                        alert(data.message);
                        closeVideoCall();
                        break;
                }
            } catch(err) {
                console.error('Erro ao processar sinalização:', err);
            }
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate && wsSignal && wsSignal.readyState === WebSocket.OPEN) {
                wsSignal.send(JSON.stringify({
                    type: 'candidate',
                    candidate: event.candidate,
                    room: roomName
                }));
            }
        };

        peerConnection.onconnectionstatechange = () => {
            if (peerConnection) {
                console.log('WebRTC Connection State (Admin):', peerConnection.connectionState);
                if (peerConnection.connectionState === 'connected') {
                    if (statusEl) statusEl.textContent = 'Em chamada';
                } else if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
                    if (statusEl) statusEl.textContent = 'Conexão perdida. Reabrindo...';
                    setTimeout(() => {
                        if (peerConnection && (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected')) {
                            console.log('Encerrando chamada no profissional por desconexão persistente.');
                            closeVideoCall();
                        }
                    }, 5000);
                }
            }
        };

    } catch (err) {
        console.error('Erro ao iniciar vídeo chamada nativa (Admin):', err);
        alert('Não foi possível acessar câmera/microfone. Verifique se deu as permissões de mídia.');
        closeVideoCall();
    }
}

export function setupCallControlsListeners() {
    const btnMic = document.getElementById('btn-toggle-mic');
    const btnCam = document.getElementById('btn-toggle-cam');
    const btnHangup = document.getElementById('btn-hangup');
    const btnCloseCall = document.getElementById('btn-close-video-call');

    if (btnMic) {
        const newBtnMic = btnMic.cloneNode(true);
        btnMic.parentNode.replaceChild(newBtnMic, btnMic);
        newBtnMic.addEventListener('click', toggleMic);
    }
    if (btnCam) {
        const newBtnCam = btnCam.cloneNode(true);
        btnCam.parentNode.replaceChild(newBtnCam, btnCam);
        newBtnCam.addEventListener('click', toggleCam);
    }
    if (btnHangup) {
        const newBtnHangup = btnHangup.cloneNode(true);
        btnHangup.parentNode.replaceChild(newBtnHangup, btnHangup);
        newBtnHangup.addEventListener('click', () => {
            if (confirm('Deseja realmente encerrar a videochamada?')) {
                closeVideoCall();
            }
        });
    }
    if (btnCloseCall) {
        const newBtnCloseCall = btnCloseCall.cloneNode(true);
        btnCloseCall.parentNode.replaceChild(newBtnCloseCall, btnCloseCall);
        newBtnCloseCall.addEventListener('click', () => {
            if (confirm('Deseja realmente fechar a tela de videochamada?')) {
                closeVideoCall();
            }
        });
    }
}

export function toggleMic() {
    if (!localStream) return;
    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length > 0) {
        isMicMuted = !isMicMuted;
        audioTracks.forEach(track => track.enabled = !isMicMuted);
        updateCallControlsUI();
    }
}

export function toggleCam() {
    if (!localStream) return;
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length > 0) {
        isCamOff = !isCamOff;
        videoTracks.forEach(track => track.enabled = !isCamOff);
        updateCallControlsUI();
        
        const localVideo = document.getElementById('local-video');
        if (localVideo) {
            localVideo.style.opacity = isCamOff ? '0' : '1';
        }
    }
}

export function updateCallControlsUI() {
    const btnMic = document.getElementById('btn-toggle-mic');
    const btnCam = document.getElementById('btn-toggle-cam');

    if (btnMic) {
        if (isMicMuted) {
            btnMic.style.background = '#ef4444';
            btnMic.innerHTML = '<i data-lucide="mic-off" style="width:18px; height:18px;"></i>';
        } else {
            btnMic.style.background = '#22c55e';
            btnMic.innerHTML = '<i data-lucide="mic" style="width:18px; height:18px;"></i>';
        }
    }

    if (btnCam) {
        if (isCamOff) {
            btnCam.style.background = '#ef4444';
            btnCam.innerHTML = '<i data-lucide="video-off" style="width:18px; height:18px;"></i>';
        } else {
            btnCam.style.background = '#22c55e';
            btnCam.innerHTML = '<i data-lucide="video" style="width:18px; height:18px;"></i>';
        }
    }
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

export function closeVideoCall() {
    if (wsSignal && wsSignal.readyState === WebSocket.OPEN) {
        try {
            wsSignal.send(JSON.stringify({ type: 'leave' }));
        } catch(e) {}
        wsSignal.close();
    }
    wsSignal = null;

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    const localVideo = document.getElementById('local-video');
    const remoteVideo = document.getElementById('remote-video');
    if (localVideo) localVideo.srcObject = null;
    if (remoteVideo) remoteVideo.srcObject = null;

    const vcPatientName = document.getElementById('vc-patient-name');
    const vcPatientEmail = document.getElementById('vc-patient-email');
    const vcPatientWeight = document.getElementById('vc-patient-weight');
    const vcPatientHeight = document.getElementById('vc-patient-height');
    const vcPatientGoal = document.getElementById('vc-patient-goal');
    const vcPatientCalories = document.getElementById('vc-patient-calories');
    const vcPatientWater = document.getElementById('vc-patient-water');
    const vcDiaryContainer = document.getElementById('vc-diary-container');
    const vcFeedbackHistoryList = document.getElementById('vc-feedback-history-list');
    const vcFeedbackContent = document.getElementById('vc-feedback-content');

    if (vcPatientName) vcPatientName.textContent = 'Paciente';
    if (vcPatientEmail) vcPatientEmail.textContent = 'email@paciente.com';
    if (vcPatientWeight) vcPatientWeight.textContent = '-';
    if (vcPatientHeight) vcPatientHeight.textContent = '-';
    if (vcPatientGoal) vcPatientGoal.textContent = '-';
    if (vcPatientCalories) vcPatientCalories.textContent = '-';
    if (vcPatientWater) vcPatientWater.textContent = '-';
    if (vcDiaryContainer) vcDiaryContainer.innerHTML = '<div style="text-align:center; padding:40px; opacity:0.5; font-size:13px;">Selecione uma consulta ativa.</div>';
    if (vcFeedbackHistoryList) vcFeedbackHistoryList.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.5; font-size:12px;">Carregando histórico...</div>';
    if (vcFeedbackContent) {
        vcFeedbackContent.value = '';
        vcFeedbackContent.disabled = false;
    }

    if (vcWeightChartInstance) {
        try {
            vcWeightChartInstance.destroy();
        } catch(e) {
            console.error("Erro ao destruir gráfico:", e);
        }
        vcWeightChartInstance = null;
    }

    const vcWeightHistoryContent = document.getElementById('vc-weight-history-content');
    const vcWeightHistoryArrow = document.getElementById('vc-weight-history-arrow');
    const vcWeightHistoryBody = document.getElementById('vc-weight-history-body');
    if (vcWeightHistoryContent) vcWeightHistoryContent.style.display = 'none';
    if (vcWeightHistoryArrow) vcWeightHistoryArrow.style.transform = 'rotate(0deg)';
    if (vcWeightHistoryBody) {
        vcWeightHistoryBody.innerHTML = '<tr><td colspan="2" style="text-align:center; opacity:0.5; padding: 12px;">Nenhum peso registrado.</td></tr>';
    }

    const vcWInitial = document.getElementById('vc-w-initial');
    const vcWCurrent = document.getElementById('vc-w-current');
    const vcWTarget = document.getElementById('vc-w-target');
    const vcWAchievementCard = document.getElementById('vc-w-achievement-card');
    const vcWAchievementText = document.getElementById('vc-w-achievement-text');
    const vcTabWeightHistoryBody = document.getElementById('vc-tab-weight-history-body');

    if (vcWInitial) vcWInitial.textContent = '-';
    if (vcWCurrent) vcWCurrent.textContent = '-';
    if (vcWTarget) vcWTarget.textContent = '-';
    if (vcWAchievementCard) vcWAchievementCard.style.display = 'none';
    if (vcWAchievementText) vcWAchievementText.textContent = 'Carregando evolução...';
    if (vcTabWeightHistoryBody) {
        vcTabWeightHistoryBody.innerHTML = '<tr><td colspan="3" style="text-align:center; opacity:0.5; padding:12px;">Nenhum peso registrado.</td></tr>';
    }

    remoteCandidatesQueue = [];
    const screenVideoCall = document.getElementById('screen-video-call');
    if (screenVideoCall) screenVideoCall.style.display = 'none';

    loadAppointmentsData();
}

export function openAdminMealDetailsModal(meal) {
    const modal = document.getElementById('admin-meal-details-modal');
    if (!modal) return;

    const titleEl = document.getElementById('admin-meal-detail-title');
    if (titleEl) titleEl.textContent = meal.name || 'Detalhes da Refeição';

    const total = meal.total && typeof meal.total === 'object' ? meal.total : {};
    const caloriesEl = document.getElementById('admin-meal-detail-calories');
    const proteinEl = document.getElementById('admin-meal-detail-protein');
    const carbsEl = document.getElementById('admin-meal-detail-carbs');
    const fatEl = document.getElementById('admin-meal-detail-fat');

    if (caloriesEl) caloriesEl.textContent = total.calories !== undefined ? `${total.calories} kcal` : (meal.calories ? `${meal.calories} kcal` : '-');
    if (proteinEl) proteinEl.textContent = total.protein !== undefined ? `${total.protein}g` : (meal.protein ? `${meal.protein}g` : '-');
    if (carbsEl) carbsEl.textContent = total.carbs !== undefined ? `${total.carbs}g` : (meal.carbs ? `${meal.carbs}g` : '-');
    if (fatEl) fatEl.textContent = total.fat !== undefined ? `${total.fat}g` : (meal.fat ? `${meal.fat}g` : '-');

    const imageWrapper = document.getElementById('admin-meal-detail-image-wrapper');
    const photoImg = document.getElementById('admin-meal-detail-photo');
    if (imageWrapper && photoImg) {
        const hasImage = total && total.image && total.image.startsWith('data:image/');
        if (hasImage) {
            photoImg.src = total.image;
            imageWrapper.style.display = 'block';
        } else {
            photoImg.src = '';
            imageWrapper.style.display = 'none';
        }
    }

    const itemsContainer = document.getElementById('admin-meal-detail-items');
    if (itemsContainer) {
        itemsContainer.innerHTML = '';
        const items = Array.isArray(meal.items) ? meal.items : [];
        if (items.length === 0) {
            itemsContainer.innerHTML = '<div style="font-size:12px; opacity:0.5; text-align:center; padding:10px;">Nenhum alimento identificado.</div>';
        } else {
            items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.style.display = 'flex';
                itemDiv.style.justifyContent = 'space-between';
                itemDiv.style.alignItems = 'center';
                itemDiv.style.background = 'rgba(255,255,255,0.02)';
                itemDiv.style.border = '1px solid rgba(255,255,255,0.05)';
                itemDiv.style.borderRadius = '8px';
                itemDiv.style.padding = '8px 12px';
                itemDiv.style.fontSize = '12px';

                const itemCal = item.calories !== undefined ? `${item.calories} kcal` : '';
                const itemMacros = `C:${item.carbs || 0}g P:${item.protein || 0}g F:${item.fat || 0}g`;

                itemDiv.innerHTML = `
                    <div>
                        <strong style="color:#fff;">${item.name}</strong>
                        <div style="font-size:10px; opacity:0.5; margin-top:2px;">${itemMacros}</div>
                    </div>
                    <span style="font-weight:600; color:var(--color-primary);">${itemCal}</span>
                `;
                itemsContainer.appendChild(itemDiv);
            });
        }
    }

    modal.style.display = 'flex';
}

export function initProPatients() {
    const btnBack = document.getElementById('btn-back-to-patients');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            const detailsLayout = document.getElementById('patient-details-view');
            const listLayout = document.getElementById('patients-list-view');
            if (detailsLayout) detailsLayout.classList.add('hidden');
            if (listLayout) listLayout.classList.remove('hidden');
        });
    }

    const feedbackForm = document.getElementById('patient-feedback-form');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const patientId = document.getElementById('feedback-patient-id').value;
            const content = document.getElementById('feedback-content').value;

            try {
                const res = await fetch(`${API_URL}/professional/patients/${patientId}/feedback`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${adminState.token}`
                    },
                    body: JSON.stringify({ content })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Erro ao enviar feedback.');

                alert('Orientação enviada com sucesso para o paciente!');
                const contentInput = document.getElementById('feedback-content');
                if (contentInput) contentInput.value = '';
                await loadFeedbackHistory(patientId);
            } catch (err) {
                alert(err.message);
            }
        });
    }

    const closeBtn = document.getElementById('btn-close-admin-meal-details');
    const closeFooterBtn = document.getElementById('btn-close-admin-meal-details-footer');
    const adminMealDetailsModal = document.getElementById('admin-meal-details-modal');

    const closeModal = () => {
        if (adminMealDetailsModal) adminMealDetailsModal.style.display = 'none';
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (closeFooterBtn) closeFooterBtn.addEventListener('click', closeModal);
    if (adminMealDetailsModal) {
        adminMealDetailsModal.addEventListener('click', (e) => {
            if (e.target === adminMealDetailsModal) closeModal();
        });
    }

    const vcWeightHistoryHeader = document.getElementById('vc-weight-history-header');
    const vcWeightHistoryContent = document.getElementById('vc-weight-history-content');
    const vcWeightHistoryArrow = document.getElementById('vc-weight-history-arrow');
    if (vcWeightHistoryHeader && vcWeightHistoryContent) {
        vcWeightHistoryHeader.addEventListener('click', () => {
            const isHidden = vcWeightHistoryContent.style.display === 'none' || vcWeightHistoryContent.style.display === '';
            if (isHidden) {
                vcWeightHistoryContent.style.display = 'block';
                if (vcWeightHistoryArrow) vcWeightHistoryArrow.style.transform = 'rotate(180deg)';
            } else {
                vcWeightHistoryContent.style.display = 'none';
                if (vcWeightHistoryArrow) vcWeightHistoryArrow.style.transform = 'rotate(0deg)';
            }
        });
    }

    document.querySelectorAll('.diary-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.diary-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyMealFilter(parseInt(btn.dataset.days));
        });
    });

    const patientSearch = document.getElementById('patient-search-input');
    const patientGoal   = document.getElementById('patient-goal-filter');
    if (patientSearch) patientSearch.addEventListener('input', applyPatientFilters);
    if (patientGoal)   patientGoal.addEventListener('change', applyPatientFilters);

    // Abas de navegação interna do paciente
    const patientTabButtons = document.querySelectorAll('.patient-tab-btn');
    patientTabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            patientTabButtons.forEach(b => {
                b.classList.remove('active');
                b.style.borderBottomColor = 'transparent';
                b.style.color = 'var(--color-text-muted)';
            });
            btn.classList.add('active');
            btn.style.borderBottomColor = 'var(--color-primary)';
            btn.style.color = '#fff';

            const tabId = btn.dataset.patientTab;
            document.querySelectorAll('.patient-tab-content-panel').forEach(panel => {
                panel.classList.add('hidden');
                panel.classList.remove('active');
            });
            const activePanel = document.getElementById(`patient-tab-content-${tabId}`);
            if (activePanel) {
                activePanel.classList.remove('hidden');
                activePanel.classList.add('active');
            }

            const patient = adminState._currentPatient;
            if (tabId === 'meal-plan' && patient) {
                _loadPatientMealPlansInTab(patient.id);
            } else if (tabId === 'energy' && patient) {
                renderEnergyCalcTab(activePanel, patient);
            }
        });
    });

    // Formulário de Ficha Clínica do Paciente
    const clinicalForm = document.getElementById('pro-patient-clinical-form');
    if (clinicalForm) {
        clinicalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const patientId = document.getElementById('feedback-patient-id').value;
            if (!patientId) return;

            const comorbidities = document.getElementById('pro-clinical-comorbidities').value;
            const intolerances = document.getElementById('pro-clinical-intolerances').value;
            const dietary_restrictions = document.getElementById('pro-clinical-restrictions').value;
            const notes = document.getElementById('pro-clinical-notes').value;

            try {
                const res = await fetch(`${API_URL}/professional/patients/${patientId}/clinical`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${adminState.token}`
                    },
                    body: JSON.stringify({ comorbidities, intolerances, dietary_restrictions, notes })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Erro ao salvar ficha clínica.');

                const successMsg = document.getElementById('clinical-success-msg');
                if (successMsg) {
                    successMsg.classList.remove('hidden');
                    setTimeout(() => successMsg.classList.add('hidden'), 3000);
                }

                const patientObj = (adminState.allPatients || []).find(p => p.id == patientId);
                if (patientObj) {
                    patientObj.comorbidities = comorbidities;
                    patientObj.intolerances = intolerances;
                    patientObj.dietary_restrictions = dietary_restrictions;
                    patientObj.notes = notes;
                }
            } catch (err) {
                alert(err.message);
            }
        });
    }
}

// ==========================================
// DADOS ANTROPOMÉTRICOS
// ==========================================

export async function loadPatientMeasurements(patientId) {
    const tbody = document.getElementById('meas-history-body');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; color:var(--color-text-muted); padding:20px;">Carregando...</td></tr>`;

    // Configura formulário se ainda não inicializado para este paciente
    _setupMeasFormListeners(patientId);

    try {
        const res = await fetch(`${API_URL}/professional/patients/${patientId}/measurements`, {
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        const measurements = await res.json();
        _renderMeasurementsTable(measurements, patientId);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; color:var(--color-danger);">Erro ao carregar medições.</td></tr>`;
    }
}

function _renderMeasurementsTable(measurements, patientId) {
    adminState._currentPatientMeasurements = measurements || [];

    const tbody = document.getElementById('meas-history-body');
    if (!tbody) return;

    if (!measurements || measurements.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; color:var(--color-text-muted); padding:20px;">Nenhuma medição registrada.</td></tr>`;
        return;
    }

    tbody.innerHTML = measurements.map(m => {
        const bmi = (m.weight_kg && m.height_cm)
            ? (m.weight_kg / Math.pow(m.height_cm / 100, 2)).toFixed(1)
            : '-';
        const rcq = (m.waist_cm && m.hip_cm)
            ? (m.waist_cm / m.hip_cm).toFixed(2)
            : '-';
        const fmt = v => v != null ? parseFloat(v).toFixed(1) : '-';
        const dateStr = String(m.measured_at).split('T')[0];
        const [y, mo, d] = dateStr.split('-');
        const datePt = `${d}/${mo}/${y}`;

        return `<tr>
            <td style="font-weight:600; white-space:nowrap;">${datePt}</td>
            <td>${fmt(m.weight_kg)} <span style="font-size:10px;color:var(--color-text-muted);">kg</span></td>
            <td><span style="color:${_bmiColor(bmi)};">${bmi}</span></td>
            <td>${fmt(m.body_fat_pct)}${m.body_fat_pct != null ? '%' : ''}</td>
            <td>${fmt(m.muscle_mass_kg)}${m.muscle_mass_kg != null ? ' kg' : ''}</td>
            <td>${fmt(m.waist_cm)}</td>
            <td>${fmt(m.hip_cm)}</td>
            <td>${rcq}</td>
            <td>${fmt(m.chest_cm)}</td>
            <td>${fmt(m.arm_cm)}</td>
            <td>${fmt(m.thigh_cm)}</td>
            <td>
                <button class="btn-danger btn-sm meas-del-btn" data-meas-id="${m.id}" data-patient-id="${patientId}" title="Excluir medição" style="padding:3px 8px; font-size:11px;">
                    <i data-lucide="trash-2" style="width:12px;height:12px;"></i>
                </button>
            </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('.meas-del-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('Excluir esta medição?')) return;
            const measId = btn.dataset.measId;
            const pid = btn.dataset.patientId;
            try {
                const res = await fetch(`${API_URL}/professional/patients/${pid}/measurements/${measId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${adminState.token}` }
                });
                if (!res.ok) throw new Error('Erro ao excluir.');
                loadPatientMeasurements(pid);
            } catch (err) {
                alert(err.message);
            }
        });
    });

    if (window.lucide) window.lucide.createIcons();
}

function _bmiColor(bmi) {
    const v = parseFloat(bmi);
    if (isNaN(v)) return 'var(--color-text-muted)';
    if (v < 18.5) return '#60a5fa';
    if (v < 25)   return '#4ade80';
    if (v < 30)   return '#f5c14d';
    return '#f87171';
}

let _measFormInitialized = false;

function _setupMeasFormListeners(patientId) {
    if (_measFormInitialized) {
        // Apenas atualiza o patientId de referência
        adminState._measPatientId = patientId;
        return;
    }
    _measFormInitialized = true;
    adminState._measPatientId = patientId;

    // Preenche data de hoje por padrão
    const dateInput = document.getElementById('meas-date');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Toggle do formulário
    document.getElementById('btn-toggle-meas-form')?.addEventListener('click', () => {
        const wrap = document.getElementById('meas-form-wrap');
        if (wrap) {
            wrap.classList.toggle('hidden');
            // Preenche data ao abrir
            const d = document.getElementById('meas-date');
            if (d && !d.value) d.value = new Date().toISOString().split('T')[0];
        }
    });

    document.getElementById('btn-cancel-meas-form')?.addEventListener('click', () => {
        document.getElementById('meas-form-wrap')?.classList.add('hidden');
    });

    // Submit do formulário
    document.getElementById('patient-meas-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        const pid = adminState._measPatientId;
        const payload = {
            measured_at:     document.getElementById('meas-date')?.value    || null,
            weight_kg:       parseFloat(document.getElementById('meas-weight')?.value)  || null,
            height_cm:       parseFloat(document.getElementById('meas-height')?.value)  || null,
            body_fat_pct:    parseFloat(document.getElementById('meas-fat')?.value)     || null,
            muscle_mass_kg:  parseFloat(document.getElementById('meas-muscle')?.value)  || null,
            waist_cm:        parseFloat(document.getElementById('meas-waist')?.value)   || null,
            hip_cm:          parseFloat(document.getElementById('meas-hip')?.value)     || null,
            chest_cm:        parseFloat(document.getElementById('meas-chest')?.value)   || null,
            arm_cm:          parseFloat(document.getElementById('meas-arm')?.value)     || null,
            thigh_cm:        parseFloat(document.getElementById('meas-thigh')?.value)   || null,
            notes:           document.getElementById('meas-notes')?.value               || null,
        };
        try {
            const res = await fetch(`${API_URL}/professional/patients/${pid}/measurements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminState.token}` },
                body: JSON.stringify(payload)
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Erro ao salvar.'); }
            document.getElementById('patient-meas-form')?.reset();
            document.getElementById('meas-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('meas-form-wrap')?.classList.add('hidden');
            loadPatientMeasurements(pid);
        } catch (err) {
            alert(err.message);
        }
    });
}

// ==========================================
// CARDÁPIO DO PACIENTE (aba inline)
// ==========================================

async function _loadPatientMealPlansInTab(patientId) {
    const container = document.getElementById('patient-tab-content-meal-plan');
    if (!container) return;
    container.innerHTML = '<p class="description" style="text-align:center; padding:24px;">Carregando cardápios...</p>';

    try {
        const res = await fetch(`${API_URL}/professional/weekly-plans`, {
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        if (!res.ok) throw new Error('Não foi possível carregar os cardápios.');
        const allPlans = await res.json();
        const plans = allPlans.filter(p => String(p.patient_id) === String(patientId));
        _renderPatientPlansInTab(container, plans, patientId);
    } catch (err) {
        container.innerHTML = `<p style="color:var(--color-danger); text-align:center; padding:24px;">${err.message}</p>`;
    }
}

function _renderPatientPlansInTab(container, plans, patientId) {
    const patient = adminState._currentPatient;

    const plansHtml = plans.length === 0
        ? `<div style="text-align:center; padding:40px; color:var(--color-text-muted);">
               <p style="font-size:13px; margin-bottom:4px;">Nenhum cardápio criado para este paciente ainda.</p>
               <p class="description" style="font-size:11px;">Clique em "Novo Cardápio" para começar.</p>
           </div>`
        : `<div class="table-responsive" style="margin-top:4px;">
               <table class="data-table" style="font-size:13px;">
                   <thead>
                       <tr>
                           <th>Nome do Cardápio</th>
                           <th>Atualizado em</th>
                           <th>Status</th>
                           <th>Ações</th>
                       </tr>
                   </thead>
                   <tbody>
                       ${plans.map(p => {
                           const updatedAt = p.updated_at
                               ? new Date(p.updated_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' })
                               : '-';
                           const statusBadge = p.is_active
                               ? `<span style="color:#4ade80; font-size:11px; font-weight:600;">● Ativo</span>`
                               : `<span style="color:var(--color-text-muted); font-size:11px;">○ Inativo</span>`;
                           return `<tr>
                               <td><strong>${p.name}</strong></td>
                               <td>${updatedAt}</td>
                               <td>${statusBadge}</td>
                               <td>
                                   <button class="btn-primary btn-sm btn-open-plan-from-patient"
                                       data-plan-id="${p.id}"
                                       style="font-size:11px;">
                                       <i data-lucide="pencil" style="width:12px;height:12px;vertical-align:middle;margin-right:3px;"></i> Editar
                                   </button>
                               </td>
                           </tr>`;
                       }).join('')}
                   </tbody>
               </table>
           </div>`;

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; flex-wrap:wrap; gap:8px;">
            <div>
                <h3 style="margin:0; font-size:14px; font-weight:700;">Cardápios de ${patient?.name || 'Paciente'}</h3>
                <p class="description" style="margin:4px 0 0; font-size:11px;">${plans.length} cardápio${plans.length !== 1 ? 's' : ''} encontrado${plans.length !== 1 ? 's' : ''}</p>
            </div>
            <button class="btn-primary btn-sm" id="btn-new-plan-for-patient">
                <i data-lucide="plus" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> Novo Cardápio
            </button>
        </div>
        ${plansHtml}
    `;

    container.querySelector('#btn-new-plan-for-patient')?.addEventListener('click', () => {
        adminState._fromPatient    = patientId;
        adminState._newPlanPatientId = patientId;
        if (window.switchTab) window.switchTab('meal-plans');
        setTimeout(() => openMealPlanBuilder(null), 200);
    });

    container.querySelectorAll('.btn-open-plan-from-patient').forEach(btn => {
        btn.addEventListener('click', () => {
            adminState._fromPatient = patientId;
            const planId = parseInt(btn.dataset.planId);
            if (window.switchTab) window.switchTab('meal-plans');
            setTimeout(() => openMealPlanBuilder(planId), 200);
        });
    });

    if (window.lucide) window.lucide.createIcons();
}
