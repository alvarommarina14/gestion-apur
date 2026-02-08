import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { turno_id, action } = await req.json();
    
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

    // Si la acción es eliminar
    if (action === 'delete' && turno.gcal_event_id) {
      const deleteResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${turno.gcal_event_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        console.error('Error eliminando turno de Google Calendar');
      }

      return Response.json({ success: true, deleted: true });
    }

    // Calcular hora de fin
    if (!turno.hora_fin) {
      const [h, m] = turno.hora_inicio.split(':').map(Number);
      const totalMinutos = h * 60 + m + turno.duracion;
      const horasFin = Math.floor(totalMinutos / 60);
      const minutosFin = totalMinutos % 60;
      turno.hora_fin = `${horasFin.toString().padStart(2, '0')}:${minutosFin.toString().padStart(2, '0')}`;
    }

    // Preparar evento para Google Calendar
    const startDateTime = `${turno.fecha}T${turno.hora_inicio}:00-03:00`;
    const endDateTime = `${turno.fecha}T${turno.hora_fin}:00-03:00`;

    const evento = {
      summary: `🏆 Turno de Cancha ${turno.cancha} - ${turno.cliente}`,
      description: `
Cliente: ${turno.cliente}
Cancha: ${turno.cancha}
Tipo: ${turno.tipo_turno === 'clase' ? 'Clase' : 'Alquiler'}
Monto: $${turno.monto}
${turno.notas ? `Notas: ${turno.notas}` : ''}
      `.trim(),
      start: {
        dateTime: startDateTime,
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      location: `Cancha ${turno.cancha}`,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 15 },
        ],
      },
      extendedProperties: {
        private: {
          turno_id: turno_id,
        },
      },
    };

    let response;
    let eventIdToUse = turno.gcal_event_id;

    // Buscar si ya existe un evento para este turno
    if (!eventIdToUse) {
      const searchResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?privateExtendedProperty=turno_id=${turno_id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.items && searchData.items.length > 0) {
          eventIdToUse = searchData.items[0].id;
        }
      }
    }
    
    if (eventIdToUse) {
      // Actualizar evento existente
      response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${eventIdToUse}`,
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
      console.error('Error de Google Calendar:', response.status);
      return Response.json({ error: 'Error al sincronizar con Google Calendar' }, { status: 500 });
    }

    const eventoCreado = await response.json();

    // Actualizar turno con ID del evento
    await base44.asServiceRole.entities.TurnoCancha.update(turno.id, {
      gcal_event_id: eventoCreado.id,
      make_sync_status: 'sincronizado',
    });

    return Response.json({
      success: true,
      event_id: eventoCreado.id,
    });

  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});