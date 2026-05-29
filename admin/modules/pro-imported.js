/**
 * pro-imported.js — Listagem da base global de alimentos importados (source='extra')
 */
import { API_URL, adminState } from './state.js';

let _page  = 1;
let _q     = '';
let _totalPages = 1;

const fmt = v => (v === null || v === undefined) ? '—' : v;

export async function loadImportedFoods(page = 1) {
    _page = page;
    const tbody = document.getElementById('imp-table-body');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-2);">Carregando...</td></tr>`;

    try {
        const url = `${API_URL}/professional/imported-foods?page=${_page}&limit=30${_q ? `&q=${encodeURIComponent(_q)}` : ''}`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${adminState.token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro');

        _totalPages = data.totalPages || 1;
        _renderTable(data.items || []);
        _renderMeta(data.total || 0);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--color-danger);padding:24px;">Erro ao carregar.</td></tr>`;
    }
}

function _renderTable(items) {
    const tbody = document.getElementById('imp-table-body');
    if (!tbody) return;

    if (!items.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-2);">${_q ? 'Nenhum alimento encontrado para a busca.' : 'Nenhum alimento importado ainda.'}</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(f => `
        <tr>
            <td><strong>${f.name}</strong></td>
            <td><span style="font-size:12px;color:var(--text-2);">${f.category || '—'}</span></td>
            <td style="text-align:right;font-weight:700;color:var(--accent);">${fmt(f.energy_kcal)}</td>
            <td style="text-align:right;">${fmt(f.protein_g)}</td>
            <td style="text-align:right;">${fmt(f.fat_g)}</td>
            <td style="text-align:right;">${fmt(f.carbs_g)}</td>
            <td style="text-align:right;">${fmt(f.fiber_g)}</td>
            <td style="text-align:right;">
                <button class="btn-danger btn-sm imp-del-btn" data-id="${f.id}">Excluir</button>
            </td>
        </tr>`).join('');

    tbody.querySelectorAll('.imp-del-btn').forEach(btn =>
        btn.addEventListener('click', () => _deleteFood(parseInt(btn.dataset.id)))
    );
}

function _renderMeta(total) {
    const countLabel = document.getElementById('imp-count-label');
    const pageLabel  = document.getElementById('imp-page-label');
    const prev = document.getElementById('imp-prev');
    const next = document.getElementById('imp-next');

    if (countLabel) countLabel.textContent = `${total} aliment${total !== 1 ? 'os' : 'o'} importad${total !== 1 ? 'os' : 'o'}`;
    if (pageLabel)  pageLabel.textContent  = `Página ${_page} de ${_totalPages}`;
    if (prev) prev.disabled = _page <= 1;
    if (next) next.disabled = _page >= _totalPages;
}

async function _deleteFood(id) {
    if (!confirm('Remover este alimento da base importada?')) return;
    await fetch(`${API_URL}/professional/imported-foods/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminState.token}` }
    });
    loadImportedFoods(_page);
}

export function initProImported() {
    let _timer;
    document.getElementById('imp-search-input')?.addEventListener('input', e => {
        clearTimeout(_timer);
        _timer = setTimeout(() => { _q = e.target.value.trim(); loadImportedFoods(1); }, 300);
    });

    document.getElementById('imp-prev')?.addEventListener('click', () => {
        if (_page > 1) loadImportedFoods(_page - 1);
    });
    document.getElementById('imp-next')?.addEventListener('click', () => {
        if (_page < _totalPages) loadImportedFoods(_page + 1);
    });
}
