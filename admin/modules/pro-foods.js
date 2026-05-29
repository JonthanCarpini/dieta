/**
 * pro-foods.js — Banco de Alimentos do Nutricionista
 */
import { API_URL, adminState } from './state.js';

let _editingId  = null;
let _allRows    = []; // cache da última listagem

// ── Medidas Caseiras — gerenciamento dinâmico ─────────────────────────────────

function _getMeasuresList() {
    return document.getElementById('pf-measures-list');
}

function _syncEmptyMsg() {
    const list  = _getMeasuresList();
    const empty = document.getElementById('pf-measures-empty');
    if (!list || !empty) return;
    empty.style.display = list.children.length === 0 ? 'block' : 'none';
}

function _addMeasureRow(label = '', grams = '') {
    const list = _getMeasuresList();
    if (!list) return;

    const row = document.createElement('div');
    row.className = 'pf-measure-row';
    row.innerHTML = `
        <input type="text"   class="pf-meas-label" placeholder="Ex: 1 colher de sopa"  value="${label}" maxlength="60">
        <input type="number" class="pf-meas-grams" placeholder="g" value="${grams}" min="0.1" step="0.1">
        <button type="button" class="pf-measure-del" title="Remover">×</button>
    `;
    row.querySelector('.pf-measure-del').addEventListener('click', () => {
        row.remove();
        _syncEmptyMsg();
    });

    list.appendChild(row);
    _syncEmptyMsg();
    row.querySelector('.pf-meas-label')?.focus();
}

function _getMeasuresData() {
    const rows = document.querySelectorAll('#pf-measures-list .pf-measure-row');
    return [...rows].map(r => ({
        label: r.querySelector('.pf-meas-label')?.value.trim() || '',
        grams: parseFloat(r.querySelector('.pf-meas-grams')?.value) || 0,
    })).filter(m => m.label && m.grams > 0);
}

function _clearMeasures() {
    const list = _getMeasuresList();
    if (list) list.innerHTML = '';
    _syncEmptyMsg();
}

function _loadMeasures(measures) {
    _clearMeasures();
    (measures || []).forEach(m => _addMeasureRow(m.label, m.grams));
}

// ── Formulário ────────────────────────────────────────────────────────────────

function _setField(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value ?? '';
}

function _clearForm() {
    _editingId = null;
    ['pf-name','pf-category','pf-portion','pf-kcal','pf-protein','pf-fat',
     'pf-carbs','pf-fiber','pf-sodium','pf-saturated-fat','pf-trans-fat',
     'pf-calcium','pf-iron'].forEach(id => _setField(id, ''));
    _clearMeasures();
    _updateFormState();
    const status = document.getElementById('pf-scan-status');
    if (status) { status.style.display = 'none'; status.textContent = ''; }
}

function _updateFormState() {
    const title     = document.getElementById('pf-form-title');
    const btnSave   = document.getElementById('pf-btn-save');
    const btnCancel = document.getElementById('pf-btn-cancel');
    if (title)     title.textContent   = _editingId ? 'Editar Alimento' : 'Cadastrar Alimento';
    if (btnSave)   btnSave.textContent = _editingId ? 'Atualizar Alimento' : 'Salvar Alimento';
    if (btnCancel) btnCancel.classList.toggle('hidden', !_editingId);
}

