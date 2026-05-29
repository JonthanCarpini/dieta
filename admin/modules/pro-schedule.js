/**
 * pro-schedule.js — Agenda e Disponibilidade Profissional
 */
import { API_URL, adminState } from './state.js';

export const SCHEDULE_TIMES = [];
for (let h = 7; h <= 20; h++) {
    SCHEDULE_TIMES.push(`${String(h).padStart(2,'0')}:00`);
    SCHEDULE_TIMES.push(`${String(h).padStart(2,'0')}:30`);
}

export const GRID_DAYS = [
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
let _bookedCells = new Map(); // key "dow|HH:MM" -> { appt, isStart, dateStr }

export function timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

export function addMinutesToTime(t, mins) {
    const total = timeToMinutes(t) + mins;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

export function slotsToSelectedCells(slots) {
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

export function selectedCellsToSlots(cells) {
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

export async function loadScheduleData() {
    try {
        const [availRes, apptRes] = await Promise.all([
            fetch(`${API_URL}/admin/availability`, { headers: { 'Authorization': `Bearer ${adminState.token}` } }),
            fetch(`${API_URL}/professional/appointments`, { headers: { 'Authorization': `Bearer ${adminState.token}` } }),
        ]);
        if (!availRes.ok) throw new Error('Não foi possível carregar a agenda.');
        const slots = await availRes.json();
        const appointments = apptRes.ok ? await apptRes.json() : [];
        _buildBookedMap(appointments);
        renderScheduleGrid(slots);
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
}

// Mapeia consultas futuras (não canceladas) para células da grade semanal
function _buildBookedMap(appointments) {
    _bookedCells = new Map();
    const todayStr = new Date().toISOString().split('T')[0];
    (appointments || []).forEach(a => {
        if (a.status === 'cancelled') return;
        const dateStr = String(a.appointment_date).split('T')[0];
        if (dateStr < todayStr) return; // só futuras/hoje
        const [y, mo, d] = dateStr.split('-').map(Number);
        const dow = new Date(y, mo - 1, d).getDay();
        const start = (a.start_time || '').substring(0, 5);
        const end   = (a.end_time   || '').substring(0, 5);
        const sM = timeToMinutes(start), eM = timeToMinutes(end);
        SCHEDULE_TIMES.forEach(t => {
            const tm = timeToMinutes(t);
            if (tm >= sM && tm < eM) {
                const key = `${dow}|${t}`;
                // mantém o agendamento mais próximo se houver colisão de semanas
                const cur = _bookedCells.get(key);
                if (!cur || dateStr < cur.dateStr) {
                    _bookedCells.set(key, { appt: a, isStart: t === start, dateStr });
                }
            }
        });
    });
}

export function renderScheduleGrid(existingSlots) {
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
            const booked = _bookedCells.get(key);
            if (booked) {
                const a = booked.appt;
                const first = (a.patient_name || 'Paciente').split(' ')[0];
                const dateBR = booked.dateStr.split('-').reverse().join('/');
                const tip = `${a.patient_name || 'Paciente'} · ${dateBR} ${(a.start_time||'').substring(0,5)}–${(a.end_time||'').substring(0,5)}${a.patient_email ? '\n' + a.patient_email : ''}`;
                return `<td class="sg-cell sg-booked${booked.isStart ? ' sg-booked-start' : ''}" data-key="${key}" data-dow="${d.dow}" data-time="${t}" data-appt-id="${a.id}" title="${tip.replace(/"/g, '&quot;')}">${booked.isStart ? `<span class="sg-booked-label"><i data-lucide="user" style="width:9px;height:9px;"></i>${first}</span>` : ''}</td>`;
            }
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
            <span class="sg-legend-item sg-legend-booked">Ocupado (agendado)</span>
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
    if (window.lucide) window.lucide.createIcons();
}

export function updateSchedInfo() {
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

export function applyPreset(preset) {
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

export function bindGridEvents(container) {
    document.getElementById('sched-weekdays')?.addEventListener('click', () => applyPreset('weekdays'));
    document.getElementById('sched-fullweek')?.addEventListener('click', () => applyPreset('fullweek'));
    document.getElementById('sched-clear')?.addEventListener('click', () => applyPreset('clear'));

    container.querySelectorAll('.sg-day-toggle').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            const dow = btn.dataset.dow;
            const dayCells = [...container.querySelectorAll(`.sg-cell[data-dow="${dow}"]:not(.sg-booked)`)];
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
        // Células ocupadas mostram detalhes do paciente e não alteram disponibilidade
        if (cell.classList.contains('sg-booked')) { _showBookedDetails(cell.dataset.key); return; }
        _dragState = { willSelect: !_selectedCells.has(cell.dataset.key) };
        toggleCellState(cell, cell.dataset.key, _dragState.willSelect);
        updateSchedInfo();
    });

    table.addEventListener('mouseover', e => {
        if (!_dragState) return;
        const cell = e.target.closest('.sg-cell');
        if (!cell || cell.classList.contains('sg-booked')) return;
        toggleCellState(cell, cell.dataset.key, _dragState.willSelect);
        updateSchedInfo();
    });
}

function _showBookedDetails(key) {
    const b = _bookedCells.get(key);
    if (!b) return;
    const a = b.appt;
    const dateBR = b.dateStr.split('-').reverse().join('/');
    const goalMap = { lose: 'Emagrecer', gain: 'Ganhar Massa', maintain: 'Manutenção' };
    alert(
        `Consulta agendada\n\n` +
        `Paciente: ${a.patient_name || '—'}\n` +
        `E-mail: ${a.patient_email || '—'}\n` +
        `Data: ${dateBR}\n` +
        `Horário: ${(a.start_time||'').substring(0,5)} – ${(a.end_time||'').substring(0,5)}\n` +
        `Status: ${a.status || 'agendado'}`
    );
}

export function toggleCellState(cell, key, select) {
    if (select) { _selectedCells.add(key);    cell.classList.add('sg-selected'); }
    else         { _selectedCells.delete(key); cell.classList.remove('sg-selected'); }
}

export function initProSchedule() {
    document.addEventListener('mouseup', () => { _dragState = null; });

    // Botão de salvar agenda
    document.addEventListener('click', async (e) => {
        if (e.target.closest('#btn-save-schedule')) {
            const slots = selectedCellsToSlots(_selectedCells);
            try {
                const btn = document.getElementById('btn-save-schedule');
                if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader"></i> Salvando...'; if (window.lucide) window.lucide.createIcons(); }
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
                if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="save"></i> Salvar Disponibilidade'; if (window.lucide) window.lucide.createIcons(); }
            }
        }
    });
}
