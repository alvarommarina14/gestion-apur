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

    // Obtener los primeros 50 turnos
    console.log('📥 Obteniendo los primeros 50 turnos...');
    const turnos = await base44.asServiceRole.entities.TurnoCancha.list('-fecha', 50);
    console.log(`📊 Turnos a eliminar: ${turnos.length}`);

    let eliminados = 0;
    let erroresGcal = 0;

    // Eliminar cada turno
    for (const turno of turnos) {
      try {
        // Eliminar de Google Calendar si existe
        if (turno.gcal_event_id) {
          try {
            await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${turno.gcal_event_id}`,
              {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            console.log(`✅ Evento eliminado: ${turno.gcal_event_id}`);
          } catch (err) {
            console.warn(`⚠️ Error eliminando evento ${turno.gcal_event_id}`);
            erroresGcal++;
          }
        }

        // Eliminar de la base de datos
        await base44.asServiceRole.entities.TurnoCancha.delete(turno.id);
        console.log(`🗑️ Turno eliminado: ${turno.id} (${turno.cliente})`);
        eliminados++;
      } catch (err) {
        console.error(`❌ Error procesando turno ${turno.id}:`, err.message);
      }
    }

    const resultado = {
      totalEliminados: eliminados,
      erroresGoogleCalendar: erroresGcal,
      mensaje: `Se eliminaron ${eliminados} turnos de la base de datos`
    };

    console.log('🎉 Operación completada:', resultado);
    return Response.json(resultado);

  } catch (error) {
    console.error('❌ Error en función:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});