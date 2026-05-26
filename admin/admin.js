/**
 * ==========================================================
 * SLIMO ADMIN - ENGINE PRINCIPAL DE GERENCIAMENTO (FASE 2)
 * ==========================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // 0. CONFIGURAÇÃO DA API
    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:5000/api' 
        : '/api';

    // 1. ESTADO GLOBAL DO PAINEL ADMIN
    const adminState = {
        token: localStorage.getItem('slimo_token') || '',
        user: null,
        users: [],
        plans: [],
        settings: {},
        editingPlanId: null
    };

    // Elementos de tela principal
    const loginContainer = document.getElementById('login-container');
    const adminDashboard = document.getElementById('admin-dashboard');

    // Inicialização
    initAdmin();

    async function initAdmin() {
        setupVisibilityToggles();
        
        if (adminState.token) {
            const isAuthorized = await checkSession();
            if (isAuthorized) {
                setupEventListeners();
                const defaultTab = adminState.user.role === 'admin' ? 'overview' : 'patients';
                loadTab(defaultTab);
            } else {
                showLoginScreen();
            }
        } else {
            showLoginScreen();
        }

        // Configura submissão do formulário de login
        const loginForm = document.getElementById('admin-login-form');
        loginForm.addEventListener('submit', handleLogin);
    }

    // 2. CONTROLE DE AUTENTICAÇÃO E SESSÃO
    async function checkSession() {
        try {
            const res = await fetch(`${API_URL}/user/profile`, {
                headers: { 'Authorization': `Bearer ${adminState.token}` }
            });
            if (!res.ok) {
                localStorage.removeItem('slimo_token');
                adminState.token = '';
                return false;
            }

            const data = await res.json();
            const allowedRoles = ['admin', 'nutritionist', 'trainer'];
            if (!allowedRoles.includes(data.user.role)) {
                alert('Acesso negado. Esta área é restrita a administradores e profissionais.');
                localStorage.removeItem('slimo_token');
                adminState.token = '';
                return false;
            }

            adminState.user = data.user;
            showDashboardScreen();
            return true;
        } catch (err) {
            console.error('Erro na validação de sessão:', err);
            return false;
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorBanner = document.getElementById('login-error-msg');
        
        errorBanner.classList.add('hidden');
        errorBanner.innerText = '';

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Falha na autenticação.');

            const allowedRoles = ['admin', 'nutritionist', 'trainer'];
            if (!allowedRoles.includes(data.user.role)) {
                throw new Error('Acesso negado. Usuário não possui perfil de administrador ou profissional.');
            }

            adminState.token = data.token;
            adminState.user = data.user;
            localStorage.setItem('slimo_token', data.token);

            showDashboardScreen();
            setupEventListeners();
            const defaultTab = data.user.role === 'admin' ? 'overview' : 'patients';
            loadTab(defaultTab);
        } catch (err) {
            errorBanner.innerText = err.message;
            errorBanner.classList.remove('hidden');
        }
    }

    function showLoginScreen() {
        loginContainer.classList.remove('hidden');
        adminDashboard.classList.add('hidden');
    }

    function showDashboardScreen() {
        loginContainer.classList.add('hidden');
        adminDashboard.classList.remove('hidden');

        // Ajusta navegação de acordo com o cargo do usuário logado
        const role = adminState.user.role;
        
        const navOverview = document.getElementById('nav-overview');
        const navUsers = document.getElementById('nav-users');
        const navProfessionals = document.getElementById('nav-professionals');
        const navPlans = document.getElementById('nav-plans');
        const navBilling = document.getElementById('nav-billing');
        const navPatients = document.getElementById('nav-patients');
        const navSettings = document.getElementById('nav-settings');
        
        const sidebarTitle = document.querySelector('.sidebar-header span');
        if (sidebarTitle) {
            if (role === 'admin') {
                sidebarTitle.innerText = 'Slimo Admin';
            } else if (role === 'nutritionist') {
                sidebarTitle.innerText = 'Slimo Nutri';
            } else if (role === 'trainer') {
                sidebarTitle.innerText = 'Slimo Trainer';
            }
        }

        if (role === 'admin') {
            if (navOverview) navOverview.classList.remove('hidden');
            if (navUsers) navUsers.classList.remove('hidden');
            if (navProfessionals) navProfessionals.classList.remove('hidden');
            if (navPlans) navPlans.classList.remove('hidden');
            if (navBilling) navBilling.classList.remove('hidden');
            if (navPatients) navPatients.classList.add('hidden');
            if (navSettings) navSettings.classList.remove('hidden');
        } else {
            // profissional (nutritionist ou trainer)
            if (navOverview) navOverview.classList.add('hidden');
            if (navUsers) navUsers.classList.add('hidden');
            if (navProfessionals) navProfessionals.classList.add('hidden');
            if (navPlans) navPlans.classList.add('hidden');
            if (navBilling) navBilling.classList.remove('hidden');
            if (navPatients) navPatients.classList.remove('hidden');
            if (navSettings) navSettings.classList.add('hidden');
        }
    }

    // 3. EVENT LISTENERS E ROTEAMENTO INTERNO DE ABAS
    function setupEventListeners() {
        // Navegação de abas lateral
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove classe ativa de todos
                navButtons.forEach(b => b.classList.remove('active'));
                // Adiciona na atual
                btn.classList.add('active');
                
                const tabId = btn.dataset.tab;
                loadTab(tabId);
            });
        });

        // Logout
        document.getElementById('btn-logout').addEventListener('click', () => {
            localStorage.removeItem('slimo_token');
            adminState.token = '';
            adminState.user = null;
            showLoginScreen();
        });

        // Ir para o App do Usuário
        document.getElementById('btn-back-to-app').addEventListener('click', () => {
            window.location.href = '/';
        });

        // Busca de usuários em tempo real
        const userSearch = document.getElementById('user-search-input');
        if (userSearch) {
            userSearch.addEventListener('input', () => {
                renderUsersTable(userSearch.value.trim());
            });
        }

        // Formulário de Cadastro de Profissional
        const proForm = document.getElementById('pro-register-form');
        if (proForm) {
            proForm.addEventListener('submit', handleProRegistration);
        }

        // Formulário de Configuração de Plano (Criação/Edição)
        const planForm = document.getElementById('plan-config-form');
        if (planForm) {
            planForm.addEventListener('submit', handlePlanSave);
        }

        document.getElementById('btn-cancel-plan-edit').addEventListener('click', resetPlanForm);

        // Voltar da visualização de diário do paciente
        const btnBack = document.getElementById('btn-back-to-patients');
        if (btnBack) {
            btnBack.addEventListener('click', () => {
                document.getElementById('patient-details-view').classList.add('hidden');
                document.getElementById('patients-list-view').classList.remove('hidden');
            });
        }

        // Formulário de prescrição/feedback
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
                    document.getElementById('feedback-content').value = '';
                } catch (err) {
                    alert(err.message);
                }
            });
        }

        // Formulário de Credenciais Gerais do Sistema
        const settingsForm = document.getElementById('global-settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', handleSettingsSave);
        }
    }

    // Roteia o conteúdo de cada aba
    window.switchTab = function(tabId) {
        const navBtn = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
        if (navBtn) navBtn.click();
    };

    async function loadTab(tabId) {
        // Atualiza a classe active nos botões da sidebar
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            if (btn.dataset.tab === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Oculta todas as telas de abas
        const tabs = document.querySelectorAll('.tab-content');
        tabs.forEach(t => t.classList.remove('active'));

        // Mostra aba ativa
        const activeTab = document.getElementById(`tab-${tabId}`);
        if (activeTab) activeTab.classList.add('active');

        // Se for a aba de pacientes, certifique-se de voltar para a lista padrão caso estivesse em detalhes
        if (tabId === 'patients') {
            const listLayout = document.getElementById('patients-list-view');
            const detailsLayout = document.getElementById('patient-details-view');
            if (listLayout) listLayout.classList.remove('hidden');
            if (detailsLayout) detailsLayout.classList.add('hidden');
        }

        // Carrega os dados específicos da aba
        if (tabId === 'overview') {
            await loadOverviewData();
        } else if (tabId === 'users') {
            await loadUsersData();
        } else if (tabId === 'professionals') {
            await loadProfessionalsData();
        } else if (tabId === 'plans') {
            await loadPlansData();
        } else if (tabId === 'settings') {
            await loadSettingsData();
        } else if (tabId === 'billing') {
            await loadBillingData();
        } else if (tabId === 'patients') {
            await loadPatientsData();
        }

        // Garante que os ícones Lucide sejam atualizados
        lucide.createIcons();
    }

    // 4. MÉTODOS DA ABA: VISÃO GERAL (OVERVIEW)
    async function loadOverviewData() {
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

            document.getElementById('stat-total-users').innerText = total;
            document.getElementById('stat-premium-users').innerText = premium;
            document.getElementById('stat-professionals').innerText = pros;
            
            const geminiStatusLabel = document.getElementById('stat-gemini-status');
            if (geminiActive) {
                geminiStatusLabel.innerText = 'Ativa';
                geminiStatusLabel.style.color = 'var(--color-success)';
            } else {
                geminiStatusLabel.innerText = 'Inativa';
                geminiStatusLabel.style.color = 'var(--color-danger)';
            }
        } catch (err) {
            console.error('Erro ao carregar dados da visão geral:', err);
        }
    }

    // 5. MÉTODOS DA ABA: GERENCIAMENTO DE USUÁRIOS
    async function loadUsersData() {
        try {
            // Carrega planos disponíveis para o dropdown de mudança de planos
            const plansRes = await fetch(`${API_URL}/admin/plans`, {
                headers: { 'Authorization': `Bearer ${adminState.token}` }
            });
            if (plansRes.ok) {
                adminState.plans = await plansRes.json();
            }

            const res = await fetch(`${API_URL}/admin/users`, {
                headers: { 'Authorization': `Bearer ${adminState.token}` }
            });
            if (!res.ok) throw new Error('Não foi possível carregar os usuários.');
            adminState.users = await res.json();
            
            renderUsersTable();
        } catch (err) {
            alert(err.message);
        }
    }

    function renderUsersTable(filter = '') {
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';

        const filteredUsers = adminState.users.filter(u => {
            const query = filter.toLowerCase();
            return u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
        });

        if (filteredUsers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted);">Nenhum usuário correspondente encontrado.</td></tr>`;
            return;
        }

        filteredUsers.forEach(u => {
            const tr = document.createElement('tr');

            // Formatacao de roles e badges
            const roleLabels = { admin: 'Admin', nutritionist: 'Nutricionista', trainer: 'Personal Trainer', user: 'Usuário' };
            const roleBadgeClass = u.role;

            const isPremium = u.plan && u.plan !== 'trial';
            const planBadgeClass = isPremium ? 'premium' : 'trial';
            const planLabel = adminState.plans.find(p => p.name === u.plan)?.display_name || u.plan;

            let expiryStr = 'Nunca';
            if (u.plan === 'trial' && u.trial_expires_at) {
                expiryStr = new Date(u.trial_expires_at).toLocaleDateString('pt-BR');
            } else if (u.premium_expires_at) {
                expiryStr = new Date(u.premium_expires_at).toLocaleDateString('pt-BR');
            }

            // Dropdown de seleção de cargos
            const roleOptions = Object.entries(roleLabels).map(([val, label]) => `
                <option value="${val}" ${u.role === val ? 'selected' : ''}>${label}</option>
            `).join('');

            // Dropdown de planos dinâmicos
            const planOptions = adminState.plans.map(p => `
                <option value="${p.name}" ${u.plan === p.name ? 'selected' : ''}>${p.display_name}</option>
            `).join('');

            tr.innerHTML = `
                <td><strong>${u.name}</strong></td>
                <td>${u.email}</td>
                <td>
                    <span class="badge-role ${roleBadgeClass}">${roleLabels[u.role] || u.role}</span>
                </td>
                <td>
                    <span class="badge-plan ${planBadgeClass}">${planLabel}</span>
                </td>
                <td>${expiryStr}</td>
                <td>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <select class="table-select change-role-select" data-user-id="${u.id}">
                            ${roleOptions}
                        </select>
                        <select class="table-select change-plan-select" data-user-id="${u.id}">
                            ${planOptions}
                        </select>
                    </div>
                </td>
            `;

            // Vincular event listeners nos selects gerados
            tr.querySelector('.change-role-select').addEventListener('change', async (e) => {
                const newRole = e.target.value;
                if (u.id === adminState.user.id && newRole !== 'admin') {
                    alert('Por segurança, você não pode revogar suas próprias permissões de administrador.');
                    e.target.value = 'admin';
                    return;
                }
                await updateUserRole(u.id, newRole);
            });

            tr.querySelector('.change-plan-select').addEventListener('change', async (e) => {
                const newPlan = e.target.value;
                await updateUserPlan(u.id, newPlan);
            });

            tbody.appendChild(tr);
        });
    }

    async function updateUserRole(userId, role) {
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
            
            // Atualiza localmente e re-renderiza
            const userIndex = adminState.users.findIndex(u => u.id === userId);
            if (userIndex !== -1) adminState.users[userIndex].role = role;
            renderUsersTable(document.getElementById('user-search-input').value.trim());
        } catch (err) {
            alert(err.message);
            await loadUsersData(); // Recarrega
        }
    }

    async function updateUserPlan(userId, planName) {
        try {
            // Busca a duração do plano escolhido
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

    // 6. MÉTODOS DA ABA: PROFISSIONAIS
    async function loadProfessionalsData() {
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

    function renderProfessionalsTable() {
        const tbody = document.getElementById('pros-table-body');
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

    async function updateProfessionalCommission(userId, percentage) {
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

    async function demoteProfessional(userId) {
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

    async function handleProRegistration(e) {
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

    // 7. MÉTODOS DA ABA: CONFIGURAÇÃO DE PLANOS
    async function loadPlansData() {
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

    function renderPlansTable() {
        const tbody = document.getElementById('plans-table-body');
        tbody.innerHTML = '';

        adminState.plans.forEach(p => {
            const tr = document.createElement('tr');
            
            // Preço formatado
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
    }

    function editPlan(plan) {
        adminState.editingPlanId = plan.id;
        document.getElementById('plan-form-title').innerText = 'Editar Plano';
        document.getElementById('plan-id').value = plan.id;
        
        const nameInput = document.getElementById('plan-name');
        nameInput.value = plan.name;
        nameInput.setAttribute('disabled', 'true'); // Slug único não editável
        
        document.getElementById('plan-display-name').value = plan.display_name;
        document.getElementById('plan-price').value = plan.price;
        document.getElementById('plan-duration').value = plan.duration_days;
        document.getElementById('plan-description').value = plan.description || '';
        
        // Trata features JSON
        let featuresArr = [];
        try {
            featuresArr = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features;
        } catch (e) {
            featuresArr = plan.features || [];
        }
        document.getElementById('plan-features').value = featuresArr.join('\n');

        document.getElementById('btn-cancel-plan-edit').classList.remove('hidden');
    }

    function resetPlanForm() {
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
        
        document.getElementById('btn-cancel-plan-edit').classList.add('hidden');
    }

    async function handlePlanSave(e) {
        e.preventDefault();
        const id = document.getElementById('plan-id').value;
        const name = document.getElementById('plan-name').value;
        const display_name = document.getElementById('plan-display-name').value;
        const price = parseFloat(document.getElementById('plan-price').value);
        const duration_days = parseInt(document.getElementById('plan-duration').value);
        const description = document.getElementById('plan-description').value;
        const featuresText = document.getElementById('plan-features').value;

        // Trata os benefícios como array
        const features = featuresText.split('\n').map(f => f.trim()).filter(f => f !== '');

        const payload = {
            name,
            display_name,
            price,
            duration_days,
            description,
            features
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

    async function deletePlan(planId) {
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

    // 8. MÉTODOS DA ABA: CREDENCIAIS (KEYS / SETTINGS)
    async function loadSettingsData() {
        try {
            const res = await fetch(`${API_URL}/admin/settings`, {
                headers: { 'Authorization': `Bearer ${adminState.token}` }
            });
            if (!res.ok) throw new Error('Não foi possível carregar as credenciais.');
            adminState.settings = await res.json();

            // Preenche os campos
            document.getElementById('setting-gemini-key').value = adminState.settings.gemini_api_key || '';
            document.getElementById('setting-google-id').value = adminState.settings.google_client_id || '';
            document.getElementById('setting-mp-token').value = adminState.settings.mercadopago_token || '';
            document.getElementById('setting-asaas-key').value = adminState.settings.asaas_key || '';
        } catch (err) {
            alert(err.message);
        }
    }

    async function handleSettingsSave(e) {
        e.preventDefault();
        const gemini_api_key = document.getElementById('setting-gemini-key').value.trim();
        const google_client_id = document.getElementById('setting-google-id').value.trim();
        const mercadopago_token = document.getElementById('setting-mp-token').value.trim();
        const asaas_key = document.getElementById('setting-asaas-key').value.trim();

        const payload = {
            gemini_api_key,
            google_client_id,
            mercadopago_token,
            asaas_key
        };

        try {
            const res = await fetch(`${API_URL}/admin/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminState.token}`
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao salvar credenciais.');

            alert('Todas as credenciais foram gravadas com sucesso no banco de dados!');
            await loadSettingsData();
        } catch (err) {
            alert(err.message);
        }
    }

    // Helpers de Visibilidade de Senhas/Chaves
    function setupVisibilityToggles() {
        const toggleButtons = document.querySelectorAll('.toggle-visibility-btn');
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                const input = document.getElementById(targetId);
                if (input) {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    btn.innerHTML = isPassword ? '<i data-lucide="eye-off"></i>' : '<i data-lucide="eye"></i>';
                    lucide.createIcons();
                }
            });
        });
    }

    // 9. MÉTODOS DA ABA: FATURAMENTO (BILLING)
    async function loadBillingData() {
        try {
            const res = await fetch(`${API_URL}/admin/billing`, {
                headers: { 'Authorization': `Bearer ${adminState.token}` }
            });
            if (!res.ok) throw new Error('Não foi possível carregar os dados de faturamento.');
            
            const data = await res.json();
            const role = data.role;
            const stats = data.stats;
            const history = data.history;

            // Exibe/oculta os cards de acordo com a role
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

    function renderBillingTable(role, history) {
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
            // nutricionista ou trainer
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
        lucide.createIcons();
    }

    // 10. MÉTODOS DA ABA: MEUS PACIENTES
    async function loadPatientsData() {
        try {
            const res = await fetch(`${API_URL}/professional/patients`, {
                headers: { 'Authorization': `Bearer ${adminState.token}` }
            });
            if (!res.ok) throw new Error('Não foi possível carregar a lista de pacientes.');
            
            const patients = await res.json();
            renderPatientsTable(patients);
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    }

    function renderPatientsTable(patients) {
        const tbody = document.getElementById('patients-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (patients.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted);">Nenhum paciente ou cliente vinculado ao seu perfil.</td></tr>`;
            return;
        }

        patients.forEach(p => {
            const tr = document.createElement('tr');
            const isPremium = p.plan && p.plan !== 'trial';
            const planBadgeClass = isPremium ? 'premium' : 'trial';
            const planLabel = p.plan === 'premium' ? 'Premium' : p.plan;
            const weightHeight = p.weight && p.height ? `${p.weight} kg / ${p.height} cm` : '-';
            const calories = p.target_calories ? `${p.target_calories} kcal` : '-';

            tr.innerHTML = `
                <td><strong>${p.name}</strong></td>
                <td>${p.email}</td>
                <td><span class="badge-plan ${planBadgeClass}">${planLabel}</span></td>
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
        lucide.createIcons();
    }

    async function viewPatientDetails(patient) {
        // Mostra a tela de detalhes
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

        // Preenche com placeholder/loading
        const weightLabel = document.getElementById('detail-patient-weight');
        const heightLabel = document.getElementById('detail-patient-height');
        const goalLabel = document.getElementById('detail-patient-goal');
        const caloriesLabel = document.getElementById('detail-patient-calories');
        const waterStatus = document.getElementById('detail-water-status');
        const fastingStatus = document.getElementById('detail-fasting-status');
        const mealsBody = document.getElementById('detail-meals-table-body');
        
        if (weightLabel) weightLabel.innerText = patient.weight ? `${patient.weight} kg` : '-';
        if (heightLabel) heightLabel.innerText = patient.height ? `${patient.height} cm` : '-';
        if (goalLabel) goalLabel.innerText = patient.goal || '-';
        if (caloriesLabel) caloriesLabel.innerText = patient.target_calories ? `${patient.target_calories} kcal` : '-';
        if (waterStatus) waterStatus.innerText = 'Carregando...';
        if (fastingStatus) fastingStatus.innerText = 'Carregando...';
        if (mealsBody) mealsBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">Carregando diário...</td></tr>`;

        try {
            const res = await fetch(`${API_URL}/professional/patients/${patient.id}/diary`, {
                headers: { 'Authorization': `Bearer ${adminState.token}` }
            });
            if (!res.ok) throw new Error('Não foi possível carregar os detalhes do diário do paciente.');

            const data = await res.json();
            
            // 1. Atualiza dados de perfil que podem estar mais atualizados no backend
            if (data.profile) {
                if (weightLabel) weightLabel.innerText = data.profile.weight ? `${data.profile.weight} kg` : '-';
                if (heightLabel) heightLabel.innerText = data.profile.height ? `${data.profile.height} cm` : '-';
                if (goalLabel) goalLabel.innerText = data.profile.goal || '-';
                if (caloriesLabel) caloriesLabel.innerText = data.profile.target_calories ? `${data.profile.target_calories} kcal` : '-';
            }

            // 2. Consumo de água
            if (data.water) {
                if (waterStatus) waterStatus.innerText = `${data.water.consumed} / ${data.water.target} ml`;
            } else {
                if (waterStatus) waterStatus.innerText = '0 / 2500 ml';
            }

            // 3. Jejum ativo
            if (data.fasting && data.fasting.active) {
                const start = new Date(data.fasting.start_time);
                const hrs = data.fasting.duration_goal;
                if (fastingStatus) fastingStatus.innerText = `Ativo (Meta: ${hrs}h, Iniciado às ${start.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})})`;
            } else {
                if (fastingStatus) fastingStatus.innerText = 'Não ativo';
            }

            // 4. Refeições
            if (mealsBody) {
                mealsBody.innerHTML = '';
                
                if (!data.meals || data.meals.length === 0) {
                    mealsBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-text-muted);">Nenhuma refeição registrada nos últimos dias.</td></tr>`;
                } else {
                    data.meals.forEach(m => {
                        const tr = document.createElement('tr');
                        const mealDate = new Date(m.date + 'T' + m.time);
                        const formattedDateTime = `${mealDate.toLocaleDateString('pt-BR')} ${m.time.substring(0, 5)}`;
                        
                        const mealTypes = { breakfast: 'Café da Manhã', lunch: 'Almoço', dinner: 'Jantar', snack: 'Lanche', pre_workout: 'Pré-Treino', post_workout: 'Pós-Treino' };
                        const typeLabel = mealTypes[m.meal_type] || m.meal_type;

                        const carbs = m.carbs ? `${m.carbs}g` : '-';
                        const protein = m.protein ? `${m.protein}g` : '-';
                        const fat = m.fat ? `${m.fat}g` : '-';
                        const macros = `C:${carbs} | P:${protein} | F:${fat}`;

                        tr.innerHTML = `
                            <td>${formattedDateTime}</td>
                            <td><strong>${m.name}</strong><br><small>${m.description || ''}</small></td>
                            <td><span class="badge-role user" style="background-color: rgba(255,255,255,0.05); color: var(--color-text);">${typeLabel}</span></td>
                            <td>${m.calories ? `${m.calories} kcal` : '-'}</td>
                            <td><small>${macros}</small></td>
                        `;
                        mealsBody.appendChild(tr);
                    });
                }
            }
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
        lucide.createIcons();
    }
});
