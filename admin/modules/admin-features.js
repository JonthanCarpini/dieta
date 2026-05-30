/**
 * admin-features.js — Funcionalidades do Administrador
 */
import { API_URL, adminState } from './state.js';

// ── OVERVIEW ──
export async function loadOverviewData() {
    if (adminState.user.role !== 'admin') {
        document.getElementById('overview-admin-content')?.classList.add('hidden');
        document.getElementById('overview-pro-content')?.classList.remove('hidden');
        const titleEl = document.getElementById('overview-title');
        const subEl   = document.getElementById('overview-subtitle');
        if (titleEl) titleEl.innerText = 'Meu Painel';
        if (subEl)   subEl.innerText   = 'Resumo da sua atividade na plataforma';
        await loadProOverviewData();
        return;
    }

    document.getElementById('overview-admin-content')?.classList.remove('hidden');
    document.getElementById('overview-pro-content')?.classList.add('hidden');

    try {
        // Carrega usuários para as métricas
        const usersRes = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        if (!usersRes.ok) throw new Error();
        adminState.users = await usersRes.json();

        // Carrega planos
        const plansRes = await fetch(`${API_URL}/admin/plans`, {
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        if (plansRes.ok) {
            adminState.plans = await plansRes.json();
        }

        // Carrega chaves
        const settingsRes = await fetch(`${API_URL}/admin/settings`, {
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        if (settingsRes.ok) {
            adminState.settings = await settingsRes.json();
        }

        // Renderiza métricas
        const total = adminState.users.length;
        const premium = adminState.users.filter(u => u.plan === 'premium').length;
        const pros = adminState.users.filter(u => u.role === 'nutritionist' || u.role === 'trainer').length;
        const geminiActive = adminState.settings.gemini_api_key && adminState.settings.gemini_api_key.trim() !== '';

        const statTotalUsers = document.getElementById('stat-total-users');
        const statPremiumUsers = document.getElementById('stat-premium-users');
        const statProfessionals = document.getElementById('stat-professionals');
        if (statTotalUsers) statTotalUsers.innerText = total;
        if (statPremiumUsers) statPremiumUsers.innerText = premium;
        if (statProfessionals) statProfessionals.innerText = pros;
        
        const geminiStatusLabel = document.getElementById('stat-gemini-status');
        if (geminiStatusLabel) {
            if (geminiActive) {
                geminiStatusLabel.innerText = 'Ativa';
                geminiStatusLabel.style.color = 'var(--color-success)';
            } else {
                geminiStatusLabel.innerText = 'Inativa';
                geminiStatusLabel.style.color = 'var(--color-danger)';
            }
        }
    } catch (err) {
        console.error('Erro ao carregar dados da visão geral:', err);
    }
}

export async function loadProOverviewData() {
    const proContent = document.getElementById('overview-pro-content');
    if (!proContent) return;
    proContent.innerHTML = '<p class="description" style="text-align:center;padding:40px;">Carregando...</p>';

    try {
        const res = await fetch(`${API_URL}/admin/pro-overview`, {
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        if (!res.ok) throw new Error('Não foi possível carregar o painel.');
        const d = await res.json();

        const now  = new Date();
        const hour = now.getHours();
        const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
        const firstName = (adminState.user.name || '').split(' ')[0];
        const roleLabel = adminState.user.role === 'nutritionist' ? 'Nutricionista' : 'Personal Trainer';
        const dayNames = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
        const dayStr  = dayNames[now.getDay()];
        const dateStr = now.toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });

        let nextRows = '';
        if (d.nextAppointments.length === 0) {
            nextRows = '<tr><td colspan="3" style="text-align:center; color:var(--color-text-muted); padding:20px;">Nenhuma consulta agendada.</td></tr>';
        } else {
            const todayStr = now.toISOString().split('T')[0];
            nextRows = d.nextAppointments.map(a => {
                const aDate = String(a.appointment_date).split('T')[0];
                const isToday = aDate === todayStr;
                const [y,mo,day] = aDate.split('-');
                const dateLbl = isToday ? `<span style="color:var(--color-primary);font-weight:700;">Hoje</span>` : `${day}/${mo}`;
                const time = String(a.start_time).substring(0,5);
                const videoBtn = `<a href="${a.video_link}" target="_blank" class="btn-primary" style="font-size:11px;padding:4px 12px;text-decoration:none;display:inline-flex;align-items:center;gap:4px;"><i data-lucide="video" style="width:12px;height:12px;"></i> Entrar</a>`;
                return `<tr><td>${dateLbl} ${time}</td><td><strong>${a.patient_name}</strong></td><td>${videoBtn}</td></tr>`;
            }).join('');
        }

        proContent.innerHTML = `
            <div class="pro-greeting-card">
                <div>
                    <h2 class="pro-greeting-title">${greeting}, ${firstName}!</h2>
                    <p class="pro-greeting-sub">${dayStr}, ${dateStr} &middot; ${roleLabel}</p>
                </div>
                <button class="btn-secondary" onclick="switchTab('schedule')" style="font-size:12px;padding:8px 14px;">
                    <i data-lucide="calendar-clock"></i> Gerenciar Agenda
                </button>
            </div>
            <div class="stats-grid margin-top-lg">
                <div class="stat-card">
                    <div class="stat-icon bg-blue"><i data-lucide="users"></i></div>
                    <div class="stat-details"><span class="stat-label">Pacientes Ativos</span><h3>${d.totalPatients}</h3></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon bg-green"><i data-lucide="video"></i></div>
                    <div class="stat-details"><span class="stat-label">Consultas Hoje</span><h3 style="${d.consultationsToday > 0 ? 'color:var(--color-primary)' : ''}">${d.consultationsToday}</h3></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon bg-purple"><i data-lucide="calendar-clock"></i></div>
                    <div class="stat-details"><span class="stat-label">Slots Disponíveis Hoje</span><h3>${d.slotsToday}</h3></div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon bg-yellow"><i data-lucide="dollar-sign"></i></div>
                    <div class="stat-details"><span class="stat-label">Comissões Este Mês</span><h3>R$ ${d.commissionsMonth.toFixed(2).replace('.',',')}</h3></div>
                </div>
            </div>
            <div class="dashboard-card margin-top-lg">
                <h3>Próximas Consultas</h3>
                <p class="description">Consultas agendadas a partir de hoje</p>
                <div class="table-responsive margin-top-md">
                    <table class="data-table">
                        <thead><tr><th>Data / Hora</th><th>Paciente</th><th>Ação</th></tr></thead>
                        <tbody>${nextRows}</tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (err) {
        proContent.innerHTML = `<p style="color:var(--color-danger);text-align:center;padding:40px;">${err.message}</p>`;
    }
    if (window.lucide) window.lucide.createIcons();
}

// ── USERS ──
export async function loadUsersData() {
    try {
        const [plansRes, prosRes, usersRes] = await Promise.all([
            fetch(`${API_URL}/admin/plans`,         { headers: { 'Authorization': `Bearer ${adminState.token}` } }),
            fetch(`${API_URL}/admin/professionals`, { headers: { 'Authorization': `Bearer ${adminState.token}` } }),
            fetch(`${API_URL}/admin/users`,         { headers: { 'Authorization': `Bearer ${adminState.token}` } }),
        ]);
        if (plansRes.ok) adminState.plans = await plansRes.json();
        adminState.professionals = prosRes.ok ? await prosRes.json() : [];
        if (!usersRes.ok) throw new Error('Não foi possível carregar os usuários.');
        adminState.users = await usersRes.json();

        _populateUserFilters();
        _initUsersUI();
        renderUsersTable();
    } catch (err) {
        alert(err.message);
    }
}

// Popula selects de filtro (plano + nutricionista) uma vez
function _populateUserFilters() {
    const planSel = document.getElementById('user-filter-plan');
    if (planSel && adminState.plans) {
        planSel.innerHTML = '<option value="">Todos os planos</option>' +
            adminState.plans.map(p => `<option value="${p.name}">${p.display_name}</option>`).join('');
    }
    const proSel = document.getElementById('user-filter-pro');
    if (proSel && adminState.professionals) {
        proSel.innerHTML = '<option value="">Qualquer nutricionista</option><option value="none">Sem nutricionista</option>' +
            adminState.professionals.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    }
}

let _usersUIBound = false;
function _initUsersUI() {
    if (_usersUIBound) return;
    _usersUIBound = true;
    const rerender = () => renderUsersTable();
    document.getElementById('user-filter-role')?.addEventListener('change', rerender);
    document.getElementById('user-filter-plan')?.addEventListener('change', rerender);
    document.getElementById('user-filter-pro')?.addEventListener('change', rerender);
    document.getElementById('btn-new-user')?.addEventListener('click', () => openUserModal(null));
    document.getElementById('user-modal-cancel')?.addEventListener('click', closeUserModal);
    document.getElementById('user-modal-save')?.addEventListener('click', saveUserModal);
}

const ROLE_LABELS = { admin: 'Admin', nutritionist: 'Nutricionista', trainer: 'Personal Trainer', user: 'Usuário' };

export function renderUsersTable(filterArg) {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    // filtros (search vem do arg quando chamado pelo input; senão lê do campo)
    const search = (filterArg !== undefined ? filterArg : (document.getElementById('user-search-input')?.value || '')).toLowerCase().trim();
    const fRole = document.getElementById('user-filter-role')?.value || '';
    const fPlan = document.getElementById('user-filter-plan')?.value || '';
    const fPro  = document.getElementById('user-filter-pro')?.value || '';

    const filtered = adminState.users.filter(u => {
        if (search && !(u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search))) return false;
        if (fRole && u.role !== fRole) return false;
        if (fPlan && u.plan !== fPlan) return false;
        if (fPro === 'none' && u.professional_id) return false;
        if (fPro && fPro !== 'none' && String(u.professional_id || '') !== fPro) return false;
        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--color-text-muted);padding:20px;">Nenhum usuário encontrado.</td></tr>`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    filtered.forEach(u => {
        const tr = document.createElement('tr');
        const isPremium = u.plan && u.plan !== 'trial';
        const planLabel = adminState.plans.find(p => p.name === u.plan)?.display_name || u.plan;
        let expiryStr = 'Nunca';
        if (u.plan === 'trial' && u.trial_expires_at) expiryStr = new Date(u.trial_expires_at).toLocaleDateString('pt-BR');
        else if (u.premium_expires_at) expiryStr = new Date(u.premium_expires_at).toLocaleDateString('pt-BR');

        const roleOptions = Object.entries(ROLE_LABELS).map(([val, label]) =>
            `<option value="${val}" ${u.role === val ? 'selected' : ''}>${label}</option>`).join('');
        const planOptions = adminState.plans.map(p =>
            `<option value="${p.name}" ${u.plan === p.name ? 'selected' : ''}>${p.display_name}</option>`).join('');
        // dropdown de atribuição de nutricionista (só relevante para pacientes)
        const proOptions = `<option value="">— sem nutri —</option>` + adminState.professionals
            .filter(p => p.role === 'nutritionist' || p.role === 'trainer')
            .map(p => `<option value="${p.id}" ${String(u.professional_id||'') === String(p.id) ? 'selected' : ''}>${p.name}</option>`).join('');

        tr.innerHTML = `
            <td><strong>${u.name}</strong></td>
            <td>${u.email}</td>
            <td><span class="badge-role ${u.role}">${ROLE_LABELS[u.role] || u.role}</span></td>
            <td><span class="badge-plan ${isPremium ? 'premium' : 'trial'}">${planLabel}</span></td>
            <td>
                <select class="table-select assign-pro-select" data-user-id="${u.id}">${proOptions}</select>
            </td>
            <td>${expiryStr}</td>
            <td>
                <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                    <select class="table-select change-role-select" data-user-id="${u.id}" title="Cargo">${roleOptions}</select>
                    <select class="table-select change-plan-select" data-user-id="${u.id}" title="Plano">${planOptions}</select>
                    <button class="user-action-btn btn-edit-user" data-user-id="${u.id}" title="Editar"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>
                    <button class="user-action-btn danger btn-delete-user" data-user-id="${u.id}" title="Excluir"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                </div>
            </td>`;

        tr.querySelector('.assign-pro-select').addEventListener('change', e => assignProfessional(u.id, e.target.value));
        tr.querySelector('.change-role-select').addEventListener('change', async e => {
            const newRole = e.target.value;
            if (u.id === adminState.user.id && newRole !== 'admin') {
                alert('Por segurança, você não pode revogar suas próprias permissões de administrador.');
                e.target.value = 'admin'; return;
            }
            await updateUserRole(u.id, newRole);
        });
        tr.querySelector('.change-plan-select').addEventListener('change', e => updateUserPlan(u.id, e.target.value));
        tr.querySelector('.btn-edit-user').addEventListener('click', () => openUserModal(u));
        tr.querySelector('.btn-delete-user').addEventListener('click', () => deleteUser(u));
        tbody.appendChild(tr);
    });
    if (window.lucide) window.lucide.createIcons();
}

// ── Atribuir nutricionista ────────────────────────────────────────────────────
export async function assignProfessional(userId, professionalId) {
    try {
        const res = await fetch(`${API_URL}/admin/users/${userId}/assign-professional`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminState.token}` },
            body: JSON.stringify({ professional_id: professionalId ? parseInt(professionalId) : null }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao atribuir nutricionista.');
        const idx = adminState.users.findIndex(x => x.id === userId);
        if (idx !== -1) {
            adminState.users[idx].professional_id = professionalId ? parseInt(professionalId) : null;
            adminState.users[idx].professional_name = professionalId ? (adminState.professionals.find(p => p.id === parseInt(professionalId))?.name || null) : null;
        }
    } catch (err) { alert(err.message); await loadUsersData(); }
}

// ── Excluir usuário ─────────────────────────────────────────────────────────
export async function deleteUser(u) {
    if (!confirm(`Excluir o usuário "${u.name}" (${u.email})?\n\nEsta ação é permanente e remove todos os dados associados.`)) return;
    try {
        const res = await fetch(`${API_URL}/admin/users/${u.id}`, {
            method: 'DELETE', headers: { 'Authorization': `Bearer ${adminState.token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao excluir.');
        adminState.users = adminState.users.filter(x => x.id !== u.id);
        renderUsersTable();
    } catch (err) { alert(err.message); }
}

// ── Modal criar/editar ────────────────────────────────────────────────────────
export function openUserModal(u) {
    const modal = document.getElementById('user-modal');
    if (!modal) return;
    const isEdit = !!u;
    document.getElementById('user-modal-title').textContent = isEdit ? 'Editar usuário' : 'Novo usuário';
    document.getElementById('user-modal-id').value = isEdit ? u.id : '';
    document.getElementById('user-modal-name').value = isEdit ? u.name : '';
    document.getElementById('user-modal-email').value = isEdit ? u.email : '';
    document.getElementById('user-modal-password').value = '';
    document.getElementById('user-modal-pass-hint').textContent = isEdit ? '(deixe em branco para manter)' : '';
    document.getElementById('user-modal-create-fields').style.display = isEdit ? 'none' : 'block';
    const err = document.getElementById('user-modal-error'); err.style.display = 'none'; err.textContent = '';
    modal.classList.remove('hidden');
}
export function closeUserModal() {
    document.getElementById('user-modal')?.classList.add('hidden');
}
async function saveUserModal() {
    const id = document.getElementById('user-modal-id').value;
    const name = document.getElementById('user-modal-name').value.trim();
    const email = document.getElementById('user-modal-email').value.trim();
    const password = document.getElementById('user-modal-password').value;
    const role = document.getElementById('user-modal-role').value;
    const errEl = document.getElementById('user-modal-error');
    const showErr = m => { errEl.textContent = m; errEl.style.display = 'block'; };

    if (!name || !email) return showErr('Nome e e-mail são obrigatórios.');
    if (!id && (!password || password.length < 6)) return showErr('Senha de no mínimo 6 caracteres.');

    try {
        const url = id ? `${API_URL}/admin/users/${id}` : `${API_URL}/admin/users`;
        const method = id ? 'PUT' : 'POST';
        const body = id ? { name, email, password } : { name, email, password, role };
        const res = await fetch(url, {
            method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminState.token}` },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) return showErr(data.error || 'Erro ao salvar.');
        closeUserModal();
        await loadUsersData();
    } catch (err) { showErr(err.message); }
}

export async function updateUserRole(userId, role) {
    try {
        const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminState.token}`
            },
            body: JSON.stringify({ role })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao atualizar cargo.');
        
        const userIndex = adminState.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) adminState.users[userIndex].role = role;
        renderUsersTable(document.getElementById('user-search-input')?.value?.trim() || '');
    } catch (err) {
        alert(err.message);
        await loadUsersData();
    }
}

export async function updateUserPlan(userId, planName) {
    try {
        const selectedPlan = adminState.plans.find(p => p.name === planName);
        const durationDays = selectedPlan ? selectedPlan.duration_days : 30;

        const res = await fetch(`${API_URL}/admin/users/${userId}/plan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminState.token}`
            },
            body: JSON.stringify({ plan: planName, durationDays })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao atualizar plano.');
        
        alert('Assinatura e plano do usuário atualizados com sucesso!');
        await loadUsersData();
    } catch (err) {
        alert(err.message);
        await loadUsersData();
    }
}

// ── PROFESSIONALS ──
export async function loadProfessionalsData() {
    try {
        const res = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        if (!res.ok) throw new Error('Não foi possível carregar os profissionais.');
        const allUsers = await res.json();
        adminState.professionals = allUsers.filter(u => u.role === 'nutritionist' || u.role === 'trainer');
        renderProfessionalsTable();
    } catch (err) {
        alert(err.message);
    }
}

export function renderProfessionalsTable() {
    const tbody = document.getElementById('pros-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (adminState.professionals.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-text-muted);">Nenhum nutricionista ou personal cadastrado.</td></tr>`;
        return;
    }

    adminState.professionals.forEach(p => {
        const tr = document.createElement('tr');
        const roleLabels = { nutritionist: 'Nutricionista', trainer: 'Personal Trainer' };

        tr.innerHTML = `
            <td><strong>${p.name}</strong></td>
            <td>${p.email}</td>
            <td><span class="badge-role ${p.role}">${roleLabels[p.role] || p.role}</span></td>
            <td>
                <input type="number" class="table-select pro-commission-input" data-user-id="${p.id}" value="${p.commission_percentage || 0}" style="width: 80px;" min="0" max="100" step="0.01">
            </td>
            <td>
                <button class="btn-danger btn-demote-pro" data-user-id="${p.id}" style="font-size:11px; padding: 4px 8px;">
                    Rebaixar a Usuário
                </button>
            </td>
        `;

        tr.querySelector('.pro-commission-input').addEventListener('change', async (e) => {
            const val = parseFloat(e.target.value);
            await updateProfessionalCommission(p.id, val);
        });

        tr.querySelector('.btn-demote-pro').addEventListener('click', async () => {
            if (confirm(`Deseja remover as permissões profissionais de ${p.name}?`)) {
                await demoteProfessional(p.id);
            }
        });

        tbody.appendChild(tr);
    });
}

export async function updateProfessionalCommission(userId, percentage) {
    try {
        const res = await fetch(`${API_URL}/admin/users/${userId}/commission`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminState.token}`
            },
            body: JSON.stringify({ commission_percentage: percentage })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao atualizar comissão.');

        alert('Percentual de comissão atualizado com sucesso!');
    } catch (err) {
        alert(err.message);
        await loadProfessionalsData();
    }
}

export async function demoteProfessional(userId) {
    try {
        const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminState.token}`
            },
            body: JSON.stringify({ role: 'user' })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao remover cargo profissional.');
        
        alert('Profissional rebaixado a usuário com sucesso!');
        await loadProfessionalsData();
    } catch (err) {
        alert(err.message);
    }
}

export async function handleProRegistration(e) {
    e.preventDefault();
    const name = document.getElementById('pro-name').value;
    const email = document.getElementById('pro-email').value;
    const password = document.getElementById('pro-password').value;
    const role = document.getElementById('pro-role').value;
    const commission_percentage = parseFloat(document.getElementById('pro-commission').value || 0);

    try {
        const res = await fetch(`${API_URL}/admin/register-professional`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminState.token}`
            },
            body: JSON.stringify({ name, email, password, role, commission_percentage })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar profissional.');

        alert('Profissional de saúde cadastrado com sucesso!');
        document.getElementById('pro-register-form').reset();
        await loadProfessionalsData();
    } catch (err) {
        alert(err.message);
    }
}

// ── PLANS ──
export async function loadPlansData() {
    try {
        const res = await fetch(`${API_URL}/admin/plans`, {
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        if (!res.ok) throw new Error('Não foi possível carregar os planos.');
        adminState.plans = await res.json();
        renderPlansTable();
    } catch (err) {
        alert(err.message);
    }
}

export function renderPlansTable() {
    const tbody = document.getElementById('plans-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    adminState.plans.forEach(p => {
        const tr = document.createElement('tr');
        
        const priceFormatted = parseFloat(p.price) === 0 ? 'Grátis' : `R$ ${parseFloat(p.price).toFixed(2)}`;
        const isDefault = p.name === 'trial' || p.name === 'premium';

        tr.innerHTML = `
            <td><code>${p.name}</code></td>
            <td><strong>${p.display_name}</strong></td>
            <td>${priceFormatted}</td>
            <td>${p.duration_days} dias</td>
            <td>
                <div style="display:flex; gap:8px;">
                    <button class="table-action-btn btn-edit-plan" data-plan-id="${p.id}"><i data-lucide="edit-3" style="width:14px;height:14px;"></i></button>
                    ${!isDefault ? `<button class="table-action-btn btn-delete-plan" data-plan-id="${p.id}" style="color:var(--color-danger);"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>` : ''}
                </div>
            </td>
        `;

        tr.querySelector('.btn-edit-plan').addEventListener('click', () => editPlan(p));
        
        const btnDelete = tr.querySelector('.btn-delete-plan');
        if (btnDelete) {
            btnDelete.addEventListener('click', () => deletePlan(p.id));
        }

        tbody.appendChild(tr);
    });
    if (window.lucide) window.lucide.createIcons();
}

export function editPlan(plan) {
    adminState.editingPlanId = plan.id;
    document.getElementById('plan-form-title').innerText = 'Editar Plano';
    document.getElementById('plan-id').value = plan.id;
    
    const nameInput = document.getElementById('plan-name');
    nameInput.value = plan.name;
    nameInput.setAttribute('disabled', 'true');
    
    document.getElementById('plan-display-name').value = plan.display_name;
    document.getElementById('plan-price').value = plan.price;
    document.getElementById('plan-duration').value = plan.duration_days;
    document.getElementById('plan-description').value = plan.description || '';
    
    let featuresArr = [];
    try {
        featuresArr = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features;
    } catch (e) {
        featuresArr = plan.features || [];
    }
    document.getElementById('plan-features').value = featuresArr.join('\n');

    const hasNutri = plan.has_nutritionist === true || plan.has_nutritionist === 'true';
    const hasTrainer = plan.has_trainer === true || plan.has_trainer === 'true';

    const checkHasNutri = document.getElementById('plan-has-nutritionist');
    if (checkHasNutri) {
        checkHasNutri.checked = hasNutri;
        const group = document.getElementById('plan-max-nutritionist-group');
        if (group) group.classList.toggle('hidden', !hasNutri);
        const limitInput = document.getElementById('plan-max-nutritionist');
        if (limitInput) limitInput.value = plan.max_nutritionist_appointments_per_month || 0;
    }

    const checkHasTrainer = document.getElementById('plan-has-trainer');
    if (checkHasTrainer) {
        checkHasTrainer.checked = hasTrainer;
        const group = document.getElementById('plan-max-trainer-group');
        if (group) group.classList.toggle('hidden', !hasTrainer);
        const limitInput = document.getElementById('plan-max-trainer');
        if (limitInput) limitInput.value = plan.max_trainer_appointments_per_month || 0;
    }

    document.getElementById('btn-cancel-plan-edit').classList.remove('hidden');
}

export function resetPlanForm() {
    adminState.editingPlanId = null;
    document.getElementById('plan-form-title').innerText = 'Criar Novo Plano';
    document.getElementById('plan-id').value = '';
    
    const nameInput = document.getElementById('plan-name');
    nameInput.value = '';
    nameInput.removeAttribute('disabled');

    document.getElementById('plan-display-name').value = '';
    document.getElementById('plan-price').value = '';
    document.getElementById('plan-duration').value = '';
    document.getElementById('plan-description').value = '';
    document.getElementById('plan-features').value = '';

    const checkHasNutri = document.getElementById('plan-has-nutritionist');
    if (checkHasNutri) {
        checkHasNutri.checked = false;
        const group = document.getElementById('plan-max-nutritionist-group');
        if (group) group.classList.add('hidden');
        const limitInput = document.getElementById('plan-max-nutritionist');
        if (limitInput) limitInput.value = '0';
    }

    const checkHasTrainer = document.getElementById('plan-has-trainer');
    if (checkHasTrainer) {
        checkHasTrainer.checked = false;
        const group = document.getElementById('plan-max-trainer-group');
        if (group) group.classList.add('hidden');
        const limitInput = document.getElementById('plan-max-trainer');
        if (limitInput) limitInput.value = '0';
    }
    
    document.getElementById('btn-cancel-plan-edit').classList.add('hidden');
}

export async function handlePlanSave(e) {
    e.preventDefault();
    const id = document.getElementById('plan-id').value;
    const name = document.getElementById('plan-name').value;
    const display_name = document.getElementById('plan-display-name').value;
    const price = parseFloat(document.getElementById('plan-price').value);
    const duration_days = parseInt(document.getElementById('plan-duration').value);
    const description = document.getElementById('plan-description').value;
    const featuresText = document.getElementById('plan-features').value;

    const features = featuresText.split('\n').map(f => f.trim()).filter(f => f !== '');

    const has_nutritionist = document.getElementById('plan-has-nutritionist')?.checked || false;
    const max_nutritionist_appointments_per_month = parseInt(document.getElementById('plan-max-nutritionist')?.value) || 0;
    const has_trainer = document.getElementById('plan-has-trainer')?.checked || false;
    const max_trainer_appointments_per_month = parseInt(document.getElementById('plan-max-trainer')?.value) || 0;

    const payload = {
        name,
        display_name,
        price,
        duration_days,
        description,
        features,
        has_nutritionist,
        max_nutritionist_appointments_per_month,
        has_trainer,
        max_trainer_appointments_per_month
    };

    if (id) payload.id = parseInt(id);

    try {
        const res = await fetch(`${API_URL}/admin/plans`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminState.token}`
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao salvar plano.');

        alert('Plano salvo com sucesso!');
        resetPlanForm();
        await loadPlansData();
    } catch (err) {
        alert(err.message);
    }
}

export async function deletePlan(planId) {
    if (!confirm('Tem certeza que deseja excluir este plano? Todos os usuários vinculados a ele serão convertidos de volta para o Plano Trial.')) return;

    try {
        const res = await fetch(`${API_URL}/admin/plans/${planId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao excluir plano.');

        alert('Plano excluído com sucesso!');
        await loadPlansData();
    } catch (err) {
        alert(err.message);
    }
}

// ── KEYS & SETTINGS ──
export function setActiveLLMCard(provider) {
    ['gemini', 'openai', 'mistral'].forEach(p => {
        const card = document.getElementById(`provider-card-${p}`);
        if (card) card.classList.toggle('active', p === provider);
    });
    const radio = document.getElementById(`provider-${provider}`);
    if (radio) radio.checked = true;
}

export function setupLLMProviderCards() {
    ['gemini', 'openai', 'mistral'].forEach(p => {
        const radio = document.getElementById(`provider-${p}`);
        if (radio) radio.addEventListener('change', () => setActiveLLMCard(p));
    });

    const btnTest = document.getElementById('btn-test-llm');
    if (btnTest) {
        btnTest.addEventListener('click', async () => {
            const resultEl = document.getElementById('llm-test-result');
            btnTest.disabled = true;
            btnTest.innerHTML = '<i data-lucide="loader"></i> Testando...';
            if (window.lucide) window.lucide.createIcons();
            resultEl.className = 'llm-test-result';
            resultEl.textContent = '';

            await saveAllSettings();

            try {
                const res = await fetch(`${API_URL}/ai/test`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${adminState.token}` }
                });
                const data = await res.json();
                if (data.ok) {
                    resultEl.className = 'llm-test-result success';
                    resultEl.innerHTML = `✓ <strong>${data.provider}</strong> (${data.model}) respondeu em <strong>${data.latency_ms}ms</strong>.<br>
                        Receita de teste: <em>"${data.sample.name}"</em> — ${data.sample.calories} kcal, ${data.sample.time_min} min.`;
                } else {
                    resultEl.className = 'llm-test-result error';
                    resultEl.textContent = `✗ Falha: ${data.error}`;
                }
            } catch (err) {
                resultEl.className = 'llm-test-result error';
                resultEl.textContent = `✗ Erro de conexão: ${err.message}`;
            } finally {
                btnTest.disabled = false;
                btnTest.innerHTML = '<i data-lucide="zap"></i> Testar provedor ativo';
                if (window.lucide) window.lucide.createIcons();
                resultEl.classList.remove('hidden');
            }
        });
    }
}

