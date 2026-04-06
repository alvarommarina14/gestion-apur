import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { event_id, recurringEventId } = await req.json();
    
    if (!event_id && !recurringEventId) {
      return Response.json({ error: 'No event_id or recurringEventId provided' }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');
    const calendarId = 'primary';

    // Si es un evento recurrente, borramos toda la serie
    if (recurringEventId) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${recurringEventId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          const errorData = await response.text();
          console.error('Error deleting recurring event:', errorData);
          return Response.json({ error: `Failed to delete recurring event: ${errorData}` }, { status: 500 });
        }

        console.log(`✅ Deleted recurring event series: ${recurringEventId}`);
        return Response.json({ success: true, message: `Deleted recurring event series: ${recurringEventId}` });
      } catch (err) {
        console.error('Error deleting recurring event:', err);
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // Si es un evento individual, lo borramos
    if (event_id) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${event_id}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          const errorData = await response.text();
          console.error('Error deleting event:', errorData);
          return Response.json({ error: `Failed to delete event: ${errorData}` }, { status: 500 });
        }

        console.log(`✅ Deleted event: ${event_id}`);
        return Response.json({ success: true, message: `Deleted event: ${event_id}` });
      } catch (err) {
        console.error('Error deleting event:', err);
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

  } catch (error) {
    console.error('Function error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});