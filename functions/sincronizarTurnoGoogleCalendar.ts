import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
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
    if (action === 'delete') {
      console.log('Intentando eliminar evento de Calendar:', { turno_id, gcal_event_id: turno.gcal_event_id });
      
      if (!turno.gcal_event_id) {
        console.log('No hay gcal_event_id, buscando por turno_id...');
        
        // Buscar el evento por turno_id en propiedades extendidas
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
            // Eliminar todos los eventos encontrados con este turno_id
            for (const item of searchData.items) {
              console.log('Eliminando evento encontrado:', item.id);
              const delResp = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${item.id}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                  },
                }
              );
              console.log('Resultado eliminación:', delResp.status);
            }
            return Response.json({ success: true, deleted: true, deleted_count: searchData.items.length });
          }
        }
        
        return Response.json({ success: true, deleted: false, message: 'No se encontró evento en Calendar' });
      }
      
      const deleteResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${turno.gcal_event_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      console.log('Resultado eliminación por gcal_event_id:', deleteResponse.status);

      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        const error = await deleteResponse.text();
        console.error('Error eliminando de Google Calendar:', error);
        return Response.json({ success: false, error }, { status: 500 });
      }

      return Response.json({ success: true, deleted: true });
    }

    // Preparar evento para Google Calendar
    const startDateTime = `${turno.fecha}T${turno.hora_inicio}:00`;
    const endDateTime = `${turno.fecha}T${turno.hora_fin}:00`;
    
    // Calcular minutos antes del FIN para la alerta (duración - 10)
    const minutosAntesDelFin = turno.duracion - 10;

    const evento = {
      summary: `🎾 Cancha ${turno.cancha} - ${turno.cliente}`,
      description: `
Tipo: ${turno.tipo_turno}
${turno.profesor ? `Profesor: ${turno.profesor}` : ''}
${turno.modalidad_alquiler ? `Modalidad: ${turno.modalidad_alquiler}` : ''}
Monto: $${turno.monto}
${turno.pagado ? '✅ Pagado' : '⏳ Pendiente de pago'}
${turno.notas ? `Notas: ${turno.notas}` : ''}

🔔 Alerta: 10 minutos antes del fin (${turno.hora_inicio} - ${turno.hora_fin})
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
      attendees: turno.empleados_asignados_emails?.map(email => ({ 
        email,
        responseStatus: 'accepted',
      })) || [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: minutosAntesDelFin },
        ],
      },
      extendedProperties: {
        private: {
          turno_id: turno_id,
        },
      },
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      guestsCanSeeOtherGuests: true,
    };

    let response;
    let eventIdToUse = turno.gcal_event_id;

    // Buscar si ya existe un evento para este turno_id (evitar duplicados)
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
          // Ya existe un evento para este turno, usar su ID
          eventIdToUse = searchData.items[0].id;
          
          // Eliminar eventos duplicados si hay más de uno
          for (let i = 1; i < searchData.items.length; i++) {
            await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${searchData.items[i].id}`,
              {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                },
              }
            );
          }
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