import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { clase_id, serie_recurrente_id, alumnos_ids, hora_inicio, fecha_desde } = await req.json();
    
    if (!clase_id) {
      return Response.json({ error: 'clase_id requerido' }, { status: 400 });
    }

    // ID del calendario compartido
    const CALENDAR_ID = 'f6f2dcd149e0fee6eb7056b8fef6bdb7e8c8f09324a222f1427adc59c40c3400@group.calendar.google.com';
    
    // Obtener access token de Google Calendar
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Obtener todas las clases para identificar las de la serie
    const todasClases = await base44.asServiceRole.entities.Clase.list('-fecha', 500);
    
    // Determinar qué clases deben eliminarse
    let clasesAEliminar = [];
    
    if (serie_recurrente_id) {
      // Buscar por serie_recurrente_id
      clasesAEliminar = todasClases.filter(c => 
        c.serie_recurrente_id === serie_recurrente_id &&
        new Date(c.fecha) >= new Date(fecha_desde)
      );
    } else {
      // Fallback: buscar por patrones coincidentes (mismo día semana, hora, alumnos)
      clasesAEliminar = todasClases.filter(c =>
        c.alumnos_ids && alumnos_ids &&
        JSON.stringify(c.alumnos_ids.sort()) === JSON.stringify(alumnos_ids.sort()) &&
        c.hora_inicio === hora_inicio &&
        new Date(c.fecha).getDay() === new Date(fecha_desde).getDay() &&
        new Date(c.fecha) >= new Date(fecha_desde)
      );
    }

    console.log(`🗑️  Eliminando ${clasesAEliminar.length} clases de Google Calendar...`);

    // Eliminar cada evento de Google Calendar
    const resultados = await Promise.allSettled(
      clasesAEliminar.map(async clase => {
        if (!clase.gcal_event_id) {
          console.log(`⚠️  Clase ${clase.id} no tiene gcal_event_id, buscando...`);
          
          // Intentar buscar por clase_id en propiedades extendidas
          const searchResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?privateExtendedProperty=clase_id=${clase.id}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.items && searchData.items.length > 0) {
              const eventId = searchData.items[0].id;
              
              const deleteResponse = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${eventId}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                  },
                }
              );

              if (deleteResponse.ok || deleteResponse.status === 404) {
                console.log(`✅ Evento de Google Calendar eliminado para clase ${clase.id}`);
              } else {
                console.error(`❌ Error eliminando evento para clase ${clase.id}:`, await deleteResponse.text());
              }

              // Eliminar duplicados si existen
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
        } else {
          // Eliminar usando gcal_event_id directamente
          const deleteResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${clase.gcal_event_id}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );

          if (deleteResponse.ok || deleteResponse.status === 404) {
            console.log(`✅ Evento ${clase.gcal_event_id} eliminado para clase ${clase.id}`);
          } else {
            console.error(`❌ Error eliminando evento ${clase.gcal_event_id}:`, await deleteResponse.text());
          }
        }
      })
    );

    const exitosos = resultados.filter(r => r.status === 'fulfilled').length;
    console.log(`✅ Se eliminaron ${exitosos} eventos de Google Calendar`);

    return Response.json({ 
      success: true, 
      eventos_eliminados: exitosos,
      clases_totales: clasesAEliminar.length
    });

  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});