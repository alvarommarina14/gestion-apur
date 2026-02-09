import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.rol !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Obtener todos los turnos con gcal_event_id
    const turnos = await base44.asServiceRole.entities.TurnoCancha.list();
    const turnosConGcal = turnos.filter(t => t.gcal_event_id);

    console.log(`🗑️ Eliminando ${turnosConGcal.length} eventos de Google Calendar...`);

    let eliminados = 0;
    let errores = 0;

    // Eliminar en paralelo (batches de 10 para no saturar la API)
    for (let i = 0; i < turnosConGcal.length; i += 10) {
      const batch = turnosConGcal.slice(i, i + 10);
      
      await Promise.all(batch.map(async (turno) => {
        try {
          const deleteResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${turno.gcal_event_id}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );

          if (deleteResponse.ok || deleteResponse.status === 404) {
            eliminados++;
            console.log(`✅ Evento ${turno.gcal_event_id} eliminado`);
            
            // Actualizar turno para quitar gcal_event_id
            await base44.asServiceRole.entities.TurnoCancha.update(turno.id, {
              gcal_event_id: null,
              gcal_sync_status: 'pendiente'
            });
          } else {
            errores++;
            console.error(`❌ Error eliminando ${turno.gcal_event_id}: ${deleteResponse.status}`);
          }
        } catch (err) {
          errores++;
          console.error(`❌ Error procesando turno ${turno.id}:`, err.message);
        }
      }));
    }

    console.log(`✅ Proceso completado: ${eliminados} eliminados, ${errores} errores`);

    return Response.json({ 
      success: true,
      eliminados,
      errores,
      total: turnosConGcal.length
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});