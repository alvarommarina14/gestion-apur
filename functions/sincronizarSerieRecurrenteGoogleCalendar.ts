import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { recurringEventId } = body;

    if (!recurringEventId) {
      return Response.json({ error: 'Falta recurringEventId' }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Eliminar el evento recurrente (toda la serie)
    const deleteResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${recurringEventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!deleteResponse.ok) {
      console.error(`❌ Error eliminando serie recurrente: ${deleteResponse.status} ${deleteResponse.statusText}`);
      const errorBody = await deleteResponse.text();
      console.error('Respuesta:', errorBody);
      return Response.json({ 
        error: 'No se pudo eliminar la serie recurrente de Google Calendar',
        details: errorBody 
      }, { status: deleteResponse.status });
    }

    console.log(`✅ Serie recurrente eliminada de Google Calendar: ${recurringEventId}`);

    return Response.json({ 
      success: true, 
      message: 'Serie recurrente eliminada correctamente',
      eventId: recurringEventId
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});