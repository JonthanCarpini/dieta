/**
 * ==========================================================
 * NUTRIR ADMIN - ENGINE PRINCIPAL DE GERENCIAMENTO (FASE 2)
 * ==========================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // 0. CONFIGURAÇÃO DA API
    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:5000/api' 
        : '/api';

    // 1. ESTADO GLOBAL DO PAINEL ADMIN
    const adminState = {
        token: localStorage.getItem('nutrir_token') || '',
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
                localStorage.removeItem('nutrir_token');
                adminState.token = '';
                return false;
            }

            const data = await res.json();
            const allowedRoles = ['admin', 'nutritionist', 'trainer'];
            if (!allowedRoles.includes(data.user.role)) {
                alert('Acesso negado. Esta área é restrita a administradores e profissionais.');
                localStorage.removeItem('nutrir_token');
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
            localStorage.setItem('nutrir_token', data.token);

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
        const navSchedule = document.getElementById('nav-schedule');
        const navSettings = document.getElementById('nav-settings');
        const navAppointments = document.getElementById('nav-appointments');
        
        const sidebarTitle = document.querySelector('.sidebar-header span');
        if (sidebarTitle) {
            if (role === 'admin') {
                sidebarTitle.innerText = 'Nutrir Admin';
            } else if (role === 'nutritionist') {
                sidebarTitle.innerText = 'Nutrir Nutri';
            } else if (role === 'trainer') {
                sidebarTitle.innerText = 'Nutrir Trainer';
            }
        }

        if (role === 'admin') {
            if (navOverview) navOverview.classList.remove('hidden');
            if (navUsers) navUsers.classList.remove('hidden');
            if (navProfessionals) navProfessionals.classList.remove('hidden');
            if (navPlans) navPlans.classList.remove('hidden');
            if (navBilling) navBilling.classList.remove('hidden');
            if (navPatients) navPatients.classList.add('hidden');
            if (navSchedule) navSchedule.classList.add('hidden');
            if (navAppointments) navAppointments.classList.remove('hidden');
            if (navSettings) navSettings.classList.remove('hidden');
        } else {
            // profissional (nutritionist ou trainer)
            if (navOverview) navOverview.classList.remove('hidden');
            if (navUsers) navUsers.classList.add('hidden');
            if (navProfessionals) navProfessionals.classList.add('hidden');
            if (navPlans) navPlans.classList.add('hidden');
            if (navBilling) navBilling.classList.remove('hidden');
            if (navPatients) navPatients.classList.remove('hidden');
            if (navSchedule) navSchedule.classList.remove('hidden');
            if (navAppointments) navAppointments.classList.remove('hidden');
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
            localStorage.removeItem('nutrir_token');
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

        // Fechar modal de detalhes de refeição do admin
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

        // Alternar exibição do histórico de peso na vídeo chamada (Acordeão)
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

        // Filtros de período no diário do paciente
        document.querySelectorAll('.diary-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.diary-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                applyMealFilter(parseInt(btn.dataset.days));
            });
        });

        // Filtros de pacientes (busca + objetivo)
        const patientSearch = document.getElementById('patient-search-input');
        const patientGoal   = document.getElementById('patient-goal-filter');
        if (patientSearch) patientSearch.addEventListener('input', applyPatientFilters);
        if (patientGoal)   patientGoal.addEventListener('change', applyPatientFilters);
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
        } else if (tabId === 'schedule') {
            await loadScheduleData();
        } else if (tabId === 'appointments') {
            await loadAppointmentsData();
        }

        // Garante que os ícones Lucide sejam atualizados
        lucide.createIcons();
    }

    // 4. MÉTODOS DA ABA: VISÃO GERAL (OVERVIEW)
    async function loadOverviewData() {
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

    async function loadProOverviewData() {
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
            if (proContent) proContent.innerHTML = `<p style="color:var(--color-danger);text-align:center;padding:40px;">${err.message}</p>`;
        }
        lucide.createIcons();
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
    function setActiveLLMCard(provider) {
        ['gemini', 'openai', 'mistral'].forEach(p => {
            const card = document.getElementById(`provider-card-${p}`);
            if (card) card.classList.toggle('active', p === provider);
        });
        const radio = document.getElementById(`provider-${provider}`);
        if (radio) radio.checked = true;
    }

    function setupLLMProviderCards() {
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
                lucide.createIcons();
                resultEl.className = 'llm-test-result';
                resultEl.textContent = '';

                // Salvar configurações atuais antes de testar
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
                    lucide.createIcons();
                    resultEl.classList.remove('hidden');
                }
            });
        }
    }

    async function loadSettingsData() {
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

            setActiveLLMCard(adminState.settings.active_llm_provider || 'gemini');
            setupLLMProviderCards();
        } catch (err) {
            alert(err.message);
        }
    }

    async function saveAllSettings() {
        const activeProvider = document.querySelector('input[name="active_llm_provider"]:checked')?.value || 'gemini';
        const payload = {
            active_llm_provider:  activeProvider,
            gemini_api_key:       document.getElementById('setting-gemini-key').value.trim(),
            openai_api_key:       document.getElementById('setting-openai-key').value.trim(),
            mistral_api_key:      document.getElementById('setting-mistral-key').value.trim(),
            google_client_id:     document.getElementById('setting-google-id').value.trim(),
            mercadopago_token:    document.getElementById('setting-mp-token').value.trim(),
            asaas_key:            document.getElementById('setting-asaas-key').value.trim()
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

    async function handleSettingsSave(e) {
        e.preventDefault();
        try {
            await saveAllSettings();
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
            adminState.allPatients = patients;
            renderPatientsTable(patients);

            // Resetar campos de filtro
            const searchInput = document.getElementById('patient-search-input');
            const goalSelect  = document.getElementById('patient-goal-filter');
            if (searchInput) searchInput.value = '';
            if (goalSelect)  goalSelect.value  = '';
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    }

    function applyPatientFilters() {
        const search = (document.getElementById('patient-search-input')?.value || '').toLowerCase().trim();
        const goal   = document.getElementById('patient-goal-filter')?.value || '';
        const filtered = (adminState.allPatients || []).filter(p => {
            const matchSearch = !search || p.name.toLowerCase().includes(search) || p.email.toLowerCase().includes(search);
            const matchGoal   = !goal   || p.goal === goal;
            return matchSearch && matchGoal;
        });
        renderPatientsTable(filtered);
    }

    function renderPatientsTable(patients) {
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
        lucide.createIcons();
    }

    // 11. MÉTODOS DA ABA: AGENDA DE DISPONIBILIDADE (GRADE VISUAL)
    const SCHEDULE_TIMES = [];
    for (let h = 7; h <= 20; h++) {
        SCHEDULE_TIMES.push(`${String(h).padStart(2,'0')}:00`);
        SCHEDULE_TIMES.push(`${String(h).padStart(2,'0')}:30`);
    }

    const GRID_DAYS = [
        { dow: 1, short: 'Seg', full: 'Segunda-feira' },
        { dow: 2, short: 'Ter', full: 'Terça-feira' },
        { dow: 3, short: 'Qua', full: 'Quarta-feira' },
        { dow: 4, short: 'Qui', full: 'Quinta-feira' },
        { dow: 5, short: 'Sex', full: 'Sexta-feira' },
        { dow: 6, short: 'Sáb', full: 'Sábado' },
        { dow: 0, short: 'Dom', full: 'Domingo' },
    ];

    let _selectedCells = new Set();
    let _dragState = null;

    function timeToMinutes(t) {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    }

    function addMinutesToTime(t, mins) {
        const total = timeToMinutes(t) + mins;
        const h = Math.floor(total / 60);
        const m = total % 60;
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    }

    function slotsToSelectedCells(slots) {
        const cells = new Set();
        slots.forEach(s => {
            const startMins = timeToMinutes((s.start_time || '00:00').substring(0, 5));
            const endMins   = timeToMinutes((s.end_time   || '00:00').substring(0, 5));
            SCHEDULE_TIMES.forEach(t => {
                if (timeToMinutes(t) >= startMins && timeToMinutes(t) < endMins) {
                    cells.add(`${s.day_of_week}|${t}`);
                }
            });
        });
        return cells;
    }

    function selectedCellsToSlots(cells) {
        const dayGroups = {};
        cells.forEach(key => {
            const pipe = key.indexOf('|');
            const dow = parseInt(key.substring(0, pipe));
            const t   = key.substring(pipe + 1);
            if (!dayGroups[dow]) dayGroups[dow] = [];
            dayGroups[dow].push(t);
        });

        const slots = [];
        Object.entries(dayGroups).forEach(([dow, times]) => {
            times.sort();
            let rangeStart = null;
            let lastTime   = null;
            times.forEach(t => {
                if (!rangeStart) {
                    rangeStart = t;
                    lastTime   = t;
                } else {
                    if (timeToMinutes(t) - timeToMinutes(lastTime) > 30) {
                        slots.push({ day_of_week: parseInt(dow), start_time: rangeStart, end_time: addMinutesToTime(lastTime, 30) });
                        rangeStart = t;
                    }
                    lastTime = t;
                }
            });
            if (rangeStart) {
                slots.push({ day_of_week: parseInt(dow), start_time: rangeStart, end_time: addMinutesToTime(lastTime, 30) });
            }
        });
        return slots;
    }

    async function loadScheduleData() {
        try {
            const res = await fetch(`${API_URL}/admin/availability`, {
                headers: { 'Authorization': `Bearer ${adminState.token}` }
            });
            if (!res.ok) throw new Error('Não foi possível carregar a agenda.');
            const slots = await res.json();
            renderScheduleGrid(slots);
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    }

    function renderScheduleGrid(existingSlots) {
        const container = document.getElementById('schedule-days-container');
        if (!container) return;

        _selectedCells = slotsToSelectedCells(existingSlots);
        _dragState = null;

        const headerCells = GRID_DAYS.map(d => `
            <th class="sg-day-header">
                <div class="sg-day-inner">
                    <span class="sg-day-label">${d.short}</span>
                    <button class="sg-day-toggle" data-dow="${d.dow}" title="Alternar ${d.full}">
                        <i data-lucide="flip-vertical-2"></i>
                    </button>
                </div>
            </th>`).join('');

        const bodyRows = SCHEDULE_TIMES.map(t => {
            const isHour = t.endsWith(':00');
            const tds = GRID_DAYS.map(d => {
                const key = `${d.dow}|${t}`;
                const sel = _selectedCells.has(key);
                return `<td class="sg-cell${sel ? ' sg-selected' : ''}" data-key="${key}" data-dow="${d.dow}" data-time="${t}"></td>`;
            }).join('');
            return `<tr class="sg-row${isHour ? ' sg-hour-mark' : ''}">
                <td class="sg-time-label">${t}</td>${tds}
            </tr>`;
        }).join('');

        container.innerHTML = `
            <div class="sched-presets">
                <button class="sched-preset-btn" id="sched-weekdays">
                    <i data-lucide="briefcase"></i> Dias Úteis 8h–18h
                </button>
                <button class="sched-preset-btn" id="sched-fullweek">
                    <i data-lucide="calendar"></i> Semana Completa 8h–18h
                </button>
                <button class="sched-preset-btn sched-preset-danger" id="sched-clear">
                    <i data-lucide="trash-2"></i> Limpar Tudo
                </button>
                <span class="sched-info" id="sched-info"></span>
            </div>
            <div class="sg-legend">
                <span class="sg-legend-item sg-legend-free">Disponível (1 consulta)</span>
                <span class="sg-legend-item sg-legend-blocked">Bloqueado</span>
                <span class="sg-legend-hint">Cada linha = 1 consulta de 30 min · Clique ou arraste para alternar</span>
            </div>
            <div class="sg-scroll-wrap">
                <table class="sg-table" id="sg-table" cellspacing="0" cellpadding="0">
                    <thead>
                        <tr>
                            <th class="sg-corner">30min</th>
                            ${headerCells}
                        </tr>
                    </thead>
                    <tbody>${bodyRows}</tbody>
                </table>
            </div>`;

        updateSchedInfo();
        bindGridEvents(container);
        lucide.createIcons();
    }

    function updateSchedInfo() {
        const el = document.getElementById('sched-info');
        if (!el) return;
        const count = _selectedCells.size;
        if (count === 0) {
            el.textContent = 'Nenhum horário selecionado';
            el.className = 'sched-info sched-info-empty';
        } else {
            const hrs = (count * 0.5).toFixed(1).replace('.', ',');
            el.textContent = `${count} slots · ${hrs}h / semana`;
            el.className = 'sched-info sched-info-active';
        }
    }

    function applyPreset(preset) {
        _selectedCells.clear();
        if (preset === 'weekdays' || preset === 'fullweek') {
            const days = preset === 'weekdays' ? [1,2,3,4,5] : [0,1,2,3,4,5,6];
            days.forEach(dow => {
                SCHEDULE_TIMES.forEach(t => {
                    const mins = timeToMinutes(t);
                    if (mins >= 8 * 60 && mins < 18 * 60) _selectedCells.add(`${dow}|${t}`);
                });
            });
        }
        document.querySelectorAll('.sg-cell').forEach(c => {
            c.classList.toggle('sg-selected', _selectedCells.has(c.dataset.key));
        });
        updateSchedInfo();
    }

    function bindGridEvents(container) {
        document.getElementById('sched-weekdays')?.addEventListener('click', () => applyPreset('weekdays'));
        document.getElementById('sched-fullweek')?.addEventListener('click', () => applyPreset('fullweek'));
        document.getElementById('sched-clear')?.addEventListener('click', () => applyPreset('clear'));

        container.querySelectorAll('.sg-day-toggle').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                const dow = btn.dataset.dow;
                const dayCells = [...container.querySelectorAll(`.sg-cell[data-dow="${dow}"]`)];
                const anySelected = dayCells.some(c => _selectedCells.has(c.dataset.key));
                dayCells.forEach(c => {
                    if (anySelected) { _selectedCells.delete(c.dataset.key); c.classList.remove('sg-selected'); }
                    else             { _selectedCells.add(c.dataset.key);    c.classList.add('sg-selected'); }
                });
                updateSchedInfo();
            });
        });

        const table = document.getElementById('sg-table');
        if (!table) return;

        table.addEventListener('mousedown', e => {
            const cell = e.target.closest('.sg-cell');
            if (!cell) return;
            e.preventDefault();
            _dragState = { willSelect: !_selectedCells.has(cell.dataset.key) };
            toggleCellState(cell, cell.dataset.key, _dragState.willSelect);
            updateSchedInfo();
        });

        table.addEventListener('mouseover', e => {
            if (!_dragState) return;
            const cell = e.target.closest('.sg-cell');
            if (!cell) return;
            toggleCellState(cell, cell.dataset.key, _dragState.willSelect);
            updateSchedInfo();
        });

        document.addEventListener('mouseup', () => { _dragState = null; });
    }

    function toggleCellState(cell, key, select) {
        if (select) { _selectedCells.add(key);    cell.classList.add('sg-selected'); }
        else         { _selectedCells.delete(key); cell.classList.remove('sg-selected'); }
    }

    // Botão de salvar agenda
    document.addEventListener('click', async (e) => {
        if (e.target.closest('#btn-save-schedule')) {
            const slots = selectedCellsToSlots(_selectedCells);
            try {
                const btn = document.getElementById('btn-save-schedule');
                if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader"></i> Salvando...'; lucide.createIcons(); }
                const res = await fetch(`${API_URL}/admin/availability`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminState.token}` },
                    body: JSON.stringify({ slots })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Erro ao salvar agenda.');
                alert(`Disponibilidade salva com sucesso! ${slots.length} intervalo(s) configurado(s).`);
            } catch (err) {
                alert(err.message);
            } finally {
                const btn = document.getElementById('btn-save-schedule');
                if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="save"></i> Salvar Disponibilidade'; lucide.createIcons(); }
            }
        }
    });

    function getMealTypeLabel(meal) {
        if (meal.meal_type) {
            const mealTypes = { breakfast: 'Café da Manhã', lunch: 'Almoço', dinner: 'Jantar', snack: 'Lanche', pre_workout: 'Pré-Treino', post_workout: 'Pós-Treino' };
            return mealTypes[meal.meal_type] || meal.meal_type;
        }
        if (!meal.time) return 'Refeição';
        const hour = parseInt(meal.time.split(':')[0]);
        if (hour >= 5 && hour < 11) return 'Café da Manhã';
        if (hour >= 11 && hour < 15) return 'Almoço';
        if (hour >= 15 && hour < 19) return 'Lanche';
        if (hour >= 19 && hour < 23) return 'Jantar';
        return 'Lanche Noturno';
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
        const weightHistoryBody = document.getElementById('detail-weight-history-body');
        
        if (weightLabel) weightLabel.innerText = patient.weight ? `${patient.weight} kg` : '-';
        if (heightLabel) heightLabel.innerText = patient.height ? `${patient.height} cm` : '-';
        if (goalLabel) goalLabel.innerText = patient.goal || '-';
        if (caloriesLabel) caloriesLabel.innerText = patient.target_calories ? `${patient.target_calories} kcal` : '-';
        if (waterStatus) waterStatus.innerText = 'Carregando...';
        if (fastingStatus) fastingStatus.innerText = 'Carregando...';
        if (mealsBody) mealsBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">Carregando diário...</td></tr>`;
        if (weightHistoryBody) weightHistoryBody.innerHTML = `<tr><td colspan="2" style="text-align: center; opacity: 0.5;">Carregando pesos...</td></tr>`;

        // Busca histórico de pesos e renderiza gráfico
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

            // 4. Refeições — armazena e renderiza com filtro
            adminState._allMeals = data.meals || [];
            adminState._patientTargetCalories = data.profile?.target_calories || 0;

            // Resetar filtro para 7 dias e renderizar
            document.querySelectorAll('.diary-filter-btn').forEach(b => b.classList.remove('active'));
            const btn7 = document.querySelector('.diary-filter-btn[data-days="7"]');
            if (btn7) btn7.classList.add('active');
            applyMealFilter(7);
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
        await loadFeedbackHistory(patient.id);
        lucide.createIcons();
    }

    function applyMealFilter(days) {
        const meals = adminState._allMeals || [];
        const targetCal = adminState._patientTargetCalories || 0;
        const now = new Date();
        const cutoffMs = days > 0 ? now - days * 86400000 : 0;

        const filtered = cutoffMs
            ? meals.filter(m => {
                const dateStr = String(m.date).split('T')[0]; // normaliza 'YYYY-MM-DD' ou ISO completo
                return new Date(dateStr + 'T00:00:00').getTime() >= cutoffMs;
            })
            : meals;

        // Caloric adherence
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

    function renderPatientMealsTable(meals) {
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

    function renderPatientWeightChart(weights) {
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

    async function loadFeedbackHistory(patientId) {
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

    async function loadAppointmentsData() {
        const headersRow = document.getElementById('appointments-table-headers');
        const tbody = document.getElementById('appointments-table-body');
        
        if (!headersRow || !tbody) return;

        const role = adminState.user.role;

        // 1. Configura os cabeçalhos baseados na role
        if (role === 'admin') {
            headersRow.innerHTML = `
                <th>Data / Hora</th>
                <th>Paciente</th>
                <th>Profissional</th>
                <th>Status</th>
                <th>Link de Vídeo</th>
                <th>Ações</th>
            `;
        } else {
            headersRow.innerHTML = `
                <th>Data / Hora</th>
                <th>Paciente</th>
                <th>Status</th>
                <th>Link de Vídeo</th>
                <th>Ações</th>
            `;
        }

        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted);">Carregando consultas...</td></tr>';

        try {
            const res = await fetch(`${API_URL}/admin/appointments`, {
                headers: { 'Authorization': `Bearer ${adminState.token}` }
            });
            if (!res.ok) throw new Error('Não foi possível carregar as consultas.');
            
            const appointments = await res.json();
            tbody.innerHTML = '';

            if (appointments.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted);">Nenhuma consulta agendada encontrada.</td></tr>`;
                return;
            }

            appointments.forEach(a => {
                const tr = document.createElement('tr');

                // Formatar Data
                const dateParts = a.appointment_date.split('T')[0].split('-');
                const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                const startTime = a.start_time.slice(0, 5);
                const endTime = a.end_time.slice(0, 5);
                const dateTimeStr = `${formattedDate} ${startTime} - ${endTime}`;

                // Status Badge
                let statusBadge = '';
                let actionBtnHtml = '';

                if (a.status === 'scheduled') {
                    statusBadge = '<span class="badge-plan premium" style="background-color:rgba(34,197,94,0.15); color:#22c55e;">Agendado</span>';
                    actionBtnHtml = `
                        <button class="btn-danger btn-cancel-admin-app" data-app-id="${a.id}" style="font-size:11px; padding: 4px 8px;">
                            Cancelar
                        </button>
                    `;
                } else if (a.status === 'cancelled') {
                    statusBadge = '<span class="badge-plan trial" style="background-color:rgba(239,68,68,0.15); color:#ef4444;">Cancelado</span>';
                    tr.style.opacity = '0.6';
                } else {
                    statusBadge = '<span class="badge-plan trial" style="background-color:rgba(255,255,255,0.1); color:var(--color-text-muted);">Concluído</span>';
                    tr.style.opacity = '0.7';
                }

                // Link Vídeo Nativo
                const videoLinkHtml = a.status === 'scheduled' 
                    ? `<a href="#" class="btn-start-call" data-video-link="${a.video_link}" style="color:var(--color-primary); font-weight:600; display:flex; align-items:center; gap:4px; text-decoration:none;"><i data-lucide="video" style="width:14px; height:14px;"></i> Iniciar Chamada</a>`
                    : '<span style="color:var(--color-text-muted);">—</span>';

                // Paciente Info
                const patientInfo = `<strong>${a.patient_name}</strong><br><small>${a.patient_email}</small>`;

                // Profissional Info (só para Admin)
                const professionalRoleLabel = a.professional_role === 'nutritionist' ? 'Nutri' : 'Personal';
                const professionalInfo = `<strong>${a.professional_name}</strong><br><small>${professionalRoleLabel}</small>`;

                if (role === 'admin') {
                    tr.innerHTML = `
                        <td>${dateTimeStr}</td>
                        <td>${patientInfo}</td>
                        <td>${professionalInfo}</td>
                        <td>${statusBadge}</td>
                        <td>${videoLinkHtml}</td>
                        <td>${actionBtnHtml}</td>
                    `;
                } else {
                    tr.innerHTML = `
                        <td>${dateTimeStr}</td>
                        <td>${patientInfo}</td>
                        <td>${statusBadge}</td>
                        <td>${videoLinkHtml}</td>
                        <td>${actionBtnHtml}</td>
                    `;
                }

                const cancelBtn = tr.querySelector('.btn-cancel-admin-app');
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', async () => {
                        if (confirm('Deseja realmente cancelar esta consulta?')) {
                            await cancelAdminAppointment(a.id);
                        }
                    });
                }
                const startCallBtn = tr.querySelector('.btn-start-call');
                if (startCallBtn) {
                    startCallBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const link = e.currentTarget.getAttribute('data-video-link');
                        startVideoCall(link, {
                            id: a.patient_id,
                            name: a.patient_name,
                            email: a.patient_email
                        });
                    });
                }

                tbody.appendChild(tr);
            });

            lucide.createIcons();
        } catch (err) {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-danger);">${err.message}</td></tr>`;
        }
    }

    async function cancelAdminAppointment(appointmentId) {
        try {
            const res = await fetch(`${API_URL}/admin/appointments/${appointmentId}/cancel`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${adminState.token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao cancelar consulta.');

            alert('Consulta cancelada com sucesso!');
            await loadAppointmentsData();
        } catch (err) {
            alert(err.message);
        }
    }

    let localStream = null;
    let peerConnection = null;
    let wsSignal = null;
    let isMicMuted = false;
    let isCamOff = false;
    let remoteCandidatesQueue = [];
    let vcWeightChartInstance = null;

    async function startVideoCall(link, patient) {
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

        // Preencher prontuário do paciente na coluna direita se houver paciente
        const vcPatientName = document.getElementById('vc-patient-name');
        const vcPatientEmail = document.getElementById('vc-patient-email');
        const vcPatientWeight = document.getElementById('vc-patient-weight');
        const vcPatientHeight = document.getElementById('vc-patient-height');
        const vcPatientGoal = document.getElementById('vc-patient-goal');
        const vcPatientCalories = document.getElementById('vc-patient-calories');
        const vcPatientWater = document.getElementById('vc-patient-water');
        const vcMealsList = document.getElementById('vc-meals-list');
        const vcFeedbackContent = document.getElementById('vc-feedback-content');
        const vcBtnSaveFeedback = document.getElementById('vc-btn-save-feedback');

        // Configurar navegação de abas na vídeo chamada
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

        // Garantir que a primeira aba esteja ativa por padrão
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

            // Fazer fetch assíncrono dos dados do paciente, diário e histórico de pesos
            (async () => {
                let weights = [];
                let diaryData = null;

                // Carregar histórico de peso para a vídeo chamada (loading)
                const vcWeightHistoryBody = document.getElementById('vc-weight-history-body');
                const vcTabWeightHistoryBody = document.getElementById('vc-tab-weight-history-body');
                if (vcWeightHistoryBody) {
                    vcWeightHistoryBody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding: 12px; opacity:0.5;">Carregando pesos...</td></tr>';
                }
                if (vcTabWeightHistoryBody) {
                    vcTabWeightHistoryBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 12px; opacity:0.5;">Carregando pesos...</td></tr>';
                }

                // 1. Fetch weight log
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

                // 2. Fetch diary & profile
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

                // Renderizar o accordion simples de peso
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

                // Preencher dados do cabeçalho da vídeo chamada
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

                // Preencher nova aba "Evolução de Peso"
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

                    // Calcular conquista/resultado
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

                    // Preencher tabela de medições da aba
                    if (vcTabWeightHistoryBody) {
                        vcTabWeightHistoryBody.innerHTML = '';
                        const sortedWeightsDesc = [...weights].reverse();
                        sortedWeightsDesc.forEach((w, i) => {
                            const tr = document.createElement('tr');
                            const [year, month, day] = w.date.split('-');
                            const formattedDate = `${day}/${month}/${year}`;
                            
                            // Calcula diferença em relação à medição anterior
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

                    // Renderizar Gráfico
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
                            tension: 0.3,
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

                // Renderizar o diário alimentar (refeições)
                const vcDiaryContainer = document.getElementById('vc-diary-container');
                if (diaryData && vcDiaryContainer) {
                    vcDiaryContainer.innerHTML = '';
                    if (!diaryData.meals || diaryData.meals.length === 0) {
                        vcDiaryContainer.innerHTML = '<div style="text-align:center; padding:40px; opacity:0.5; font-size:13px;">Nenhuma refeição registrada nos últimos dias.</div>';
                    } else {
                        // Agrupar refeições por data
                        const mealsByDay = {};
                        diaryData.meals.forEach(m => {
                            const dateVal = m.date.split('T')[0];
                            if (!mealsByDay[dateVal]) mealsByDay[dateVal] = [];
                            mealsByDay[dateVal].push(m);
                        });

                        // Ordenar as datas decrescentemente
                        const sortedDates = Object.keys(mealsByDay).sort().reverse();

                        sortedDates.forEach((dateStr, idx) => {
                            const dayMeals = mealsByDay[dateStr];
                            
                            // Somar macros e calorias do dia
                            let dayCal = 0, dayCarbs = 0, dayProtein = 0, dayFat = 0;
                            dayMeals.forEach(m => {
                                const tot = m.total && typeof m.total === 'object' ? m.total : {};
                                dayCal += tot.calories || 0;
                                dayCarbs += tot.carbs || 0;
                                dayProtein += tot.protein || 0;
                                dayFat += tot.fat || 0;
                            });

                            // Formatar a data para exibição (ex: "27/05/2026")
                            const dateParts = dateStr.split('-');
                            const displayDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

                            // Determinar se é "Hoje" ou "Ontem"
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

                            // Criar acordeão
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

                            // Listener de expansão/recolhimento
                            dayGroup.querySelector('.vc-diary-day-header').addEventListener('click', () => {
                                dayGroup.classList.toggle('expanded');
                            });

                            vcDiaryContainer.appendChild(dayGroup);
                        });

                        if (window.lucide) window.lucide.createIcons();
                    }
                }
            })();

            // Função para buscar e renderizar o histórico de feedbacks
            const loadFeedbackHistory = async (patientId) => {
                const historyList = document.getElementById('vc-feedback-history-list');
                if (!historyList) return;
                try {
                    const hRes = await fetch(`${API_URL}/professional/patients/${patientId}/feedbacks`, {
                        headers: { 'Authorization': `Bearer ${adminState.token}` }
                    });
                    if (hRes.ok) {
                        const feedbacks = await hRes.json();
                        historyList.innerHTML = '';
                        if (feedbacks.length === 0) {
                            historyList.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.5; font-size:12px;">Nenhuma orientação enviada ainda.</div>';
                        } else {
                            feedbacks.forEach(f => {
                                const fItem = document.createElement('div');
                                fItem.className = 'vc-feedback-item';
                                const fDate = new Date(f.created_at);
                                const formattedDate = `${fDate.toLocaleDateString('pt-BR')} às ${fDate.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`;
                                
                                const roleLabel = f.type === 'nutritionist' ? 'Nutricionista' : 'Personal Trainer';
                                fItem.innerHTML = `
                                    <div class="vc-feedback-item-header">
                                        <strong>${f.professional_name} (${roleLabel})</strong>
                                        <span>${formattedDate}</span>
                                    </div>
                                    <div class="vc-feedback-item-content">${f.content}</div>
                                `;
                                historyList.appendChild(fItem);
                            });
                        }
                    } else {
                        historyList.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.5; font-size:12px; color:var(--color-danger);">Erro ao carregar histórico.</div>';
                    }
                } catch(err) {
                    console.error("Erro ao carregar feedbacks:", err);
                    historyList.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.5; font-size:12px; color:var(--color-danger);">Erro ao conectar ao servidor.</div>';
                }
            };

            // Carrega o histórico pela primeira vez
            loadFeedbackHistory(patient.id);

            // Configurar listener para salvar feedback
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
                        // Recarrega o histórico de feedbacks após salvar
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
            // Sem paciente vinculado
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
            // Obter fluxo local de mídia
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const localVideo = document.getElementById('local-video');
            if (localVideo) localVideo.srcObject = localStream;

            isMicMuted = false;
            isCamOff = false;
            updateCallControlsUI();

            // Configurar botões de controle
            setupCallControlsListeners();

            // Configurar a conexão WebRTC
            peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });

            // Adicionar faixas locais ao PeerConnection
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });

            // Manipular faixa remota
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

            // Determinar URL do WebSocket de sinalização
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
                
                // Enviar join
                wsSignal.send(JSON.stringify({
                    type: 'join',
                    room: roomName,
                    userId: adminState.user ? adminState.user.id : 'profissional-' + Date.now()
                }));
            };

            // Função para processar candidatos ICE acumulados após RemoteDescription ser definida
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
                            // Criar oferta SDP
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

            // Enviar candidatos ICE
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

    function setupCallControlsListeners() {
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

    function toggleMic() {
        if (!localStream) return;
        const audioTracks = localStream.getAudioTracks();
        if (audioTracks.length > 0) {
            isMicMuted = !isMicMuted;
            audioTracks.forEach(track => track.enabled = !isMicMuted);
            updateCallControlsUI();
        }
    }

    function toggleCam() {
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

    function updateCallControlsUI() {
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

    function closeVideoCall() {
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

        // Resetar prontuário do paciente na coluna direita
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

        // Limpar aba de evolução de peso
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

    function openAdminMealDetailsModal(meal) {
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
});