function _startEdit(id) {
    const food = _allRows.find(f => f.id === id);
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

    const measures = Array.isArray(food.measures) ? food.measures : [];
    _loadMeasures(measures);

    _updateFormState();
    document.getElementById('pf-form-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Scanner de duas imagens ───────────────────────────────────────────────────

let _scanImages = { front: null, label: null }; // base64 strings

function _renderScanUI() {
    const wrap = document.getElementById('pf-scan-wrap');
    if (!wrap) return;

    const slots = [
        { key: 'front', icon: 'package', title: 'Frente da Embalagem', hint: 'Nome, marca, sabor, variante' },
        { key: 'label', icon: 'list',    title: 'Tabela Nutricional',   hint: 'Quadro de informações nutricionais' },
    ];

    wrap.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
            ${slots.map(s => `
                <div class="pf-img-slot" id="pf-slot-${s.key}" data-key="${s.key}"
                     style="border:1.5px dashed var(--border);border-radius:10px;padding:12px 8px;
                            text-align:center;cursor:pointer;transition:border-color .15s;
                            background:var(--bg-surface-alt);min-height:90px;
                            display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;">
                    <div id="pf-slot-${s.key}-thumb" style="display:none;width:100%;position:relative;">
                        <img style="width:100%;max-height:70px;object-fit:cover;border-radius:6px;" alt="${s.title}">
                        <button type="button" class="pf-slot-clear" data-key="${s.key}"
                            style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,.6);color:#fff;
                                   border:none;border-radius:50%;width:18px;height:18px;font-size:12px;
                                   line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
                    </div>
                    <div id="pf-slot-${s.key}-placeholder">
                        <i data-lucide="${s.icon}" style="width:20px;height:20px;color:var(--text-2);margin-bottom:4px;"></i>
                        <div style="font-size:11px;font-weight:600;color:var(--text-2);">${s.title}</div>
                        <div style="font-size:10px;color:var(--text-3);">${s.hint}</div>
                    </div>
                </div>`).join('')}
        </div>
        <button type="button" id="pf-btn-analyze"
                class="btn-primary w-full" disabled
                style="font-size:13px;padding:10px;opacity:.5;">
            <i data-lucide="scan-line" style="width:14px;height:14px;display:inline;vertical-align:middle;margin-right:5px;"></i>
            Selecione ao menos uma foto para analisar
        </button>
    `;

    // Clicks nos slots
    wrap.querySelectorAll('.pf-img-slot').forEach(slot => {
        slot.addEventListener('click', e => {
            if (e.target.closest('.pf-slot-clear')) return; // não abre picker ao clicar no X
            _pickImage(slot.dataset.key);
        });
    });

    // Botões de limpar slot
    wrap.querySelectorAll('.pf-slot-clear').forEach(btn => {
        btn.addEventListener('click', () => _clearSlot(btn.dataset.key));
    });

    // Botão analisar
    wrap.querySelector('#pf-btn-analyze')?.addEventListener('click', _runScan);

    if (window.lucide) window.lucide.createIcons();
}

function _pickImage(key) {
    const input = document.createElement('input');
    input.type    = 'file';
    input.accept  = 'image/*';
    input.capture = 'environment';
    input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload  = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        _scanImages[key] = base64;

        // Mostra preview
        const thumb  = document.getElementById(`pf-slot-${key}-thumb`);
        const ph     = document.getElementById(`pf-slot-${key}-placeholder`);
        const slot   = document.getElementById(`pf-slot-${key}`);
        if (thumb && ph) {
            thumb.querySelector('img').src = `data:image/jpeg;base64,${base64}`;
            thumb.style.display = 'block';
            ph.style.display    = 'none';
        }
        if (slot) slot.style.borderColor = 'var(--accent)';

        _updateAnalyzeBtn();
    };
    input.click();
}

function _clearSlot(key) {
    _scanImages[key] = null;
    const thumb = document.getElementById(`pf-slot-${key}-thumb`);
    const ph    = document.getElementById(`pf-slot-${key}-placeholder`);
    const slot  = document.getElementById(`pf-slot-${key}`);
    if (thumb) thumb.style.display = 'none';
    if (ph)    ph.style.display    = 'flex';
    if (slot)  slot.style.borderColor = '';
    _updateAnalyzeBtn();
}

function _updateAnalyzeBtn() {
    const btn  = document.getElementById('pf-btn-analyze');
    const has  = _scanImages.front || _scanImages.label;
    const both = _scanImages.front && _scanImages.label;
    if (!btn) return;
    btn.disabled = !has;
    btn.style.opacity = has ? '1' : '.5';
    btn.innerHTML = has
        ? `<i data-lucide="scan-line" style="width:14px;height:14px;display:inline;vertical-align:middle;margin-right:5px;"></i>
           ${both ? 'Analisar 2 imagens com IA' : 'Analisar imagem com IA'}`
        : `<i data-lucide="scan-line" style="width:14px;height:14px;display:inline;vertical-align:middle;margin-right:5px;"></i>
           Selecione ao menos uma foto para analisar`;
    if (window.lucide) window.lucide.createIcons();
}

async function _runScan() {
    const images = [_scanImages.front, _scanImages.label].filter(Boolean);
    if (!images.length) return;

    const scanInfo = document.getElementById('pf-scan-status');
    const btn      = document.getElementById('pf-btn-analyze');
    const nImgs    = images.length;

    if (btn)      { btn.disabled = true; btn.textContent = `Analisando ${nImgs} imagem${nImgs > 1 ? 'ns' : ''} com IA...`; }
    if (scanInfo) { scanInfo.style.display = 'block'; scanInfo.style.color = 'var(--accent)'; scanInfo.textContent = `Enviando ${nImgs} foto${nImgs > 1 ? 's' : ''} para a IA…`; }

    try {
        const res = await fetch(`${API_URL}/ai/scan-nutrition-label`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminState.token}` },
            body: JSON.stringify({ images })
        });
        if (!res.ok) throw new Error((await res.json()).error || 'Erro na IA');
        const d = await res.json();

        // Preenche campos
        if (d.name)            _setField('pf-name',          d.name);
        if (d.portion_grams)   _setField('pf-portion',       Math.round(d.portion_grams));
        if (d.energy_kcal_100g)  _setField('pf-kcal',          parseFloat(d.energy_kcal_100g).toFixed(1));
        if (d.protein_g)         _setField('pf-protein',       parseFloat(d.protein_g).toFixed(1));
        if (d.fat_g)             _setField('pf-fat',           parseFloat(d.fat_g).toFixed(1));
        if (d.carbs_g)           _setField('pf-carbs',         parseFloat(d.carbs_g).toFixed(1));
        if (d.fiber_g)           _setField('pf-fiber',         parseFloat(d.fiber_g).toFixed(1));
        if (d.sodium_mg)         _setField('pf-sodium',        parseFloat(d.sodium_mg).toFixed(0));
        if (d.saturated_fat_g)   _setField('pf-saturated-fat', parseFloat(d.saturated_fat_g).toFixed(1));
        if (d.trans_fat_g)       _setField('pf-trans-fat',     parseFloat(d.trans_fat_g).toFixed(2));
        if (d.calcium_mg)        _setField('pf-calcium',       parseFloat(d.calcium_mg).toFixed(0));
        if (d.iron_mg)           _setField('pf-iron',          parseFloat(d.iron_mg).toFixed(2));

        // Medidas caseiras
        _clearMeasures();
        const aiMeasures = Array.isArray(d.measures) ? d.measures.filter(m => m.label && m.grams > 0) : [];
        if (aiMeasures.length > 0) {
            aiMeasures.forEach(m => _addMeasureRow(m.label, m.grams));
        } else if (d.portion_grams && d.portion_grams !== 100) {
            _addMeasureRow('1 porção', d.portion_grams);
        }

        const model   = d._meta?.model || 'IA';
        const measTxt = aiMeasures.length ? ` · ${aiMeasures.length} medida${aiMeasures.length > 1 ? 's' : ''} detectada${aiMeasures.length > 1 ? 's' : ''}` : '';
        if (scanInfo) { scanInfo.textContent = `✓ Preenchido por ${model}${measTxt}. Revise e salve.`; }

    } catch (err) {
        if (scanInfo) { scanInfo.style.color = 'var(--color-danger)'; scanInfo.textContent = `Erro: ${err.message}`; }
    } finally {
        _updateAnalyzeBtn();
    }
}

