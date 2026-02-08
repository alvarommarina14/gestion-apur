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

    // Obtener todos los turnos de cancha
    console.log('📥 Obteniendo todos los turnos de cancha...');
    const turnos = await base44.asServiceRole.entities.TurnoCancha.list();
    console.log(`📊 Total de turnos encontrados: ${turnos.length}`);

    let eliminados = 0;
    let errores = 0;

    // Eliminar cada turno de Google Calendar
    for (const turno of turnos) {
      try {
        if (!turno.gcal_event_id) {
          console.log(`⏭️ Turno sin event_id: ${turno.cliente} - ${turno.fecha}`);
          continue;
        }

        console.log(`🗑️ Eliminando evento: ${turno.gcal_event_id} (${turno.cliente})`);
        
        const deleteResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${turno.gcal_event_id}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (deleteResponse.ok) {
          console.log(`✅ Evento eliminado: ${turno.gcal_event_id}`);
          eliminados++;
          
          // Actualizar el turno en la BD para limpiar el event_id
          await base44.asServiceRole.entities.TurnoCancha.update(turno.id, {
            gcal_event_id: null,
            make_sync_status: 'pendiente'
          });
        } else {
          console.warn(`⚠️ Error eliminando evento ${turno.gcal_event_id}: ${deleteResponse.status}`);
          errores++;
        }
      } catch (err) {
        console.error(`❌ Error procesando turno ${turno.id}:`, err.message);
        errores++;
      }
    }

    const resultado = {
      totalTurnos: turnos.length,
      eliminados: eliminados,
      errores: errores,
      mensaje: `Se eliminaron ${eliminados} eventos de Google Calendar de ${turnos.length} turnos`
    };

    console.log('🎉 Operación completada:', resultado);
    return Response.json(resultado);

  } catch (error) {
    console.error('❌ Error en función:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});