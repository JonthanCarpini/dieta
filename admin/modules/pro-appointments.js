/**
 * pro-appointments.js — Gestão de Consultas
 */
import { API_URL, adminState } from './state.js';
import { startVideoCall } from './pro-patients.js';

export async function loadAppointmentsData() {
    const headersRow = document.getElementById('appointments-table-headers');
    const tbody = document.getElementById('appointments-table-body');
    
    if (!headersRow || !tbody) return;

    const role = adminState.user.role;

    if (role === 'admin') {
        headersRow.innerHTML = `
            <th>Data / Hora</th>
            <th>Paciente</th>
            <th>Profissional</th>
            <th>Status</th>
            <th>Link de Vídeo</th>
            <th>Ações</th>
        `;
    } else {
        headersRow.innerHTML = `
            <th>Data / Hora</th>
            <th>Paciente</th>
            <th>Status</th>
            <th>Link de Vídeo</th>
            <th>Ações</th>
        `;
    }

    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted);">Carregando consultas...</td></tr>';

    try {
        const res = await fetch(`${API_URL}/admin/appointments`, {
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        if (!res.ok) throw new Error('Não foi possível carregar as consultas.');
        
        const appointments = await res.json();
        tbody.innerHTML = '';

        if (appointments.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted);">Nenhuma consulta agendada encontrada.</td></tr>`;
            return;
        }

        appointments.forEach(a => {
            const tr = document.createElement('tr');

            const dateParts = a.appointment_date.split('T')[0].split('-');
            const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
            const startTime = a.start_time.slice(0, 5);
            const endTime = a.end_time.slice(0, 5);
            const dateTimeStr = `${formattedDate} ${startTime} - ${endTime}`;

            let statusBadge = '';
            let actionBtnHtml = '';

            if (a.status === 'scheduled') {
                statusBadge = '<span class="badge-plan premium" style="background-color:rgba(34,197,94,0.15); color:#22c55e;">Agendado</span>';
                actionBtnHtml = `
                    <button class="btn-danger btn-cancel-admin-app" data-app-id="${a.id}" style="font-size:11px; padding: 4px 8px;">
                        Cancelar
                    </button>
                `;
            } else if (a.status === 'cancelled') {
                statusBadge = '<span class="badge-plan trial" style="background-color:rgba(239,68,68,0.15); color:#ef4444;">Cancelado</span>';
                tr.style.opacity = '0.6';
            } else {
                statusBadge = '<span class="badge-plan trial" style="background-color:rgba(255,255,255,0.1); color:var(--color-text-muted);">Concluído</span>';
                tr.style.opacity = '0.7';
            }

            const videoLinkHtml = a.status === 'scheduled' 
                ? `<a href="#" class="btn-start-call" data-video-link="${a.video_link}" style="color:var(--color-primary); font-weight:600; display:flex; align-items:center; gap:4px; text-decoration:none;"><i data-lucide="video" style="width:14px; height:14px;"></i> Iniciar Chamada</a>`
                : '<span style="color:var(--color-text-muted);">—</span>';

            const patientInfo = `<strong>${a.patient_name}</strong><br><small>${a.patient_email}</small>`;
            const professionalRoleLabel = a.professional_role === 'nutritionist' ? 'Nutri' : 'Personal';
            const professionalInfo = `<strong>${a.professional_name}</strong><br><small>${professionalRoleLabel}</small>`;

            if (role === 'admin') {
                tr.innerHTML = `
                    <td>${dateTimeStr}</td>
                    <td>${patientInfo}</td>
                    <td>${professionalInfo}</td>
                    <td>${statusBadge}</td>
                    <td>${videoLinkHtml}</td>
                    <td>${actionBtnHtml}</td>
                `;
            } else {
                tr.innerHTML = `
                    <td>${dateTimeStr}</td>
                    <td>${patientInfo}</td>
                    <td>${statusBadge}</td>
                    <td>${videoLinkHtml}</td>
                    <td>${actionBtnHtml}</td>
                `;
            }

            const cancelBtn = tr.querySelector('.btn-cancel-admin-app');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', async () => {
                    if (confirm('Deseja realmente cancelar esta consulta?')) {
                        await cancelAdminAppointment(a.id);
                    }
                });
            }
            const startCallBtn = tr.querySelector('.btn-start-call');
            if (startCallBtn) {
                startCallBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const link = e.currentTarget.getAttribute('data-video-link');
                    startVideoCall(link, {
                        id: a.patient_id,
                        name: a.patient_name,
                        email: a.patient_email
                    });
                });
            }

            tbody.appendChild(tr);
        });

        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-danger);">${err.message}</td></tr>`;
    }
}

export async function cancelAdminAppointment(appointmentId) {
    try {
        const res = await fetch(`${API_URL}/admin/appointments/${appointmentId}/cancel`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${adminState.token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao cancelar consulta.');

        alert('Consulta cancelada com sucesso!');
        await loadAppointmentsData();
    } catch (err) {
        alert(err.message);
    }
}
