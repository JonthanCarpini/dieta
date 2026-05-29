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

// ── Controle do importador (scraper) ──────────────────────────────────────────
let _pollTimer = null;

async function _scraperStatus() {
    const res = await fetch(`${API_URL}/professional/imported-foods/scraper/status`, {
        headers: { 'Authorization': `Bearer ${adminState.token}` }
    });
    return res.json();
}

function _renderScraperStatus(st) {
    const badge   = document.getElementById('scraper-state-badge');
    const startBt = document.getElementById('scraper-start');
    const stopBt  = document.getElementById('scraper-stop');
    const total   = document.getElementById('scraper-total');
    const elapsed = document.getElementById('scraper-elapsed');
    const log     = document.getElementById('scraper-log');

    const running = !!st.running;
    if (badge) {
        badge.textContent = running ? 'rodando' : 'parado';
        badge.className   = `ps-badge ${running ? '' : 'trial'}`;
    }
    if (startBt) startBt.classList.toggle('hidden', running);
    if (stopBt)  stopBt.classList.toggle('hidden', !running);
    if (total)   total.textContent = st.totalInDb != null ? st.totalInDb : '—';
    if (elapsed) elapsed.textContent = running && st.elapsedSec != null
        ? `Em execução há ${Math.floor(st.elapsedSec/60)}m ${st.elapsedSec%60}s`
        : (st.lastExit ? `Última execução encerrada (código ${st.lastExit.code})` : '');

    if (log) {
        if (st.lines && st.lines.length) {
            log.style.display = 'block';
            log.textContent = st.lines.join('\n');
            log.scrollTop = log.scrollHeight;
        }
    }
    return running;
}

export async function refreshScraperStatus() { return _refreshScraper(); }

async function _refreshScraper() {
    try {
        const st = await _scraperStatus();
        const running = _renderScraperStatus(st);
        // Atualiza a tabela quando o total muda e estamos na 1ª página sem busca
        if (running && _page === 1 && !_q) loadImportedFoods(1);
        // Liga/desliga o polling conforme execução
        if (running && !_pollTimer) {
            _pollTimer = setInterval(_refreshScraper, 4000);
        } else if (!running && _pollTimer) {
            clearInterval(_pollTimer); _pollTimer = null;
            if (_page === 1 && !_q) loadImportedFoods(1); // recarrega ao terminar
        }
    } catch { /* silencioso */ }
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

    // Controle do scraper
    document.getElementById('scraper-start')?.addEventListener('click', async () => {
        const max   = document.getElementById('scraper-max')?.value;
        const terms = document.getElementById('scraper-terms')?.value.trim();
        const btn   = document.getElementById('scraper-start');
        if (btn) { btn.disabled = true; btn.textContent = 'Iniciando...'; }
        try {
            const res = await fetch(`${API_URL}/professional/imported-foods/scraper/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminState.token}` },
                body: JSON.stringify({ max, terms: terms || undefined })
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Erro');
            _refreshScraper();
        } catch (err) {
            alert(err.message);
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="play" style="width:14px;height:14px;display:inline;vertical-align:middle;margin-right:4px;"></i> Iniciar'; if (window.lucide) window.lucide.createIcons(); }
        }
    });

    document.getElementById('scraper-stop')?.addEventListener('click', async () => {
        if (!confirm('Interromper a importação em andamento?')) return;
        try {
            await fetch(`${API_URL}/professional/imported-foods/scraper/stop`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${adminState.token}` }
            });
            _refreshScraper();
        } catch (err) { alert(err.message); }
    });
}
