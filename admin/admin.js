/**
 * admin.js — Engine principal modular do Painel Admin (Nutrir)
 */

import { adminState } from './modules/state.js';
import { initAuth, checkSession, showLoginScreen, handleLogin } from './modules/auth.js';
import { 
    initAdminFeatures,
    loadOverviewData, 
    loadUsersData, 
    loadProfessionalsData, 
    loadPlansData, 
    loadSettingsData, 
    loadBillingData,
    setupVisibilityToggles,
    resetPlanForm,
    handlePlanSave,
    handleProRegistration,
    handleSettingsSave
} from './modules/admin-features.js';
import { initProSchedule, loadScheduleData } from './modules/pro-schedule.js';
import { initProPatients, loadPatientsData } from './modules/pro-patients.js';
import { loadAppointmentsData } from './modules/pro-appointments.js';
import { initProMeals, loadMealPlansData, openMealPlanBuilder, saveMealPlan } from './modules/pro-meals.js';
import { initProEnergy } from './modules/pro-energy.js';

document.addEventListener('DOMContentLoaded', () => {
    // Inicialização
    initAdmin();

    async function initAdmin() {
        setupVisibilityToggles();
        
        // Inicializa listeners comuns dos subcomponentes
        setupEventListeners();
        initProSchedule();
        initProPatients();
        initProMeals();
        initProEnergy();

        // Autentica e inicia
        await initAuth(() => {
            const defaultTab = adminState.user.role === 'admin' ? 'overview' : 'patients';
            loadTab(defaultTab);
        });
    }

    function setupEventListeners() {
        // Navegação de abas lateral
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                navButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tabId = btn.dataset.tab;
                loadTab(tabId);
            });
        });

        // Logout
        document.getElementById('btn-logout')?.addEventListener('click', () => {
            localStorage.removeItem('nutrir_token');
            adminState.token = '';
            adminState.user = null;
            showLoginScreen();
        });

        // Ir para o App do Usuário
        document.getElementById('btn-back-to-app')?.addEventListener('click', () => {
            window.location.href = '/';
        });

        // Busca de usuários em tempo real
        const userSearch = document.getElementById('user-search-input');
        if (userSearch) {
            userSearch.addEventListener('input', () => {
                import('./modules/admin-features.js').then(m => m.renderUsersTable(userSearch.value.trim()));
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

        document.getElementById('btn-cancel-plan-edit')?.addEventListener('click', resetPlanForm);

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
        // Captura e limpa o flag antes de qualquer lógica para evitar race conditions
        const preservePatient = adminState._preservePatientDetail;
        adminState._preservePatientDetail = false;

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

        // Se for a aba de pacientes, decide se mostra lista ou preserva a view de detalhes
        if (tabId === 'patients' && !preservePatient) {
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
            // Só recarrega a lista se não estamos preservando a view do paciente
            if (!preservePatient) {
                await loadPatientsData();
            }
        } else if (tabId === 'schedule') {
            await loadScheduleData();
        } else if (tabId === 'appointments') {
            await loadAppointmentsData();
        } else if (tabId === 'meal-plans') {
            await loadMealPlansData();
        }

        // Garante que os ícones Lucide sejam atualizados
        if (window.lucide) window.lucide.createIcons();
    }
});
