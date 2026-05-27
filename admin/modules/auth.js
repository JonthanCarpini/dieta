/**
 * auth.js — Controle de Autenticação e Sessão
 */
import { API_URL, adminState } from './state.js';

export function showLoginScreen() {
    const loginContainer = document.getElementById('login-container');
    const adminDashboard = document.getElementById('admin-dashboard');
    if (loginContainer && adminDashboard) {
        loginContainer.classList.remove('hidden');
        adminDashboard.classList.add('hidden');
    }
}

export function showDashboardScreen() {
    const loginContainer = document.getElementById('login-container');
    const adminDashboard = document.getElementById('admin-dashboard');
    if (!loginContainer || !adminDashboard) return;

    loginContainer.classList.add('hidden');
    adminDashboard.classList.remove('hidden');

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
    const navMealPlans = document.getElementById('nav-meal-plans');
    
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
        if (navMealPlans) navMealPlans.classList.add('hidden');
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
        if (navMealPlans) navMealPlans.classList.remove('hidden');
    }
}

export async function checkSession() {
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

export async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorBanner = document.getElementById('login-error-msg');
    
    if (errorBanner) {
        errorBanner.classList.add('hidden');
        errorBanner.innerText = '';
    }

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
        return true;
    } catch (err) {
        if (errorBanner) {
            errorBanner.innerText = err.message;
            errorBanner.classList.remove('hidden');
        }
        return false;
    }
}

export async function initAuth(onLoginSuccess) {
    const loginForm = document.getElementById('admin-login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            const success = await handleLogin(e);
            if (success) {
                onLoginSuccess();
            }
        });
    }

    if (adminState.token) {
        const isAuthorized = await checkSession();
        if (isAuthorized) {
            onLoginSuccess();
        } else {
            showLoginScreen();
        }
    } else {
        showLoginScreen();
    }
}
