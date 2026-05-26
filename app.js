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
        savedWeeklyPlans: []     // Planos semanais gerados por IA salvos
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
        'food-search': document.getElementById('screen-food-search')
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

            if (!client_id || client_id.includes('your_google_oauth_client_id')) {
                console.warn('Google Client ID não configurado ou padrão.');
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

    function getTodayDateString() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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
        const noNavScreens = ['screen-login', 'screen-onboarding', 'screen-scanner', 'screen-results', 'screen-food-search', 'screen-professional', 'screen-admin'];
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
            renderRecipesGrid('all');
            renderSavedAiRecipes();
            renderSavedWeeklyPlans();
        }
        if (screenId === 'screen-fasting') {
            renderFastingScreen();
        }
        if (screenId === 'screen-history') {
            renderHistoryPage();
        }
        if (screenId === 'screen-settings') {
            renderSettingsPage();
            renderUserProfessionalSettings();
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

    // 12. ABA DE RECEITAS E DETALHES COM SLIDER DE ESCALA
    const recipesGrid = document.getElementById('recipes-list-container');
    const filterBtns = document.querySelectorAll('.recipe-filter-btn');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderRecipesGrid(btn.dataset.category);
        });
    });

    function renderRecipesGrid(category) {
        recipesGrid.innerHTML = "";
        const filtered = category === 'all' ? 
            FIT_RECIPES_DATABASE : 
            FIT_RECIPES_DATABASE.filter(r => r.category === category);

        filtered.forEach(recipe => {
            const card = document.createElement('div');
            card.className = 'recipe-grid-card';
            card.innerHTML = `
                <div class="recipe-card-img" style="background-image: url('${recipe.image}')"></div>
                <div class="recipe-card-info">
                    <h4>${recipe.name}</h4>
                    <div class="recipe-card-meta">
                        <span><i data-lucide="clock" style="width: 12px; height: 12px; display:inline-block; vertical-align:middle; margin-top:-2px;"></i> ${recipe.time_min} min</span>
                        <span class="cal">${recipe.calories_base} kcal</span>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => openRecipeDetailModal(recipe));
            recipesGrid.appendChild(card);
        });

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

            if (state.geminiApiKey && state.geminiApiKey.trim() !== '') {
                try {
                    if (period === 'daily') {
                        loaderStatus.innerText = `Gemini gerando uma receita de ${mealType === 'all' ? 'qualquer tipo' : mealType} de ${calRemaining} kcal...`;
                        const generatedRecipe = await callGeminiForDailyRecipe(mealType, calRemaining, protRemaining, carbsRemaining, fatRemaining);
                        
                        state.savedAiRecipes.push(generatedRecipe);
                        saveAiRecipesToLocalStorage();
                        renderSavedAiRecipes();
                        
                        loader.classList.add('hidden');
                        openRecipeDetailModal(generatedRecipe);
                    } else {
                        loaderStatus.innerText = `Gemini gerando um plano semanal (7 dias de receitas) adaptado para ${profile.targetCalories} kcal/dia...`;
                        const generatedPlan = await callGeminiForWeeklyPlan(mealType, profile);
                        
                        state.savedWeeklyPlans.push(generatedPlan);
                        saveWeeklyPlansToLocalStorage();
                        renderSavedWeeklyPlans();
                        
                        loader.classList.add('hidden');
                        alert("Plano semanal gerado com sucesso! Clique no plano abaixo para expandir e acessar as receitas de cada dia.");
                    }
                } catch (err) {
                    console.error("Erro na geração por IA real: ", err);
                    alert("Falha de conexão com a IA. Mostrando receitas simuladas.");
                    runMockGeneration(mealType, period, profile, calRemaining, protRemaining, carbsRemaining, fatRemaining);
                    loader.classList.add('hidden');
                }
            } else {
                // Mock modo demonstração
                loaderStatus.innerText = "Modo Demo: Simulando geração inteligente com IA...";
                await new Promise(resolve => setTimeout(resolve, 2000));
                runMockGeneration(mealType, period, profile, calRemaining, protRemaining, carbsRemaining, fatRemaining);
                loader.classList.add('hidden');
            }
        });
    }

    async function callGeminiForDailyRecipe(mealType, cal, p, c, f) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.geminiApiKey}`;
        const mealTypeStr = mealType === 'all' ? 'qualquer tipo de refeição saudável' : `refeição do tipo: ${mealType}`;
        const prompt = `Você é um chef e nutricionista experiente. Crie uma receita saudável, rápida e realista em português para ser consumida como ${mealTypeStr}.
A receita deve utilizar aproximadamente o seguinte limite nutricional:
- Calorias: ${cal} kcal
- Proteínas: ${p}g
- Carboidratos: ${c}g
- Gorduras: ${f}g

Responda ESTRITAMENTE em formato JSON puro (sem formatar bloco de código markdown como \`\`\`json, apenas a string JSON limpa e direta) contendo os seguintes campos:
{
  "name": "Nome descritivo e gostoso da receita",
  "time_min": 15,
  "calories": 320,
  "protein": 24,
  "carbs": 30,
  "fat": 8,
  "ingredients": [
    { "name": "Nome exato do ingrediente", "amount": 100, "unit": "g" }
  ],
  "directions": "Modo de preparo passo a passo resumido."
}`;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("API call failed");
        const data = await res.json();
        const jsonText = data.candidates[0].content.parts[0].text;
        const recipeResult = JSON.parse(jsonText);

        const imagesByCategory = {
            breakfast: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400",
            lunch: "https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=400",
            dinner: "https://images.unsplash.com/photo-1547592165-e1d17fed6005?w=400",
            snack: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"
        };

        return {
            id: "ai_recipe_daily_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
            name: recipeResult.name,
            category: mealType === 'all' ? 'lunch' : mealType,
            time_min: recipeResult.time_min || 15,
            image: imagesByCategory[mealType] || imagesByCategory['lunch'],
            calories_base: recipeResult.calories,
            protein_base: recipeResult.protein,
            carbs_base: recipeResult.carbs,
            fat_base: recipeResult.fat,
            fiber_base: 2.0,
            ingredients: recipeResult.ingredients.map(i => ({ name: i.name, amount_base: i.amount, unit: i.unit })),
            directions: recipeResult.directions
        };
    }

    async function callGeminiForWeeklyPlan(mealType, profile) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.geminiApiKey}`;
        
        // Estimativa média de macros por refeição para o plano (1/3 do dia)
        const calPerMeal = Math.round(profile.targetCalories / 3);
        const protPerMeal = Math.round(profile.targetProtein / 3);
        const carbsPerMeal = Math.round(profile.targetCarbs / 3);
        const fatPerMeal = Math.round(profile.targetFat / 3);

        const mealTypeStr = mealType === 'all' ? 'refeições variadas (café, almoço, janta, lanche) ao longo dos dias' : `refeições estritamente do tipo: ${mealType}`;

        const prompt = `Você é um chef e nutricionista. Crie um plano de 7 dias completos com 7 receitas saudáveis diferentes e variadas em português (uma receita para cada dia da semana, identificados de dia 1 a dia 7).
O tipo de refeição deve ser: ${mealTypeStr}.
Cada receita deve ter aproximadamente o seguinte valor nutricional médio:
- Calorias: ${calPerMeal} kcal
- Proteínas: ${protPerMeal}g
- Carboidratos: ${carbsPerMeal}g
- Gorduras: ${fatPerMeal}g

Responda ESTRITAMENTE em formato JSON (sem bloco de código markdown, apenas a string JSON limpa) que seja um array contendo exatamente 7 objetos seguindo esta estrutura:
[
  {
    "day": 1,
    "name": "Nome da receita do dia 1",
    "time_min": 20,
    "calories": 400,
    "protein": 30,
    "carbs": 40,
    "fat": 10,
    "ingredients": [
      { "name": "Ingrediente", "amount": 100, "unit": "g" }
    ],
    "directions": "Modo de preparo rápido."
  }
]`;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("API call failed");
        const data = await res.json();
        const jsonText = data.candidates[0].content.parts[0].text;
        const plansArray = JSON.parse(jsonText);

        const imagesByCategory = {
            breakfast: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400",
            lunch: "https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=400",
            dinner: "https://images.unsplash.com/photo-1547592165-e1d17fed6005?w=400",
            snack: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"
        };

        const mappedRecipes = plansArray.map((r, index) => {
            let cat = mealType;
            if (mealType === 'all') {
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
            mealType: portugueseMealType[mealType] || mealType,
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

        state.currentCapturedImage = canvas.toDataURL('image/jpeg', 0.85);

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

        if (state.geminiApiKey && state.geminiApiKey.trim() !== '') {
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
                loaderStatus.innerText = "Falha na conexão de IA. Iniciando modo demonstração para simular o prato...";
                await new Promise(resolve => setTimeout(resolve, 2000));
                simulateImageScan();
            } finally {
                loader.classList.add('hidden');
            }
        } else {
            loaderStatus.innerText = "Modo Demo: Simulando análise visual do prato...";
            await new Promise(resolve => setTimeout(resolve, 2500));
            simulateImageScan();
            loader.classList.add('hidden');
        }
    }

    async function callGeminiApi(base64Image) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.geminiApiKey}`;
        const promptText = `Você é um nutricionista especialista em identificar pratos de comida por imagem. Analise a imagem fornecida e retorne um objeto JSON contendo os alimentos identificados, o peso estimado (g), e os macronutrientes (calorias, carboidratos (g), proteínas (g), gorduras (g)) de cada um.
Responda ESTRITAMENTE em formato JSON puro obedecendo a esta exata estrutura (não coloque em bloco de código de markdown como \`\`\`json, apenas envie a string JSON limpa e direta):
{
  "items": [
    { "name": "Nome do Alimento", "weight_g": 150, "calories": 210, "protein": 24, "carbs": 2, "fat": 12 }
  ],
  "total": { "calories": 210, "protein": 24, "carbs": 2, "fat": 12 }
}`;

        const payload = {
            contents: [
                {
                    parts: [
                        { text: promptText },
                        {
                            inlineData: {
                                mimeType: "image/jpeg",
                                data: base64Image
                            }
                        }
                    ]
                }
            ],
            generationConfig: { responseMimeType: "application/json" }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("HTTP error!");
        const data = await response.json();
        
        try {
            const rawJsonText = data.candidates[0].content.parts[0].text;
            return JSON.parse(rawJsonText);
        } catch (parseErr) {
            console.error("Erro parsing: ", parseErr);
            throw new Error("Resposta inválida.");
        }
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
        const totalCalEl = document.getElementById('result-total-calories');
        const totalProtEl = document.getElementById('result-total-protein');
        const totalCarbsEl = document.getElementById('result-total-carbs');
        const totalFatEl = document.getElementById('result-total-fat');
        const listEl = document.getElementById('detected-foods-list');

        previewImg.src = state.currentCapturedImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';

        const meal = state.currentAnalyzingMeal;
        totalCalEl.innerText = meal.total.calories;
        totalProtEl.innerText = `${meal.total.protein}g`;
        totalCarbsEl.innerText = `${meal.total.carbs}g`;
        totalFatEl.innerText = `${meal.total.fat}g`;

        listEl.innerHTML = '';

        meal.items.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'food-item-card';
            card.innerHTML = `
                <div class="food-item-details">
                    <span class="food-name">${item.name}</span>
                    <span class="food-sub">${item.weight_g}g</span>
                    <div class="food-macros">
                        <span>P: ${item.protein}g</span>
                        <span>C: ${item.carbs}g</span>
                        <span>G: ${item.fat}g</span>
                    </div>
                </div>
                <div class="food-item-right-wrap">
                    <span class="food-cal-display">${item.calories} <span>kcal</span></span>
                    <i data-lucide="edit-3" class="edit-indicator" style="width: 16px; height: 16px;"></i>
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

        const newMealEntry = {
            id: 'meal_' + Date.now(),
            date: todayStr,
            time: timeStr,
            name: `Escaner de Alimento (${timeStr})`,
            items: state.currentAnalyzingMeal.items,
            total: state.currentAnalyzingMeal.total
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

        // Macros
        document.getElementById('target-protein').innerText = protTarget;
        document.getElementById('consumed-protein').innerText = protConsumed;
        document.getElementById('target-carbs').innerText = carbsTarget;
        document.getElementById('consumed-carbs').innerText = carbsConsumed;
        document.getElementById('target-fat').innerText = fatTarget;
        document.getElementById('consumed-fat').innerText = fatConsumed;

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
                    <p>Nenhuma refeição registrada hoje. Adicione clicando no scanner ou buscando alimentos.</p>
                </div>
            `;
        } else {
            todaysMeals.sort((a,b) => b.time.localeCompare(a.time));
            todaysMeals.forEach(meal => {
                const item = document.createElement('div');
                item.className = 'meal-item';
                const summary = meal.items.map(i => i.name).join(', ');
                const cleanSummary = summary.length > 35 ? summary.substring(0, 35) + '...' : summary;

                item.innerHTML = `
                    <div class="meal-info">
                        <span class="meal-title">${meal.name}</span>
                        <span class="meal-time">${meal.time} • ${cleanSummary}</span>
                        <div class="meal-macros-summary">
                            <span>P: ${meal.total.protein}g</span>
                            <span>C: ${meal.total.carbs}g</span>
                            <span>G: ${meal.total.fat}g</span>
                        </div>
                    </div>
                    <div class="meal-item-right">
                        <span class="meal-cal-badge">${meal.total.calories}<span>kcal</span></span>
                        <button class="meal-delete-btn"><i data-lucide="trash-2"></i></button>
                    </div>
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

                listEl.appendChild(item);
            });
        }
        lucide.createIcons();
    }

    // 20. PÁGINA DE HISTÓRICO E GRÁFICOS
    function renderHistoryPage() {
        if (!state.userProfile) return;

        document.getElementById('hist-target-cal').innerText = `${state.userProfile.targetCalories} kcal`;
        document.getElementById('hist-target-p').innerText = `${state.userProfile.targetProtein}g`;
        document.getElementById('hist-target-c').innerText = `${state.userProfile.targetCarbs}g`;
        document.getElementById('hist-target-f').innerText = `${state.userProfile.targetFat}g`;

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

        const sorted = Object.keys(grouped).sort((a,b) => b.localeCompare(a));
        if (sorted.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>Nenhum histórico disponível.</p></div>`;
        } else {
            sorted.forEach(dt => {
                const parts = dt.split('-');
                const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
                const meals = grouped[dt];
                
                let sumC = 0, sumP = 0, sumCr = 0, sumF = 0;
                meals.forEach(m => {
                    sumC += m.total.calories;
                    sumP += m.total.protein;
                    sumCr += m.total.carbs;
                    sumF += m.total.fat;
                });

                const card = document.createElement('div');
                card.className = 'history-day-card';
                card.innerHTML = `
                    <div class="day-card-header">
                        <span class="day-date">${formatted}</span>
                        <span class="day-cal-total">${sumC} kcal</span>
                    </div>
                    <div class="day-macros-strip">
                        <span>P: <strong>${Math.round(sumP)}g</strong></span>
                        <span>C: <strong>${Math.round(sumCr)}g</strong></span>
                        <span>G: <strong>${Math.round(sumF)}g</strong></span>
                    </div>
                `;
                container.appendChild(card);
            });
        }
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
    }

    // 22. CONFIGURAÇÕES DE EVENTOS GERAIS
    function setupEventListeners() {
        // Navegação abas
        navItems.forEach(item => {
            item.addEventListener('click', () => showScreen(item.dataset.target));
        });

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
            if (file) {
                uploadFilename.innerText = file.name;
                btnAnalyzeUpload.removeAttribute('disabled');
                const reader = new FileReader();
                reader.onload = (event) => {
                    state.currentCapturedImage = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });

        btnAnalyzeUpload.addEventListener('click', () => {
            if (state.currentCapturedImage) analyzeFoodPhoto();
        });

        // Logout do perfil
        const btnProfileLogout = document.getElementById('btn-profile-logout');
        if (btnProfileLogout) {
            btnProfileLogout.addEventListener('click', () => {
                if (confirm('Deseja sair da sua conta?')) {
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

        // Alternância de abas de receitas (Padrão vs IA)
        const tabDefaultBtn = document.getElementById('btn-tab-recipes-default');
        const tabAiBtn = document.getElementById('btn-tab-recipes-ai');
        const panelDefault = document.getElementById('section-recipes-default');
        const panelAi = document.getElementById('section-recipes-ai');

        if (tabDefaultBtn && tabAiBtn && panelDefault && panelAi) {
            tabDefaultBtn.addEventListener('click', () => {
                tabDefaultBtn.classList.add('active');
                tabAiBtn.classList.remove('active');
                panelDefault.classList.remove('hidden');
                panelAi.classList.add('hidden');
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
    }
});
