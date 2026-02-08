import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { turno_id } = await req.json();
    
    if (!turno_id) {
      return Response.json({ error: 'turno_id requerido' }, { status: 400 });
    }

    // Obtener el turno inicial
    const turnos = await base44.asServiceRole.entities.TurnoCancha.filter({ id: turno_id });
    const turnoInicial = turnos[0];

    if (!turnoInicial) {
      return Response.json({ error: 'Turno no encontrado' }, { status: 404 });
    }

    const CALENDAR_ID = 'primary';
    const accessToken = await base44.connectors.getAccessToken('googlecalendar');

    // Calcular hora de fin
    if (!turnoInicial.hora_fin) {
      const [h, m] = turnoInicial.hora_inicio.split(':').map(Number);
      const totalMinutos = h * 60 + m + turnoInicial.duracion;
      const horasFin = Math.floor(totalMinutos / 60);
      const minutosFin = totalMinutos % 60;
      turnoInicial.hora_fin = `${horasFin.toString().padStart(2, '0')}:${minutosFin.toString().padStart(2, '0')}`;
    }

    // Preparar evento con recurrencia semanal
    const startDateTime = `${turnoInicial.fecha}T${turnoInicial.hora_inicio}:00-03:00`;
    const endDateTime = `${turnoInicial.fecha}T${turnoInicial.hora_fin}:00-03:00`;

    const evento = {
      summary: `🏆 Turno de Cancha ${turnoInicial.cancha} - ${turnoInicial.cliente}`,
      description: `
Cliente: ${turnoInicial.cliente}
Cancha: ${turnoInicial.cancha}
Tipo: ${turnoInicial.tipo_turno === 'clase' ? 'Clase' : 'Alquiler'}
Monto: $${turnoInicial.monto}
${turnoInicial.notas ? `Notas: ${turnoInicial.notas}` : ''}
      `.trim(),
      start: {
        dateTime: startDateTime,
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      recurrence: ['RRULE:FREQ=WEEKLY;COUNT=52'],
      location: `Cancha ${turnoInicial.cancha}`,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 15 },
        ],
      },
      extendedProperties: {
        private: {
          turno_id: turno_id,
          es_recurrente: 'true',
        },
      },
    };

    const response = await fetch(
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Google Calendar:', response.status, errorText);
      return Response.json({ error: 'Error al sincronizar con Google Calendar', details: errorText }, { status: 500 });
    }

    const eventoCreado = await response.json();
    console.log('✅ Evento recurrente creado en Google Calendar:', eventoCreado.id);

    // Actualizar el turno inicial con el event_id
    await base44.asServiceRole.entities.TurnoCancha.update(turno_id, {
      gcal_event_id: eventoCreado.id,
      make_sync_status: 'sincronizado',
    });

    return Response.json({
      success: true,
      event_id: eventoCreado.id,
      mensaje: 'Evento recurrente sincronizado con Google Calendar'
    });

  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});