export async function loadSettingsData() {
    try {
        const res = await fetch(`${API_URL}/admin/settings`, {
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        if (!res.ok) throw new Error('Não foi possível carregar as credenciais.');
        adminState.settings = await res.json();

        document.getElementById('setting-gemini-key').value  = adminState.settings.gemini_api_key  || '';
        document.getElementById('setting-openai-key').value  = adminState.settings.openai_api_key  || '';
        document.getElementById('setting-mistral-key').value = adminState.settings.mistral_api_key || '';
        document.getElementById('setting-google-id').value   = adminState.settings.google_client_id || '';
        document.getElementById('setting-mp-token').value    = adminState.settings.mercadopago_token || '';
        document.getElementById('setting-asaas-key').value   = adminState.settings.asaas_key || '';

        const spoonacularInput = document.getElementById('spoonacular-api-key-input');
        if (spoonacularInput && adminState.settings.spoonacular_api_key !== undefined) {
            spoonacularInput.value = adminState.settings.spoonacular_api_key || '';
        }

        setActiveLLMCard(adminState.settings.active_llm_provider || 'gemini');
        setupLLMProviderCards();
    } catch (err) {
        alert(err.message);
    }
}

export async function saveAllSettings() {
    const activeProvider = document.querySelector('input[name="active_llm_provider"]:checked')?.value || 'gemini';
    const payload = {
        active_llm_provider:  activeProvider,
        gemini_api_key:       document.getElementById('setting-gemini-key').value.trim(),
        openai_api_key:       document.getElementById('setting-openai-key').value.trim(),
        mistral_api_key:      document.getElementById('setting-mistral-key').value.trim(),
        google_client_id:     document.getElementById('setting-google-id').value.trim(),
        mercadopago_token:    document.getElementById('setting-mp-token').value.trim(),
        asaas_key:            document.getElementById('setting-asaas-key').value.trim(),
        spoonacular_api_key:  document.getElementById('spoonacular-api-key-input')?.value?.trim() || ''
    };
    const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminState.token}` },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao salvar credenciais.');
    return data;
}

export async function handleSettingsSave(e) {
    e.preventDefault();
    try {
        await saveAllSettings();
        alert('Todas as credenciais foram gravadas com sucesso no banco de dados!');
        await loadSettingsData();
    } catch (err) {
        alert(err.message);
    }
}

export function setupVisibilityToggles() {
    const toggleButtons = document.querySelectorAll('.toggle-visibility-btn');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            if (input) {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                btn.innerHTML = isPassword ? '<i data-lucide="eye-off"></i>' : '<i data-lucide="eye"></i>';
                if (window.lucide) window.lucide.createIcons();
            }
        });
    });
}

// ── BILLING ──
export async function loadBillingData() {
    try {
        const res = await fetch(`${API_URL}/admin/billing`, {
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        if (!res.ok) throw new Error('Não foi possível carregar os dados de faturamento.');
        
        const data = await res.json();
        const role = data.role;
        const stats = data.stats;
        const history = data.history;

        const adminStatsDiv = document.getElementById('billing-stats-admin');
        const proStatsDiv = document.getElementById('billing-stats-pro');
        
        if (role === 'admin') {
            if (adminStatsDiv) adminStatsDiv.classList.remove('hidden');
            if (proStatsDiv) proStatsDiv.classList.add('hidden');
            
            const grossLabel = document.getElementById('billing-stat-gross');
            const commsLabel = document.getElementById('billing-stat-commissions');
            const netLabel = document.getElementById('billing-stat-net');
            
            if (grossLabel) grossLabel.innerText = `R$ ${parseFloat(stats.gross || 0).toFixed(2)}`;
            if (commsLabel) commsLabel.innerText = `R$ ${parseFloat(stats.commission || 0).toFixed(2)}`;
            if (netLabel) netLabel.innerText = `R$ ${parseFloat(stats.net || 0).toFixed(2)}`;
        } else {
            if (adminStatsDiv) adminStatsDiv.classList.add('hidden');
            if (proStatsDiv) proStatsDiv.classList.remove('hidden');
            
            const commsLabel = document.getElementById('pro-stat-commissions');
            const patientsLabel = document.getElementById('pro-stat-patients');
            
            if (commsLabel) commsLabel.innerText = `R$ ${parseFloat(stats.commission || 0).toFixed(2)}`;
            if (patientsLabel) patientsLabel.innerText = stats.activePatients || 0;
        }

        renderBillingTable(role, history);
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
}

export function renderBillingTable(role, history) {
    const header = document.getElementById('billing-table-header');
    const tbody = document.getElementById('billing-table-body');
    
    if (!header || !tbody) return;
    
    tbody.innerHTML = '';
    
    if (role === 'admin') {
        header.innerHTML = `
            <tr>
                <th>ID</th>
                <th>Data</th>
                <th>Paciente</th>
                <th>Plano</th>
                <th>Gateway</th>
                <th>Profissional Vinculado</th>
                <th>Comissão</th>
                <th>Valor Pago</th>
            </tr>
        `;

        if (history.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--color-text-muted);">Nenhuma transação financeira registrada.</td></tr>`;
            return;
        }

        history.forEach(item => {
            const date = new Date(item.created_at).toLocaleDateString('pt-BR');
            const commissionStr = item.commission_amount && parseFloat(item.commission_amount) > 0
                ? `R$ ${parseFloat(item.commission_amount).toFixed(2)} (${item.commission_percentage || 0}%)`
                : 'Nenhum';
            const proStr = item.professional_name ? `${item.professional_name}` : '-';
            const gatewayStr = `${(item.payment_gateway || 'mp').toUpperCase()} (${item.gateway_payment_id || '-'})`;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code>#${item.id}</code></td>
                <td>${date}</td>
                <td><strong>${item.patient_name}</strong><br><small>${item.patient_email}</small></td>
                <td><span class="badge-plan premium">${(item.plan_name || 'premium').toUpperCase()}</span></td>
                <td><small>${gatewayStr}</small></td>
                <td>${proStr}</td>
                <td>${commissionStr}</td>
                <td><strong>R$ ${parseFloat(item.amount || 0).toFixed(2)}</strong></td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        header.innerHTML = `
            <tr>
                <th>ID</th>
                <th>Data</th>
                <th>Paciente</th>
                <th>Plano</th>
                <th>Comissão Recebida</th>
                <th>Valor Pago</th>
            </tr>
        `;

        if (history.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted);">Nenhum repasse de comissão registrado.</td></tr>`;
            return;
        }

        history.forEach(item => {
            const date = new Date(item.created_at).toLocaleDateString('pt-BR');
            const commissionVal = parseFloat(item.commission_amount || 0);
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code>#${item.id}</code></td>
                <td>${date}</td>
                <td><strong>${item.patient_name}</strong><br><small>${item.patient_email}</small></td>
                <td><span class="badge-plan premium">${(item.plan_name || 'premium').toUpperCase()}</span></td>
                <td><strong style="color: var(--color-success);">R$ ${commissionVal.toFixed(2)}</strong></td>
                <td>R$ ${parseFloat(item.amount || 0).toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    }
    if (window.lucide) window.lucide.createIcons();
}

export function initAdminFeatures() {
    setupVisibilityToggles();

    const userSearch = document.getElementById('user-search-input');
    if (userSearch) {
        userSearch.addEventListener('input', () => {
            renderUsersTable(userSearch.value.trim());
        });
    }

    const proForm = document.getElementById('pro-register-form');
    if (proForm) {
        proForm.addEventListener('submit', handleProRegistration);
    }

    const planForm = document.getElementById('plan-config-form');
    if (planForm) {
        planForm.addEventListener('submit', handlePlanSave);
    }

    const checkHasNutri = document.getElementById('plan-has-nutritionist');
    if (checkHasNutri) {
        checkHasNutri.addEventListener('change', function() {
            const group = document.getElementById('plan-max-nutritionist-group');
            if (group) group.classList.toggle('hidden', !this.checked);
        });
    }

    const checkHasTrainer = document.getElementById('plan-has-trainer');
    if (checkHasTrainer) {
        checkHasTrainer.addEventListener('change', function() {
            const group = document.getElementById('plan-max-trainer-group');
            if (group) group.classList.toggle('hidden', !this.checked);
        });
    }

    const btnCancelEdit = document.getElementById('btn-cancel-plan-edit');
    if (btnCancelEdit) {
        btnCancelEdit.addEventListener('click', resetPlanForm);
    }

    const settingsForm = document.getElementById('global-settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', handleSettingsSave);
    }
}
