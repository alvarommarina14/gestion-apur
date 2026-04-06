import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { gcal_event_id } = await req.json();

    if (!gcal_event_id) {
      return Response.json({ error: 'gcal_event_id requerido' }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${gcal_event_id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Error al eliminar evento de Google Calendar:', error);
      return Response.json({ 
        success: false,
        error: 'No se pudo eliminar el evento de Google Calendar'
      }, { status: response.status });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});