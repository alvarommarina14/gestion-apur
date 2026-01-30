import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { turno_id } = await req.json();
    
    if (!turno_id) {
      return Response.json({ error: 'turno_id requerido' }, { status: 400 });
    }

    // Obtener el turno
    const turnos = await base44.asServiceRole.entities.TurnoCancha.filter({ id: turno_id });
    const turno = turnos[0];

    if (!turno) {
      return Response.json({ error: 'Turno no encontrado' }, { status: 404 });
    }

    // ID del calendario compartido
    const CALENDAR_ID = 'f6f2dcd149e0fee6eb7056b8fef6bdb7e8c8f09324a222f1427adc59c40c3400@group.calendar.google.com';
    
    // Obtener access token de Google Calendar
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Preparar evento para Google Calendar
    const [horaInicio, minInicio] = turno.hora_inicio.split(':');
    const [horaFin, minFin] = turno.hora_fin.split(':');
    
    // Argentina está GMT-3, crear fecha correctamente
    const fechaParts = turno.fecha.split('-');
    const year = parseInt(fechaParts[0]);
    const month = parseInt(fechaParts[1]) - 1; // Mes en JS es 0-indexed
    const day = parseInt(fechaParts[2]);
    
    const startDateTime = new Date(year, month, day, parseInt(horaInicio), parseInt(minInicio), 0);
    const endDateTime = new Date(year, month, day, parseInt(horaFin), parseInt(minFin), 0);

    // Notificación 10 minutos antes del INICIO del turno
    const minutosParaNotificar = 10;

    const evento = {
      summary: `🎾 Cancha ${turno.cancha} - ${turno.cliente}`,
      description: `
Tipo: ${turno.tipo_turno}
${turno.profesor ? `Profesor: ${turno.profesor}` : ''}
${turno.modalidad_alquiler ? `Modalidad: ${turno.modalidad_alquiler}` : ''}
Monto: $${turno.monto}
${turno.pagado ? '✅ Pagado' : '⏳ Pendiente de pago'}
${turno.notas ? `Notas: ${turno.notas}` : ''}

🔔 Recordatorio: 10 minutos antes del inicio
      `.trim(),
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      location: `Cancha ${turno.cancha}`,
      attendees: turno.empleados_asignados_emails?.map(email => ({ 
        email,
        responseStatus: 'accepted', // Auto-aceptar para que aparezca directamente
      })) || [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 }, // 10 min antes del inicio
        ],
      },
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      guestsCanSeeOtherGuests: true,
    };

    let response;
    
    if (turno.gcal_event_id) {
      // Actualizar evento existente
      response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${turno.gcal_event_id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(evento),
        }
      );
    } else {
      // Crear nuevo evento
      response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(evento),
        }
      );
    }

    if (!response.ok) {
      const error = await response.text();
      console.error('Error de Google Calendar:', error);
      
      // Marcar como error
      await base44.asServiceRole.entities.TurnoCancha.update(turno.id, {
        make_sync_status: 'error',
        make_error_msg: error,
        make_last_sync_at: new Date().toISOString(),
      });

      return Response.json({ error: 'Error al sincronizar con Google Calendar', details: error }, { status: 500 });
    }

    const eventoCreado = await response.json();

    // Actualizar turno con ID del evento
    await base44.asServiceRole.entities.TurnoCancha.update(turno.id, {
      gcal_event_id: eventoCreado.id,
      make_sync_status: 'sincronizado',
      make_last_sync_at: new Date().toISOString(),
      make_error_msg: null,
    });

    return Response.json({
      success: true,
      event_id: eventoCreado.id,
      event_link: eventoCreado.htmlLink,
    });

  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});