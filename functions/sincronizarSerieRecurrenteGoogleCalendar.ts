import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { recurringEventId } = await req.json();
    
    if (!recurringEventId) {
      return Response.json({ error: 'recurringEventId requerido' }, { status: 400 });
    }

    // ID del calendario compartido
    const CALENDAR_ID = 'f6f2dcd149e0fee6eb7056b8fef6bdb7e8c8f09324a222f1427adc59c40c3400@group.calendar.google.com';
    
    // Obtener access token de Google Calendar
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Eliminar la serie recurrente completa desde Google Calendar
    const deleteResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(recurringEventId)}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (deleteResponse.ok || deleteResponse.status === 404) {
      console.log(`✅ Serie recurrente ${recurringEventId} eliminada de Google Calendar`);
      return Response.json({ 
        success: true, 
        message: 'Serie recurrente eliminada correctamente'
      });
    } else {
      const errorText = await deleteResponse.text();
      console.error(`❌ Error eliminando serie recurrente:`, errorText);
      return Response.json({ 
        error: `Error al eliminar serie: ${errorText}`,
        success: false
      }, { status: deleteResponse.status });
    }

  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});