// ── Carregar lista ────────────────────────────────────────────────────────────

export async function loadProFoodsData(q = '') {
    const tbody = document.getElementById('pf-table-body');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-2);">Carregando...</td></tr>`;

    try {
        const url  = `${API_URL}/professional/foods${q ? `?q=${encodeURIComponent(q)}` : ''}`;
        const res  = await fetch(url, { headers: { 'Authorization': `Bearer ${adminState.token}` } });
        const rows = await res.json();
        _allRows   = rows;

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-2);">Nenhum alimento cadastrado ainda.</td></tr>`;
            return;
        }

        tbody.innerHTML = rows.map(f => {
            const measures = Array.isArray(f.measures) ? f.measures : [];
            const meaLabel = measures.length
                ? measures.slice(0, 2).map(m => `${m.label} (${m.grams}g)`).join(', ') + (measures.length > 2 ? ` +${measures.length - 2}` : '')
                : '<span style="color:var(--text-2);font-size:11px;">—</span>';

            return `<tr>
                <td>
                    <strong>${f.name}</strong>
                    <br><small style="color:var(--text-2);">${f.category || '—'}</small>
                </td>
                <td style="text-align:right;white-space:nowrap;">${f.portion_grams ?? '—'} g</td>
                <td style="text-align:right;font-weight:700;color:var(--accent);">${f.energy_kcal ?? '—'}</td>
                <td style="text-align:right;">${f.protein_g ?? '—'}</td>
                <td style="text-align:right;">${f.fat_g ?? '—'}</td>
                <td style="text-align:right;">${f.carbs_g ?? '—'}</td>
                <td style="font-size:11px;color:var(--text-2);">${meaLabel}</td>
                <td style="text-align:right;white-space:nowrap;">
                    <button class="btn-secondary btn-sm pf-edit-btn" data-id="${f.id}" style="margin-right:4px;">Editar</button>
                    <button class="btn-danger btn-sm pf-del-btn" data-id="${f.id}">Excluir</button>
                </td>
            </tr>`;
        }).join('');

        tbody.querySelectorAll('.pf-edit-btn').forEach(btn =>
            btn.addEventListener('click', () => _startEdit(parseInt(btn.dataset.id)))
        );
        tbody.querySelectorAll('.pf-del-btn').forEach(btn =>
            btn.addEventListener('click', () => _deleteFood(parseInt(btn.dataset.id)))
        );
    } catch {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--color-danger);padding:20px;">Erro ao carregar alimentos.</td></tr>`;
    }
}

