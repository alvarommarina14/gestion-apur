import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const CALENDAR_ID = 'f6f2dcd149e0fee6eb7056b8fef6bdb7e8c8f09324a222f1427adc59c40c3400@group.calendar.google.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Solo admins pueden limpiar el calendario
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Obtener token de Google Calendar
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // 1. Listar TODOS los eventos de Google Calendar
    let allEvents = [];
    let pageToken = null;

    console.log('📅 Listando eventos de Google Calendar...');

    do {
      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`);
      url.searchParams.set('maxResults', '250');
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error listing events:', response.status, errorText);
        return Response.json({ error: 'Error listing calendar events', details: errorText }, { status: 500 });
      }

      const data = await response.json();
      allEvents = allEvents.concat(data.items || []);
      pageToken = data.nextPageToken;
    } while (pageToken);

    console.log(`✅ Total eventos encontrados: ${allEvents.length}`);

    // 2. Obtener todas las clases y turnos de la BD
    const clases = await base44.asServiceRole.entities.Clase.list();
    const turnos = await base44.asServiceRole.entities.TurnoCancha.list();

    console.log(`📊 Clases en BD: ${clases.length}`);
    console.log(`📊 Turnos en BD: ${turnos.length}`);

    // 3. Crear un set de IDs válidos
    const validEventIds = new Set();
    
    // Agregar event IDs de clases
    clases.forEach(clase => {
      if (clase.gcal_event_id) {
        validEventIds.add(clase.gcal_event_id);
      }
    });

    // Agregar event IDs de turnos
    turnos.forEach(turno => {
      if (turno.gcal_event_id) {
        validEventIds.add(turno.gcal_event_id);
      }
    });

    console.log(`✅ IDs válidos en BD: ${validEventIds.size}`);

    // 4. Identificar eventos a eliminar
    const now = new Date();
    
    const eventsToDelete = allEvents.filter(event => {
      // Si está en validEventIds, es válido
      if (validEventIds.has(event.id)) {
        return false;
      }

      // Si tiene extended properties con clase_id o turno_id válidos, es válido
      const claseId = event.extendedProperties?.private?.clase_id;
      const turnoId = event.extendedProperties?.private?.turno_id;
      
      if (claseId) {
        const claseExiste = clases.some(c => c.id === claseId);
        if (claseExiste) return false;
      }
      
      if (turnoId) {
        const turnoExiste = turnos.some(t => t.id === turnoId);
        if (turnoExiste) return false;
      }

      // Si el evento no tiene fecha de inicio o es muy antiguo, eliminar
      if (!event.start?.dateTime) {
        return true;
      }

      const eventDate = new Date(event.start.dateTime);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      if (eventDate < thirtyDaysAgo) {
        return true;
      }

      return true; // Por defecto, si no coincide con nada, eliminar
    });

    console.log(`🗑️  Eventos para eliminar: ${eventsToDelete.length}`);

    // 5. Eliminar eventos huérfanos
    let deletedCount = 0;
    for (const event of eventsToDelete) {
      try {
        const deleteResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${event.id}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (deleteResponse.ok || deleteResponse.status === 404) {
          console.log(`✅ Eliminado: ${event.summary} (${event.id})`);
          deletedCount++;
        } else {
          console.error(`❌ Error eliminando ${event.id}:`, deleteResponse.status);
        }
      } catch (err) {
        console.error(`❌ Error eliminando evento:`, err);
      }
    }

    return Response.json({
      success: true,
      summary: {
        totalEventsInCalendar: allEvents.length,
        classesInDB: clases.length,
        turnosInDB: turnos.length,
        validEventIds: validEventIds.size,
        deletedEvents: deletedCount,
      },
    });
  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});