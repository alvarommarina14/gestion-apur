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

    // Obtener todos los turnos
    console.log('📥 Obteniendo todos los turnos...');
    const todosTurnos = await base44.asServiceRole.entities.TurnoCancha.list('-fecha', 10000);
    console.log(`📊 Total de turnos encontrados: ${todosTurnos.length}`);

    let eliminadosGCal = 0;
    let eliminadosBD = 0;
    let errores = 0;

    // Eliminar cada turno
    for (const turno of todosTurnos) {
      try {
        // Eliminar de Google Calendar si tiene event_id
        if (turno.gcal_event_id) {
          try {
            const response = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${turno.gcal_event_id}`,
              {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            if (response.ok || response.status === 404) {
              console.log(`✅ Evento GCal eliminado: ${turno.gcal_event_id}`);
              eliminadosGCal++;
            } else {
              console.warn(`⚠️ No se pudo eliminar evento GCal ${turno.gcal_event_id}: ${response.status}`);
            }
          } catch (err) {
            console.error(`❌ Error al eliminar evento GCal ${turno.gcal_event_id}:`, err.message);
          }
        }

        // Eliminar de la base de datos
        await base44.asServiceRole.entities.TurnoCancha.delete(turno.id);
        console.log(`✅ Turno BD eliminado: ${turno.id}`);
        eliminadosBD++;

      } catch (err) {
        console.error(`❌ Error procesando turno ${turno.id}:`, err.message);
        errores++;
      }
    }

    const resultado = {
      total: todosTurnos.length,
      eliminadosGoogleCalendar: eliminadosGCal,
      eliminadosBD: eliminadosBD,
      errores: errores,
      mensaje: `Se eliminaron ${eliminadosBD} turnos de la BD y ${eliminadosGCal} eventos de Google Calendar`
    };

    console.log('🎉 Operación completada:', resultado);
    return Response.json(resultado);

  } catch (error) {
    console.error('❌ Error en función:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});