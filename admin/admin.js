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
    initAdmin();

    async function initAdmin() {
        setupVisibilityToggles();
        setupEventListeners();
        initProSchedule();
        initProPatients();
        initProMeals();
        initProEnergy();

        await initAuth(() => {
            const defaultTab = adminState.user.role === 'admin' ? 'overview' : 'patients';
            loadTab(defaultTab);
        });
    }

    function setupEventListeners() {
        // Navegação de abas no topnav
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                navButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                loadTab(btn.dataset.tab);
            });
        });

        document.getElementById('btn-logout')?.addEventListener('click', () => {
            localStorage.removeItem('nutrir_token');
            adminState.token = '';
            adminState.user = null;
            showLoginScreen();
        });

        document.getElementById('btn-back-to-app')?.addEventListener('click', () => {
            window.location.href = '/';
        });

        const userSearch = document.getElementById('user-search-input');
        if (userSearch) {
            userSearch.addEventListener('input', () => {
                import('./modules/admin-features.js').then(m => m.renderUsersTable(userSearch.value.trim()));
            });
        }

        const proForm = document.getElementById('pro-register-form');
        if (proForm) proForm.addEventListener('submit', handleProRegistration);

        const planForm = document.getElementById('plan-config-form');
        if (planForm) planForm.addEventListener('submit', handlePlanSave);

        document.getElementById('plan-has-nutritionist')?.addEventListener('change', function() {
            document.getElementById('plan-max-nutritionist-group')?.classList.toggle('hidden', !this.checked);
        });

        document.getElementById('plan-has-trainer')?.addEventListener('change', function() {
            document.getElementById('plan-max-trainer-group')?.classList.toggle('hidden', !this.checked);
        });

        document.getElementById('btn-cancel-plan-edit')?.addEventListener('click', resetPlanForm);

        const settingsForm = document.getElementById('global-settings-form');
        if (settingsForm) settingsForm.addEventListener('submit', handleSettingsSave);
    }

    // Abre o workspace do paciente (substitui a lógica de sub-aba dentro da tab patients)
    window.openPatientWorkspace = function(patientTabId) {
        const regularView = document.getElementById('regular-view');
        const workspace = document.getElementById('patient-workspace');
        if (regularView) regularView.classList.add('hidden');
        if (workspace) workspace.classList.remove('hidden');

        // Remove active de todos os nav-btn do topnav (nenhum fica ativo no workspace)
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

        // Ativa a aba do paciente solicitada (ou a primeira)
        const targetTab = patientTabId || 'overview';
        const panels = document.querySelectorAll('.patient-tab-content-panel');
        panels.forEach(p => p.classList.remove('active'));
        const target = document.getElementById(`patient-tab-content-${targetTab}`);
        if (target) target.classList.add('active');

        const tabBtns = document.querySelectorAll('.patient-tab-btn');
        tabBtns.forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`.patient-tab-btn[data-patient-tab="${targetTab}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        if (window.lucide) window.lucide.createIcons();
    };

    // Permite que módulos externos naveguem para uma aba normal do dashboard
    window.switchTab = function(tabId) {
        const navBtn = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
        if (navBtn) navBtn.click();
    };

    async function loadTab(tabId) {
        // Ao navegar para qualquer aba normal, fecha o workspace do paciente
        const regularView = document.getElementById('regular-view');
        const workspace = document.getElementById('patient-workspace');
        if (regularView) regularView.classList.remove('hidden');
        if (workspace) workspace.classList.add('hidden');

        // Atualiza active nos botões de nav
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        // Oculta todas as tab-content e mostra a ativa
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        const activeTab = document.getElementById(`tab-${tabId}`);
        if (activeTab) activeTab.classList.add('active');

        // Carrega dados da aba
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
        } else if (tabId === 'meal-plans') {
            await loadMealPlansData();
        }

        if (window.lucide) window.lucide.createIcons();
    }
});
