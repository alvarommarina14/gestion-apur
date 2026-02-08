import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    // ID del calendario compartido
    const CALENDAR_ID = 'f6f2dcd149e0fee6eb7056b8fef6bdb7e8c8f09324a222f1427adc59c40c3400@group.calendar.google.com';
    
    // Obtener access token de Google Calendar
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Listar todos los eventos del calendario
    const listResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?maxResults=2500`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!listResponse.ok) {
      const error = await listResponse.text();
      return Response.json({ error: 'Error listando eventos', details: error }, { status: 500 });
    }

    const eventsData = await listResponse.json();
    const events = eventsData.items || [];

    console.log(`Encontrados ${events.length} eventos para eliminar`);

    // Eliminar cada evento
    let deleted = 0;
    let errors = 0;

    for (const event of events) {
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
          deleted++;
        } else {
          errors++;
          console.error(`Error eliminando evento ${event.id}:`, await deleteResponse.text());
        }
      } catch (err) {
        errors++;
        console.error(`Error eliminando evento ${event.id}:`, err.message);
      }
    }

    return Response.json({
      success: true,
      total: events.length,
      deleted,
      errors,
      message: `Eliminados ${deleted} eventos de ${events.length} encontrados (${errors} errores)`
    });

  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});