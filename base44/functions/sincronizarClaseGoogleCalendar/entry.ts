import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { clase_id, action } = await req.json();
    
    if (!clase_id) {
      return Response.json({ error: 'clase_id requerido' }, { status: 400 });
    }

    // Obtener la clase
    const clases = await base44.asServiceRole.entities.Clase.filter({ id: clase_id });
    const clase = clases[0];

    if (!clase) {
      return Response.json({ error: 'Clase no encontrada' }, { status: 404 });
    }

    // ID del calendario compartido
    const CALENDAR_ID = 'f6f2dcd149e0fee6eb7056b8fef6bdb7e8c8f09324a222f1427adc59c40c3400@group.calendar.google.com';
    
    // Obtener access token de Google Calendar
    const accessToken = await base44.connectors.getAccessToken('googlecalendar');
    console.log('✅ Access token obtenido, Calendar ID:', CALENDAR_ID);

    // Si la acción es eliminar
    if (action === 'delete') {
      let eventIdToDelete = clase.gcal_event_id;

      // Si no tiene event_id, buscar por clase_id en propiedades extendidas
      if (!eventIdToDelete) {
        const searchResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?privateExtendedProperty=clase_id=${clase_id}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.items && searchData.items.length > 0) {
            eventIdToDelete = searchData.items[0].id;
          }
        }
      }

      // Eliminar evento si lo encontramos
      if (eventIdToDelete) {
        const deleteResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${eventIdToDelete}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!deleteResponse.ok && deleteResponse.status !== 404) {
          const error = await deleteResponse.text();
          console.error('Error eliminando de Google Calendar:', error);
        }
      }

      return Response.json({ success: true, deleted: true });
    }

    // Obtener profesor para incluir en descripción
    let profesorNombre = '';
    if (clase.profesor_id) {
      const profesores = await base44.asServiceRole.entities.Profesor.filter({ id: clase.profesor_id });
      if (profesores.length > 0) {
        profesorNombre = profesores[0].nombre;
      }
    }

    // Calcular hora de fin
    const [horaInicio, minutoInicio] = clase.hora_inicio.split(':').map(Number);
    const horaFin = new Date(0, 0, 0, horaInicio, minutoInicio + clase.duracion);
    const horaFinStr = `${String(horaFin.getHours()).padStart(2, '0')}:${String(horaFin.getMinutes()).padStart(2, '0')}`;

    // Preparar evento para Google Calendar
    const startDateTime = `${clase.fecha}T${clase.hora_inicio}:00-03:00`;
    const endDateTime = `${clase.fecha}T${horaFinStr}:00-03:00`;

    const alumnosText = clase.alumnos_nombres?.length > 0 
      ? `Alumnos: ${clase.alumnos_nombres.join(', ')}`
      : 'Sin alumnos asignados';

    // Construir RRULE si es recurrente
    let recurrencia = null;
    if (clase.es_recurrente && clase.dias_semana && clase.dias_semana.length > 0) {
      const daysMap = {
        'lunes': 'MO',
        'martes': 'TU',
        'miércoles': 'WE',
        'miercoles': 'WE',
        'jueves': 'TH',
        'viernes': 'FR',
        'sábado': 'SA',
        'sabado': 'SA',
        'domingo': 'SU',
      };
      
      const byDay = clase.dias_semana
        .map(dia => daysMap[dia.toLowerCase()])
        .filter(Boolean);
      
      if (byDay.length > 0) {
        const freq = clase.recurrencia_tipo === 'quincenal' ? 'WEEKLY' : 'WEEKLY';
        const interval = clase.recurrencia_tipo === 'quincenal' ? 2 : 1;
        const until = clase.recurrencia_hasta ? clase.recurrencia_hasta.replace(/-/g, '') : null;
        
        let rrule = `FREQ=${freq};INTERVAL=${interval};BYDAY=${byDay.join(',')}`;
        if (until) {
          rrule += `;UNTIL=${until}`;
        }
        recurrencia = [rrule];
      }
    }

    const evento = {
      summary: `📚 ${clase.tipo === 'individual' ? 'Clase Individual' : 'Clase Grupal'} - ${profesorNombre}`,
      description: `
Profesor: ${profesorNombre}
Tipo: ${clase.tipo === 'individual' ? 'Individual' : 'Grupal'}
Duración: ${clase.duracion} minutos
${clase.cancha ? `Cancha: ${clase.cancha}` : ''}
${alumnosText}
${clase.precio ? `Precio: $${clase.precio}` : ''}
${clase.notas ? `Notas: ${clase.notas}` : ''}
      `.trim(),
      start: {
        dateTime: startDateTime,
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      ...(recurrencia && { recurrence: recurrencia }),
      ...(clase.cancha && { location: `Cancha ${clase.cancha}` }),
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 15 },
        ],
      },
      extendedProperties: {
        private: {
          clase_id: clase_id,
        },
      },
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      guestsCanSeeOtherGuests: true,
    };

    let response;
    let eventIdToUse = clase.gcal_event_id;

    // Buscar si ya existe un evento para esta clase (evitar duplicados)
    if (!eventIdToUse) {
      const searchResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?privateExtendedProperty=clase_id=${clase_id}`,
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
      console.error('❌ Error de Google Calendar:', error);
      console.error('Status:', response.status);
      console.error('Evento enviado:', JSON.stringify(evento));
      
      // Marcar como error
      await base44.asServiceRole.entities.Clase.update(clase.id, {
        gcal_sync_status: 'error',
        gcal_error_msg: error,
      });

      return Response.json({ error: 'Error al sincronizar con Google Calendar', details: error }, { status: 500 });
    }

    const eventoCreado = await response.json();
    console.log('✅ Evento creado en Google Calendar:', eventoCreado.id);

    // Actualizar clase con ID del evento
    await base44.asServiceRole.entities.Clase.update(clase.id, {
      gcal_event_id: eventoCreado.id,
      gcal_sync_status: 'sincronizado',
      gcal_error_msg: null,
    });
    console.log('✅ Clase actualizada con event_id:', eventoCreado.id);

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