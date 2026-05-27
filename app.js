/**
 * ==========================================================================
 * NUTRIR AI DIET TRACKER - ENGINE PRINCIPAL COMPLETA (FASE 2)
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // 0. CONFIGURAÇÃO DA API
    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:5000/api' 
        : '/api';

    // 1. ESTADO GLOBAL DA APLICAÇÃO
    const state = {
        userProfile: null,       // Perfil do usuário (peso, metas, onboarding)
        mealsLog: [],           // Histórico de refeições: { id, date, time, name, items, total }
        geminiApiKey: '',       // Chave da API do Gemini
        waterConsumed: 0,       // Consumo de água hoje (ml)
        waterTarget: 2500,      // Meta diária de água (ml)
        fastingActive: false,   // Status do Jejum
        fastingStartTime: null, // Data/Hora de início do jejum
        fastingDurationGoal: 14, // Meta de horas do jejum (12, 14, 16, 18)
        currentCameraStream: null,
        currentCapturedImage: '',
        currentAnalyzingMeal: null,
        editingItemIndex: -1,
        activeRecipe: null,      // Receita aberta no modal
        recipeScaleFactor: 100,  // Fator de ajuste de calorias (50% a 150%)
        recipePortionCount: 1,   // Quantidade de porções da receita
        selectedSearchFood: null, // Alimento da busca selecionado para adicionar
        weeklyChart: null,
        fastingInterval: null,   // Intervalo do cronômetro de jejum
        savedAiRecipes: [],      // Receitas diárias geradas por IA salvas
        savedWeeklyPlans: [],    // Planos semanais gerados por IA salvos
        weightHistory: [],       // Histórico de pesos registrados
        proWeeklyPlan: null      // Cardápio semanal do nutricionista
    };

    // 2. BANCO DE DADOS DE ALIMENTOS BRASILEIROS (NUTRIR BRAZIL DATABASE)
    const BR_FOOD_DATABASE = [
        { name: "Iogurte natural integral", calories: 51, protein: 3.0, carbs: 4.0, fat: 3.0, portion_g: 100, brand: "Livre" },
        { name: "Iogurte natural desnatado", calories: 41, protein: 4.0, carbs: 6.0, fat: 0.0, portion_g: 100, brand: "Livre" },
        { name: "Iogurte Natural Desnatado (Danone)", calories: 84, protein: 7.0, carbs: 10.0, fat: 0.0, portion_g: 160, brand: "Danone" },
        { name: "Iogurte Pense Zero Morango (Batavo)", calories: 26, protein: 3.0, carbs: 4.0, fat: 0.0, portion_g: 100, brand: "Batavo" },
        { name: "Iogurte Desnatado Baunilha Molico", calories: 54, protein: 6.0, carbs: 7.0, fat: 0.0, portion_g: 200, brand: "Molico" },
        { name: "Iogurte Desnatado Grego (Yorgus)", calories: 76, protein: 15.0, carbs: 4.0, fat: 0.0, portion_g: 100, brand: "Yorgus" },
        { name: "Tapioca pronta simples", calories: 240, protein: 0.5, carbs: 60.0, fat: 0.0, portion_g: 100, brand: "Livre" },
        { name: "Pão de Queijo mineiro assado", calories: 135, protein: 3.0, carbs: 15.0, fat: 7.0, portion_g: 40, brand: "Livre" },
        { name: "Açaí na tigela puro (sem xarope)", calories: 60, protein: 1.0, carbs: 6.0, fat: 4.0, portion_g: 100, brand: "Livre" },
        { name: "Peito de Frango desfiado cozido", calories: 165, protein: 31.0, carbs: 0.0, fat: 3.6, portion_g: 100, brand: "Livre" },
        { name: "Arroz Branco Cozido Agulhinha", calories: 130, protein: 2.5, carbs: 28.0, fat: 0.2, portion_g: 100, brand: "Livre" },
        { name: "Feijão Carioca Cozido com caldo", calories: 76, protein: 4.8, carbs: 14.0, fat: 0.5, portion_g: 100, brand: "Livre" },
        { name: "Requeijão Light cremoso Nestlé", calories: 45, protein: 3.0, carbs: 1.0, fat: 3.0, portion_g: 30, brand: "Livre" },
        { name: "Whey Protein Concentrado 80%", calories: 120, protein: 24.0, carbs: 3.0, fat: 2.0, portion_g: 30, brand: "Livre" },
        { name: "Ovo cozido inteiro de galinha", calories: 155, protein: 13.0, carbs: 1.0, fat: 11.0, portion_g: 100, brand: "Livre" },
        { name: "Banana Prata madura", calories: 89, protein: 1.0, carbs: 23.0, fat: 0.3, portion_g: 100, brand: "Livre" },
        { name: "Batata Doce cozida", calories: 86, protein: 1.6, carbs: 20.0, fat: 0.1, portion_g: 100, brand: "Livre" },
        { name: "Pão de Forma Integral 12 grãos", calories: 110, protein: 4.5, carbs: 19.0, fat: 1.5, portion_g: 50, brand: "Livre" },
        { name: "Mamão Papaia fresco", calories: 45, protein: 0.5, carbs: 11.0, fat: 0.1, portion_g: 100, brand: "Livre" },
        { name: "Leite Desnatado líquido UHT", calories: 35, protein: 3.2, carbs: 4.7, fat: 0.0, portion_g: 100, brand: "Livre" }
    ];

    // 3. RECEITAS SAUDÁVEIS (PRELOADED FIT RECIPES)
    const FIT_RECIPES_DATABASE = [
        {
            id: "recipe_1",
            name: "Purê de Batata com Frango Desfiado",
            category: "lunch",
            time_min: 25,
            image: "https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=400",
            calories_base: 483,
            protein_base: 50.5,
            carbs_base: 52.3,
            fat_base: 7.3,
            fiber_base: 3.2,
            ingredients: [
                { name: "Batata inglesa crua em cubos", amount_base: 270, unit: "g" },
                { name: "Peito de frango desfiado cozido", amount_base: 150, unit: "g" },
                { name: "Requeijão light cremoso", amount_base: 45, unit: "g" }
            ],
            directions: "Cozinhe a batata inglesa. Amasse e misture com o requeijão light e sal. Sirva com o frango cozido e desfiado grelhado por cima."
        },
        {
            id: "recipe_2",
            name: "Crepioca Proteica de Queijo",
            category: "breakfast",
            time_min: 10,
            image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400",
            calories_base: 290,
            protein_base: 18.0,
            carbs_base: 22.0,
            fat_base: 14.0,
            fiber_base: 0.5,
            ingredients: [
                { name: "Goma de tapioca seca", amount_base: 40, unit: "g" },
                { name: "Ovo inteiro de galinha", amount_base: 1, unit: "unidade(s)" },
                { name: "Clara de ovo de galinha", amount_base: 1, unit: "unidade(s)" },
                { name: "Queijo mussarela ralado", amount_base: 25, unit: "g" }
            ],
            directions: "Bata a goma de tapioca, o ovo e a clara de ovo. Despeje na frigideira antiaderente quente. Vire, coloque a mussarela no meio, dobre e doure dos dois lados."
        },
        {
            id: "recipe_3",
            name: "Mingau de Aveia Whey e Banana",
            category: "breakfast",
            time_min: 12,
            image: "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=400",
            calories_base: 360,
            protein_base: 26.5,
            carbs_base: 45.0,
            fat_base: 5.5,
            fiber_base: 6.0,
            ingredients: [
                { name: "Farelo de aveia integral", amount_base: 40, unit: "g" },
                { name: "Whey Protein de Baunilha", amount_base: 20, unit: "g" },
                { name: "Banana prata picada", amount_base: 1, unit: "unidade(s)" },
                { name: "Leite desnatado UHT", amount_base: 150, unit: "ml" }
            ],
            directions: "Cozinhe a aveia com o leite no micro-ondas por 1.5 minutos. Misture o whey protein de baunilha vigorosamente. Cubra com as rodelas de banana."
        },
        {
            id: "recipe_4",
            name: "Panqueca Fit de Banana com Aveia",
            category: "snack",
            time_min: 15,
            image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400",
            calories_base: 250,
            protein_base: 12.0,
            carbs_base: 36.0,
            fat_base: 7.0,
            fiber_base: 4.5,
            ingredients: [
                { name: "Banana prata madura", amount_base: 1, unit: "unidade(s)" },
                { name: "Ovo inteiro de galinha", amount_base: 1, unit: "unidade(s)" },
                { name: "Farelo de aveia integral", amount_base: 25, unit: "g" }
            ],
            directions: "Amasse a banana, misture bem com o ovo e a aveia. Cozinhe em colheres em fogo baixo em frigideira antiaderente tampada. Vire para dourar ambos os lados."
        }
    ];

    // 4. ELEMENTOS DO DOM
    const screens = {
        login: document.getElementById('screen-login'),
        professional: document.getElementById('screen-professional'),
        admin: document.getElementById('screen-admin'),
        onboarding: document.getElementById('screen-onboarding'),
        dashboard: document.getElementById('screen-dashboard'),
        scanner: document.getElementById('screen-scanner'),
        results: document.getElementById('screen-results'),
        recipes: document.getElementById('screen-recipes'),
        fasting: document.getElementById('screen-fasting'),
        history: document.getElementById('screen-history'),
        settings: document.getElementById('screen-settings'),
        'food-search': document.getElementById('screen-food-search'),
        'my-professionals': document.getElementById('screen-my-professionals'),
        'video-call': document.getElementById('screen-video-call')
    };

    const nav = document.getElementById('main-navigation');
    const navItems = document.querySelectorAll('.nav-item');

    // 5. INICIALIZAÇÃO DO APP
    initApp();

    async function initApp() {
        // Configura ouvintes globais
        setupEventListeners();
        setupAuthListeners();
        setupAdminListeners();
        setupProfessionalListeners();

        // Configura ícones Lucide
        lucide.createIcons();

        // Verifica token e carrega estado da API
        const token = localStorage.getItem('nutrir_token');
        if (token) {
            const success = await loadStateFromAPI(token);
            if (success) {
                // Roteia baseado no cargo (role)
                if (state.user.role === 'nutritionist' || state.user.role === 'trainer') {
                    showScreen('screen-professional');
                } else if (state.user.role === 'admin') {
                    showScreen('screen-admin');
                } else {
                    if (state.userProfile) {
                        showScreen('screen-dashboard');
                        updateDashboard();
                    } else {
                        showScreen('screen-onboarding');
                        setupOnboardingSliders();
                    }
                }
            } else {
                showScreen('screen-login');
            }
        } else {
            showScreen('screen-login');
        }

        // Inicia cronômetro de jejum se ativo
        if (state.fastingActive) {
            startFastingTimer();
        }

        // Inicializa Google Login Button
        initGoogleLogin();

        // Inicia o timer de notificações de consultas (15 minutos antes)
        startAppointmentAlertTimer();
    }

    // 6. CARREGAR E SALVAR ESTADOS
    async function loadStateFromAPI(token) {
        try {
            // 1. Carrega Perfil
            const profileRes = await fetch(`${API_URL}/user/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!profileRes.ok) {
                if (profileRes.status === 401 || profileRes.status === 403) {
                    localStorage.removeItem('nutrir_token');
                }
                return false;
            }
            const data = await profileRes.json();
            state.user = data.user;
            
            // Mapeia DB columns de volta para o perfil do state
            if (data.profile) {
                state.userProfile = {
                    gender: data.profile.gender,
                    age: data.profile.age,
                    weight: parseFloat(data.profile.weight),
                    height: data.profile.height,
                    activity: parseFloat(data.profile.activity),
                    goal: data.profile.goal,
                    goalWeight: parseFloat(data.profile.goal_weight),
                    speed: parseFloat(data.profile.speed),
                    targetCalories: data.profile.target_calories,
                    targetProtein: data.profile.target_protein,
                    targetCarbs: data.profile.target_carbs,
                    targetFat: data.profile.target_fat,
                    comorbidities: data.profile.comorbidities || '',
                    intolerances: data.profile.intolerances || '',
                    dietary_restrictions: data.profile.dietary_restrictions || '',
                    notes: data.profile.notes || '',
                    dateCalculated: data.profile.updated_at ? data.profile.updated_at.split('T')[0] : getTodayDateString()
                };
            } else {
                state.userProfile = null;
            }

            // 2. Carrega Refeições
            const mealsRes = await fetch(`${API_URL}/user/meals`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (mealsRes.ok) {
                const meals = await mealsRes.json();
                state.mealsLog = meals.map(m => ({
                    id: m.id,
                    date: m.date.split('T')[0],
                    time: m.time.slice(0, 5),
                    name: m.name,
                    items: typeof m.items === 'string' ? JSON.parse(m.items) : m.items,
                    total: typeof m.total === 'string' ? JSON.parse(m.total) : m.total
                }));
            }

            // 3. Carrega Água
            const today = getTodayDateString();
            const waterRes = await fetch(`${API_URL}/user/water?date=${today}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (waterRes.ok) {
                const water = await waterRes.json();
                state.waterConsumed = water.consumed || 0;
                state.waterTarget = water.target || 2500;
            }

            // 4. Carrega Jejum
            const fastingRes = await fetch(`${API_URL}/user/fasting`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (fastingRes.ok) {
                const fasting = await fastingRes.json();
                if (fasting) {
                    state.fastingActive = true;
                    state.fastingStartTime = new Date(fasting.start_time);
                    state.fastingDurationGoal = fasting.duration_goal;
                } else {
                    state.fastingActive = false;
                }
            }

            // 5. Carrega Receitas IA
            const recipesRes = await fetch(`${API_URL}/user/recipes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (recipesRes.ok) {
                const recipes = await recipesRes.json();
                state.savedAiRecipes = recipes.filter(r => r.type === 'daily').map(r => ({
                    id: r.id,
                    type: r.type,
                    name: r.name,
                    ... (typeof r.data === 'string' ? JSON.parse(r.data) : r.data)
                }));
                state.savedWeeklyPlans = recipes.filter(r => r.type === 'weekly').map(r => ({
                    id: r.id,
                    type: r.type,
                    name: r.name,
                    recipes: typeof r.data === 'string' ? JSON.parse(r.data).recipes : r.data.recipes
                }));
            }

            // 4.5. Carrega Histórico de Peso (Área Evolutiva)
            const weightLogRes = await fetch(`${API_URL}/user/weight-log`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (weightLogRes.ok) {
                state.weightHistory = await weightLogRes.json();
            } else {
                state.weightHistory = [];
            }

            // Buscar cardápio semanal do nutricionista
            try {
                const planRes = await fetch(`${API_URL}/user/weekly-plan`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (planRes.ok) {
                    state.proWeeklyPlan = await planRes.json(); // null if none
                }
            } catch { state.proWeeklyPlan = null; }

            // Carrega api key global do banco de dados
            if (data.geminiApiKey && data.geminiApiKey.trim() !== '') {
                state.geminiApiKey = data.geminiApiKey;
            } else {
                const apiKey = localStorage.getItem('nutrir_gemini_key');
                if (apiKey) state.geminiApiKey = apiKey;
            }

            return true;
        } catch (err) {
            console.error("Erro ao carregar estado da API:", err);
            return false;
        }
    }

    async function saveProfileToLocalStorage(profile) {
        state.userProfile = profile;
        localStorage.setItem('nutrir_profile', JSON.stringify(profile));

        const token = localStorage.getItem('nutrir_token');
        if (!token) return;

        try {
            await fetch(`${API_URL}/user/profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    gender: profile.gender,
                    age: profile.age,
                    weight: profile.weight,
                    height: profile.height,
                    activity: profile.activity,
                    goal: profile.goal,
                    goal_weight: profile.goalWeight,
                    speed: profile.speed,
                    target_calories: profile.targetCalories,
                    target_protein: profile.targetProtein,
                    target_carbs: profile.targetCarbs,
                    target_fat: profile.targetFat
                })
            });

            // Sincroniza o peso no histórico
            await fetch(`${API_URL}/user/weight-log`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ weight: profile.weight })
            });
        } catch (err) {
            console.error("Erro ao salvar perfil na API:", err);
        }
    }

    async function saveMealsToLocalStorage() {
        localStorage.setItem('nutrir_meals_log', JSON.stringify(state.mealsLog));

        const token = localStorage.getItem('nutrir_token');
        if (!token) return;

        // Envia as refeições para sincronizar no backend
        for (const meal of state.mealsLog) {
            try {
                await fetch(`${API_URL}/user/meals`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        id: meal.id,
                        date: meal.date,
                        time: meal.time,
                        name: meal.name,
                        items: meal.items,
                        total: meal.total
                    })
                });
            } catch (err) {
                console.error(`Erro ao salvar refeição ${meal.id} na API:`, err);
            }
        }
    }

    async function deleteMealFromAPI(mealId) {
        const token = localStorage.getItem('nutrir_token');
        if (!token) return;
        try {
            await fetch(`${API_URL}/user/meals/${mealId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) {
            console.error("Erro ao deletar refeição na API:", err);
        }
    }

    async function saveWaterToAPI() {
        const token = localStorage.getItem('nutrir_token');
        if (!token) return;
        try {
            await fetch(`${API_URL}/user/water`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    date: getTodayDateString(),
                    consumed: state.waterConsumed,
                    target: state.waterTarget
                })
            });
        } catch (err) {
            console.error("Erro ao salvar água na API:", err);
        }
    }

    async function saveFastingToAPI(active) {
        const token = localStorage.getItem('nutrir_token');
        if (!token) return;
        try {
            await fetch(`${API_URL}/user/fasting`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    start_time: state.fastingStartTime ? state.fastingStartTime.toISOString() : new Date().toISOString(),
                    duration_goal: state.fastingDurationGoal,
                    active: active
                })
            });
        } catch (err) {
            console.error("Erro ao salvar jejum na API:", err);
        }
    }

    async function saveAiRecipesToLocalStorage() {
        localStorage.setItem('nutrir_saved_ai_recipes', JSON.stringify(state.savedAiRecipes));
        const token = localStorage.getItem('nutrir_token');
        if (!token) return;

        for (const recipe of state.savedAiRecipes) {
            try {
                await fetch(`${API_URL}/user/recipes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        id: recipe.id,
                        type: 'daily',
                        name: recipe.name,
                        data: recipe
                    })
                });
            } catch (err) {
                console.error("Erro ao salvar receita de IA na API:", err);
            }
        }
    }

    async function saveWeeklyPlansToLocalStorage() {
        localStorage.setItem('nutrir_saved_weekly_plans', JSON.stringify(state.savedWeeklyPlans));
        const token = localStorage.getItem('nutrir_token');
        if (!token) return;

        for (const plan of state.savedWeeklyPlans) {
            try {
                await fetch(`${API_URL}/user/recipes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        id: plan.id,
                        type: 'weekly',
                        name: plan.name || 'Plano Semanal',
                        data: plan
                    })
                });
            } catch (err) {
                console.error("Erro ao salvar plano de IA na API:", err);
            }
        }
    }

    function getTodayDateString() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    // ==========================================================
    // AUTENTICAÇÃO - EVENTOS E MÉTODOS
    // ==========================================================
    let isRegisterMode = false;

    function setupAuthListeners() {
        const loginForm = document.getElementById('login-form');
        const btnToggleAuthMode = document.getElementById('btn-toggle-auth-mode');
        const lblAuthToggleText = document.getElementById('lbl-auth-toggle-text');
        const groupAuthName = document.getElementById('group-auth-name');
        const btnAuthSubmit = document.getElementById('btn-auth-submit');

        if (!loginForm || !btnToggleAuthMode) return;

        btnToggleAuthMode.addEventListener('click', () => {
            isRegisterMode = !isRegisterMode;
            if (isRegisterMode) {
                groupAuthName.classList.remove('hidden');
                btnAuthSubmit.innerText = 'CRIAR CONTA';
                lblAuthToggleText.innerText = 'Já tem uma conta?';
                btnToggleAuthMode.innerText = 'Fazer Login';
                document.getElementById('login-name').required = true;
            } else {
                groupAuthName.classList.add('hidden');
                btnAuthSubmit.innerText = 'ENTRAR';
                lblAuthToggleText.innerText = 'Não tem uma conta?';
                btnToggleAuthMode.innerText = 'Criar Conta';
                document.getElementById('login-name').required = false;
            }
        });

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const name = document.getElementById('login-name').value;

            const url = isRegisterMode ? `${API_URL}/auth/register` : `${API_URL}/auth/login`;
            const payload = isRegisterMode ? { email, password, name } : { email, password };

            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || 'Erro na requisição.');
                }

                localStorage.setItem('nutrir_token', data.token);
                await initApp();
            } catch (err) {
                alert(`Erro de autenticação: ${err.message}`);
            }
        });
    }

    async function initGoogleLogin() {
        try {
            const configRes = await fetch(`${API_URL}/auth/config`);
            const config = await configRes.json();
            const client_id = config.googleClientId;

            // Valid Google OAuth client IDs always end with .apps.googleusercontent.com
            if (!client_id || !client_id.endsWith('.apps.googleusercontent.com')) {
                // Silently skip — Google login simply won't appear if not configured
                return;
            }

            if (typeof google === 'undefined') {
                console.error('SDK do Google Identity Services não carregado.');
                return;
            }

            google.accounts.id.initialize({
                client_id: client_id,
                callback: handleGoogleLoginResponse
            });

            google.accounts.id.renderButton(
                document.getElementById('google-login-btn'),
                { theme: 'outline', size: 'large', width: '100%' }
            );
        } catch (err) {
            console.error('Erro ao inicializar Google Login:', err);
        }
    }

    async function handleGoogleLoginResponse(response) {
        try {
            const res = await fetch(`${API_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Erro na autenticação do Google.');
            }

            localStorage.setItem('nutrir_token', data.token);
            await initApp();
        } catch (err) {
            alert(`Falha no Login Google: ${err.message}`);
        }
    }

    // ==========================================================
    // PAINEL DO ADMINISTRADOR - EVENTOS E MÉTODOS
    // ==========================================================
    async function renderAdminPanel() {
        const token = localStorage.getItem('nutrir_token');
        if (!token) return;

        try {
            // Carrega as configurações globais do Gemini
            const settingsRes = await fetch(`${API_URL}/admin/settings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (settingsRes.ok) {
                const settings = await settingsRes.json();
                const geminiInput = document.getElementById('admin-gemini-key');
                if (geminiInput) {
                    geminiInput.value = settings.gemini_api_key || '';
                }
            }

            const res = await fetch(`${API_URL}/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Não foi possível carregar os usuários.');
            const users = await res.json();

            const container = document.getElementById('admin-users-container');
            container.innerHTML = '';

            if (users.length === 0) {
                container.innerHTML = '<p class="settings-description">Nenhum usuário cadastrado.</p>';
                return;
            }

            users.forEach(u => {
                const userCard = document.createElement('div');
                userCard.className = 'history-day-card';
                userCard.style.padding = '12px';
                userCard.style.display = 'flex';
                userCard.style.flexDirection = 'column';
                userCard.style.gap = '8px';

                const planStr = u.plan === 'premium' ? '<span class="ai-pill" style="background:#fee440; color:#000;">PREMIUM</span>' : '<span class="ai-pill" style="background:#6c757d; color:#fff;">TRIAL</span>';
                const roleStr = u.role === 'admin' ? '[Admin]' : u.role === 'nutritionist' ? '[Nutri]' : u.role === 'trainer' ? '[Trainer]' : '[User]';

                userCard.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <strong>${u.name}</strong> <span style="font-size:11px; opacity:0.6;">${roleStr}</span>
                            <div style="font-size:11px; opacity:0.5;">${u.email}</div>
                        </div>
                        <div>
                            ${planStr}
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; margin-top:4px;">
                        <select class="select-user-role" data-user-id="${u.id}" style="font-size:11px; padding:4px; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#fff;">
                            <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
                            <option value="nutritionist" ${u.role === 'nutritionist' ? 'selected' : ''}>Nutricionista</option>
                            <option value="trainer" ${u.role === 'trainer' ? 'selected' : ''}>Personal Trainer</option>
                            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                        <button class="btn-toggle-plan btn-secondary" data-user-id="${u.id}" data-current-plan="${u.plan}" style="font-size:11px; padding:4px 8px; height:auto; border-radius:6px;">
                            Alternar Plano
                        </button>
                    </div>
                `;

                userCard.querySelector('.select-user-role').addEventListener('change', async (e) => {
                    const newRole = e.target.value;
                    try {
                        const roleRes = await fetch(`${API_URL}/admin/users/${u.id}/role`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ role: newRole })
                        });
                        const rData = await roleRes.json();
                        if (!roleRes.ok) throw new Error(rData.error || 'Erro ao alterar cargo.');
                        alert('Cargo atualizado com sucesso!');
                        renderAdminPanel();
                    } catch (err) {
                        alert(err.message);
                    }
                });

                userCard.querySelector('.btn-toggle-plan').addEventListener('click', async () => {
                    const newPlan = u.plan === 'premium' ? 'trial' : 'premium';
                    try {
                        const planRes = await fetch(`${API_URL}/admin/users/${u.id}/plan`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ plan: newPlan, durationDays: 30 })
                        });
                        const pData = await planRes.json();
                        if (!planRes.ok) throw new Error(pData.error || 'Erro ao alterar plano.');
                        alert('Plano atualizado com sucesso!');
                        renderAdminPanel();
                    } catch (err) {
                        alert(err.message);
                    }
                });

                container.appendChild(userCard);
            });
        } catch (err) {
            console.error('Erro ao renderizar painel admin:', err);
        }
    }

    function setupAdminListeners() {
        const form = document.getElementById('admin-register-pro-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('admin-pro-name').value;
                const email = document.getElementById('admin-pro-email').value;
                const password = document.getElementById('admin-pro-password').value;
                const role = document.getElementById('admin-pro-role').value;

                const token = localStorage.getItem('nutrir_token');
                try {
                    const res = await fetch(`${API_URL}/admin/register-professional`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ name, email, password, role })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar profissional.');

                    alert('Profissional cadastrado com sucesso!');
                    form.reset();
                    renderAdminPanel();
                } catch (err) {
                    alert(err.message);
                }
            });
        }

        const geminiForm = document.getElementById('admin-gemini-key-form');
        if (geminiForm) {
            geminiForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const gemini_api_key = document.getElementById('admin-gemini-key').value.trim();
                const token = localStorage.getItem('nutrir_token');
                try {
                    const res = await fetch(`${API_URL}/admin/settings`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ gemini_api_key })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Erro ao salvar chave.');

                    alert('Chave global do Gemini salva com sucesso!');
                    
                    state.geminiApiKey = gemini_api_key;
                    const inputApiKey = document.getElementById('input-api-key');
                    if (inputApiKey) inputApiKey.value = gemini_api_key;
                    updateApiStatusIndicator();
                } catch (err) {
                    alert(err.message);
                }
            });
        }

        const btnAdminLogout = document.getElementById('btn-admin-logout');
        if (btnAdminLogout) {
            btnAdminLogout.addEventListener('click', () => {
                localStorage.removeItem('nutrir_token');
                showScreen('screen-login');
            });
        }

        const btnAdminToDashboard = document.getElementById('btn-admin-to-dashboard');
        if (btnAdminToDashboard) {
            btnAdminToDashboard.addEventListener('click', () => {
                showScreen('screen-dashboard');
            });
        }
    }

    // ==========================================================
    // PAINEL DO PROFISSIONAL - EVENTOS E MÉTODOS
    // ==========================================================
    let selectedPatientId = null;

    async function renderProfessionalPanel() {
        const token = localStorage.getItem('nutrir_token');
        if (!token) return;

        try {
            const roleBadge = document.getElementById('professional-role-badge');
            const welcomeText = document.getElementById('professional-welcome-text');
            if (state.user) {
                roleBadge.innerText = state.user.role === 'nutritionist' ? 'Nutricionista' : 'Personal Trainer';
                welcomeText.innerText = `Painel do Profissional - ${state.user.name}`;
            }

            const res = await fetch(`${API_URL}/professional/patients`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Erro ao buscar pacientes.');
            const patients = await res.json();

            const container = document.getElementById('professional-patients-container');
            container.innerHTML = '';

            if (patients.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p>Nenhum paciente vinculado ao seu painel.</p>
                    </div>
                `;
                return;
            }

            patients.forEach(p => {
                const patientCard = document.createElement('div');
                patientCard.className = 'history-day-card';
                patientCard.style.padding = '12px';
                patientCard.style.cursor = 'pointer';
                patientCard.style.display = 'flex';
                patientCard.style.justifyContent = 'space-between';
                patientCard.style.alignItems = 'center';

                patientCard.innerHTML = `
                    <div>
                        <strong>${p.name}</strong>
                        <div style="font-size:12px; opacity:0.6;">E-mail: ${p.email}</div>
                        <div style="font-size:11px; opacity:0.5; margin-top:2px;">
                            Meta: ${p.goal === 'lose' ? 'Emagrecer' : p.goal === 'gain' ? 'Ganhar Peso' : 'Manter Peso'} (${p.target_calories || 0} kcal)
                        </div>
                    </div>
                    <i data-lucide="chevron-right" style="opacity:0.5;"></i>
                `;

                patientCard.addEventListener('click', () => openPatientDetailsModal(p.id, p.name));

                container.appendChild(patientCard);
            });
            lucide.createIcons();
        } catch (err) {
            console.error('Erro ao renderizar painel profissional:', err);
        }
    }

    async function openPatientDetailsModal(patientId, patientName) {
        const token = localStorage.getItem('nutrir_token');
        if (!token) return;

        selectedPatientId = patientId;
        document.getElementById('patient-modal-name').innerText = patientName;
        document.getElementById('input-patient-feedback').value = '';

        try {
            const res = await fetch(`${API_URL}/professional/patients/${patientId}/diary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Não foi possível buscar os registros do paciente.');
            const data = await res.json();

            const total = { calories: 0, protein: 0, carbs: 0, fat: 0 };
            const todayStr = getTodayDateString();
            const todayMeals = data.meals.filter(m => m.date.split('T')[0] === todayStr);

            todayMeals.forEach(m => {
                const mTotal = typeof m.total === 'string' ? JSON.parse(m.total) : m.total;
                total.calories += mTotal.calories || 0;
                total.protein += mTotal.protein || 0;
                total.carbs += mTotal.carbs || 0;
                total.fat += mTotal.fat || 0;
            });

            document.getElementById('patient-cal-summary').innerText = `${total.calories} kcal`;
            document.getElementById('patient-prot-summary').innerText = `${total.protein}g`;
            document.getElementById('patient-carbs-summary').innerText = `${total.carbs}g`;
            document.getElementById('patient-fat-summary').innerText = `${total.fat}g`;

            const mealsList = document.getElementById('patient-meals-list');
            mealsList.innerHTML = '';

            if (data.meals.length === 0) {
                mealsList.innerHTML = '<p style="font-size:12px; opacity:0.6; text-align:center; padding:12px;">Nenhuma refeição registrada.</p>';
            } else {
                data.meals.forEach(m => {
                    const mTotal = typeof m.total === 'string' ? JSON.parse(m.total) : m.total;
                    const items = typeof m.items === 'string' ? JSON.parse(m.items) : m.items;
                    const mDiv = document.createElement('div');
                    mDiv.className = 'history-day-card';
                    mDiv.style.padding = '8px';
                    mDiv.style.fontSize = '12px';

                    mDiv.innerHTML = `
                        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                            <strong>${m.name}</strong>
                            <span style="opacity:0.6;">${m.date.split('T')[0]} - ${m.time.slice(0, 5)}</span>
                        </div>
                        <div style="opacity:0.8;">${items.map(it => `${it.name} (${it.weight_g || it.weight}g)`).join(', ')}</div>
                        <div style="font-size:11px; opacity:0.6; margin-top:2px;">
                            Kcal: ${mTotal.calories} | P: ${mTotal.protein}g | C: ${mTotal.carbs}g | F: ${mTotal.fat}g
                        </div>
                    `;
                    mealsList.appendChild(mDiv);
                });
            }

            document.getElementById('patient-diary-modal').classList.add('active');
        } catch (err) {
            alert(err.message);
        }
    }

    function setupProfessionalListeners() {
        document.getElementById('btn-close-patient-modal').addEventListener('click', () => {
            document.getElementById('patient-diary-modal').classList.remove('active');
        });
        document.getElementById('btn-cancel-patient-feedback').addEventListener('click', () => {
            document.getElementById('patient-diary-modal').classList.remove('active');
        });

        document.getElementById('btn-save-patient-feedback').addEventListener('click', async () => {
            const content = document.getElementById('input-patient-feedback').value;
            if (!content.trim()) {
                alert('Escreva a orientação antes de enviar.');
                return;
            }

            const token = localStorage.getItem('nutrir_token');
            try {
                const res = await fetch(`${API_URL}/professional/patients/${selectedPatientId}/feedback`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ content })
                });
                if (!res.ok) throw new Error('Falha ao enviar feedback.');

                alert('Feedback enviado com sucesso!');
                document.getElementById('patient-diary-modal').classList.remove('active');
            } catch (err) {
                alert(err.message);
            }
        });

        document.getElementById('btn-professional-logout').addEventListener('click', () => {
            localStorage.removeItem('nutrir_token');
            showScreen('screen-login');
        });
    }

    // ==========================================================
    // ACOMPANHAMENTO PROFISSIONAL - DIÁLOGO DO PACIENTE (PERFIL)
    // ==========================================================
    async function renderUserProfessionalSettings() {
        const area = document.getElementById('professional-status-area');
        if (!area) return;

        if (!state.user || !state.user.isPremiumActive) {
            area.innerHTML = `
                <p class="settings-description">Faça o upgrade para o plano Premium para vincular seu nutricionista e personal trainer.</p>
                <button class="btn-primary w-full" id="btn-upgrade-premium">Upgrade para Premium</button>
            `;
            document.getElementById('btn-upgrade-premium').addEventListener('click', simulatePremiumPayment);
            return;
        }

        const token = localStorage.getItem('nutrir_token');
        try {
            const prosRes = await fetch(`${API_URL}/user/available-professionals`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!prosRes.ok) throw new Error('Falha ao buscar profissionais.');
            const professionals = await prosRes.json();

            const nutritionists = professionals.filter(p => p.role === 'nutritionist');
            const trainers = professionals.filter(p => p.role === 'trainer');

            const feedbackRes = await fetch(`${API_URL}/user/professional-feedbacks`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const feedbacks = feedbackRes.ok ? await feedbackRes.json() : [];

            area.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
                    <div>
                        <label style="font-size:12px; opacity:0.8;">Vincular Nutricionista</label>
                        <div style="display:flex; gap:8px; margin-top:4px;">
                            <select id="select-link-nutri" style="flex:1; font-size:12px; padding:8px; border-radius:8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#fff;">
                                <option value="">Selecione um Nutricionista...</option>
                                ${nutritionists.map(n => `<option value="${n.id}">${n.name}</option>`).join('')}
                            </select>
                            <button class="btn-primary" id="btn-save-link-nutri" style="padding:0 12px; font-size:12px; height:auto; border-radius:8px;">Vincular</button>
                        </div>
                    </div>
                    <div>
                        <label style="font-size:12px; opacity:0.8;">Vincular Personal Trainer</label>
                        <div style="display:flex; gap:8px; margin-top:4px;">
                            <select id="select-link-trainer" style="flex:1; font-size:12px; padding:8px; border-radius:8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#fff;">
                                <option value="">Selecione um Personal...</option>
                                ${trainers.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                            </select>
                            <button class="btn-primary" id="btn-save-link-trainer" style="padding:0 12px; font-size:12px; height:auto; border-radius:8px;">Vincular</button>
                        </div>
                    </div>
                </div>

                <div class="divider-line"></div>
                <h4 style="margin-top:12px; margin-bottom:8px;">Orientações Recebidas</h4>
                <div id="professional-feedbacks-list" style="display:flex; flex-direction:column; gap:8px; max-height:200px; overflow-y:auto;">
                    ${feedbacks.length === 0 ? '<p style="font-size:11px; opacity:0.5; text-align:center; padding:12px;">Nenhuma orientação recebida ainda.</p>' : feedbacks.map(f => `
                        <div class="history-day-card" style="padding:10px; font-size:12px;">
                            <div style="display:flex; justify-content:between; margin-bottom:4px;">
                                <strong>${f.professional_name} (${f.type === 'nutritionist' ? 'Nutri' : 'Personal'})</strong>
                                <span style="font-size:10px; opacity:0.5; margin-left:auto;">${new Date(f.created_at).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <p style="opacity:0.9; line-height:1.4;">${f.content}</p>
                        </div>
                    `).join('')}
                </div>
            `;

            document.getElementById('btn-save-link-nutri').addEventListener('click', async () => {
                const val = document.getElementById('select-link-nutri').value;
                if (!val) return alert('Selecione um nutricionista.');
                await linkProfessional(val, 'nutritionist');
            });

            document.getElementById('btn-save-link-trainer').addEventListener('click', async () => {
                const val = document.getElementById('select-link-trainer').value;
                if (!val) return alert('Selecione um personal trainer.');
                await linkProfessional(val, 'trainer');
            });

        } catch (err) {
            console.error('Erro ao renderizar acompanhamento profissional no perfil:', err);
        }
    }

    async function linkProfessional(proId, type) {
        const token = localStorage.getItem('nutrir_token');
        try {
            const res = await fetch(`${API_URL}/user/link-professional`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ professional_id: proId, type })
            });
            if (!res.ok) throw new Error('Não foi possível vincular o profissional.');
            alert('Profissional vinculado com sucesso!');
            renderUserProfessionalSettings();
        } catch (err) {
            alert(err.message);
        }
    }

    async function simulatePremiumPayment() {
        const token = localStorage.getItem('nutrir_token');
        if (!token) return;

        if (confirm("Você será redirecionado para a simulação de pagamento via Mercado Pago/Asaas (PIX). Confirmar upgrade premium por 30 dias?")) {
            try {
                const res = await fetch(`${API_URL}/payments/mercadopago-webhook`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'payment.created',
                        type: 'payment',
                        payer_email: state.user.email,
                        data: { id: 'payment_' + Date.now(), email: state.user.email }
                    })
                });

                if (res.ok) {
                    alert("Pagamento PIX Aprovado com Sucesso! Sua assinatura Premium de 30 dias está ativa.");
                    await initApp();
                } else {
                    alert("Falha na simulação de pagamento.");
                }
            } catch (err) {
                console.error("Erro na simulação do pagamento:", err);
            }
        }
    }

    async function renderMyProfessionalsScreen() {
        const trialCard = document.getElementById('my-pros-trial-card');
        const premiumContainer = document.getElementById('my-pros-premium-container');
        
        if (!state.user) return;

        const trialTitle = trialCard.querySelector('h3');
        const trialDescription = trialCard.querySelector('.settings-description');

        if (state.user.isPlanExpired) {
            if (trialTitle) trialTitle.innerText = 'Assinatura Expirada';
            if (trialDescription) trialDescription.innerText = 'Sua assinatura expirou. Para continuar contando com acompanhamento profissional exclusivo e agendamento de consultas por vídeo, por favor renove sua assinatura.';
            trialCard.classList.remove('hidden');
            premiumContainer.classList.add('hidden');
            return;
        }

        if (!state.user.has_nutritionist && !state.user.has_trainer) {
            if (trialTitle) trialTitle.innerText = 'Upgrade Necessário';
            if (trialDescription) trialDescription.innerText = 'O acompanhamento profissional exclusivo e agendamento de consultas não estão inclusos no seu plano atual. Faça upgrade para um plano que inclua suporte a profissionais para liberar este recurso.';
            trialCard.classList.remove('hidden');
            premiumContainer.classList.add('hidden');
            return;
        }

        trialCard.classList.add('hidden');
        premiumContainer.classList.remove('hidden');
        loadBodyEval();

        const token = localStorage.getItem('nutrir_token');
        try {
            // 1. Carrega todos os profissionais disponíveis
            const prosRes = await fetch(`${API_URL}/user/available-professionals`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!prosRes.ok) throw new Error('Falha ao buscar profissionais.');
            const professionals = await prosRes.json();

            const roleSelect = document.getElementById('select-my-pros-role');
            const prosListSelect = document.getElementById('select-my-pros-list');

            // Popula o select de papéis com base no plano do usuário
            let roleSelectHtml = '';
            if (state.user.has_nutritionist) {
                roleSelectHtml += `<option value="nutritionist">Nutricionista</option>`;
            }
            if (state.user.has_trainer) {
                roleSelectHtml += `<option value="trainer">Personal Trainer</option>`;
            }
            roleSelect.innerHTML = roleSelectHtml;

            const updateProsDropdown = () => {
                const selectedRole = roleSelect.value;
                const filtered = professionals.filter(p => p.role === selectedRole);
                prosListSelect.innerHTML = `<option value="">Selecione um profissional...</option>` +
                    filtered.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
            };

            roleSelect.removeEventListener('change', updateProsDropdown);
            roleSelect.addEventListener('change', updateProsDropdown);
            updateProsDropdown();

            // 2. Carrega orientações e profissionais vinculados
            const linkedRes = await fetch(`${API_URL}/user/linked-professionals`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!linkedRes.ok) throw new Error('Falha ao buscar profissionais vinculados.');
            const linkedPros = await linkedRes.json();
            state.linkedProfessionals = linkedPros;

            const feedbacksRes = await fetch(`${API_URL}/user/professional-feedbacks`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const feedbacks = feedbacksRes.ok ? await feedbacksRes.json() : [];

            // 3. Carrega consultas
            const appRes = await fetch(`${API_URL}/user/appointments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const appointments = appRes.ok ? await appRes.json() : [];
            state.myAppointments = appointments;

            // 4. Renderiza profissionais vinculados
            const listContainer = document.getElementById('my-pros-linked-list');
            listContainer.innerHTML = '';

            if (linkedPros.length === 0) {
                listContainer.innerHTML = '<p style="font-size:12px; opacity:0.5; text-align:center; padding:12px;">Nenhum profissional vinculado ainda.</p>';
            } else {
                linkedPros.forEach(p => {
                    const profFeedbacks = feedbacks.filter(f => f.professional_id === p.id);
                    const card = document.createElement('div');
                    card.className = 'settings-card';
                    card.style.padding = '14px';

                    const roleLabel = p.role === 'nutritionist' ? 'Nutricionista' : 'Personal Trainer';
                    
                    let feedbacksHtml = '<p style="font-size:11px; opacity:0.5; margin-top:6px;">Nenhuma orientação recebida ainda.</p>';
                    if (profFeedbacks.length > 0) {
                        feedbacksHtml = profFeedbacks.map(f => `
                            <div style="background:rgba(255,255,255,0.02); padding:8px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.05); margin-top:6px; font-size:12px;">
                                <div style="display:flex; justify-content:space-between; margin-bottom:4px; opacity:0.6; font-size:10px;">
                                    <span>${new Date(f.created_at).toLocaleDateString('pt-BR')}</span>
                                </div>
                                <p style="line-height:1.4; opacity:0.9;">${f.content}</p>
                            </div>
                        `).join('');
                    }

                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                            <div>
                                <h4 style="margin:0; font-size:15px; font-weight:600;">${p.name}</h4>
                                <span style="font-size:11px; opacity:0.6; display:block; margin-top:2px;">${roleLabel}</span>
                                <span style="font-size:11px; opacity:0.4;">${p.email}</span>
                            </div>
                            <button class="btn-primary btn-book-appointment-trigger" data-pro-id="${p.id}" data-pro-name="${p.name}" data-pro-role="${p.role}" style="font-size:11px; padding:6px 12px; height:auto; border-radius:8px;">
                                <i data-lucide="video" style="width:12px; height:12px; display:inline-block; vertical-align:middle; margin-right:4px;"></i>
                                Agendar
                            </button>
                        </div>
                        
                        <div style="border-top:1px solid rgba(255,255,255,0.05); padding-top:10px; margin-top:10px;">
                            <h5 style="margin:0; font-size:12px; font-weight:600; opacity:0.8;">Orientações e Prescrições:</h5>
                            <div style="max-height:150px; overflow-y:auto; display:flex; flex-direction:column; gap:6px;">
                                ${feedbacksHtml}
                            </div>
                        </div>
                    `;

                    card.querySelector('.btn-book-appointment-trigger').addEventListener('click', (e) => {
                        const target = e.currentTarget;
                        openBookAppointmentModal(target.dataset.proId, target.dataset.proName, target.dataset.proRole);
                    });

                    listContainer.appendChild(card);
                });
            }

            // 5. Renderiza consultas
            const appContainer = document.getElementById('my-pros-appointments-list');
            appContainer.innerHTML = '';

            if (appointments.length === 0) {
                appContainer.innerHTML = '<p style="font-size:12px; opacity:0.5; text-align:center; padding:12px;">Nenhuma consulta agendada.</p>';
            } else {
                appointments.forEach(a => {
                    const appointmentCard = document.createElement('div');
                    appointmentCard.className = 'history-day-card';
                    appointmentCard.style.padding = '12px';
                    appointmentCard.style.display = 'flex';
                    appointmentCard.style.flexDirection = 'column';
                    appointmentCard.style.gap = '8px';

                    const roleLabel = a.professional_role === 'nutritionist' ? 'Nutri' : 'Personal';
                    
                    const dateParts = a.appointment_date.split('T')[0].split('-');
                    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

                    const startTime = a.start_time.slice(0, 5);
                    const endTime = a.end_time.slice(0, 5);

                    let statusBadge = '';
                    let actionButtonsHtml = '';

                    if (a.status === 'scheduled') {
                        statusBadge = '<span class="ai-pill" style="background:rgba(34,197,94,0.15); color:#22c55e;">Agendado</span>';
                        actionButtonsHtml = `
                            <div style="display:flex; gap:8px; margin-top:4px;">
                                <a href="#" class="btn-primary flex-1 btn-start-video-call-trigger" data-video-link="${a.video_link}" style="font-size:11px; padding:6px; height:auto; border-radius:6px; text-decoration:none; text-align:center; display:flex; align-items:center; justify-content:center; gap:4px;">
                                    <i data-lucide="video" style="width:12px; height:12px;"></i>
                                    Iniciar Chamada
                                </a>
                                <button class="btn-danger flex-1 btn-cancel-appointment-trigger" data-app-id="${a.id}" style="font-size:11px; padding:6px; height:auto; border-radius:6px;">
                                    Cancelar
                                </button>
                            </div>
                        `;
                    } else if (a.status === 'cancelled') {
                        statusBadge = '<span class="ai-pill" style="background:rgba(239,68,68,0.15); color:#ef4444;">Cancelado</span>';
                        appointmentCard.style.opacity = '0.6';
                    } else {
                        statusBadge = '<span class="ai-pill" style="background:rgba(255,255,255,0.15); color:#fff;">Concluído</span>';
                        appointmentCard.style.opacity = '0.7';
                    }

                    appointmentCard.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <strong style="font-size:13px;">${a.professional_name}</strong> <span style="font-size:10px; opacity:0.6;">(${roleLabel})</span>
                                <div style="font-size:11px; opacity:0.6; margin-top:2px;">
                                    <i data-lucide="calendar" style="width:10px; height:10px; display:inline-block; vertical-align:middle; margin-top:-2px; margin-right:2px;"></i>
                                    ${formattedDate} às ${startTime} - ${endTime}
                                </div>
                            </div>
                            <div>
                                ${statusBadge}
                            </div>
                        </div>
                        ${actionButtonsHtml}
                    `;

                    const cancelBtn = appointmentCard.querySelector('.btn-cancel-appointment-trigger');
                    if (cancelBtn) {
                        cancelBtn.addEventListener('click', async (e) => {
                            if (confirm('Deseja realmente cancelar esta consulta?')) {
                                await cancelAppointment(e.currentTarget.dataset.appId);
                            }
                        });
                    }

                    const startCallBtn = appointmentCard.querySelector('.btn-start-video-call-trigger');
                    if (startCallBtn) {
                        startCallBtn.addEventListener('click', (e) => {
                            e.preventDefault();
                            const link = e.currentTarget.dataset.videoLink;
                            startVideoCall(link);
                        });
                    }

                    appContainer.appendChild(appointmentCard);
                });
            }

            // 5.5 Carrega e renderiza exames
            await loadMyExamsList();

            lucide.createIcons();
        } catch (err) {
            console.error('Erro ao renderizar tela de Meus Profissionais:', err);
        }
    }

    async function loadMyExamsList() {
        const container = document.getElementById('my-exams-list');
        if (!container) return;
        
        container.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.4); font-size: 12px; margin: 12px 0;">Carregando...</p>';

        try {
            const res = await fetch(`${API_URL}/user/exams`, {
                headers: { 'Authorization': `Bearer ${state.token}` }
            });
            if (!res.ok) throw new Error();
            const exams = await res.json();

            container.innerHTML = '';
            if (exams.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.4); font-size: 12px; margin: 12px 0;">Nenhum exame enviado.</p>';
                return;
            }

            exams.forEach(exam => {
                const card = document.createElement('div');
                card.className = 'history-day-card';
                card.style.padding = '12px';
                card.style.display = 'flex';
                card.style.flexDirection = 'column';
                card.style.gap = '6px';

                const dateStr = new Date(exam.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const filename = exam.file_path.substring(exam.file_path.lastIndexOf('/') + 1);
                const downloadUrl = `${API_URL}/user/exams/download/${filename}`;

                let noteHtml = '';
                if (exam.notes) {
                    noteHtml = `<div style="font-size:11px; color:var(--color-primary); background:rgba(245,193,77,0.05); padding:6px 8px; border-radius:6px; border:1px solid rgba(245,193,77,0.1); margin-top:4px;"><strong>Nota do Nutri:</strong> ${exam.notes}</div>`;
                }

                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="flex:1; min-width:0; margin-right:8px;">
                            <strong style="font-size:13px; color:#fff; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${exam.file_name}">${exam.file_name}</strong>
                            <span style="font-size:10px; opacity:0.5;">Enviado em: ${dateStr}</span>
                        </div>
                        <div style="display:flex; gap:8px; flex-shrink:0;">
                            <a href="${downloadUrl}" download="${exam.file_name}" class="btn-secondary" style="font-size:10px; padding:6px 8px; text-decoration:none; display:inline-block; border-radius:6px; height:auto; line-height:1;">
                                <i data-lucide="download" style="width:10px; height:10px; vertical-align:middle;"></i>
                            </a>
                            <button class="btn-danger btn-delete-exam" data-exam-id="${exam.id}" style="font-size:10px; padding:6px; border-radius:6px; height:auto; line-height:1;">
                                <i data-lucide="trash-2" style="width:10px; height:10px;"></i>
                            </button>
                        </div>
                    </div>
                    ${noteHtml}
                `;

                card.querySelector('.btn-delete-exam').addEventListener('click', async (e) => {
                    if (confirm('Deseja realmente excluir este exame?')) {
                        const examId = e.currentTarget.dataset.examId;
                        try {
                            const delRes = await fetch(`${API_URL}/user/exams/${examId}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${state.token}` }
                            });
                            if (!delRes.ok) throw new Error();
                            await loadMyExamsList();
                        } catch {
                            alert('Erro ao excluir exame.');
                        }
                    }
                });

                container.appendChild(card);
            });

            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            container.innerHTML = '<p style="text-align: center; color: var(--color-danger); font-size: 12px; margin: 12px 0;">Erro ao carregar exames.</p>';
        }
    }

    async function openBookAppointmentModal(proId, proName, proRole) {
        document.getElementById('book-appointment-pro-id').value = proId;
        document.getElementById('book-appointment-pro-info').innerText = `Agende uma consulta por vídeo com ${proName}.`;
        
        // 1. Exibir informações de cotas do plano para o tipo de profissional
        const quotaInfoContainer = document.getElementById('book-appointment-quota-info');
        if (quotaInfoContainer) {
            const roleLabel = proRole === 'nutritionist' ? 'Nutricionista' : 'Personal Trainer';
            const limit = proRole === 'nutritionist' 
              ? (state.user.max_nutritionist_appointments_per_month || 0) 
              : (state.user.max_trainer_appointments_per_month || 0);

            const appointments = state.myAppointments || [];
            const nowObj = new Date();
            const currentYear = nowObj.getFullYear();
            const currentMonth = nowObj.getMonth();

            const activeThisMonth = appointments.filter(app => {
                if (app.status === 'cancelled') return false;
                if (app.professional_role !== proRole) return false;
                
                const appDate = new Date(app.appointment_date);
                return appDate.getFullYear() === currentYear && appDate.getMonth() === currentMonth;
            }).length;

            const remaining = Math.max(0, limit - activeThisMonth);

            quotaInfoContainer.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                    <span style="opacity:0.7;">Direito no Plano (${roleLabel}):</span>
                    <strong>${limit} consultas/mês</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom: 2px;">
                    <span style="opacity:0.7;">Consultas Usadas no Mês Atual:</span>
                    <strong>${activeThisMonth}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; border-top:1px solid rgba(255,255,255,0.05); padding-top:4px; margin-top:4px;">
                    <span style="opacity:0.7;">Restantes:</span>
                    <strong style="color:${remaining > 0 ? '#22c55e' : '#ef4444'};">${remaining}</strong>
                </div>
            `;
        }

        const todayStr = getTodayDateString();
        const dateInput = document.getElementById('book-appointment-date');
        dateInput.value = todayStr;
        dateInput.min = todayStr;

        document.getElementById('book-appointment-start').value = '';
        document.getElementById('book-appointment-end').value = '';

        const slotsContainer = document.getElementById('book-appointment-pro-availability-slots');
        slotsContainer.innerHTML = '<p style="font-size:11px; opacity:0.5;">Buscando horários...</p>';

        const token = localStorage.getItem('nutrir_token');
        try {
            const res = await fetch(`${API_URL}/user/professionals/${proId}/availability`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Falha ao buscar agenda do profissional.');
            const slots = await res.json();
            state.currentProSlots = slots;

            slotsContainer.innerHTML = '';
            if (slots.length === 0) {
                slotsContainer.innerHTML = '<p style="font-size:11px; opacity:0.5; color:#ef4444;">Este profissional ainda não configurou horários de atendimento.</p>';
            } else {
                const diasSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
                slots.forEach(slot => {
                    const row = document.createElement('div');
                    row.style.display = 'flex';
                    row.style.justifyContent = 'space-between';
                    row.style.padding = '4px 0';
                    row.style.borderBottom = '1px solid rgba(255,255,255,0.02)';
                    row.innerHTML = `
                        <strong>${diasSemana[slot.day_of_week]}</strong>
                        <span>${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}</span>
                    `;
                    slotsContainer.appendChild(row);
                });
            }
        } catch (err) {
            slotsContainer.innerHTML = `<p style="font-size:11px; opacity:0.5; color:#ef4444;">${err.message}</p>`;
        }

        // Configuração reativa para o dia e horários de agendamento do profissional
        const updateAvailabilityForSelectedDate = async () => {
            const selectedDate = dateInput.value;
            if (!selectedDate) return;

            const dateParts = selectedDate.split('-');
            const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
            const dayOfWeek = dateObj.getDay();

            const daySlots = (state.currentProSlots || []).filter(slot => slot.day_of_week === dayOfWeek);
            const detailContainer = document.getElementById('book-appointment-date-details');
            if (!detailContainer) return;

            if (daySlots.length === 0) {
                detailContainer.innerHTML = `
                    <div style="background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.2); padding:10px; border-radius:8px; font-size:12px; margin-top:10px;">
                        <strong>Indisponível:</strong> Este profissional não atende neste dia da semana.
                    </div>
                `;
                return;
            }

            detailContainer.innerHTML = '<p style="font-size:11px; opacity:0.5; margin-top:10px;">Buscando agendamentos do dia...</p>';
            try {
                const busyRes = await fetch(`${API_URL}/user/professionals/${proId}/busy-slots?date=${selectedDate}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const busySlots = busyRes.ok ? await busyRes.json() : [];

                const todayStr = getTodayDateString();
                const isToday = selectedDate === todayStr;
                const nowSP = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
                const currentHour = String(nowSP.getHours()).padStart(2, '0');
                const currentMinute = String(nowSP.getMinutes()).padStart(2, '0');
                const currentTimeSP = `${currentHour}:${currentMinute}`;

                let slotsHtml = daySlots.map(slot => {
                    const start = slot.start_time.slice(0, 5);
                    const end = slot.end_time.slice(0, 5);
                    
                    if (isToday && start < currentTimeSP) {
                        return `
                            <div class="expired-time-slot" 
                                 style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); padding:8px 12px; border-radius:8px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; opacity:0.4; cursor:not-allowed;">
                                <span style="font-weight:600; color:var(--color-text-muted); text-decoration:line-through;">${start} às ${end}</span>
                                <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:#ef4444; letter-spacing:0.05em;">Expirado</span>
                            </div>
                        `;
                    }
                    
                    return `
                        <div class="selectable-time-slot" data-start="${start}" data-end="${end}" 
                             style="background:rgba(34,197,94,0.05); border:1px solid rgba(34,197,94,0.15); padding:8px 12px; border-radius:8px; margin-bottom:6px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; transition:all 0.2s;"
                             onmouseover="this.style.background='rgba(34,197,94,0.12)'; this.style.borderColor='var(--color-primary)';"
                             onmouseout="this.style.background='rgba(34,197,94,0.05)'; this.style.borderColor='rgba(34,197,94,0.15)';">
                            <span style="font-weight:600; color:var(--color-text);">${start} às ${end}</span>
                            <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:#22c55e; letter-spacing:0.05em;">Selecionar</span>
                        </div>
                    `;
                }).join('');

                let busyHtml = '<span style="color:#22c55e; font-size:11px;">Nenhuma consulta agendada neste dia (Livre).</span>';
                if (busySlots.length > 0) {
                    busyHtml = busySlots.map(busy => `
                        <div style="background:rgba(239,68,68,0.05); border:1px solid rgba(239,68,68,0.15); color:#ef4444; display:inline-block; padding:4px 8px; border-radius:6px; font-size:11px; margin-right:6px; margin-top:4px; font-weight:500;">
                            ${busy.start_time.slice(0, 5)} - ${busy.end_time.slice(0, 5)}
                        </div>
                    `).join('');
                }

                detailContainer.innerHTML = `
                    <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); padding:12px; border-radius:8px; font-size:12px; margin-top:10px; display:flex; flex-direction:column; gap:10px;">
                        <div>
                            <span style="opacity:0.6; display:block; margin-bottom:8px; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Horários de Atendimento Disponíveis (Clique para escolher):</span>
                            <div>${slotsHtml}</div>
                        </div>
                        <div style="border-top:1px solid rgba(255,255,255,0.05); padding-top:10px;">
                            <span style="opacity:0.6; display:block; margin-bottom:6px; font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Horários Ocupados no Dia:</span>
                            <div>${busyHtml}</div>
                        </div>
                    </div>
                `;

                // Adiciona listeners para preenchimento de início/fim de consulta ao clicar
                detailContainer.querySelectorAll('.selectable-time-slot').forEach(el => {
                    el.addEventListener('click', (e) => {
                        const target = e.currentTarget;
                        document.getElementById('book-appointment-start').value = target.dataset.start;
                        document.getElementById('book-appointment-end').value = target.dataset.end;
                        
                        // Efeito visual de seleção
                        detailContainer.querySelectorAll('.selectable-time-slot').forEach(item => {
                            item.style.boxShadow = 'none';
                            item.style.background = 'rgba(34,197,94,0.05)';
                        });
                        target.style.boxShadow = '0 0 0 2px var(--color-primary)';
                        target.style.background = 'rgba(34,197,94,0.15)';
                    });
                });
            } catch (err) {
                detailContainer.innerHTML = `<p style="font-size:11px; opacity:0.5; color:#ef4444; margin-top:10px;">${err.message}</p>`;
            }
        };

        dateInput.removeEventListener('change', updateAvailabilityForSelectedDate);
        dateInput.addEventListener('change', updateAvailabilityForSelectedDate);
        
        // Dispara uma vez inicial após obter os horários de atendimento da semana
        setTimeout(updateAvailabilityForSelectedDate, 500);

        document.getElementById('modal-book-appointment').classList.add('active');
    }

    async function cancelAppointment(appointmentId) {
        const token = localStorage.getItem('nutrir_token');
        try {
            const res = await fetch(`${API_URL}/user/appointments/${appointmentId}/cancel`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao cancelar consulta.');

            alert('Consulta cancelada com sucesso!');
            renderMyProfessionalsScreen();
        } catch (err) {
            alert(err.message);
        }
    }

    function getTodayDateString() {
        const nowSP = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
        const y = nowSP.getFullYear();
        const m = String(nowSP.getMonth() + 1).padStart(2, '0');
        const d = String(nowSP.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // 7. ROTEADOR DE TELAS
    function showScreen(screenId) {
        const key = screenId.replace('screen-', '');
        const targetScreen = screens[key];

        if (!targetScreen) {
            console.error(`Screen not found: ${screenId} (key: ${key})`);
            return;
        }

        Object.values(screens).forEach(screen => {
            if (screen) {
                screen.classList.remove('active');
            }
        });

        if (screenId !== 'screen-scanner') {
            stopCameraStream();
        }

        targetScreen.classList.add('active');

        // Exibição do Bottom Nav
        const noNavScreens = ['screen-login', 'screen-onboarding', 'screen-scanner', 'screen-results', 'screen-food-search', 'screen-professional', 'screen-admin', 'screen-video-call'];
        if (noNavScreens.includes(screenId)) {
            nav.style.display = 'none';
        } else {
            nav.style.display = 'flex';
            navItems.forEach(item => {
                if (item.dataset.target === screenId) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }

        // Ações específicas de aba
        if (screenId === 'screen-dashboard') {
            updateDashboard();
        }
        if (screenId === 'screen-recipes') {
            renderProRecipesTab();
            renderSavedAiRecipes();
        }
        if (screenId === 'screen-fasting') {
            renderFastingScreen();
        }
        if (screenId === 'screen-history') {
            renderHistoryPage();
        }
        if (screenId === 'screen-settings') {
            renderSettingsPage();
        }
        if (screenId === 'screen-my-professionals') {
            renderMyProfessionalsScreen();
        }
        if (screenId === 'screen-professional') {
            renderProfessionalPanel();
        }
        if (screenId === 'screen-admin') {
            renderAdminPanel();
        }
    }

    // 8. ONBOARDING COM SLIDERS INTERATIVOS CIENTÍFICOS
    function setupOnboardingSliders() {
        const inputWeight = document.getElementById('input-weight');
        const inputHeight = document.getElementById('input-height');
        
        const sliderGoal = document.getElementById('slider-goal-weight');
        const sliderSpeed = document.getElementById('slider-diet-speed');
        
        const lblGoal = document.getElementById('lbl-goal-weight');
        const lblSpeed = document.getElementById('lbl-diet-speed');
        const lblSpeedTitle = document.getElementById('lbl-speed-title');

        const lblMin = document.getElementById('lbl-bound-min');
        const lblMax = document.getElementById('lbl-bound-max');

        // Dispara recálculo ao mexer nos campos
        const triggerRecalculate = () => {
            const h = parseFloat(inputHeight.value) || 170;
            const w = parseFloat(inputWeight.value) || 70;
            
            // Intervalo saudável de peso baseado em IMC (18.5 a 24.9)
            const heightM = h / 100;
            const minHealthyWeight = Math.round(18.5 * (heightM * heightM) * 10) / 10;
            const maxHealthyWeight = Math.round(24.9 * (heightM * heightM) * 10) / 10;

            lblMin.innerText = `${minHealthyWeight} kg (IMC 18.5)`;
            lblMax.innerText = `${maxHealthyWeight} kg (IMC 24.9)`;

            // Define valores limites do slider de peso
            sliderGoal.min = Math.floor(minHealthyWeight - 5);
            sliderGoal.max = Math.ceil(maxHealthyWeight + 15);
            
            // Corrige valores
            const targetWeight = parseFloat(sliderGoal.value);
            lblGoal.innerText = targetWeight.toFixed(1);

            const speed = parseFloat(sliderSpeed.value);

            // Se objetivo de peso é menor que atual -> Perda. Se maior -> Ganho.
            let direction = 'lose';
            if (targetWeight > w) {
                direction = 'gain';
                lblSpeedTitle.innerText = "Velocidade de ganhar peso";
                lblSpeed.innerText = `+${speed.toFixed(2)}`;
            } else if (targetWeight < w) {
                direction = 'lose';
                lblSpeedTitle.innerText = "Velocidade de perder peso";
                lblSpeed.innerText = `-${speed.toFixed(2)}`;
            } else {
                direction = 'maintain';
                lblSpeedTitle.innerText = "Manutenção de peso";
                lblSpeed.innerText = `0.00`;
            }

            // Calcula calorias recomendadas em tempo real
            const age = parseInt(document.getElementById('input-age').value) || 25;
            const gender = document.querySelector('input[name="gender"]:checked').value;
            const activity = parseFloat(document.getElementById('select-activity').value) || 1.375;

            // Mifflin-St Jeor TMB
            let bmr = 0;
            if (gender === 'male') {
                bmr = 10 * w + 6.25 * h - 5 * age + 5;
            } else {
                bmr = 10 * w + 6.25 * h - 5 * age - 161;
            }
            const tdee = Math.round(bmr * activity);

            // Ajuste com base na velocidade
            // 1kg por semana = 7700 kcal de déficit/superávit
            // Déficit diário = (velocidade * 7700) / 7 = velocidade * 1100
            let targetCal = tdee;
            if (direction === 'lose') {
                targetCal = Math.round(tdee - (speed * 1100));
                // Mínimos saudáveis
                const safeMin = (gender === 'male') ? 1200 : 1000;
                if (targetCal < safeMin) targetCal = safeMin;
            } else if (direction === 'gain') {
                targetCal = Math.round(tdee + (speed * 1100));
            }

            document.getElementById('onboard-cal-result').innerText = targetCal;

            // Fim projetado da dieta
            const diffWeight = Math.abs(w - targetWeight);
            let weeks = 0;
            if (speed > 0 && direction !== 'maintain') {
                weeks = diffWeight / speed;
            }

            const projectedDate = new Date();
            projectedDate.setDate(projectedDate.getDate() + Math.round(weeks * 7));
            
            const pDay = String(projectedDate.getDate()).padStart(2, '0');
            const pMonth = String(projectedDate.getMonth() + 1).padStart(2, '0');
            const pYear = projectedDate.getFullYear();
            
            if (direction === 'maintain') {
                document.getElementById('onboard-date-result').innerText = "Meta contínua";
            } else {
                document.getElementById('onboard-date-result').innerText = `${pDay}/${pMonth}/${pYear}`;
            }
        };

        // Escuta inputs
        inputWeight.addEventListener('input', triggerRecalculate);
        inputHeight.addEventListener('input', triggerRecalculate);
        document.getElementById('input-age').addEventListener('input', triggerRecalculate);
        document.querySelectorAll('input[name="gender"]').forEach(r => r.addEventListener('change', triggerRecalculate));
        document.getElementById('select-activity').addEventListener('change', triggerRecalculate);

        // Escuta sliders
        sliderGoal.addEventListener('input', triggerRecalculate);
        sliderSpeed.addEventListener('input', triggerRecalculate);

        // Executa primeira vez
        triggerRecalculate();
    }

    // 9. ONBOARDING SUBMIT
    const onboardingForm = document.getElementById('onboarding-form');
    onboardingForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const gender = document.querySelector('input[name="gender"]:checked').value;
        const age = parseInt(document.getElementById('input-age').value);
        const weight = parseFloat(document.getElementById('input-weight').value);
        const height = parseInt(document.getElementById('input-height').value);
        const activity = parseFloat(document.getElementById('select-activity').value);

        const goalWeight = parseFloat(document.getElementById('slider-goal-weight').value);
        const speed = parseFloat(document.getElementById('slider-diet-speed').value);

        // Direção
        let direction = 'lose';
        if (goalWeight > weight) direction = 'gain';
        else if (goalWeight === weight) direction = 'maintain';

        // TMB
        let bmr = (gender === 'male') ? 
            (10 * weight + 6.25 * height - 5 * age + 5) : 
            (10 * weight + 6.25 * height - 5 * age - 161);
        const tdee = Math.round(bmr * activity);

        let targetCalories = tdee;
        if (direction === 'lose') {
            targetCalories = Math.round(tdee - (speed * 1100));
            const safeMin = (gender === 'male') ? 1200 : 1000;
            if (targetCalories < safeMin) targetCalories = safeMin;
        } else if (direction === 'gain') {
            targetCalories = Math.round(tdee + (speed * 1100));
        }

        // Macronutrientes padrão cientifico
        let targetProtein = 0;
        let targetFat = 0;
        if (direction === 'lose') {
            targetProtein = Math.round(weight * 2.0);
            targetFat = Math.round(weight * 0.8);
        } else if (direction === 'gain') {
            targetProtein = Math.round(weight * 2.0);
            targetFat = Math.round(weight * 1.0);
        } else {
            targetProtein = Math.round(weight * 1.8);
            targetFat = Math.round(weight * 0.9);
        }

        const proteinKcal = targetProtein * 4;
        const fatKcal = targetFat * 9;
        let targetCarbs = Math.round((targetCalories - proteinKcal - fatKcal) / 4);
        if (targetCarbs < 50) targetCarbs = 50;

        const profile = {
            gender, age, weight, height, activity,
            goal: direction,
            goalWeight, speed,
            tdee,
            targetCalories,
            targetProtein,
            targetCarbs,
            targetFat,
            dateCalculated: getTodayDateString()
        };

        saveProfileToLocalStorage(profile);
        updateDashboard();
        showScreen('screen-dashboard');
    });

    // 10. HIDRATAÇÃO DE ÁGUA LÓGICA
    function updateWaterWidget() {
        const text = document.getElementById('water-progress-text');
        const bar = document.getElementById('water-bar');

        text.innerText = `${state.waterConsumed} / ${state.waterTarget} ml`;
        const percentage = Math.min(100, (state.waterConsumed / state.waterTarget) * 100);
        bar.style.width = `${percentage}%`;
    }

    function addWater(amount) {
        state.waterConsumed += amount;
        localStorage.setItem('nutrir_water_consumed', state.waterConsumed);
        updateWaterWidget();
    }

    // 11. BUSCA DE ALIMENTOS NACIONAIS BRASILEIROS
    const searchTriggerBox = document.getElementById('search-trigger-box');
    const inputFoodSearch = document.getElementById('input-food-search');
    const foodSearchResults = document.getElementById('food-search-results');
    const clearSearchInputBtn = document.getElementById('btn-clear-search-input');

    searchTriggerBox.addEventListener('click', () => {
        showScreen('screen-food-search');
        inputFoodSearch.value = "";
        renderFoodSearchResults("");
        setTimeout(() => inputFoodSearch.focus(), 150);
    });

    document.getElementById('btn-close-food-search').addEventListener('click', () => {
        showScreen('screen-dashboard');
    });

    inputFoodSearch.addEventListener('input', (e) => {
        const query = e.target.value;
        if (query.length > 0) {
            clearSearchInputBtn.style.display = 'block';
        } else {
            clearSearchInputBtn.style.display = 'none';
        }
        renderFoodSearchResults(query);
    });

    clearSearchInputBtn.addEventListener('click', () => {
        inputFoodSearch.value = "";
        clearSearchInputBtn.style.display = 'none';
        renderFoodSearchResults("");
        inputFoodSearch.focus();
    });

    function renderFoodSearchResults(query) {
        foodSearchResults.innerHTML = "";
        const cleanQuery = query.toLowerCase().trim();

        // Se pesquisa vazia, exibe todos os itens padrão
        const filtered = cleanQuery === "" ? 
            BR_FOOD_DATABASE : 
            BR_FOOD_DATABASE.filter(f => f.name.toLowerCase().includes(cleanQuery) || f.brand.toLowerCase().includes(cleanQuery));

        if (filtered.length === 0) {
            foodSearchResults.innerHTML = `
                <div class="empty-state">
                    <p>Nenhum produto nacional encontrado com esse termo.</p>
                </div>
            `;
            return;
        }

        filtered.forEach(food => {
            const card = document.createElement('div');
            card.className = 'search-food-item';
            card.innerHTML = `
                <div class="food-meta-info">
                    <span class="title">${food.name}</span>
                    <span class="kcal">${food.calories} kcal <span class="sub">(${food.portion_g}g)</span></span>
                    <span class="portion-badge">${food.brand}</span>
                </div>
                <button class="add-food-search-btn">
                    <i data-lucide="plus" style="width: 18px; height: 18px;"></i>
                </button>
            `;

            card.addEventListener('click', () => openFoodAddConfirmModal(food));
            foodSearchResults.appendChild(card);
        });

        lucide.createIcons();
    }

    // Modal de Confirmação de quantidade da busca
    const foodConfirmModal = document.getElementById('food-add-confirm-modal');
    const inputFoodConfirmWeight = document.getElementById('input-food-confirm-weight');

    function openFoodAddConfirmModal(food) {
        state.selectedSearchFood = food;
        document.getElementById('food-confirm-title').innerText = food.name;
        document.getElementById('food-confirm-subtitle').innerText = `${food.portion_g}g = ${food.calories} kcal`;
        inputFoodConfirmWeight.value = food.portion_g;
        
        updateFoodConfirmPreview();
        foodConfirmModal.classList.add('active');
    }

    function updateFoodConfirmPreview() {
        if (!state.selectedSearchFood) return;
        const food = state.selectedSearchFood;
        const weight = parseFloat(inputFoodConfirmWeight.value) || 0;
        const multiplier = weight / food.portion_g;

        const cal = Math.round(food.calories * multiplier);
        const p = Math.round(food.protein * multiplier * 10) / 10;
        const c = Math.round(food.carbs * multiplier * 10) / 10;
        const f = Math.round(food.fat * multiplier * 10) / 10;

        document.getElementById('lbl-confirm-c').innerText = `${c}g`;
        document.getElementById('lbl-confirm-p').innerText = `${p}g`;
        document.getElementById('lbl-confirm-f').innerText = `${f}g`;
        document.getElementById('lbl-confirm-cal').innerText = `${cal} kcal`;
    }

    inputFoodConfirmWeight.addEventListener('input', updateFoodConfirmPreview);

    document.getElementById('btn-close-food-confirm-modal').addEventListener('click', () => {
        foodConfirmModal.classList.remove('active');
        state.selectedSearchFood = null;
    });

    document.getElementById('btn-cancel-food-confirm').addEventListener('click', () => {
        foodConfirmModal.classList.remove('active');
        state.selectedSearchFood = null;
    });

    document.getElementById('btn-save-food-confirm').addEventListener('click', () => {
        if (!state.selectedSearchFood) return;
        const food = state.selectedSearchFood;
        const weight = parseFloat(inputFoodConfirmWeight.value) || 0;
        if (weight <= 0) {
            alert("Por favor insira um peso válido.");
            return;
        }

        const multiplier = weight / food.portion_g;
        const cal = Math.round(food.calories * multiplier);
        const p = Math.round(food.protein * multiplier * 10) / 10;
        const c = Math.round(food.carbs * multiplier * 10) / 10;
        const f = Math.round(food.fat * multiplier * 10) / 10;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;

        const newMeal = {
            id: 'meal_' + Date.now(),
            date: todayStr,
            time: timeStr,
            name: food.name,
            items: [
                {
                    name: food.name,
                    weight_g: weight,
                    calories: cal,
                    protein: p,
                    carbs: c,
                    fat: f
                }
            ],
            total: {
                calories: cal,
                protein: p,
                carbs: c,
                fat: f
            }
        };

        state.mealsLog.push(newMeal);
        saveMealsToLocalStorage();
        foodConfirmModal.classList.remove('active');
        state.selectedSearchFood = null;

        updateDashboard();
        showScreen('screen-dashboard');
    });

    // 12. ABA DE RECEITAS — NUTRICIONISTA E IA

    // ── RECEITAS DO NUTRICIONISTA ──
    const PRO_MEAL_EMOJIS = {
        cafe_da_manha: '☀️', lanche_manha: '🍎', almoco: '🍽️',
        lanche_tarde: '🍊', jantar: '🌙', ceia: '🌛'
    };

    function renderProRecipesTab() {
        const loading = document.getElementById('pro-plan-loading');
        const empty   = document.getElementById('pro-plan-empty');
        const content = document.getElementById('pro-plan-content');
        if (!loading || !empty || !content) return;

        if (!state.proWeeklyPlan) {
            loading.classList.add('hidden');
            empty.classList.remove('hidden');
            content.classList.add('hidden');
            lucide.createIcons();
            return;
        }

        loading.classList.add('hidden');
        empty.classList.add('hidden');
        content.classList.remove('hidden');

        document.getElementById('pro-plan-name').textContent = state.proWeeklyPlan.name || 'Cardápio Semanal';
        const profLabel = document.getElementById('pro-plan-professional');
        if (profLabel) {
            const role = state.proWeeklyPlan.professional_role === 'nutritionist' ? 'Nutricionista' : 'Personal Trainer';
            profLabel.textContent = `Por: ${state.proWeeklyPlan.professional_name || 'Profissional'} · ${role}`;
        }

        // Bind day tabs
        document.querySelectorAll('.pro-day-tab').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.pro-day-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderProPlanDay(parseInt(tab.dataset.dow));
            };
        });

        // Show today's dow by default
        const todayDow = new Date().getDay();
        document.querySelectorAll('.pro-day-tab').forEach(t => t.classList.remove('active'));
        const todayTab = document.querySelector(`.pro-day-tab[data-dow="${todayDow}"]`);
        if (todayTab) todayTab.classList.add('active');
        renderProPlanDay(todayDow);
        lucide.createIcons();
    }

    function renderProPlanDay(dow) {
        const container = document.getElementById('pro-plan-day-view');
        if (!container || !state.proWeeklyPlan) return;
        const planData = typeof state.proWeeklyPlan.plan_data === 'string'
            ? JSON.parse(state.proWeeklyPlan.plan_data)
            : state.proWeeklyPlan.plan_data;
        const dayData = planData?.days?.find(d => d.dow === dow);
        if (!dayData || !dayData.meals) {
            container.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:24px;">Sem refeições para este dia.</p>';
            return;
        }

        const dayNames = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
        let totalCal = 0, totalP = 0, totalC = 0, totalG = 0;
        dayData.meals.forEach(m => {
            totalCal += m.total?.calories || 0;
            totalP   += m.total?.protein  || 0;
            totalC   += m.total?.carbs    || 0;
            totalG   += m.total?.fat      || 0;
        });
        const targetCal = state.userProfile?.targetCalories || 0;

        container.innerHTML = `
            <div class="pro-plan-day-title">${dayNames[dow]}</div>
            ${dayData.meals.filter(m => m.items && m.items.length > 0).map(meal => `
                <div class="pro-meal-card">
                    <div class="pro-meal-header">
                        <span class="pro-meal-icon">${PRO_MEAL_EMOJIS[meal.type] || '🍴'}</span>
                        <div>
                            <strong class="pro-meal-label">${meal.label}</strong>
                            <span class="pro-meal-time">${meal.time}</span>
                        </div>
                        <span class="pro-meal-cal">${Math.round(meal.total?.calories || 0)} kcal</span>
                    </div>
                    <ul class="pro-meal-item-list">
                        ${meal.items.map(item => `
                            <li class="pro-meal-item">
                                <span class="pro-item-name">${item.name}${item.qty ? ` <span class="pro-item-qty">(${item.qty})</span>` : ''}</span>
                                <span class="pro-item-macros">${Math.round(item.calories)} kcal · P:${Math.round(item.protein)}g · C:${Math.round(item.carbs)}g · G:${Math.round(item.fat)}g</span>
                            </li>
                        `).join('')}
                    </ul>
                    ${meal.total?.calories > 0 ? `<div class="pro-meal-subtotal">Subtotal: ${Math.round(meal.total.calories)} kcal · P:${Math.round(meal.total.protein)}g · C:${Math.round(meal.total.carbs)}g · G:${Math.round(meal.total.fat)}g</div>` : ''}
                    ${meal.instructions ? `<div class="pro-meal-instructions"><i data-lucide="chef-hat" style="width:13px;height:13px;"></i> ${meal.instructions}</div>` : ''}
                </div>
            `).join('') || '<p style="text-align:center;color:var(--color-text-muted);padding:20px;">Sem refeições registradas para este dia.</p>'}
            <div class="pro-day-total-card">
                <div class="pro-day-total-title">Total do Dia</div>
                <div class="pro-day-total-row">
                    <span>Calorias</span>
                    <div class="pro-total-bar-wrap">
                        <div class="pro-total-bar" style="width:${targetCal > 0 ? Math.min(100, Math.round(totalCal/targetCal*100)) : 0}%;background:var(--color-primary);"></div>
                    </div>
                    <span class="pro-total-val">${Math.round(totalCal)} kcal</span>
                </div>
                <div class="pro-day-total-macros">
                    <span>P: ${Math.round(totalP)}g</span>
                    <span>C: ${Math.round(totalC)}g</span>
                    <span>G: ${Math.round(totalG)}g</span>
                </div>
            </div>
        `;
        lucide.createIcons();
    }

    const recipeModal = document.getElementById('recipe-detail-modal');
    const sliderRecipeScale = document.getElementById('slider-recipe-scale');
    const lblRecipePortions = document.getElementById('lbl-recipe-portions');

    function openRecipeDetailModal(recipe) {
        state.activeRecipe = recipe;
        state.recipeScaleFactor = 100;
        state.recipePortionCount = 1;

        sliderRecipeScale.value = 100;
        lblRecipePortions.innerText = "1";

        updateRecipeModalUI();
        recipeModal.classList.add('active');
    }

    function updateRecipeModalUI() {
        if (!state.activeRecipe) return;
        const recipe = state.activeRecipe;
        
        // Multiplicadores
        const scale = state.recipeScaleFactor / 100;
        const portions = state.recipePortionCount;
        const multiplier = scale * portions;

        // Recalcula macros por porção (o slider afeta o tamanho da porção)
        const carbs = Math.round(recipe.carbs_base * scale * 10) / 10;
        const protein = Math.round(recipe.protein_base * scale * 10) / 10;
        const fat = Math.round(recipe.fat_base * scale * 10) / 10;
        const cal = Math.round(recipe.calories_base * scale);

        // Atualiza textos do modal
        document.getElementById('recipe-modal-title').innerText = recipe.name;
        document.getElementById('recipe-modal-category').innerText = recipe.category === 'lunch' ? 'Almoço' : (recipe.category === 'breakfast' ? 'Café da Manhã' : 'Lanche');
        document.getElementById('recipe-modal-time').innerHTML = `<i data-lucide="clock" style="width:12px;height:12px;"></i> ${recipe.time_min} min`;
        
        document.getElementById('recipe-m-carbs').innerText = `${carbs}g`;
        document.getElementById('recipe-m-protein').innerText = `${protein}g`;
        document.getElementById('recipe-m-fat').innerText = `${fat}g`;
        document.getElementById('recipe-m-calories').innerText = `${cal} kcal`;
        document.getElementById('recipe-directions-text').innerText = recipe.directions;

        // Ingredientes List
        const listEl = document.getElementById('recipe-ingredients-list');
        listEl.innerHTML = "";

        recipe.ingredients.forEach(ing => {
            // Calcula quantidade baseada em escala e porções
            const amtVal = ing.amount_base * multiplier;
            
            let displayAmountStr = "";
            if (ing.unit === "unidade(s)" || ing.unit === "colher(es)") {
                // Para unidades e colheres, se der número quebrado, mostramos fração estilo Slimo
                if (Number.isInteger(amtVal)) {
                    displayAmountStr = `${amtVal} ${ing.unit}`;
                } else {
                    // Ex: se amtVal for 1.4 e portions for 5 -> 7/5 unidade(s)
                    // Faremos uma aproximação bonita
                    const fractionNumerator = Math.round(amtVal * 5);
                    displayAmountStr = `${fractionNumerator}/5 ${ing.unit} (${(ing.amount_base * scale * portions).toFixed(0)}g)`;
                }
            } else {
                displayAmountStr = `${Math.round(amtVal)}${ing.unit}`;
            }

            const itemCard = document.createElement('div');
            itemCard.className = 'ingredient-scaled-card';
            itemCard.innerHTML = `
                <span class="i-name">${ing.name}</span>
                <span class="i-amount">${displayAmountStr}</span>
            `;
            listEl.appendChild(itemCard);
        });

        lucide.createIcons();
    }

    // Escuta Sliders do Modal
    sliderRecipeScale.addEventListener('input', (e) => {
        state.recipeScaleFactor = parseInt(e.target.value);
        updateRecipeModalUI();
    });

    document.getElementById('btn-recipe-portion-minus').addEventListener('click', () => {
        if (state.recipePortionCount > 1) {
            state.recipePortionCount--;
            lblRecipePortions.innerText = state.recipePortionCount;
            updateRecipeModalUI();
        }
    });

    document.getElementById('btn-recipe-portion-plus').addEventListener('click', () => {
        state.recipePortionCount++;
        lblRecipePortions.innerText = state.recipePortionCount;
        updateRecipeModalUI();
    });

    document.getElementById('btn-close-recipe-modal').addEventListener('click', () => {
        recipeModal.classList.remove('active');
        state.activeRecipe = null;
    });

    // Salvar receita na dieta (Para Hoje)
    document.getElementById('btn-log-recipe-today').addEventListener('click', () => {
        logRecipeToDate(new Date());
    });

    // Salvar receita na dieta (Por 7 Dias)
    document.getElementById('btn-log-recipe-7days').addEventListener('click', () => {
        if (confirm("Deseja registrar esta refeição no mesmo horário para hoje e para os próximos 6 dias?")) {
            for (let i = 0; i < 7; i++) {
                const date = new Date();
                date.setDate(date.getDate() + i);
                logRecipeToDate(date);
            }
            alert("Refeições programadas com sucesso para os próximos 7 dias!");
        }
    });

    function logRecipeToDate(dateObj) {
        if (!state.activeRecipe) return;
        const recipe = state.activeRecipe;
        const scale = state.recipeScaleFactor / 100;
        const portions = state.recipePortionCount;
        const multiplier = scale * portions;

        const cal = Math.round(recipe.calories_base * multiplier);
        const p = Math.round(recipe.protein_base * multiplier * 10) / 10;
        const c = Math.round(recipe.carbs_base * multiplier * 10) / 10;
        const f = Math.round(recipe.fat_base * multiplier * 10) / 10;

        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;

        const logEntry = {
            id: 'meal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            date: dateStr,
            time: timeStr,
            name: `${recipe.name} (${portions} porção/ões)`,
            items: [
                {
                    name: recipe.name,
                    weight_g: Math.round(400 * scale * portions), // Estimativa de peso cozido total
                    calories: cal,
                    protein: p,
                    carbs: c,
                    fat: f
                }
            ],
            total: { calories: cal, protein: p, carbs: c, fat: f }
        };

        state.mealsLog.push(logEntry);
        saveMealsToLocalStorage();

        recipeModal.classList.remove('active');
        state.activeRecipe = null;
        updateDashboard();
        showScreen('screen-dashboard');
    }

    // 13. GERADOR DE RECEITAS PERSONALIZADAS POR IA (GEMINI)
    
    // Mapeamento de receitas para o modo demonstração
    const MOCK_RECIPES_POOL = {
        breakfast: [
            {
                name: "Omelete Fit de Ricota e Espinafre",
                category: "breakfast",
                time_min: 10,
                image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400",
                calories_base: 180,
                protein_base: 18.0,
                carbs_base: 4.5,
                fat_base: 10.0,
                fiber_base: 1.5,
                ingredients: [
                    { name: "Ovos de galinha inteiros", amount_base: 2, unit: "unidade(s)" },
                    { name: "Ricota fresca esfarelada", amount_base: 30, unit: "g" },
                    { name: "Folhas de espinafre fresco", amount_base: 20, unit: "g" }
                ],
                directions: "Bata os ovos, misture o espinafre picado e a ricota. Despeje em uma frigideira untada e doure dos dois lados."
            },
            {
                name: "Panqueca Fit de Aveia e Banana",
                category: "breakfast",
                time_min: 12,
                image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400",
                calories_base: 245,
                protein_base: 12.0,
                carbs_base: 42.0,
                fat_base: 4.5,
                fiber_base: 5.0,
                ingredients: [
                    { name: "Banana prata madura", amount_base: 1, unit: "unidade(s)" },
                    { name: "Ovo inteiro de galinha", amount_base: 1, unit: "unidade(s)" },
                    { name: "Farelo de aveia integral", amount_base: 30, unit: "g" }
                ],
                directions: "Amasse a banana, misture com o ovo e a aveia. Grelhe em frigideira antiaderente tampada."
            },
            {
                name: "Crepioca Proteica de Frango",
                category: "breakfast",
                time_min: 12,
                image: "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=400",
                calories_base: 290,
                protein_base: 22.0,
                carbs_base: 20.0,
                fat_base: 8.0,
                fiber_base: 1.0,
                ingredients: [
                    { name: "Goma de tapioca seca", amount_base: 30, unit: "g" },
                    { name: "Ovo inteiro", amount_base: 1, unit: "unidade(s)" },
                    { name: "Peito de frango cozido desfiado", amount_base: 60, unit: "g" }
                ],
                directions: "Misture tapioca e ovo, doure na frigideira. Recheie com o frango cozido desfiado temperado."
            }
        ],
        lunch: [
            {
                name: "Purê de Mandioquinha com Carne Moída",
                category: "lunch",
                time_min: 30,
                image: "https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=400",
                calories_base: 450,
                protein_base: 35.0,
                carbs_base: 48.0,
                fat_base: 12.0,
                fiber_base: 4.0,
                ingredients: [
                    { name: "Mandioquinha cozida", amount_base: 200, unit: "g" },
                    { name: "Patinho bovino moído grelhado", amount_base: 120, unit: "g" },
                    { name: "Creme de ricota light", amount_base: 30, unit: "g" }
                ],
                directions: "Amasse a mandioquinha com o creme de ricota para fazer o purê. Sirva com a carne moída refogada e temperada."
            },
            {
                name: "Strogonoff de Frango Light com Arroz",
                category: "lunch",
                time_min: 25,
                image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
                calories_base: 410,
                protein_base: 42.0,
                carbs_base: 35.0,
                fat_base: 9.0,
                fiber_base: 3.0,
                ingredients: [
                    { name: "Peito de frango em cubos", amount_base: 150, unit: "g" },
                    { name: "Iogurte natural desnatado", amount_base: 100, unit: "g" },
                    { name: "Arroz integral cozido", amount_base: 100, unit: "g" },
                    { name: "Molho de tomate caseiro", amount_base: 50, unit: "g" }
                ],
                directions: "Grelhe o frango, misture o molho de tomate e desligue o fogo antes de adicionar o iogurte para simular creme de leite. Sirva com arroz."
            },
            {
                name: "Tilápia Grelhada com Legumes",
                category: "lunch",
                time_min: 20,
                image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400",
                calories_base: 340,
                protein_base: 38.0,
                carbs_base: 15.0,
                fat_base: 10.0,
                fiber_base: 5.0,
                ingredients: [
                    { name: "Filé de tilápia fresca", amount_base: 180, unit: "g" },
                    { name: "Brócolis cozido no vapor", amount_base: 100, unit: "g" },
                    { name: "Azeite de oliva extra virgem", amount_base: 10, unit: "ml" }
                ],
                directions: "Grelhe a tilápia com sal e limão. Sirva com os brócolis salpicados com o azeite de oliva."
            }
        ],
        dinner: [
            {
                name: "Sopa Creme de Abóbora com Frango",
                category: "dinner",
                time_min: 30,
                image: "https://images.unsplash.com/photo-1547592165-e1d17fed6005?w=400",
                calories_base: 280,
                protein_base: 28.0,
                carbs_base: 24.0,
                fat_base: 6.0,
                fiber_base: 4.5,
                ingredients: [
                    { name: "Abóbora cabotiá cozida", amount_base: 200, unit: "g" },
                    { name: "Peito de frango cozido desfiado", amount_base: 100, unit: "g" },
                    { name: "Gengibre ralado fresco", amount_base: 5, unit: "g" }
                ],
                directions: "Bata a abóbora no liquidificador com água do cozimento e gengibre. Ferva e junte o frango desfiado por cima."
            },
            {
                name: "Espaguete de Abobrinha à Bolonhesa",
                category: "dinner",
                time_min: 20,
                image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
                calories_base: 310,
                protein_base: 28.0,
                carbs_base: 18.0,
                fat_base: 12.0,
                fiber_base: 4.0,
                ingredients: [
                    { name: "Abobrinha ralada em tiras", amount_base: 250, unit: "g" },
                    { name: "Carne bovina moída patinho", amount_base: 100, unit: "g" },
                    { name: "Molho de tomate caseiro", amount_base: 80, unit: "g" }
                ],
                directions: "Refogue a carne moída com molho de tomate. Salteie rapidamente as tiras de abobrinha em frigideira quente com alho por 2 min e sirva o molho por cima."
            },
            {
                name: "Salada Proteica de Atum",
                category: "dinner",
                time_min: 15,
                image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
                calories_base: 360,
                protein_base: 30.0,
                carbs_base: 32.0,
                fat_base: 9.0,
                fiber_base: 7.0,
                ingredients: [
                    { name: "Grão de bico cozido drenado", amount_base: 120, unit: "g" },
                    { name: "Atum ralado em água lata", amount_base: 1, unit: "lata(s)" },
                    { name: "Cebola roxa picada e cheiro verde", amount_base: 20, unit: "g" }
                ],
                directions: "Misture o grão de bico, o atum drenado, a cebola roxa e o cheiro verde em um bowl. Tempere com limão e sal."
            }
        ],
        snack: [
            {
                name: "Bowl de Iogurte Grego e Chia",
                category: "snack",
                time_min: 5,
                image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
                calories_base: 160,
                protein_base: 16.0,
                carbs_base: 12.0,
                fat_base: 4.0,
                fiber_base: 3.5,
                ingredients: [
                    { name: "Iogurte grego desnatado (Yorgus)", amount_base: 130, unit: "g" },
                    { name: "Sementes de chia", amount_base: 10, unit: "g" },
                    { name: "Morangos frescos fatiados", amount_base: 50, unit: "g" }
                ],
                directions: "Coloque o iogurte no bowl, misture a chia e decore com os morangos por cima."
            },
            {
                name: "Whey Shake Creamy de Morango",
                category: "snack",
                time_min: 5,
                image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
                calories_base: 195,
                protein_base: 25.0,
                carbs_base: 14.0,
                fat_base: 3.0,
                fiber_base: 2.0,
                ingredients: [
                    { name: "Whey protein de baunilha/morango", amount_base: 30, unit: "g" },
                    { name: "Leite desnatado líquido", amount_base: 150, unit: "ml" },
                    { name: "Morangos congelados", amount_base: 60, unit: "g" }
                ],
                directions: "Bata todos os ingredientes no liquidificador ou mixer com pedras de gelo até ficar cremoso."
            },
            {
                name: "Muffin de Aveia Proteico",
                category: "snack",
                time_min: 8,
                image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
                calories_base: 220,
                protein_base: 15.0,
                carbs_base: 26.0,
                fat_base: 6.0,
                fiber_base: 3.0,
                ingredients: [
                    { name: "Farelo de aveia integral", amount_base: 25, unit: "g" },
                    { name: "Ovo inteiro de galinha", amount_base: 1, unit: "unidade(s)" },
                    { name: "Cacau em pó 100% puro", amount_base: 10, unit: "g" }
                ],
                directions: "Misture tudo na caneca com adoçante a gosto. Asse no micro-ondas por 1.5 minutos."
            }
        ]
    };

    // Event listener do gerador expandido
    const btnGenerateRecipeV2 = document.getElementById('btn-generate-ai-recipe-v2');
    if (btnGenerateRecipeV2) {
        btnGenerateRecipeV2.addEventListener('click', async () => {
            const mealType = document.getElementById('select-ai-meal-type').value;
            const period = document.getElementById('select-ai-period').value;

            const profile = state.userProfile;
            if (!profile) {
                alert("Por favor, conclua o Onboarding primeiro para calcularmos suas metas.");
                return;
            }

            const loader = document.getElementById('ai-loader');
            const loaderStatus = document.getElementById('loader-status');
            
            loader.classList.remove('hidden');
            loaderStatus.innerText = "Preparando balanceador nutricional...";

            // Calcular saldo de macros do dia
            const todayStr = getTodayDateString();
            let calConsumed = 0;
            let protConsumed = 0;
            let carbsConsumed = 0;
            let fatConsumed = 0;

            state.mealsLog.filter(m => m.date === todayStr).forEach(m => {
                calConsumed += m.total.calories;
                protConsumed += m.total.protein;
                carbsConsumed += m.total.carbs;
                fatConsumed += m.total.fat;
            });

            const calRemaining = Math.max(150, profile.targetCalories - calConsumed);
            const protRemaining = Math.max(10, profile.targetProtein - protConsumed);
            const carbsRemaining = Math.max(10, profile.targetCarbs - carbsConsumed);
            const fatRemaining = Math.max(5, profile.targetFat - fatConsumed);

            // Fração razoável por tipo de refeição — não usar saldo total do dia
            const mealFraction = { breakfast: 0.25, lunch: 0.35, dinner: 0.30, snack: 0.12, all: 0.30 };
            const frac = mealFraction[mealType] || 0.30;
            const calForMeal  = Math.min(calRemaining,  Math.round(profile.targetCalories  * frac));
            const protForMeal = Math.min(protRemaining, Math.round(profile.targetProtein   * frac));
            const carbForMeal = Math.min(carbsRemaining,Math.round(profile.targetCarbs     * frac));
            const fatForMeal  = Math.min(fatRemaining,  Math.round(profile.targetFat       * frac));

            try {
                if (period === 'daily') {
                    loaderStatus.innerText = `IA gerando uma receita de ${mealType === 'all' ? 'qualquer tipo' : mealType} de ${calForMeal} kcal...`;
                    const generatedRecipe = await callGeminiForDailyRecipe(mealType, calForMeal, protForMeal, carbForMeal, fatForMeal);
                    state.savedAiRecipes.push(generatedRecipe);
                    saveAiRecipesToLocalStorage();
                    renderSavedAiRecipes();
                    loader.classList.add('hidden');
                    openRecipeDetailModal(generatedRecipe);
                } else {
                    loaderStatus.innerText = `IA gerando um plano semanal adaptado para ${profile.targetCalories} kcal/dia...`;
                    const generatedPlan = await callGeminiForWeeklyPlan(mealType, profile);
                    state.savedWeeklyPlans.push(generatedPlan);
                    saveWeeklyPlansToLocalStorage();
                    renderSavedWeeklyPlans();
                    loader.classList.add('hidden');
                    alert("Plano semanal gerado com sucesso! Clique no plano abaixo para expandir e acessar as receitas de cada dia.");
                }
            } catch (err) {
                console.error("Erro na geração por IA: ", err);
                const errMsg = err.message.includes('configurada') ? err.message : "IA indisponível. Exibindo receitas de demonstração.";
                alert(errMsg);
                runMockGeneration(mealType, period, profile, calForMeal, protForMeal, carbForMeal, fatForMeal);
                loader.classList.add('hidden');
            }
        });
    }

    async function callGeminiForDailyRecipe(mealType, cal, p, c, f) {
        const token = localStorage.getItem('nutrir_token');
        const profile = state.userProfile ? {
            goal: state.userProfile.goal,
            goalWeight: state.userProfile.goalWeight,
            weight: state.userProfile.weight,
            age: state.userProfile.age,
            gender: state.userProfile.gender,
            targetCalories: state.userProfile.targetCalories,
            targetProtein: state.userProfile.targetProtein,
            targetCarbs: state.userProfile.targetCarbs,
            targetFat: state.userProfile.targetFat
        } : null;
        const res = await fetch('/api/ai/generate-recipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ mealType, cal, protein: p, carbs: c, fat: f, profile })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Falha ao gerar receita');
        }
        const data = await res.json();
        const { recipe: r, mealType: mt, _meta } = data;

        if (_meta) {
            console.group(`%c[Nutrir IA] Receita Diária`, 'color:#f5c14d;font-weight:bold');
            console.log(`Provedor : ${_meta.provider}`);
            console.log(`Modelo   : ${_meta.model}`);
            console.log(`Latência : ${_meta.latency_ms}ms`);
            console.log(`Receita  : ${r.name} | ${r.calories} kcal | ${r.time_min}min`);
            console.groupEnd();
        }

        const imagesByCategory = {
            breakfast: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400",
            lunch: "https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=400",
            dinner: "https://images.unsplash.com/photo-1547592165-e1d17fed6005?w=400",
            snack: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"
        };
        const cat = mt === 'all' ? 'lunch' : mt;
        return {
            id: "ai_recipe_daily_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
            name: r.name,
            category: cat,
            time_min: r.time_min || 15,
            image: imagesByCategory[cat] || imagesByCategory['lunch'],
            calories_base: r.calories,
            protein_base: r.protein,
            carbs_base: r.carbs,
            fat_base: r.fat,
            fiber_base: 2.0,
            ingredients: r.ingredients.map(i => ({ name: i.name, amount_base: i.amount, unit: i.unit })),
            directions: r.directions
        };
    }

    async function callGeminiForWeeklyPlan(mealType, profile) {
        const token = localStorage.getItem('nutrir_token');
        const profilePayload = profile ? {
            goal: profile.goal,
            goalWeight: profile.goalWeight,
            weight: profile.weight,
            age: profile.age,
            gender: profile.gender,
            targetCalories: profile.targetCalories,
            targetProtein: profile.targetProtein,
            targetCarbs: profile.targetCarbs,
            targetFat: profile.targetFat
        } : null;
        const res = await fetch('/api/ai/generate-weekly', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                mealType,
                targetCalories: profile.targetCalories,
                targetProtein: profile.targetProtein,
                targetCarbs: profile.targetCarbs,
                targetFat: profile.targetFat,
                profile: profilePayload
            })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Falha ao gerar plano semanal');
        }
        const weeklyData = await res.json();
        const { plans: plansArray, mealType: mt, _meta } = weeklyData;

        if (_meta) {
            console.group(`%c[Nutrir IA] Plano Semanal`, 'color:#f5c14d;font-weight:bold');
            console.log(`Provedor : ${_meta.provider}`);
            console.log(`Modelo   : ${_meta.model}`);
            console.log(`Latência : ${_meta.latency_ms}ms`);
            console.log(`Receitas : ${plansArray.length} dias gerados`);
            plansArray.forEach(r => console.log(`  Dia ${r.day}: ${r.name} | ${r.calories} kcal`));
            console.groupEnd();
        }

        const imagesByCategory = {
            breakfast: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400",
            lunch: "https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=400",
            dinner: "https://images.unsplash.com/photo-1547592165-e1d17fed6005?w=400",
            snack: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"
        };

        const mappedRecipes = plansArray.map((r, index) => {
            let cat = mt;
            if (mt === 'all') {
                const rotation = ['breakfast', 'lunch', 'dinner', 'snack'];
                cat = rotation[index % rotation.length];
            }
            return {
                id: `ai_recipe_weekly_${Date.now()}_day${r.day || (index+1)}`,
                name: r.name,
                category: cat,
                time_min: r.time_min || 20,
                image: imagesByCategory[cat] || imagesByCategory['lunch'],
                calories_base: r.calories,
                protein_base: r.protein,
                carbs_base: r.carbs,
                fat_base: r.fat,
                fiber_base: 2.0,
                ingredients: r.ingredients.map(i => ({ name: i.name, amount_base: i.amount, unit: i.unit })),
                directions: r.directions
            };
        });

        const portugueseMealType = {
            all: 'Variado',
            breakfast: 'Café da Manhã',
            lunch: 'Almoço',
            dinner: 'Jantar',
            snack: 'Lanche'
        };

        return {
            id: 'plan_' + Date.now(),
            date: new Date().toLocaleDateString('pt-BR'),
            mealType: portugueseMealType[mt] || mt,
            recipes: mappedRecipes
        };
    }

    function runMockGeneration(mealType, period, profile, cal, p, c, f) {
        if (period === 'daily') {
            const cat = mealType === 'all' ? 'lunch' : mealType;
            const pool = MOCK_RECIPES_POOL[cat];
            const baseRecipe = pool[Math.floor(Math.random() * pool.length)];

            // Adapta os macros ao saldo
            const scale = cal / baseRecipe.calories_base;
            const adaptedRecipe = {
                id: `ai_recipe_daily_mock_${Date.now()}`,
                name: baseRecipe.name + " (IA Demo)",
                category: baseRecipe.category,
                time_min: baseRecipe.time_min,
                image: baseRecipe.image,
                calories_base: Math.round(baseRecipe.calories_base * scale),
                protein_base: Math.round(baseRecipe.protein_base * scale * 10) / 10,
                carbs_base: Math.round(baseRecipe.carbs_base * scale * 10) / 10,
                fat_base: Math.round(baseRecipe.fat_base * scale * 10) / 10,
                fiber_base: baseRecipe.fiber_base,
                ingredients: baseRecipe.ingredients.map(ing => ({
                    name: ing.name,
                    amount_base: Math.round(ing.amount_base * scale),
                    unit: ing.unit
                })),
                directions: baseRecipe.directions
            };

            state.savedAiRecipes.push(adaptedRecipe);
            saveAiRecipesToLocalStorage();
            renderSavedAiRecipes();
            openRecipeDetailModal(adaptedRecipe);
        } else {
            // Plano semanal
            const planRecipes = [];
            const rotationCategories = ['breakfast', 'lunch', 'dinner', 'snack', 'breakfast', 'lunch', 'dinner'];

            for (let dayNum = 1; dayNum <= 7; dayNum++) {
                const cat = mealType === 'all' ? rotationCategories[dayNum - 1] : mealType;
                const pool = MOCK_RECIPES_POOL[cat];
                const baseRecipe = pool[(dayNum - 1) % pool.length];

                // Adapta levemente para simular calibração do dia
                const scale = (profile.targetCalories / 3) / baseRecipe.calories_base;
                planRecipes.push({
                    id: `ai_recipe_weekly_mock_${Date.now()}_day${dayNum}`,
                    name: `${baseRecipe.name} (Dia ${dayNum})`,
                    category: baseRecipe.category,
                    time_min: baseRecipe.time_min,
                    image: baseRecipe.image,
                    calories_base: Math.round(baseRecipe.calories_base * scale),
                    protein_base: Math.round(baseRecipe.protein_base * scale * 10) / 10,
                    carbs_base: Math.round(baseRecipe.carbs_base * scale * 10) / 10,
                    fat_base: Math.round(baseRecipe.fat_base * scale * 10) / 10,
                    fiber_base: baseRecipe.fiber_base,
                    ingredients: baseRecipe.ingredients.map(ing => ({
                        name: ing.name,
                        amount_base: Math.round(ing.amount_base * scale),
                        unit: ing.unit
                    })),
                    directions: baseRecipe.directions
                });
            }

            const portugueseMealType = {
                all: 'Variado',
                breakfast: 'Café da Manhã',
                lunch: 'Almoço',
                dinner: 'Jantar',
                snack: 'Lanche'
            };

            const newPlan = {
                id: 'plan_mock_' + Date.now(),
                date: new Date().toLocaleDateString('pt-BR'),
                mealType: portugueseMealType[mealType] || mealType,
                recipes: planRecipes
            };

            state.savedWeeklyPlans.push(newPlan);
            saveWeeklyPlansToLocalStorage();
            renderSavedWeeklyPlans();
            alert("Plano semanal de demonstração gerado com sucesso!");
        }
    }

    function renderSavedAiRecipes() {
        const container = document.getElementById('ai-saved-recipes-container');
        const countBadge = document.getElementById('ai-daily-count');
        if (!container) return;

        container.innerHTML = "";
        countBadge.innerText = state.savedAiRecipes.length;

        if (state.savedAiRecipes.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1; padding: 20px;">
                    <p style="font-size: 13px; color: var(--color-text-muted);">Nenhuma receita diária avulsa salva.</p>
                </div>
            `;
            return;
        }

        state.savedAiRecipes.forEach(recipe => {
            const card = document.createElement('div');
            card.className = 'recipe-grid-card';
            
            const categoryLabels = {
                breakfast: 'Café',
                lunch: 'Almoço',
                dinner: 'Jantar',
                snack: 'Lanche'
            };

            card.innerHTML = `
                <div class="recipe-card-img" style="background-image: url('${recipe.image}')"></div>
                <div class="recipe-card-info">
                    <h4>${recipe.name}</h4>
                    <div class="recipe-card-meta">
                        <span>${categoryLabels[recipe.category] || recipe.category}</span>
                        <span class="cal">${recipe.calories_base} kcal</span>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => openRecipeDetailModal(recipe));
            container.appendChild(card);
        });
    }

    function renderSavedWeeklyPlans() {
        const container = document.getElementById('ai-weekly-plans-container');
        const countBadge = document.getElementById('ai-weekly-count');
        if (!container) return;

        container.innerHTML = "";
        countBadge.innerText = state.savedWeeklyPlans.length;

        if (state.savedWeeklyPlans.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 20px;">
                    <p style="font-size: 13px; color: var(--color-text-muted);">Nenhum plano semanal salvo.</p>
                </div>
            `;
            return;
        }

        const sortedPlans = [...state.savedWeeklyPlans].reverse();

        sortedPlans.forEach(plan => {
            const totalCal = plan.recipes.reduce((acc, r) => acc + r.calories_base, 0);
            const avgCal = Math.round(totalCal / 7);

            const planCard = document.createElement('div');
            planCard.className = 'weekly-plan-card';
            planCard.innerHTML = `
                <div class="weekly-plan-header">
                    <div class="weekly-plan-header-left">
                        <span class="weekly-plan-title">Plano Semanal (${plan.mealType})</span>
                        <span class="weekly-plan-subtitle">Gerado em ${plan.date} • Média: ${avgCal} kcal/dia</span>
                    </div>
                    <i data-lucide="chevron-down" class="weekly-plan-icon" style="width: 18px; height: 18px;"></i>
                </div>
                <div class="weekly-plan-days-list">
                    ${plan.recipes.map((recipe, idx) => `
                        <div class="weekly-day-row" data-day-index="${idx}">
                            <span class="weekly-day-label">Dia ${idx + 1}</span>
                            <span class="weekly-day-name">${recipe.name.replace(/ \(Dia \d+\)/, '')}</span>
                            <span class="weekly-day-cal">${recipe.calories_base} kcal</span>
                            <i data-lucide="chevron-right" class="weekly-day-arrow" style="width: 14px; height: 14px;"></i>
                        </div>
                    `).join('')}
                </div>
            `;

            planCard.querySelector('.weekly-plan-header').addEventListener('click', () => {
                planCard.classList.toggle('expanded');
            });

            planCard.querySelectorAll('.weekly-day-row').forEach(row => {
                row.addEventListener('click', (e) => {
                    const idx = parseInt(row.dataset.dayIndex);
                    const recipe = plan.recipes[idx];
                    openRecipeDetailModal(recipe);
                });
            });

            container.appendChild(planCard);
        });

        lucide.createIcons();
    }

    // 14. ABA DE JEJUM INTERMITENTE (TIMER CIRCULAR)
    const selectFastingProtocol = document.getElementById('select-fasting-protocol');
    const fastingTimerDisplay = document.getElementById('fasting-timer-display');
    const fastingStateLabel = document.getElementById('fasting-state-label');
    const fastingPeriodInfo = document.getElementById('fasting-period-info');
    const btnToggleFasting = document.getElementById('btn-toggle-fasting');
    const fastingPhaseDescription = document.getElementById('fasting-phase-description');

    selectFastingProtocol.addEventListener('change', (e) => {
        state.fastingDurationGoal = parseInt(e.target.value);
        localStorage.setItem('nutrir_fasting_goal', state.fastingDurationGoal);
        renderFastingScreen();
        saveFastingToAPI(state.fastingActive);
    });

    btnToggleFasting.addEventListener('click', () => {
        if (!state.fastingActive) {
            // Inicia Jejum
            state.fastingActive = true;
            state.fastingStartTime = new Date();
            localStorage.setItem('nutrir_fasting_active', true);
            localStorage.setItem('nutrir_fasting_start_time', state.fastingStartTime.toISOString());
            
            startFastingTimer();
            saveFastingToAPI(true);
            alert("Jejum iniciado! Mantenha o foco!");
        } else {
            // Interrompe Jejum
            if (confirm("Deseja realmente finalizar o jejum atual?")) {
                state.fastingActive = false;
                state.fastingStartTime = null;
                localStorage.removeItem('nutrir_fasting_active');
                localStorage.removeItem('nutrir_fasting_start_time');
                
                if (state.fastingInterval) {
                    clearInterval(state.fastingInterval);
                    state.fastingInterval = null;
                }
                
                saveFastingToAPI(false);
                alert("Jejum encerrado com sucesso!");
            }
        }
        renderFastingScreen();
    });

    function startFastingTimer() {
        if (state.fastingInterval) clearInterval(state.fastingInterval);
        state.fastingInterval = setInterval(() => {
            updateFastingTimerValues();
        }, 1000);
    }

    function updateFastingTimerValues() {
        if (!state.fastingActive || !state.fastingStartTime) return;
        
        const now = new Date();
        const diffMs = now - state.fastingStartTime;
        const diffSecs = Math.floor(diffMs / 1000);
        
        const hours = Math.floor(diffSecs / 3600);
        const mins = Math.floor((diffSecs % 3600) / 60);
        const secs = diffSecs % 60;
        
        const formatH = String(hours).padStart(2, '0');
        const formatM = String(mins).padStart(2, '0');
        const formatS = String(secs).padStart(2, '0');
        
        fastingTimerDisplay.innerText = `${formatH}:${formatM}:${formatS}`;

        // Atualiza anel circular de progresso (circumference aproximado: 2 * PI * 95 = 596.9)
        const circumference = 596.9;
        const goalSecs = state.fastingDurationGoal * 3600;
        const percent = Math.min(1, diffSecs / goalSecs);
        const offset = circumference - (percent * circumference);
        
        const circle = document.getElementById('fasting-progress-circle');
        if (circle) {
            circle.style.strokeDasharray = `${circumference} ${circumference}`;
            circle.style.strokeDashoffset = offset;
        }

        // Fases do jejum em texto explicativo
        const elapsedHours = diffSecs / 3600;
        if (elapsedHours >= state.fastingDurationGoal) {
            fastingStateLabel.innerText = "Meta Atingida!";
            fastingPhaseDescription.innerText = "Meta concluída! Seu corpo está em estado de autofagia e queima acelerada de gorduras. Você pode encerrar o jejum e se alimentar de forma equilibrada.";
        } else if (elapsedHours >= 12) {
            fastingStateLabel.innerText = "Queima de Gordura";
            fastingPhaseDescription.innerText = "Após 12h de jejum, as reservas de glicogênio hepático começam a se esgotar, e seu corpo entra em cetose leve, queimando gordura como fonte de energia.";
        } else if (elapsedHours >= 4) {
            fastingStateLabel.innerText = "Transição Lipídica";
            fastingPhaseDescription.innerText = "Sua insulina baixou aos níveis basais. O pâncreas começa a secretar glucagon para liberar energia estocada.";
        } else {
            fastingStateLabel.innerText = "Digestão Recente";
            fastingPhaseDescription.innerText = "Corpo digerindo a última refeição. Nutrientes e glicose circulando no sangue, insulina alta.";
        }
    }

    function renderFastingScreen() {
        const circle = document.getElementById('fasting-progress-circle');
        const circumference = 596.9;

        if (state.fastingActive) {
            btnToggleFasting.innerHTML = `<i data-lucide="stop-circle"></i> Encerrar Meu Jejum`;
            btnToggleFasting.className = "btn-danger w-full";
            fastingPeriodInfo.innerText = `Protocolo selecionado: ${state.fastingDurationGoal}h`;
            updateFastingTimerValues();
        } else {
            btnToggleFasting.innerHTML = `<i data-lucide="play-circle"></i> Iniciar Meu Jejum`;
            btnToggleFasting.className = "btn-primary w-full";
            fastingTimerDisplay.innerText = "00:00:00";
            fastingStateLabel.innerText = "Alimentação Livre";
            fastingPeriodInfo.innerText = `Alvo: ${state.fastingDurationGoal} horas`;
            fastingPhaseDescription.innerText = "Você está no período de alimentação livre. Seu corpo está digerindo os nutrientes recentes e acumulando glicogênio.";
            
            if (circle) {
                circle.style.strokeDasharray = `${circumference} ${circumference}`;
                circle.style.strokeDashoffset = circumference;
            }
        }
        lucide.createIcons();
    }

    // 15. AVALIAÇÃO SEMANAL (PLATEAU CHECKER)
    const btnTriggerWeeklyReview = document.getElementById('btn-trigger-weekly-review');
    const weeklyReviewModal = document.getElementById('weekly-review-modal');
    const weeklyStepWeight = document.getElementById('weekly-step-weight');
    const weeklyStepPlateau = document.getElementById('weekly-step-plateau');
    const inputWeeklyWeight = document.getElementById('input-weekly-current-weight');

    // Botão de simulação da revisão semanal ativa no dashboard (sempre visível para testes)
    btnTriggerWeeklyReview.classList.remove('hidden');

    btnTriggerWeeklyReview.addEventListener('click', () => {
        const profile = state.userProfile;
        if (!profile) return;

        inputWeeklyWeight.value = profile.weight;
        weeklyStepWeight.classList.remove('hidden');
        weeklyStepPlateau.classList.add('hidden');
        weeklyReviewModal.classList.add('active');
    });

    document.getElementById('btn-close-weekly-modal').addEventListener('click', () => {
        weeklyReviewModal.classList.remove('active');
    });

    document.getElementById('btn-weekly-submit-weight').addEventListener('click', () => {
        const newWeight = parseFloat(inputWeeklyWeight.value);
        const profile = state.userProfile;

        if (isNaN(newWeight) || newWeight <= 20) {
            alert("Insira um peso válido.");
            return;
        }

        // Valida se houve estagnação/platô
        // Se a meta é emagrecer e o peso não diminuiu em relação ao onboarding anterior
        const targetGoal = profile.goal;
        const weightDiff = newWeight - profile.weight;

        let isPlateau = false;
        if (targetGoal === 'lose' && weightDiff >= -0.1) {
            // Não perdeu peso de forma consistente
            isPlateau = true;
        } else if (targetGoal === 'gain' && weightDiff <= 0.1) {
            // Não ganhou peso de forma consistente
            isPlateau = true;
        }

        // Atualiza o peso atual do perfil local
        profile.weight = newWeight;
        saveProfileToLocalStorage(profile);

        if (isPlateau) {
            // Mostra tela de platô (Mascote do Slimo)
            weeklyStepWeight.classList.add('hidden');
            weeklyStepPlateau.classList.remove('hidden');
        } else {
            alert("Parabéns! Suas metas estão dando resultado. Continue com a consistência!");
            weeklyReviewModal.classList.remove('active');
            updateDashboard();
        }
    });

    document.getElementById('btn-weekly-confirm-adjustment').addEventListener('click', () => {
        const adjustment = document.querySelector('input[name="plateau-adjustment"]:checked').value;
        const profile = state.userProfile;

        if (adjustment === 'reduce') {
            // Reduz 5% de calorias diárias
            profile.targetCalories = Math.round(profile.targetCalories * 0.95);
            // Reajusta carboidratos mantendo proteínas e gorduras intocadas
            const proteinKcal = profile.targetProtein * 4;
            const fatKcal = profile.targetFat * 9;
            profile.targetCarbs = Math.round((profile.targetCalories - proteinKcal - fatKcal) / 4);
            if (profile.targetCarbs < 50) profile.targetCarbs = 50;

            saveProfileToLocalStorage(profile);
            alert("Sua meta de calorias diárias foi ajustada em -5% para quebrar o platô.");
        } else {
            alert("Meta mantida. Lembre-se que consistência é a chave!");
        }

        weeklyReviewModal.classList.remove('active');
        updateDashboard();
    });

    // 16. METAS PERSONALIZADAS MANUALMENTE (FLEXIBILIZAÇÃO)
    const modalAdjustCal = document.getElementById('modal-adjust-cal-manual');
    const modalAdjustMacros = document.getElementById('modal-adjust-macros-manual');

    // Abre Modais de Ajuste Manual
    document.getElementById('btn-adjust-calories-manual').addEventListener('click', () => {
        const profile = state.userProfile;
        if (!profile) return;
        document.getElementById('input-cal-manual-value').value = profile.targetCalories;
        modalAdjustCal.classList.add('active');
    });

    document.getElementById('btn-adjust-macros-manual').addEventListener('click', () => {
        const profile = state.userProfile;
        if (!profile) return;

        document.getElementById('input-manual-carbs').value = profile.targetCarbs;
        document.getElementById('input-manual-protein').value = profile.targetProtein;
        document.getElementById('input-manual-fat').value = profile.targetFat;
        
        updateManualMacrosSummary();
        modalAdjustMacros.classList.add('active');
    });

    // Fechamento de Modais
    document.getElementById('btn-close-cal-manual').addEventListener('click', () => modalAdjustCal.classList.remove('active'));
    document.getElementById('btn-close-macros-manual').addEventListener('click', () => modalAdjustMacros.classList.remove('active'));

    // Atualiza o total de calorias em tempo real nos macros manuais
    function updateManualMacrosSummary() {
        const c = parseInt(document.getElementById('input-manual-carbs').value) || 0;
        const p = parseInt(document.getElementById('input-manual-protein').value) || 0;
        const f = parseInt(document.getElementById('input-manual-fat').value) || 0;
        const total = (c * 4) + (p * 4) + (f * 9);
        document.getElementById('lbl-manual-total-calories').innerText = `${total} kcal`;
    }

    document.getElementById('input-manual-carbs').addEventListener('input', updateManualMacrosSummary);
    document.getElementById('input-manual-protein').addEventListener('input', updateManualMacrosSummary);
    document.getElementById('input-manual-fat').addEventListener('input', updateManualMacrosSummary);

    // Salva calorias manuais
    document.getElementById('btn-save-cal-manual').addEventListener('click', () => {
        const val = parseInt(document.getElementById('input-cal-manual-value').value) || 0;
        if (val < 800 || val > 6000) {
            alert("Insira uma meta calórica diária razoável entre 800 e 6000 kcal.");
            return;
        }

        const profile = state.userProfile;
        // Ajusta macros proporcionalmente baseado no ratio anterior
        const oldC = profile.targetCarbs;
        const oldP = profile.targetProtein;
        const oldF = profile.targetFat;
        const oldTotalKcal = (oldC * 4) + (oldP * 4) + (oldF * 9);

        profile.targetCalories = val;
        profile.targetCarbs = Math.round((oldC * 4 / oldTotalKcal) * val / 4);
        profile.targetProtein = Math.round((oldP * 4 / oldTotalKcal) * val / 4);
        profile.targetFat = Math.round((oldF * 9 / oldTotalKcal) * val / 9);

        saveProfileToLocalStorage(profile);
        modalAdjustCal.classList.remove('active');
        updateDashboard();
        alert("Meta calórica diária redefinida!");
    });

    // Restaura padrões calóricos baseados no TDEE
    document.getElementById('btn-restore-cal-defaults').addEventListener('click', () => {
        const profile = state.userProfile;
        const speed = profile.speed || 0.5;
        let defCals = profile.tdee;
        if (profile.goal === 'lose') {
            defCals = Math.round(profile.tdee - (speed * 1100));
        } else if (profile.goal === 'gain') {
            defCals = Math.round(profile.tdee + (speed * 1100));
        }

        profile.targetCalories = defCals;
        // Restaura macros
        if (profile.goal === 'lose') {
            profile.targetProtein = Math.round(profile.weight * 2.0);
            profile.targetFat = Math.round(profile.weight * 0.8);
        } else if (profile.goal === 'gain') {
            profile.targetProtein = Math.round(profile.weight * 2.0);
            profile.targetFat = Math.round(profile.weight * 1.0);
        } else {
            profile.targetProtein = Math.round(profile.weight * 1.8);
            profile.targetFat = Math.round(profile.weight * 0.9);
        }
        profile.targetCarbs = Math.round((profile.targetCalories - (profile.targetProtein * 4) - (profile.targetFat * 9)) / 4);

        saveProfileToLocalStorage(profile);
        modalAdjustCal.classList.remove('active');
        updateDashboard();
        alert("Metas calóricas restauradas para o padrão científico!");
    });

    // Salva macros manuais
    document.getElementById('btn-save-macros-manual').addEventListener('click', () => {
        const c = parseInt(document.getElementById('input-manual-carbs').value) || 0;
        const p = parseInt(document.getElementById('input-manual-protein').value) || 0;
        const f = parseInt(document.getElementById('input-manual-fat').value) || 0;
        const totalKcal = (c * 4) + (p * 4) + (f * 9);

        if (c <= 0 || p <= 0 || f <= 0) {
            alert("Todos os macronutrientes precisam ser maiores que zero.");
            return;
        }

        const profile = state.userProfile;
        profile.targetCarbs = c;
        profile.targetProtein = p;
        profile.targetFat = f;
        profile.targetCalories = totalKcal;

        saveProfileToLocalStorage(profile);
        modalAdjustMacros.classList.remove('active');
        updateDashboard();
        alert("Metas de macronutrientes personalizadas salvas com sucesso!");
    });

    document.getElementById('btn-restore-macros-defaults').addEventListener('click', () => {
        // Apenas clica no redefinir das calorias que restaura tudo
        document.getElementById('btn-restore-cal-defaults').click();
        modalAdjustMacros.classList.remove('active');
    });

    // 17. PROCESSAMENTO E CÂMERA DE SNAPSHOT (WEBCAM API)
    async function startCameraStream() {
        const video = document.getElementById('camera-stream');
        const placeholder = document.getElementById('camera-placeholder');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1080 },
                    height: { ideal: 1080 },
                    aspectRatio: { ideal: 1.0 }
                },
                audio: false
            });

            state.currentCameraStream = stream;
            video.srcObject = stream;
            video.style.display = 'block';
            placeholder.style.display = 'none';
        } catch (err) {
            console.warn("Não foi possível acessar a câmera do dispositivo: ", err);
            video.style.display = 'none';
            placeholder.style.display = 'flex';
            switchTab('upload');
        }
    }

    function stopCameraStream() {
        if (state.currentCameraStream) {
            state.currentCameraStream.getTracks().forEach(track => track.stop());
            state.currentCameraStream = null;
        }
        const video = document.getElementById('camera-stream');
        if (video) video.srcObject = null;
    }

    // Redimensiona qualquer imagem para max 900px e comprime em JPEG 0.80
    // Mantém proporção, garante payload < 1MB
    function resizeImageToBase64(sourceCanvas, maxPx = 900, quality = 0.80) {
        const w = sourceCanvas.width;
        const h = sourceCanvas.height;
        const scale = Math.min(1, maxPx / Math.max(w, h));
        const out = document.createElement('canvas');
        out.width  = Math.round(w * scale);
        out.height = Math.round(h * scale);
        out.getContext('2d').drawImage(sourceCanvas, 0, 0, out.width, out.height);
        return out.toDataURL('image/jpeg', quality);
    }

    function capturePhoto() {
        const video = document.getElementById('camera-stream');
        const canvas = document.getElementById('photo-canvas');
        const context = canvas.getContext('2d');

        if (!state.currentCameraStream) {
            alert("A câmera não está ativa. Utilize o envio por arquivo de imagem.");
            return;
        }

        const size = Math.min(video.videoWidth, video.videoHeight);
        canvas.width = size;
        canvas.height = size;

        const sx = (video.videoWidth - size) / 2;
        const sy = (video.videoHeight - size) / 2;
        context.drawImage(video, sx, sy, size, size, 0, 0, size, size);

        state.currentCapturedImage = resizeImageToBase64(canvas);

        stopCameraStream();
        analyzeFoodPhoto();
    }

    function switchTab(tab) {
        const tabCamera = document.getElementById('tab-camera');
        const tabUpload = document.getElementById('tab-upload');
        const controlsCamera = document.getElementById('controls-camera');
        const controlsUpload = document.getElementById('controls-upload');

        if (tab === 'camera') {
            tabCamera.classList.add('active');
            tabUpload.classList.remove('active');
            controlsCamera.classList.remove('hidden');
            controlsUpload.classList.add('hidden');
            startCameraStream();
        } else {
            tabCamera.classList.remove('active');
            tabUpload.classList.add('active');
            controlsCamera.classList.add('hidden');
            controlsUpload.classList.remove('hidden');
            stopCameraStream();
            
            document.getElementById('camera-stream').style.display = 'none';
            document.getElementById('camera-placeholder').style.display = 'flex';
        }
    }

    // 18. ANÁLISE POR FOTO E INTEGRAÇÃO DO GEMINI
    async function analyzeFoodPhoto() {
        const loader = document.getElementById('ai-loader');
        const loaderStatus = document.getElementById('loader-status');
        
        loader.classList.remove('hidden');
        loaderStatus.innerText = "Iniciando reconhecimento de alimentos...";

        try {
            loaderStatus.innerText = "IA Nutrir analisando texturas e volumes do prato...";
            const base64Data = state.currentCapturedImage.split(',')[1];
            const response = await callGeminiApi(base64Data);
            loaderStatus.innerText = "Estimando calorias e pesos...";
            state.currentAnalyzingMeal = response;
            renderResultsScreen();
            showScreen('screen-results');
        } catch (err) {
            console.error("Erro na API do Gemini: ", err);
            loaderStatus.innerText = "IA indisponível. Iniciando modo demonstração...";
            await new Promise(resolve => setTimeout(resolve, 1500));
            simulateImageScan();
        } finally {
            loader.classList.add('hidden');
        }
    }

    async function callGeminiApi(base64Image) {
        const token = localStorage.getItem('nutrir_token');
        const response = await fetch('/api/ai/analyze-food', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ image: base64Image })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Falha ao analisar imagem');
        }
        const scanData = await response.json();
        if (scanData._meta) {
            console.group(`%c[Nutrir IA] Scanner de Alimentos`, 'color:#f5c14d;font-weight:bold');
            console.log(`Provedor : ${scanData._meta.provider}`);
            console.log(`Modelo   : ${scanData._meta.model}`);
            console.log(`Latência : ${scanData._meta.latency_ms}ms`);
            if (scanData.items) {
                console.log(`Itens    : ${scanData.items.map(i => `${i.name} (${i.weight_g}g)`).join(', ')}`);
                console.log(`Total    : ${scanData.total?.calories} kcal | P:${scanData.total?.protein}g C:${scanData.total?.carbs}g G:${scanData.total?.fat}g`);
            }
            console.groupEnd();
        }
        return scanData;
    }

    function simulateImageScan() {
        const demoMeals = [
            {
                items: [
                    { name: "Arroz Integral Cozido", weight_g: 150, calories: 180, protein: 4.0, carbs: 38.0, fat: 1.0 },
                    { name: "Feijão Preto Carioca", weight_g: 100, calories: 90, protein: 6.0, carbs: 16.0, fat: 0.0 },
                    { name: "File de Peito de Frango Grelhado", weight_g: 120, calories: 195, protein: 37.0, carbs: 0.0, fat: 5.0 },
                    { name: "Salada Verde Mix", weight_g: 80, calories: 15, protein: 1.0, carbs: 3.0, fat: 0.0 }
                ]
            },
            {
                items: [
                    { name: "Espaguete ao molho Bolonhesa", weight_g: 220, calories: 340, protein: 11.0, carbs: 68.0, fat: 3.0 },
                    { name: "Almôndegas Bovinas", weight_g: 90, calories: 230, protein: 16.0, carbs: 4.0, fat: 16.0 },
                    { name: "Queijo Parmesão Ralado", weight_g: 10, calories: 40, protein: 4.0, carbs: 0.0, fat: 3.0 }
                ]
            }
        ];

        const selectedIndex = Math.floor(Math.random() * demoMeals.length);
        const selectedTemplate = demoMeals[selectedIndex];
        const simulatedItems = JSON.parse(JSON.stringify(selectedTemplate.items));

        const total = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        simulatedItems.forEach(item => {
            total.calories += item.calories;
            total.protein += item.protein;
            total.carbs += item.carbs;
            total.fat += item.fat;
        });

        state.currentAnalyzingMeal = { items: simulatedItems, total };

        renderResultsScreen();
        showScreen('screen-results');
    }

    function renderResultsScreen() {
        const previewImg = document.getElementById('result-photo-preview');
        const listEl = document.getElementById('detected-foods-list');

        previewImg.src = state.currentCapturedImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';

        const meal = state.currentAnalyzingMeal;
        const prof = state.userProfile;

        // ── Calories card
        document.getElementById('result-total-calories').innerText = meal.total.calories;

        if (prof && prof.targetCalories) {
            const pct = Math.min(Math.round((meal.total.calories / prof.targetCalories) * 100), 100);
            const remaining = prof.targetCalories - meal.total.calories;
            const goalBar = document.getElementById('result-goal-bar');
            if (goalBar) {
                goalBar.style.width = pct + '%';
                goalBar.style.background = pct > 90 ? '#ef4444' : pct > 70 ? '#f97316' : 'var(--color-primary)';
            }
            const pctEl = document.getElementById('result-goal-pct');
            if (pctEl) pctEl.innerText = `${pct}% da meta diária · restam ${remaining > 0 ? remaining : 0} kcal`;
        }

        // ── Macro rows with progress bars
        const macros = [
            { id: 'protein', label: 'Proteína',      val: meal.total.protein, target: prof?.targetProtein, color: '#22c55e' },
            { id: 'carbs',   label: 'Carboidratos',  val: meal.total.carbs,   target: prof?.targetCarbs,   color: '#3b82f6' },
            { id: 'fat',     label: 'Gorduras',       val: meal.total.fat,     target: prof?.targetFat,     color: '#f97316' },
        ];
        const macrosCard = document.getElementById('result-macros-card');
        if (macrosCard) {
            macrosCard.innerHTML = macros.map(m => {
                const pct = m.target ? Math.min(Math.round((m.val / m.target) * 100), 100) : null;
                const goalLabel = pct !== null ? `${m.val}g de ${m.target}g (${pct}%)` : `${m.val}g`;
                return `
                <div class="result-macro-row">
                    <div class="rmr-header">
                        <span class="rmr-name" style="color:${m.color}">${m.label}</span>
                        <span class="rmr-value">${m.val}g</span>
                    </div>
                    ${pct !== null ? `
                    <div class="rmr-bar-track">
                        <div class="rmr-bar-fill" style="width:${pct}%;background:${m.color}"></div>
                    </div>` : ''}
                    <span class="rmr-goal-label">${goalLabel}</span>
                </div>`;
            }).join('');
        }

        // ── Food items list
        listEl.innerHTML = '';
        meal.items.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'food-item-card-v2';
            card.innerHTML = `
                <div class="ficv2-top">
                    <span class="ficv2-name">${item.name}</span>
                    <div class="ficv2-right">
                        <span class="ficv2-cal">${item.calories}<span class="ficv2-cal-unit">kcal</span></span>
                        <i data-lucide="edit-3" class="ficv2-edit-icon"></i>
                    </div>
                </div>
                <div class="ficv2-bottom">
                    <span class="ficv2-weight">${item.weight_g}g</span>
                    <div class="ficv2-macros">
                        <span class="ficv2-tag ficv2-tag-p">P ${item.protein}g</span>
                        <span class="ficv2-tag ficv2-tag-c">C ${item.carbs}g</span>
                        <span class="ficv2-tag ficv2-tag-f">G ${item.fat}g</span>
                        ${item.fiber ? `<span class="ficv2-tag ficv2-tag-fi">Fib ${item.fiber}g</span>` : ''}
                    </div>
                </div>
            `;
            card.addEventListener('click', () => openEditFoodModal(index));
            listEl.appendChild(card);
        });

        lucide.createIcons();
    }

    // Modal de Edição (Nutrientes individuais)
    const foodEditModal = document.getElementById('food-edit-modal');
    
    function openEditFoodModal(index) {
        state.editingItemIndex = index;
        const titleEl = document.getElementById('modal-title');
        const deleteBtn = document.getElementById('btn-delete-modal-item');

        const inputName = document.getElementById('edit-item-name');
        const inputWeight = document.getElementById('edit-item-weight');
        const inputCal = document.getElementById('edit-item-cal');
        const inputProt = document.getElementById('edit-item-protein');
        const inputCarbs = document.getElementById('edit-item-carbs');
        const inputFat = document.getElementById('edit-item-fat');

        if (index === -1) {
            titleEl.innerText = "Adicionar Alimento";
            inputName.value = "";
            inputWeight.value = "100";
            inputCal.value = "100";
            inputProt.value = "10";
            inputCarbs.value = "10";
            inputFat.value = "2";
            deleteBtn.style.display = 'none';
        } else {
            const item = state.currentAnalyzingMeal.items[index];
            titleEl.innerText = "Editar Alimento";
            inputName.value = item.name;
            inputWeight.value = item.weight_g;
            inputCal.value = item.calories;
            inputProt.value = item.protein;
            inputCarbs.value = item.carbs;
            inputFat.value = item.fat;
            deleteBtn.style.display = 'block';
        }

        foodEditModal.classList.add('active');
    }

    document.getElementById('btn-close-modal').addEventListener('click', () => foodEditModal.classList.remove('active'));

    document.getElementById('btn-save-modal-item').addEventListener('click', () => {
        const inputName = document.getElementById('edit-item-name').value.trim();
        const inputWeight = parseInt(document.getElementById('edit-item-weight').value) || 0;
        const inputCal = parseInt(document.getElementById('edit-item-cal').value) || 0;
        const inputProt = parseInt(document.getElementById('edit-item-protein').value) || 0;
        const inputCarbs = parseInt(document.getElementById('edit-item-carbs').value) || 0;
        const inputFat = parseInt(document.getElementById('edit-item-fat').value) || 0;

        if (inputName === "") return;

        const updatedItem = {
            name: inputName,
            weight_g: inputWeight,
            calories: inputCal,
            protein: inputProt,
            carbs: inputCarbs,
            fat: inputFat
        };

        if (state.editingItemIndex === -1) {
            state.currentAnalyzingMeal.items.push(updatedItem);
        } else {
            state.currentAnalyzingMeal.items[state.editingItemIndex] = updatedItem;
        }

        recalculateAnalyzingMealTotals();
        renderResultsScreen();
        foodEditModal.classList.remove('active');
    });

    document.getElementById('btn-delete-modal-item').addEventListener('click', () => {
        if (state.editingItemIndex !== -1) {
            state.currentAnalyzingMeal.items.splice(state.editingItemIndex, 1);
            recalculateAnalyzingMealTotals();
            renderResultsScreen();
        }
        foodEditModal.classList.remove('active');
    });

    function recalculateAnalyzingMealTotals() {
        const meal = state.currentAnalyzingMeal;
        meal.total = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        meal.items.forEach(item => {
            meal.total.calories += item.calories;
            meal.total.protein += item.protein;
            meal.total.carbs += item.carbs;
            meal.total.fat += item.fat;
        });
    }

    document.getElementById('btn-save-meal').addEventListener('click', () => {
        if (!state.currentAnalyzingMeal || state.currentAnalyzingMeal.items.length === 0) return;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;

        // Salva a foto (base64) dentro do campo total.image
        const totalWithImage = {
            ...state.currentAnalyzingMeal.total,
            image: state.currentCapturedImage || ''
        };

        const newMealEntry = {
            id: 'meal_' + Date.now(),
            date: todayStr,
            time: timeStr,
            name: `Escaner de Alimento (${timeStr})`,
            items: state.currentAnalyzingMeal.items,
            total: totalWithImage
        };

        state.mealsLog.push(newMealEntry);
        saveMealsToLocalStorage();

        state.currentAnalyzingMeal = null;
        state.currentCapturedImage = '';

        updateDashboard();
        showScreen('screen-dashboard');
    });

    document.getElementById('btn-discard-meal').addEventListener('click', () => {
        if (confirm("Descartar refeição analisada?")) {
            state.currentAnalyzingMeal = null;
            showScreen('screen-dashboard');
        }
    });

    document.getElementById('btn-add-manual-item').addEventListener('click', () => openEditFoodModal(-1));

    // 19. ATUALIZAÇÃO DO DASHBOARD PRINCIPAL
    function updateDashboard() {
        const now = new Date();
        const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        
        document.getElementById('dashboard-date').innerText = `${daysOfWeek[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]}`;

        const todayStr = getTodayDateString();
        const profile = state.userProfile;
        if (!profile) return;

        const calTarget = profile.targetCalories;
        const protTarget = profile.targetProtein;
        const carbsTarget = profile.targetCarbs;
        const fatTarget = profile.targetFat;

        // Soma consumido hoje
        let calConsumed = 0;
        let protConsumed = 0;
        let carbsConsumed = 0;
        let fatConsumed = 0;

        const todaysMeals = state.mealsLog.filter(meal => meal.date === todayStr);
        todaysMeals.forEach(meal => {
            calConsumed += meal.total.calories;
            protConsumed += meal.total.protein;
            carbsConsumed += meal.total.carbs;
            fatConsumed += meal.total.fat;
        });

        const calRemaining = Math.max(0, calTarget - calConsumed);

        document.getElementById('dashboard-cal-target').innerText = calTarget.toLocaleString('pt-BR');
        document.getElementById('dashboard-cal-consumed').innerText = calConsumed.toLocaleString('pt-BR');
        document.getElementById('dashboard-cal-remaining').innerText = calRemaining.toLocaleString('pt-BR');

        // Macros (arredondados — evita 23.400000000)
        document.getElementById('target-protein').innerText = Math.round(protTarget);
        document.getElementById('consumed-protein').innerText = Math.round(protConsumed);
        document.getElementById('target-carbs').innerText = Math.round(carbsTarget);
        document.getElementById('consumed-carbs').innerText = Math.round(carbsConsumed);
        document.getElementById('target-fat').innerText = Math.round(fatTarget);
        document.getElementById('consumed-fat').innerText = Math.round(fatConsumed);

        // Círculo SVG robusto
        const circle = document.getElementById('calorie-progress-circle');
        let radius = 68;
        if (circle) {
            if (circle.r && circle.r.baseVal) {
                radius = circle.r.baseVal.value;
            } else {
                const rAttr = circle.getAttribute('r');
                if (rAttr) radius = parseFloat(rAttr);
            }
            const circumference = 2 * Math.PI * radius;
            circle.style.strokeDasharray = `${circumference} ${circumference}`;
            const percent = Math.min(1, calConsumed / calTarget);
            circle.style.strokeDashoffset = circumference - (percent * circumference);
        }

        // Barras
        document.getElementById('bar-protein').style.width = `${Math.min(100, (protConsumed / protTarget) * 100)}%`;
        document.getElementById('bar-carbs').style.width = `${Math.min(100, (carbsConsumed / carbsTarget) * 100)}%`;
        document.getElementById('bar-fat').style.width = `${Math.min(100, (fatConsumed / fatTarget) * 100)}%`;

        // Água Widget
        updateWaterWidget();

        // Lista Refeições
        document.getElementById('meal-count-badge').innerText = `${todaysMeals.length} refeição${todaysMeals.length !== 1 ? 's' : ''}`;
        const listEl = document.getElementById('dashboard-meals-list');
        listEl.innerHTML = '';

        if (todaysMeals.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="salad" class="empty-icon"></i>
                    <p>Nenhuma refeição registrada hoje. Use o scanner ou busca de alimentos.</p>
                </div>
            `;
        } else {
            todaysMeals.sort((a,b) => b.time.localeCompare(a.time));
            todaysMeals.forEach(meal => {
                const item = document.createElement('div');
                item.className = 'meal-item';

                const foodItems = (meal.items || []).map(i =>
                    `<div class="mdi-item">
                        <span class="mdi-name">${i.name}</span>
                        <span class="mdi-info">${i.weight_g}g &nbsp;·&nbsp; ${Math.round(i.calories)} kcal</span>
                    </div>`
                ).join('');

                item.innerHTML = `
                    <div class="meal-item-top">
                        <div class="meal-info">
                            <span class="meal-title">${meal.name}</span>
                            <span class="meal-time">${meal.time}</span>
                        </div>
                        <div class="meal-item-right">
                            <span class="meal-cal-badge">${Math.round(meal.total.calories)}<span>kcal</span></span>
                            <button class="meal-delete-btn"><i data-lucide="trash-2"></i></button>
                        </div>
                    </div>
                    <div class="meal-tags-row">
                        <span class="mmtag mmtag-p">P ${Math.round(meal.total.protein)}g</span>
                        <span class="mmtag mmtag-c">C ${Math.round(meal.total.carbs)}g</span>
                        <span class="mmtag mmtag-f">G ${Math.round(meal.total.fat)}g</span>
                        <button class="meal-expand-btn" title="Ver alimentos"><i data-lucide="chevron-down"></i></button>
                    </div>
                    <div class="meal-items-detail hidden">${foodItems || '<div class="mdi-item"><span class="mdi-name" style="color:var(--color-text-muted)">Sem itens detalhados</span></div>'}</div>
                `;

                item.querySelector('.meal-delete-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm("Remover esta refeição?")) {
                        const mealId = meal.id;
                        state.mealsLog = state.mealsLog.filter(m => m.id !== meal.id);
                        saveMealsToLocalStorage();
                        deleteMealFromAPI(mealId);
                        updateDashboard();
                    }
                });

                const expandBtn = item.querySelector('.meal-expand-btn');
                const detail = item.querySelector('.meal-items-detail');
                const toggleExpand = () => {
                    detail.classList.toggle('hidden');
                    expandBtn.classList.toggle('open');
                };
                expandBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleExpand(); });
                item.querySelector('.meal-item-top').addEventListener('click', () => openMealDetailModal(meal));

                listEl.appendChild(item);
            });
        }
        lucide.createIcons();
    }

    // 20. PÁGINA DE HISTÓRICO E GRÁFICOS
    function renderHistoryPage() {
        if (!state.userProfile) return;

        const prof = state.userProfile;
        const goalLabels = { lose: 'Emagrecer', gain: 'Ganhar Massa', maintain: 'Manutenção' };
        const goalBadge = document.getElementById('hist-goal-badge');
        if (goalBadge) goalBadge.innerText = goalLabels[prof.goal] || 'Meta Ativa';

        document.getElementById('hist-target-cal').innerText = `${Math.round(prof.targetCalories)} kcal`;
        document.getElementById('hist-target-p').innerText = `${Math.round(prof.targetProtein)}g`;
        document.getElementById('hist-target-c').innerText = `${Math.round(prof.targetCarbs)}g`;
        document.getElementById('hist-target-f').innerText = `${Math.round(prof.targetFat)}g`;

        const chartLabels = [];
        const chartDataConsumed = [];
        const chartDataTarget = [];
        const daysLetters = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const yr = date.getFullYear();
            const mt = String(date.getMonth() + 1).padStart(2, '0');
            const dy = String(date.getDate()).padStart(2, '0');
            const dateStr = `${yr}-${mt}-${dy}`;

            chartLabels.push(`${dy}/${mt} (${daysLetters[date.getDay()]})`);
            const dayMeals = state.mealsLog.filter(m => m.date === dateStr);
            chartDataConsumed.push(dayMeals.reduce((acc, curr) => acc + curr.total.calories, 0));
            chartDataTarget.push(state.userProfile.targetCalories);
        }

        if (state.weeklyChart) state.weeklyChart.destroy();
        const ctx = document.getElementById('weekly-calories-chart').getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 0, 160);
        grad.addColorStop(0, '#ff9f0a');
        grad.addColorStop(1, '#ff375f');

        state.weeklyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartLabels,
                datasets: [
                    { label: 'Consumido', data: chartDataConsumed, backgroundColor: grad, borderRadius: 6, barPercentage: 0.6 },
                    { label: 'Meta', data: chartDataTarget, borderColor: '#ff9f0a', borderWidth: 2, borderDash: [5,5], type: 'line', fill: false, pointRadius: 0 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#8e8e93', font: { size: 9 } } },
                    y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#8e8e93', font: { size: 9 } } }
                }
            }
        });

        // Listagem histórica agrupada
        const container = document.getElementById('history-days-container');
        container.innerHTML = '';
        
        const grouped = {};
        state.mealsLog.forEach(m => {
            if (!grouped[m.date]) grouped[m.date] = [];
            grouped[m.date].push(m);
        });

        const daysOfWeekShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const daysOfWeekFull  = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

        const sorted = Object.keys(grouped).sort((a,b) => b.localeCompare(a));
        if (sorted.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>Nenhum histórico disponível.</p></div>`;
        } else {
            sorted.forEach(dt => {
                const [yr, mt, dy] = dt.split('-');
                const dateObj = new Date(parseInt(yr), parseInt(mt) - 1, parseInt(dy));
                const dayName = daysOfWeekFull[dateObj.getDay()];
                const formatted = `${dy}/${mt}/${yr}`;

                const meals = grouped[dt];
                let sumC = 0, sumP = 0, sumCr = 0, sumF = 0;
                meals.forEach(m => {
                    sumC  += m.total.calories;
                    sumP  += m.total.protein;
                    sumCr += m.total.carbs;
                    sumF  += m.total.fat;
                });

                const target = state.userProfile.targetCalories;
                const pct = target ? Math.round((sumC / target) * 100) : 0;
                const barW = Math.min(pct, 100);
                const calColor = pct > 105 ? '#ef4444' : pct >= 85 ? '#22c55e' : '#3b82f6';

                const mealsHtml = meals
                    .sort((a,b) => b.time.localeCompare(a.time))
                    .map(m => `
                        <div class="hdc-meal-item" data-meal-id="${m.id}" style="cursor:pointer;">
                            <div class="hdc-meal-top">
                                <span class="hdc-meal-name">${m.name}</span>
                                <span class="hdc-meal-kcal">${Math.round(m.total.calories)} kcal</span>
                            </div>
                            <div class="hdc-meal-meta">
                                <span>${m.time}</span>
                                <span>P ${Math.round(m.total.protein)}g</span>
                                <span>C ${Math.round(m.total.carbs)}g</span>
                                <span>G ${Math.round(m.total.fat)}g</span>
                            </div>
                        </div>
                    `).join('');

                const card = document.createElement('div');
                card.className = 'history-day-card';
                card.innerHTML = `
                    <div class="hdc-main">
                        <div class="hdc-header">
                            <div class="hdc-date-info">
                                <span class="hdc-day-name">${dayName}</span>
                                <span class="hdc-date-str">${formatted}</span>
                            </div>
                            <div class="hdc-cal-block">
                                <span class="hdc-cal-val" style="color:${calColor}">${Math.round(sumC)}</span>
                                <span class="hdc-cal-pct">${pct}% da meta</span>
                            </div>
                        </div>
                        <div class="hdc-bar-track">
                            <div class="hdc-bar-fill" style="width:${barW}%;background:${calColor}"></div>
                        </div>
                        <div class="hdc-bottom">
                            <div class="hdc-macros">
                                <span class="mmtag mmtag-p">P ${Math.round(sumP)}g</span>
                                <span class="mmtag mmtag-c">C ${Math.round(sumCr)}g</span>
                                <span class="mmtag mmtag-f">G ${Math.round(sumF)}g</span>
                            </div>
                            <button class="hdc-toggle-btn">
                                <i data-lucide="chevron-down"></i>
                                ${meals.length} refeição${meals.length !== 1 ? 'ões' : ''}
                            </button>
                        </div>
                    </div>
                    <div class="hdc-meals-list hidden">${mealsHtml}</div>
                `;

                const btn = card.querySelector('.hdc-toggle-btn');
                const mealsList = card.querySelector('.hdc-meals-list');
                btn.addEventListener('click', () => {
                    mealsList.classList.toggle('hidden');
                    btn.classList.toggle('open');
                    lucide.createIcons();
                });

                // Liga o clique em cada refeição do histórico para abrir o modal detalhado
                card.querySelectorAll('.hdc-meal-item').forEach(mealEl => {
                    mealEl.addEventListener('click', () => {
                        const mealId = mealEl.dataset.mealId;
                        const foundMeal = meals.find(m => m.id === mealId);
                        if (foundMeal) {
                            openMealDetailModal(foundMeal);
                        }
                    });
                });

                container.appendChild(card);
            });
        }
        lucide.createIcons();
    }

    // 21. PÁGINA DE PERFIL E OPÇÕES (SUMMARY)
    function renderSettingsPage() {
        const profile = state.userProfile;
        const summaryEl = document.getElementById('settings-profile-summary');

        // Hero section
        const heroName = document.getElementById('profile-hero-name');
        const heroInitials = document.getElementById('profile-avatar-initials');
        const heroPlan = document.getElementById('profile-hero-plan');
        if (heroName && state.user) {
            const name = state.user.name || state.user.email || 'Usuário';
            heroName.textContent = name;
            heroInitials.textContent = name.charAt(0).toUpperCase();
        }
        if (heroPlan && state.user) {
            const planLabels = { trial: 'Plano Trial', premium: 'Plano Premium' };
            heroPlan.textContent = planLabels[state.user.plan] || 'Plano Trial';
            heroPlan.className = 'profile-hero-plan' + (state.user.plan === 'premium' ? ' premium' : '');
        }

        if (!profile || !summaryEl) return;

        const goals = { lose: 'Déficit calórico', maintain: 'Manutenção', gain: 'Hipertrofia' };
        const genderIcon = profile.gender === 'male' ? '♂' : '♀';

        summaryEl.innerHTML = `
            <div class="profile-cal-highlight">
                <span class="pch-label">Meta diária</span>
                <span class="pch-value">${profile.targetCalories}<span class="pch-unit"> kcal</span></span>
                <span class="pch-goal">${goals[profile.goal] || ''}</span>
            </div>
            <div class="profile-bio-grid">
                <div class="profile-bio-item">
                    <span class="pbi-label">Sexo</span>
                    <span class="pbi-value">${genderIcon} ${profile.gender === 'male' ? 'Masc.' : 'Fem.'}</span>
                </div>
                <div class="profile-bio-item">
                    <span class="pbi-label">Idade</span>
                    <span class="pbi-value">${profile.age} <span class="pbi-unit">anos</span></span>
                </div>
                <div class="profile-bio-item">
                    <span class="pbi-label">Peso</span>
                    <span class="pbi-value">${profile.weight} <span class="pbi-unit">kg</span></span>
                </div>
                <div class="profile-bio-item">
                    <span class="pbi-label">Altura</span>
                    <span class="pbi-value">${profile.height} <span class="pbi-unit">cm</span></span>
                </div>
                <div class="profile-bio-item pbi-wide">
                    <span class="pbi-label">Objetivo de peso</span>
                    <span class="pbi-value">${profile.goalWeight} <span class="pbi-unit">kg</span></span>
                </div>
            </div>
        `;

        const adminCard = document.getElementById('admin-settings-card');
        if (adminCard) {
            adminCard.style.display = (state.user && state.user.role === 'admin') ? 'block' : 'none';
        }

        // Preencher perfil clínico se existir
        const inputComorbidities = document.getElementById('input-settings-comorbidities');
        const inputIntolerances = document.getElementById('input-settings-intolerances');
        const inputRestrictions = document.getElementById('input-settings-restrictions');

        if (inputComorbidities) inputComorbidities.value = profile.comorbidities || '';
        if (inputIntolerances) inputIntolerances.value = profile.intolerances || '';
        if (inputRestrictions) inputRestrictions.value = profile.dietary_restrictions || '';

        // Renderiza o histórico de peso na Área Evolutiva
        renderWeightHistory();
     }

    function renderWeightHistory() {
        const historyContainer = document.getElementById('weight-history-list');
        if (!historyContainer) return;

        historyContainer.innerHTML = '';
        const history = state.weightHistory || [];

        if (history.length === 0) {
            historyContainer.innerHTML = `
                <p class="empty-weight-history" style="text-align: center; color: rgba(255,255,255,0.4); font-size: 13px; margin: 12px 0;">Nenhum registro de peso encontrado.</p>
            `;
            return;
        }

        // Ordenado por data decrescente para mostrar o mais recente primeiro no histórico
        const sortedHistory = [...history].sort((a, b) => b.date.localeCompare(a.date));

        sortedHistory.forEach(item => {
            const dateParts = item.date.split('-');
            const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

            const row = document.createElement('div');
            row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; font-size: 13px; color: #fff;';
            row.innerHTML = `
                <span style="font-weight: 500;">${formattedDate}</span>
                <span style="color: var(--color-primary); font-weight: 600;">${parseFloat(item.weight).toFixed(1)} kg</span>
            `;
            historyContainer.appendChild(row);
        });
    }

    function openMealDetailModal(meal) {
        const modal = document.getElementById('meal-detail-modal');
        if (!modal) return;

        document.getElementById('meal-detail-title').innerText = meal.name;
        
        // Exibe macros totais
        document.getElementById('meal-detail-calories').innerText = `${Math.round(meal.total.calories)} kcal`;
        document.getElementById('meal-detail-protein').innerText = `${Math.round(meal.total.protein)}g`;
        document.getElementById('meal-detail-carbs').innerText = `${Math.round(meal.total.carbs)}g`;
        document.getElementById('meal-detail-fat').innerText = `${Math.round(meal.total.fat)}g`;

        // Trata imagem do prato
        const imgWrapper = document.getElementById('meal-detail-image-wrapper');
        const imgEl = document.getElementById('meal-detail-photo');
        
        // Verifica se existe foto armazenada em total.image
        if (meal.total && meal.total.image) {
            imgEl.src = meal.total.image;
            imgWrapper.style.display = 'block';
        } else {
            imgEl.src = '';
            imgWrapper.style.display = 'none';
        }

        // Renderiza itens individuais da refeição
        const itemsContainer = document.getElementById('meal-detail-items-list');
        itemsContainer.innerHTML = '';

        const items = meal.items || [];
        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'food-item-card-v2';
            itemDiv.style.cssText = 'padding: 8px 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px;';
            itemDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px; font-weight:600;">
                    <span>${item.name}</span>
                    <span style="color:var(--color-primary);">${Math.round(item.calories)} kcal</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; opacity:0.7;">
                    <span>${item.weight_g || item.weight}g</span>
                    <div style="display:flex; gap:6px;">
                        <span style="color:#22c55e;">P ${item.protein}g</span>
                        <span style="color:#3b82f6;">C ${item.carbs}g</span>
                        <span style="color:#f97316;">G ${item.fat}g</span>
                    </div>
                </div>
            `;
            itemsContainer.appendChild(itemDiv);
        });

        // Configura ouvintes de fechar
        const closeBtn = document.getElementById('btn-close-meal-detail');
        const closeBtnFooter = document.getElementById('btn-close-meal-detail-footer');

        const closeModal = () => modal.classList.remove('active');
        
        closeBtn.removeEventListener('click', closeModal);
        closeBtnFooter.removeEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);
        closeBtnFooter.addEventListener('click', closeModal);

        modal.classList.add('active');
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // 22. CONFIGURAÇÕES DE EVENTOS GERAIS
    function setupEventListeners() {
        // Navegação abas
        navItems.forEach(item => {
            item.addEventListener('click', () => showScreen(item.dataset.target));
        });

        // Ouvinte para registro de novo peso
        const weightLogForm = document.getElementById('weight-log-form');
        if (weightLogForm) {
            weightLogForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const inputWeight = document.getElementById('input-new-weight');
                const newWeight = parseFloat(inputWeight.value);

                if (isNaN(newWeight) || newWeight <= 30 || newWeight > 250) {
                    alert('Por favor, insira um peso válido entre 30 e 250 kg.');
                    return;
                }

                const token = localStorage.getItem('nutrir_token');
                try {
                    const res = await fetch(`${API_URL}/user/weight-log`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ weight: newWeight })
                    });

                    if (!res.ok) throw new Error('Erro ao salvar peso.');
                    
                    const savedLog = await res.json();
                    
                    // Atualiza perfil no estado local
                    if (state.userProfile) {
                        state.userProfile.weight = newWeight;
                        localStorage.setItem('nutrir_profile', JSON.stringify(state.userProfile));
                    }

                    // Recarrega histórico
                    const weightLogRes = await fetch(`${API_URL}/user/weight-log`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (weightLogRes.ok) {
                        state.weightHistory = await weightLogRes.json();
                    }

                    inputWeight.value = '';
                    renderSettingsPage();
                    updateDashboard();
                    alert('Peso registrado com sucesso!');
                } catch (err) {
                    alert(err.message);
                }
            });
        }

        // Água botões
        document.querySelectorAll('.btn-water-quick').forEach(btn => {
            btn.addEventListener('click', () => {
                addWater(parseInt(btn.dataset.amount));
            });
        });

        document.getElementById('btn-water-reset').addEventListener('click', () => {
            state.waterConsumed = 0;
            localStorage.setItem('nutrir_water_consumed', 0);
            updateWaterWidget();
            saveWaterToAPI();
        });

        // Scanner triggers
        document.getElementById('btn-fab-camera').addEventListener('click', () => {
            showScreen('screen-scanner');
            switchTab('camera');
        });

        document.getElementById('btn-back-scanner').addEventListener('click', () => showScreen('screen-dashboard'));
        document.getElementById('btn-back-results').addEventListener('click', () => {
            if (confirm("Descartar análise?")) showScreen('screen-dashboard');
        });

        document.getElementById('tab-camera').addEventListener('click', () => switchTab('camera'));
        document.getElementById('tab-upload').addEventListener('click', () => switchTab('upload'));
        document.getElementById('btn-capture-photo').addEventListener('click', capturePhoto);

        // Upload de foto
        const fileUploader = document.getElementById('file-uploader');
        const uploadFilename = document.getElementById('upload-filename-text');
        const btnAnalyzeUpload = document.getElementById('btn-analyze-upload');

        document.getElementById('btn-select-file').addEventListener('click', () => fileUploader.click());
        
        fileUploader.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            uploadFilename.innerText = file.name;
            btnAnalyzeUpload.setAttribute('disabled', 'true');
            btnAnalyzeUpload.innerText = 'Processando...';

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const tmpCanvas = document.createElement('canvas');
                    tmpCanvas.width  = img.width;
                    tmpCanvas.height = img.height;
                    tmpCanvas.getContext('2d').drawImage(img, 0, 0);
                    state.currentCapturedImage = resizeImageToBase64(tmpCanvas);
                    btnAnalyzeUpload.removeAttribute('disabled');
                    btnAnalyzeUpload.innerText = 'Analisar Foto';
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });

        btnAnalyzeUpload.addEventListener('click', () => {
            if (state.currentCapturedImage) analyzeFoodPhoto();
        });

        // Logout do perfil
        const btnProfileLogout = document.getElementById('btn-profile-logout');
        if (btnProfileLogout) {
            btnProfileLogout.addEventListener('click', () => {
                if (confirm('Deseja sair da sua conta?')) {
                    if (appointmentAlertInterval) {
                        clearInterval(appointmentAlertInterval);
                        appointmentAlertInterval = null;
                    }
                    localStorage.removeItem('nutrir_token');
                    showScreen('screen-login');
                }
            });
        }

        // Recalcular plano e reset
        document.getElementById('btn-recalculate-profile').addEventListener('click', () => {
            if (confirm("Deseja voltar ao formulário de plano e redefinir suas metas?")) {
                showScreen('screen-onboarding');
                setupOnboardingSliders();
            }
        });

        const btnSettingsGoToAdmin = document.getElementById('btn-settings-go-to-admin');
        if (btnSettingsGoToAdmin) {
            btnSettingsGoToAdmin.addEventListener('click', () => {
                showScreen('screen-admin');
            });
        }

        document.getElementById('btn-reset-app').addEventListener('click', () => {
            if (confirm("Limpar permanentemente TODOS os dados locais?")) {
                localStorage.clear();
                state.userProfile = null;
                state.mealsLog = [];
                state.geminiApiKey = '';
                state.waterConsumed = 0;
                state.fastingActive = false;
                state.savedAiRecipes = [];
                state.savedWeeklyPlans = [];
                initApp();
            }
        });

        // Alternância de abas de receitas (Nutricionista vs IA)
        const tabDefaultBtn = document.getElementById('btn-tab-recipes-pro');
        const tabAiBtn = document.getElementById('btn-tab-recipes-ai');
        const panelDefault = document.getElementById('section-recipes-pro');
        const panelAi = document.getElementById('section-recipes-ai');

        if (tabDefaultBtn && tabAiBtn && panelDefault && panelAi) {
            tabDefaultBtn.addEventListener('click', () => {
                tabDefaultBtn.classList.add('active');
                tabAiBtn.classList.remove('active');
                panelDefault.classList.remove('hidden');
                panelAi.classList.add('hidden');
                renderProRecipesTab();
            });

            tabAiBtn.addEventListener('click', () => {
                tabAiBtn.classList.add('active');
                tabDefaultBtn.classList.remove('active');
                panelAi.classList.remove('hidden');
                panelDefault.classList.add('hidden');

                renderSavedAiRecipes();
                renderSavedWeeklyPlans();
            });
        }

        // Ouvintes da nova tela de Meus Profissionais (screen-my-professionals)
        const btnGoToMyPros = document.getElementById('btn-go-to-my-professionals');
        if (btnGoToMyPros) {
            btnGoToMyPros.addEventListener('click', () => showScreen('screen-my-professionals'));
        }

        const btnBackMyPros = document.getElementById('btn-back-my-professionals');
        if (btnBackMyPros) {
            btnBackMyPros.addEventListener('click', () => showScreen('screen-settings'));
        }

        const btnMyProsUpgrade = document.getElementById('btn-my-pros-upgrade');
        if (btnMyProsUpgrade) {
            btnMyProsUpgrade.addEventListener('click', simulatePremiumPayment);
        }

        const myProsLinkForm = document.getElementById('my-pros-link-form');
        if (myProsLinkForm) {
            myProsLinkForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const proId = document.getElementById('select-my-pros-list').value;
                const type = document.getElementById('select-my-pros-role').value;
                if (!proId) return alert('Selecione um profissional.');

                // Verifica se já possui profissional vinculado desse tipo
                const existingPro = (state.linkedProfessionals || []).find(p => p.role === type);
                if (existingPro) {
                    const roleLabel = type === 'nutritionist' ? 'Nutricionista' : 'Personal Trainer';
                    if (!confirm(`Você já possui o profissional ${existingPro.name} vinculado como seu ${roleLabel}. Deseja substituí-lo pelo novo profissional selecionado?`)) {
                        return;
                    }
                }

                await linkProfessional(proId, type);
                renderMyProfessionalsScreen();
            });
        }

        // Modal de Agendamento
        const btnCloseBookAppointment = document.getElementById('btn-close-book-appointment');
        if (btnCloseBookAppointment) {
            btnCloseBookAppointment.addEventListener('click', () => {
                document.getElementById('modal-book-appointment').classList.remove('active');
            });
        }

        const btnCancelBookAppointment = document.getElementById('btn-cancel-book-appointment');
        if (btnCancelBookAppointment) {
            btnCancelBookAppointment.addEventListener('click', () => {
                document.getElementById('modal-book-appointment').classList.remove('active');
            });
        }

        const bookAppointmentForm = document.getElementById('book-appointment-form');
        if (bookAppointmentForm) {
            bookAppointmentForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const professional_id = document.getElementById('book-appointment-pro-id').value;
                const appointment_date = document.getElementById('book-appointment-date').value;
                const start_time = document.getElementById('book-appointment-start').value;
                const end_time = document.getElementById('book-appointment-end').value;

                if (!professional_id || !appointment_date || !start_time || !end_time) {
                    alert('Por favor, preencha todos os campos.');
                    return;
                }

                // Validar data e hora com base no fuso de Brasília
                const todayStr = getTodayDateString();
                if (appointment_date < todayStr) {
                    alert('Não é possível agendar consultas em datas passadas de acordo com o Horário de Brasília.');
                    return;
                }

                if (appointment_date === todayStr) {
                    const nowSP = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
                    const currentHour = String(nowSP.getHours()).padStart(2, '0');
                    const currentMinute = String(nowSP.getMinutes()).padStart(2, '0');
                    const currentTimeSP = `${currentHour}:${currentMinute}`;
                    if (start_time <= currentTimeSP) {
                        alert('Não é possível agendar consultas para um horário passado hoje de acordo com o Horário de Brasília.');
                        return;
                    }
                }

                const token = localStorage.getItem('nutrir_token');
                try {
                    const res = await fetch(`${API_URL}/user/appointments`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ professional_id, appointment_date, start_time, end_time })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Erro ao agendar consulta.');

                    alert('Consulta agendada com sucesso!');
                    document.getElementById('modal-book-appointment').classList.remove('active');
                    renderMyProfessionalsScreen();
                } catch (err) {
                    alert(err.message);
                }
            });
        }

        const btnSaveBookAppointment = document.getElementById('btn-save-book-appointment');
        if (btnSaveBookAppointment) {
            btnSaveBookAppointment.addEventListener('click', () => {
                const submitEvent = new Event('submit', { cancelable: true });
                bookAppointmentForm.dispatchEvent(submitEvent);
            });
        }

        // Listener do botão de fechar vídeo chamada
        const btnCloseVideoCall = document.getElementById('btn-close-video-call');
        if (btnCloseVideoCall) {
            btnCloseVideoCall.addEventListener('click', () => {
                if (confirm('Deseja realmente encerrar a videochamada?')) {
                    closeVideoCall();
                }
            });
        }

        // Ouvintes de ficha clínica nas configurações do paciente
        const settingsClinicalForm = document.getElementById('settings-clinical-form');
        if (settingsClinicalForm) {
            settingsClinicalForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const comorbidities = document.getElementById('input-settings-comorbidities').value;
                const intolerances = document.getElementById('input-settings-intolerances').value;
                const dietary_restrictions = document.getElementById('input-settings-restrictions').value;

                try {
                    const res = await fetch(`${API_URL}/user/clinical`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${state.token}`
                        },
                        body: JSON.stringify({ comorbidities, intolerances, dietary_restrictions })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Erro ao salvar ficha clínica.');

                    const successMsg = document.getElementById('clinical-settings-success-msg');
                    if (successMsg) {
                        successMsg.classList.remove('hidden');
                        setTimeout(() => successMsg.classList.add('hidden'), 3000);
                    }

                    if (state.userProfile) {
                        state.userProfile.comorbidities = comorbidities;
                        state.userProfile.intolerances = intolerances;
                        state.userProfile.dietary_restrictions = dietary_restrictions;
                    }
                } catch (err) {
                    alert(err.message);
                }
            });
        }

        // Ouvinte de upload de exames laboratoriais do paciente
        const myExamsUploadForm = document.getElementById('my-exams-upload-form');
        if (myExamsUploadForm) {
            myExamsUploadForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const fileInput = document.getElementById('input-exam-file');
                if (!fileInput || fileInput.files.length === 0) {
                    alert('Selecione um arquivo primeiro.');
                    return;
                }

                const file = fileInput.files[0];
                const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
                if (!allowedTypes.includes(file.type)) {
                    alert('Formato de arquivo não suportado. Envie apenas PDF ou imagens.');
                    return;
                }

                const reader = new FileReader();
                reader.onload = async () => {
                    const fileBase64 = reader.result;
                    const payload = {
                        fileName: file.name,
                        mimeType: file.type,
                        fileBase64: fileBase64,
                        notes: ''
                    };

                    const btnSubmit = document.getElementById('btn-submit-exam');
                    if (btnSubmit) {
                        btnSubmit.disabled = true;
                        btnSubmit.innerHTML = 'Enviando...';
                    }

                    try {
                        const res = await fetch(`${API_URL}/user/exams`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${state.token}`
                            },
                            body: JSON.stringify(payload)
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Erro ao enviar exame.');

                        alert('Exame enviado com sucesso!');
                        fileInput.value = '';
                        await loadMyExamsList();
                    } catch (err) {
                        alert(err.message);
                    } finally {
                        if (btnSubmit) {
                            btnSubmit.disabled = false;
                            btnSubmit.innerHTML = `<i data-lucide="upload" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i> Enviar Exame`;
                            if (window.lucide) window.lucide.createIcons();
                        }
                    }
                };
                reader.onerror = () => {
                    alert('Erro ao ler arquivo.');
                };
                reader.readAsDataURL(file);
            });
        }
    }

    let localStream = null;
    let peerConnection = null;
    let wsSignal = null;
    let isMicMuted = false;
    let isCamOff = false;
    let remoteCandidatesQueue = [];
    let appointmentAlertInterval = null;
    let lastAppointmentsFetchTime = 0;

    async function startVideoCall(link) {
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

        showScreen('screen-video-call');

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
                        console.warn("Autoplay bloqueado no stream remoto. Forçando muted e play...", err);
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
                console.log('Conectado ao servidor de sinalização');
                if (statusEl) statusEl.textContent = 'Aguardando outro participante...';
                
                // Enviar join
                wsSignal.send(JSON.stringify({
                    type: 'join',
                    room: roomName,
                    userId: state.user ? state.user.id : 'paciente-' + Date.now()
                }));
            };

            // Função para processar candidatos ICE acumulados após RemoteDescription ser definida
            const processPendingCandidates = async () => {
                if (remoteCandidatesQueue.length > 0) {
                    console.log(`[WebRTC] Aplicando ${remoteCandidatesQueue.length} candidatos ICE acumulados...`);
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
                                    console.log("[WebRTC] Acumulando candidato ICE (RemoteDescription não definida)");
                                    remoteCandidatesQueue.push(candidate);
                                }
                            }
                            break;

                        case 'peer-left':
                            if (statusEl) statusEl.textContent = 'Chamada encerrada pelo profissional.';
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
                    console.log('WebRTC Connection State:', peerConnection.connectionState);
                    if (peerConnection.connectionState === 'connected') {
                        if (statusEl) statusEl.textContent = 'Em chamada';
                    } else if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
                        if (statusEl) statusEl.textContent = 'Conexão perdida. Reabrindo...';
                        setTimeout(() => {
                            if (peerConnection && (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected')) {
                                console.log('Encerrando chamada por perda persistente de conexão.');
                                closeVideoCall();
                            }
                        }, 5000);
                    }
                }
            };

        } catch (err) {
            console.error('Erro ao iniciar vídeo chamada nativa:', err);
            alert('Não foi possível acessar câmera/microfone. Verifique suas permissões nas configurações do navegador.');
            closeVideoCall();
        }
    }

    function setupCallControlsListeners() {
        const btnMic = document.getElementById('btn-toggle-mic');
        const btnCam = document.getElementById('btn-toggle-cam');
        const btnHangup = document.getElementById('btn-hangup');

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

        remoteCandidatesQueue = [];
        showScreen('screen-my-professionals');
        renderMyProfessionalsScreen();
    }

    function startAppointmentAlertTimer() {
        if (appointmentAlertInterval) {
            clearInterval(appointmentAlertInterval);
        }
        
        // Executa uma vez imediatamente
        checkUpcomingAppointments();
        
        // Executa a cada 60 segundos
        appointmentAlertInterval = setInterval(checkUpcomingAppointments, 60000);
    }

    async function checkUpcomingAppointments() {
        const token = localStorage.getItem('nutrir_token');
        if (!token) return;
        
        const now = new Date();
        
        // Atualizar silenciosamente a lista de consultas a cada 3 minutos (180000 ms)
        if (!state.myAppointments || (now.getTime() - lastAppointmentsFetchTime > 180000)) {
            try {
                const appRes = await fetch(`${API_URL}/user/appointments`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (appRes.ok) {
                    state.myAppointments = await appRes.json();
                    lastAppointmentsFetchTime = now.getTime();
                }
            } catch(e) {
                console.error("Erro silencioso ao buscar consultas para alertas:", e);
            }
        }
        
        if (!state.myAppointments || state.myAppointments.length === 0) return;
        
        state.myAppointments.forEach(a => {
            if (a.status !== 'scheduled') return;
            
            // Combinar data e hora da consulta
            const dateStr = a.appointment_date.split('T')[0];
            const timeStr = a.start_time;
            const appDateTime = new Date(`${dateStr}T${timeStr}`);
            
            // Diferença em milissegundos
            const diffMs = appDateTime.getTime() - now.getTime();
            // Diferença em minutos
            const diffMin = Math.round(diffMs / 60000);
            
            // Alerta in-app se faltam exatamente 15 minutos
            if (diffMin === 15) {
                if (!state.alertedAppointments) {
                    state.alertedAppointments = new Set();
                }
                
                if (!state.alertedAppointments.has(a.id)) {
                    state.alertedAppointments.add(a.id);
                    showInAppAppointmentAlert(a);
                }
            }
            
            // Tentar agendar no alarme nativo do Android
            if (window.AndroidApp && window.AndroidApp.scheduleNotification) {
                // Alarme nativo dispara exatamente 15 minutos antes da consulta
                const alarmTime = appDateTime.getTime() - (15 * 60000);
                if (alarmTime > now.getTime()) {
                    const title = "Consulta em breve";
                    const roleLabel = a.professional_role === 'nutritionist' ? 'Nutricionista' : 'Personal Trainer';
                    const message = `Sua consulta por vídeo com o ${roleLabel} começará em 15 minutos!`;
                    window.AndroidApp.scheduleNotification(a.id, title, message, alarmTime);
                }
            }
        });
    }

    function showInAppAppointmentAlert(a) {
        const alertId = 'in-app-alert-' + a.id;
        if (document.getElementById(alertId)) return;
        
        const alertDiv = document.createElement('div');
        alertDiv.id = alertId;
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-120px);
            background: linear-gradient(135deg, #22c55e, #10b981);
            color: #fff;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            z-index: 100000;
            display: flex;
            align-items: center;
            gap: 16px;
            width: 90%;
            max-width: 400px;
            transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;
        
        const roleLabel = a.professional_role === 'nutritionist' ? 'Nutricionista' : 'Personal Trainer';
        
        alertDiv.innerHTML = `
            <div style="background:rgba(255,255,255,0.2); border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            </div>
            <div style="flex:1;">
                <h4 style="margin:0; font-size:14px; font-weight:600; color:#fff;">Consulta em 15 Minutos!</h4>
                <p style="margin:2px 0 0 0; font-size:11px; opacity:0.9; color:#fff;">Sua consulta com o ${roleLabel} começará em breve.</p>
            </div>
            <button class="btn-start-call" style="background:#fff; color:#10b981; border:none; padding:6px 12px; border-radius:6px; font-size:11px; font-weight:bold; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.2); flex-shrink:0;">Entrar</button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Animação de entrada
        setTimeout(() => {
            alertDiv.style.transform = 'translateX(-50%) translateY(0)';
        }, 100);
        
        // Ação do botão
        alertDiv.querySelector('.btn-start-call').addEventListener('click', () => {
            alertDiv.style.transform = 'translateX(-50%) translateY(-120px)';
            setTimeout(() => alertDiv.remove(), 500);
            
            // Iniciar a chamada
            startVideoCall(a.video_link);
        });
        
        // Remover automaticamente após 15 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.style.transform = 'translateX(-50%) translateY(-120px)';
                setTimeout(() => alertDiv.remove(), 500);
            }
        }, 15000);
    }

    // ── AVALIAÇÃO CORPORAL POR IA ─────────────────────────────

    let _bodyEvalListenersReady = false;

    function _renderBodyEvalMetrics(data) {
        const fmt = v => (v != null && !isNaN(v)) ? parseFloat(v).toFixed(1) : '—';
        const assessment = data.visual_assessment || '';
        const confidence = data.confidence != null ? data.confidence : '?';

        return `
            <span class="body-eval-assessment-badge">${assessment || 'não definido'}</span>
            <div class="body-eval-metric-grid">
                <div class="body-eval-metric">
                    <div class="body-eval-metric-val">${fmt(data.body_fat_pct)}<span style="font-size:11px;font-weight:400"> %</span></div>
                    <div class="body-eval-metric-lbl">Gordura Corporal</div>
                </div>
                <div class="body-eval-metric">
                    <div class="body-eval-metric-val">${fmt(data.muscle_mass_kg)}<span style="font-size:11px;font-weight:400"> kg</span></div>
                    <div class="body-eval-metric-lbl">Massa Muscular Est.</div>
                </div>
                <div class="body-eval-metric">
                    <div class="body-eval-metric-val">${fmt(data.waist_cm)}<span style="font-size:11px;font-weight:400"> cm</span></div>
                    <div class="body-eval-metric-lbl">Cintura</div>
                </div>
                <div class="body-eval-metric">
                    <div class="body-eval-metric-val">${fmt(data.hip_cm)}<span style="font-size:11px;font-weight:400"> cm</span></div>
                    <div class="body-eval-metric-lbl">Quadril</div>
                </div>
                <div class="body-eval-metric">
                    <div class="body-eval-metric-val">${fmt(data.chest_cm)}<span style="font-size:11px;font-weight:400"> cm</span></div>
                    <div class="body-eval-metric-lbl">Tórax</div>
                </div>
                <div class="body-eval-metric">
                    <div class="body-eval-metric-val">${fmt(data.arm_cm)}<span style="font-size:11px;font-weight:400"> cm</span></div>
                    <div class="body-eval-metric-lbl">Braço</div>
                </div>
                <div class="body-eval-metric">
                    <div class="body-eval-metric-val">${fmt(data.thigh_cm)}<span style="font-size:11px;font-weight:400"> cm</span></div>
                    <div class="body-eval-metric-lbl">Coxa</div>
                </div>
            </div>
            <div class="body-eval-confidence">
                <i data-lucide="shield-check" style="width:13px;height:13px;"></i>
                Confiança da IA: ${confidence}/10
            </div>
            ${data.notes ? `<p class="body-eval-notes">${data.notes}</p>` : ''}
        `;
    }

    async function loadBodyEval() {
        const token = localStorage.getItem('nutrir_token');

        // Setup one-time event listeners
        if (!_bodyEvalListenersReady) {
            _bodyEvalListenersReady = true;

            const inputPhoto = document.getElementById('input-body-photo');
            const btnSelect  = document.getElementById('btn-select-body-photo');
            const btnAnalyze = document.getElementById('btn-analyze-body-photo');
            const fileLabel  = document.getElementById('body-eval-filename');
            const btnNew     = document.getElementById('btn-new-body-eval');

            let _capturedBodyImage = null;

            btnSelect.addEventListener('click', () => inputPhoto.click());

            inputPhoto.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                fileLabel.textContent = file.name;
                fileLabel.classList.remove('hidden');
                btnAnalyze.setAttribute('disabled', 'true');
                btnAnalyze.classList.remove('hidden');
                btnAnalyze.textContent = 'Processando...';

                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = new Image();
                    img.onload = () => {
                        const tmpCanvas = document.createElement('canvas');
                        tmpCanvas.width  = img.width;
                        tmpCanvas.height = img.height;
                        tmpCanvas.getContext('2d').drawImage(img, 0, 0);
                        _capturedBodyImage = resizeImageToBase64(tmpCanvas, 1200, 0.85);
                        btnAnalyze.removeAttribute('disabled');
                        btnAnalyze.innerHTML = '<i data-lucide="sparkles" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:6px;"></i>Analisar com IA';
                        if (window.lucide) window.lucide.createIcons();
                    };
                    img.src = ev.target.result;
                };
                reader.readAsDataURL(file);
            });

            btnAnalyze.addEventListener('click', async () => {
                if (!_capturedBodyImage) return;
                const heightCm = state.userProfile && state.userProfile.height ? state.userProfile.height : null;
                if (!heightCm) {
                    alert('Você precisa ter sua altura cadastrada no perfil para usar este recurso.');
                    return;
                }

                const uploadSection = document.getElementById('body-eval-upload-section');
                const loader        = document.getElementById('body-eval-loader');
                const resultsWrap   = document.getElementById('body-eval-results');
                const resultsInner  = document.getElementById('body-eval-results-inner');

                uploadSection.classList.add('hidden');
                loader.classList.remove('hidden');
                resultsWrap.classList.add('hidden');

                try {
                    const base64 = _capturedBodyImage.split(',')[1];
                    const aiRes = await fetch(`${API_URL}/ai/analyze-body`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ image: base64, height_cm: heightCm })
                    });
                    if (!aiRes.ok) {
                        const e = await aiRes.json().catch(() => ({}));
                        throw new Error(e.error || 'Falha na análise com IA.');
                    }
                    const aiData = await aiRes.json();

                    // Auto-save
                    const today = new Date().toISOString().split('T')[0];
                    await fetch(`${API_URL}/user/measurements`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                            measured_at:    today,
                            height_cm:      heightCm,
                            body_fat_pct:   aiData.body_fat_pct,
                            muscle_mass_kg: aiData.muscle_mass_kg,
                            waist_cm:       aiData.waist_cm,
                            hip_cm:         aiData.hip_cm,
                            chest_cm:       aiData.chest_cm,
                            arm_cm:         aiData.arm_cm,
                            thigh_cm:       aiData.thigh_cm,
                            notes:          `IA (confiança ${aiData.confidence}/10): ${aiData.notes || ''}`
                        })
                    });

                    loader.classList.add('hidden');
                    resultsInner.innerHTML = _renderBodyEvalMetrics(aiData);
                    resultsWrap.classList.remove('hidden');
                    if (window.lucide) window.lucide.createIcons();

                    // Refresh last eval section
                    _renderLastBodyEval([aiData]);

                    if (aiData._meta) {
                        console.group('%c[Nutrir IA] Avaliação Corporal', 'color:#a78bfa;font-weight:bold');
                        console.log(`Provedor: ${aiData._meta.provider} | Modelo: ${aiData._meta.model}`);
                        console.log(`Latência: ${aiData._meta.latency_ms}ms | Confiança: ${aiData.confidence}/10`);
                        console.groupEnd();
                    }
                } catch (err) {
                    loader.classList.add('hidden');
                    uploadSection.classList.remove('hidden');
                    alert('Erro na análise: ' + err.message);
                }
            });

            btnNew.addEventListener('click', () => {
                _capturedBodyImage = null;
                inputPhoto.value = '';
                fileLabel.textContent = '';
                fileLabel.classList.add('hidden');
                btnAnalyze.classList.add('hidden');

                document.getElementById('body-eval-upload-section').classList.remove('hidden');
                document.getElementById('body-eval-results').classList.add('hidden');
            });
        }

        // Load last saved measurement
        try {
            const measRes = await fetch(`${API_URL}/user/measurements`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (measRes.ok) {
                const measurements = await measRes.json();
                _renderLastBodyEval(measurements);
            }
        } catch (_) {}
    }

    function _renderLastBodyEval(measurements) {
        const container = document.getElementById('body-eval-last-content');
        if (!container) return;
        if (!measurements || measurements.length === 0) {
            container.innerHTML = '<p style="font-size:11px; opacity:0.4; text-align:center;">Nenhuma avaliação realizada ainda.</p>';
            return;
        }
        const m = measurements[0];
        const fmt = v => (v != null && !isNaN(parseFloat(v))) ? parseFloat(v).toFixed(1) : '—';
        const date = m.measured_at ? new Date(m.measured_at + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
        container.innerHTML = `
            <p style="font-size:11px; opacity:0.55; margin-bottom:8px;">Realizada em ${date}</p>
            <div class="body-eval-metric-grid" style="grid-template-columns:1fr 1fr 1fr;">
                <div class="body-eval-metric">
                    <div class="body-eval-metric-val">${fmt(m.body_fat_pct)}<span style="font-size:10px;font-weight:400">%</span></div>
                    <div class="body-eval-metric-lbl">% Gordura</div>
                </div>
                <div class="body-eval-metric">
                    <div class="body-eval-metric-val">${fmt(m.waist_cm)}<span style="font-size:10px;font-weight:400">cm</span></div>
                    <div class="body-eval-metric-lbl">Cintura</div>
                </div>
                <div class="body-eval-metric">
                    <div class="body-eval-metric-val">${fmt(m.hip_cm)}<span style="font-size:10px;font-weight:400">cm</span></div>
                    <div class="body-eval-metric-lbl">Quadril</div>
                </div>
            </div>
        `;
    }

});