async function _deleteFood(id) {
    if (!confirm('Excluir este alimento do seu banco personalizado?')) return;
    await fetch(`${API_URL}/professional/foods/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminState.token}` }
    });
    if (_editingId === id) _clearForm();
    loadProFoodsData();
}

// ── Inicialização ─────────────────────────────────────────────────────────────

export function initProFoods() {
    _syncEmptyMsg();
    _renderScanUI(); // monta os dois slots de imagem

    // Busca em tempo real
    let _searchTimer;
    document.getElementById('pf-search-input')?.addEventListener('input', e => {
        clearTimeout(_searchTimer);
        _searchTimer = setTimeout(() => loadProFoodsData(e.target.value.trim()), 300);
    });

    // Adicionar linha de medida
    document.getElementById('pf-btn-add-measure')?.addEventListener('click', () => _addMeasureRow());

    // Cancelar edição
    document.getElementById('pf-btn-cancel')?.addEventListener('click', _clearForm);

    // Submit
    document.getElementById('pf-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('pf-btn-save');
        if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

        const n = id => parseFloat(document.getElementById(id)?.value) || null;

        const body = {
            name:            document.getElementById('pf-name')?.value.trim(),
            category:        document.getElementById('pf-category')?.value.trim() || 'Personalizado',
            portion_grams:   n('pf-portion')  ?? 100,
            energy_kcal:     n('pf-kcal'),
            protein_g:       n('pf-protein'),
            fat_g:           n('pf-fat'),
            carbs_g:         n('pf-carbs'),
            fiber_g:         n('pf-fiber'),
            sodium_mg:       n('pf-sodium'),
            saturated_fat_g: n('pf-saturated-fat'),
            trans_fat_g:     n('pf-trans-fat'),
            calcium_mg:      n('pf-calcium'),
            iron_mg:         n('pf-iron'),
            measures:        _getMeasuresData(),
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
