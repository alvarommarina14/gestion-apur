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

    // Obtener TODOS los eventos del calendario (pasados y futuros)
    console.log('📥 Obteniendo todos los eventos del calendario...');
    
    // Rango de fechas muy amplio para capturar todo
    const hace5Años = new Date();
    hace5Años.setFullYear(hace5Años.getFullYear() - 5);
    const en5Años = new Date();
    en5Años.setFullYear(en5Años.getFullYear() + 5);

    const listResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?` +
      `timeMin=${hace5Años.toISOString()}&` +
      `timeMax=${en5Años.toISOString()}&` +
      `maxResults=2500&` +
      `showDeleted=false`,
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
    let eventos = data.items || [];
    console.log(`📊 Total de eventos encontrados: ${eventos.length}`);
    
    // Si hay más resultados, obtener la siguiente página
    let nextPageToken = data.nextPageToken;
    while (nextPageToken) {
      console.log('📄 Obteniendo página siguiente...');
      const nextResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?` +
        `timeMin=${hace5Años.toISOString()}&` +
        `timeMax=${en5Años.toISOString()}&` +
        `maxResults=2500&` +
        `pageToken=${nextPageToken}&` +
        `showDeleted=false`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!nextResponse.ok) break;
      
      const nextData = await nextResponse.json();
      eventos = [...eventos, ...(nextData.items || [])];
      nextPageToken = nextData.nextPageToken;
      console.log(`📊 Total acumulado: ${eventos.length}`);
    }
    
    console.log(`📊 Total FINAL de eventos a eliminar: ${eventos.length}`);

    let eliminados = 0;
    let errores = 0;
    let totalRecurrentes = 0;

    // Eliminar solo eventos con recurrencia semanal
    for (const evento of eventos) {
      try {
        // Verificar si tiene recurrencia semanal
        const tieneRecurrenciaSemanal = evento.recurrence && 
          evento.recurrence.some(rule => rule.includes('FREQ=WEEKLY'));
        
        if (tieneRecurrenciaSemanal) {
          totalRecurrentes++;
          console.log(`🔄 Evento recurrente encontrado: ${evento.summary} (${evento.id})`);
          
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
            console.log(`✅ Evento recurrente eliminado: ${evento.summary} (${evento.id})`);
            eliminados++;
          } else {
            console.warn(`⚠️ Error eliminando evento ${evento.id}: ${deleteResponse.status}`);
            errores++;
          }
        }
      } catch (err) {
        console.error(`❌ Error procesando evento:`, err.message);
        errores++;
      }
    }
    
    console.log(`📊 Total de eventos recurrentes encontrados: ${totalRecurrentes}`);

    const resultado = {
      total: eventos.length,
      recurrentesSemanal: totalRecurrentes,
      eliminados: eliminados,
      errores: errores,
      mensaje: `Se encontraron ${totalRecurrentes} eventos recurrentes semanales y se eliminaron ${eliminados}`
    };

    console.log('🎉 Operación completada:', resultado);
    return Response.json(resultado);

  } catch (error) {
    console.error('❌ Error en función:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});