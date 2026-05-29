/**
 * pro-foods.js — Banco de Alimentos do Nutricionista
 */
import { API_URL, adminState } from './state.js';

let _editingId = null;

// ── Campos do formulário ──────────────────────────────────────────────────────
const FIELDS = [
    { id: 'pf-name',          label: 'Nome do Alimento',          type: 'text',   required: true,  span2: true  },
    { id: 'pf-category',      label: 'Categoria',                 type: 'text',   required: false, span2: false, placeholder: 'Ex: Laticínios, Grãos, Carnes...' },
    { id: 'pf-portion',       label: 'Porção de referência (g)',  type: 'number', required: false, span2: false, placeholder: '100' },
    { id: 'pf-kcal',          label: 'Kcal por 100g',             type: 'number', required: true,  span2: false },
    { id: 'pf-protein',       label: 'Proteínas por 100g (g)',    type: 'number', required: false, span2: false },
    { id: 'pf-fat',           label: 'Lipídios por 100g (g)',     type: 'number', required: false, span2: false },
    { id: 'pf-carbs',         label: 'Carboidratos por 100g (g)', type: 'number', required: false, span2: false },
    { id: 'pf-fiber',         label: 'Fibras por 100g (g)',       type: 'number', required: false, span2: false },
    { id: 'pf-sodium',        label: 'Sódio por 100g (mg)',       type: 'number', required: false, span2: false },
    { id: 'pf-saturated-fat', label: 'Gord. Saturada /100g (g)', type: 'number', required: false, span2: false },
    { id: 'pf-trans-fat',     label: 'Gord. Trans /100g (g)',     type: 'number', required: false, span2: false },
    { id: 'pf-calcium',       label: 'Cálcio /100g (mg)',         type: 'number', required: false, span2: false },
    { id: 'pf-iron',          label: 'Ferro /100g (mg)',          type: 'number', required: false, span2: false },
];

// ── Carregar lista ────────────────────────────────────────────────────────────
export async function loadProFoodsData(q = '') {
    const tbody = document.getElementById('pf-table-body');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-2);">Carregando...</td></tr>`;

    try {
        const url = `${API_URL}/professional/foods${q ? `?q=${encodeURIComponent(q)}` : ''}`;
        const res  = await fetch(url, { headers: { 'Authorization': `Bearer ${adminState.token}` } });
        const rows = await res.json();

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-2);">Nenhum alimento cadastrado ainda. Use o formulário ao lado.</td></tr>`;
            return;
        }

        tbody.innerHTML = rows.map(f => `
            <tr>
                <td><strong>${f.name}</strong><br><small style="color:var(--text-2);">${f.category || '—'}</small></td>
                <td style="text-align:right;">${f.portion_grams ?? '—'} g</td>
                <td style="text-align:right;font-weight:700;color:var(--accent);">${f.energy_kcal ?? '—'}</td>
                <td style="text-align:right;">${f.protein_g ?? '—'}</td>
                <td style="text-align:right;">${f.fat_g ?? '—'}</td>
                <td style="text-align:right;">${f.carbs_g ?? '—'}</td>
                <td style="text-align:right;">
                    <button class="btn-secondary btn-sm pf-edit-btn" data-id="${f.id}" style="margin-right:4px;">Editar</button>
                    <button class="btn-danger btn-sm pf-del-btn" data-id="${f.id}">Excluir</button>
                </td>
            </tr>`).join('');

        tbody.querySelectorAll('.pf-edit-btn').forEach(btn =>
            btn.addEventListener('click', () => _startEdit(parseInt(btn.dataset.id), rows))
        );
        tbody.querySelectorAll('.pf-del-btn').forEach(btn =>
            btn.addEventListener('click', () => _deleteFood(parseInt(btn.dataset.id)))
        );
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--color-danger);padding:20px;">Erro ao carregar alimentos.</td></tr>`;
    }
}

function _startEdit(id, rows) {
    const food = rows.find(f => f.id === id);
    if (!food) return;
    _editingId = id;

    _setField('pf-name',          food.name);
    _setField('pf-category',      food.category);
    _setField('pf-portion',       food.portion_grams);
    _setField('pf-kcal',          food.energy_kcal);
    _setField('pf-protein',       food.protein_g);
    _setField('pf-fat',           food.fat_g);
    _setField('pf-carbs',         food.carbs_g);
    _setField('pf-fiber',         food.fiber_g);
    _setField('pf-sodium',        food.sodium_mg);
    _setField('pf-saturated-fat', food.saturated_fat_g);
    _setField('pf-trans-fat',     food.trans_fat_g);
    _setField('pf-calcium',       food.calcium_mg);
    _setField('pf-iron',          food.iron_mg);

    _updateFormState();
    document.getElementById('pf-form-title')?.scrollIntoView({ behavior: 'smooth' });
}

function _setField(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value ?? '';
}

function _clearForm() {
    _editingId = null;
    FIELDS.forEach(f => { const el = document.getElementById(f.id); if (el) el.value = ''; });
    _updateFormState();
}

