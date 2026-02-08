import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');
    const calendarId = 'primary';

    // Obtener todos los eventos del calendario (futuros)
    const now = new Date().toISOString();
    console.log('📥 Obteniendo todos los eventos del calendario...');

    const listResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${now}&maxResults=2500`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!listResponse.ok) {
      const error = await listResponse.text();
      return Response.json({ error: `Failed to list events: ${error}` }, { status: 500 });
    }

    const data = await listResponse.json();
    const eventos = data.items || [];
    console.log(`📊 Total de eventos encontrados: ${eventos.length}`);

    let eliminados = 0;
    let errores = 0;

    // Eliminar cada evento
    for (const evento of eventos) {
      try {
        const deleteResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${evento.id}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (deleteResponse.ok) {
          console.log(`✅ Evento eliminado: ${evento.summary} (${evento.id})`);
          eliminados++;
        } else {
          console.warn(`⚠️ Error eliminando evento ${evento.id}: ${deleteResponse.status}`);
          errores++;
        }
      } catch (err) {
        console.error(`❌ Error procesando evento:`, err.message);
        errores++;
      }
    }

    const resultado = {
      total: eventos.length,
      eliminados: eliminados,
      errores: errores,
      mensaje: `Se eliminaron ${eliminados} eventos del calendario`
    };

    console.log('🎉 Operación completada:', resultado);
    return Response.json(resultado);

  } catch (error) {
    console.error('❌ Error en función:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});