function _updateFormState() {
    const title  = document.getElementById('pf-form-title');
    const btnSave = document.getElementById('pf-btn-save');
    const btnCancel = document.getElementById('pf-btn-cancel');
    if (title)    title.textContent   = _editingId ? 'Editar Alimento' : 'Cadastrar Alimento';
    if (btnSave)  btnSave.textContent = _editingId ? 'Atualizar' : 'Salvar Alimento';
    if (btnCancel) btnCancel.classList.toggle('hidden', !_editingId);
}

async function _deleteFood(id) {
    if (!confirm('Excluir este alimento do seu banco pessoal?')) return;
    await fetch(`${API_URL}/professional/foods/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminState.token}` }
    });
    loadProFoodsData();
}

// ── Scanner de Tabela Nutricional ─────────────────────────────────────────────
async function _openScanner() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';

    input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;

        const scanBtn  = document.getElementById('pf-btn-scan');
        const scanInfo = document.getElementById('pf-scan-status');
        if (scanBtn)  { scanBtn.disabled = true; scanBtn.textContent = 'Analisando...'; }
        if (scanInfo) { scanInfo.textContent = 'IA lendo a tabela nutricional...'; scanInfo.style.display = 'block'; }

        try {
            // Converte para base64
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload  = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const res  = await fetch(`${API_URL}/ai/scan-nutrition-label`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminState.token}` },
                body: JSON.stringify({ image: base64 })
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Erro na IA');
            const data = await res.json();

            // Auto-preenche campos
            if (data.name)                _setField('pf-name',          data.name);
            if (data.portion_grams)       _setField('pf-portion',       data.portion_grams);
            if (data.energy_kcal_100g)    _setField('pf-kcal',          Math.round(data.energy_kcal_100g));
            if (data.protein_g)           _setField('pf-protein',       data.protein_g);
            if (data.fat_g)               _setField('pf-fat',           data.fat_g);
            if (data.carbs_g)             _setField('pf-carbs',         data.carbs_g);
            if (data.fiber_g)             _setField('pf-fiber',         data.fiber_g);
            if (data.sodium_mg)           _setField('pf-sodium',        data.sodium_mg);
            if (data.saturated_fat_g)     _setField('pf-saturated-fat', data.saturated_fat_g);
            if (data.trans_fat_g)         _setField('pf-trans-fat',     data.trans_fat_g);
            if (data.calcium_mg)          _setField('pf-calcium',       data.calcium_mg);
            if (data.iron_mg)             _setField('pf-iron',          data.iron_mg);

            const model = data._meta?.model || 'IA';
            if (scanInfo) {
                scanInfo.textContent = `✓ Campos preenchidos automaticamente por ${model}. Revise antes de salvar.`;
                scanInfo.style.color = 'var(--accent)';
            }
        } catch (err) {
            if (scanInfo) { scanInfo.textContent = `Erro: ${err.message}`; scanInfo.style.color = 'var(--color-danger)'; }
        } finally {
            if (scanBtn) { scanBtn.disabled = false; scanBtn.textContent = '📷 Escanear Tabela Nutricional'; }
        }
    };

    input.click();
}

// ── Inicialização ─────────────────────────────────────────────────────────────
export function initProFoods() {
    // Busca em tempo real
    const searchInput = document.getElementById('pf-search-input');
    if (searchInput) {
        let timer;
        searchInput.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(() => loadProFoodsData(searchInput.value.trim()), 300);
        });
    }

    // Scanner
    document.getElementById('pf-btn-scan')?.addEventListener('click', _openScanner);

    // Cancelar edição
    document.getElementById('pf-btn-cancel')?.addEventListener('click', _clearForm);

    // Submit do formulário
    document.getElementById('pf-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('pf-btn-save');
        if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

        const body = {
            name:           document.getElementById('pf-name')?.value.trim(),
            category:       document.getElementById('pf-category')?.value.trim() || 'Personalizado',
            portion_grams:  parseFloat(document.getElementById('pf-portion')?.value) || 100,
            energy_kcal:    parseFloat(document.getElementById('pf-kcal')?.value)    || null,
            protein_g:      parseFloat(document.getElementById('pf-protein')?.value) || null,
            fat_g:          parseFloat(document.getElementById('pf-fat')?.value)     || null,
            carbs_g:        parseFloat(document.getElementById('pf-carbs')?.value)   || null,
            fiber_g:        parseFloat(document.getElementById('pf-fiber')?.value)   || null,
            sodium_mg:      parseFloat(document.getElementById('pf-sodium')?.value)  || null,
            saturated_fat_g: parseFloat(document.getElementById('pf-saturated-fat')?.value) || null,
            trans_fat_g:    parseFloat(document.getElementById('pf-trans-fat')?.value) || null,
            calcium_mg:     parseFloat(document.getElementById('pf-calcium')?.value) || null,
            iron_mg:        parseFloat(document.getElementById('pf-iron')?.value)    || null,
        };

        try {
            const url    = _editingId ? `${API_URL}/professional/foods/${_editingId}` : `${API_URL}/professional/foods`;
            const method = _editingId ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminState.token}` },
                body: JSON.stringify(body)
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Erro ao salvar'); }
            _clearForm();
            loadProFoodsData();
        } catch (err) {
            alert(err.message);
        } finally {
            if (btn) { btn.disabled = false; _updateFormState(); }
        }
    });
}
