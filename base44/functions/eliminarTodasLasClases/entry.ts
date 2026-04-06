import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Solo admins
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Obtener todas las clases desde hoy
    const hoy = new Date().toISOString().split('T')[0];
    const todasLasClases = await base44.entities.Clase.list();
    
    // Filtrar clases desde hoy en adelante
    const clasesAEliminar = todasLasClases.filter(c => c.fecha >= hoy);

    console.log(`Eliminando ${clasesAEliminar.length} clases...`);

    // Eliminar de Google Calendar y de la BD
    for (const clase of clasesAEliminar) {
      try {
        // Si tiene gcal_event_id, intentar eliminar de Google Calendar
        if (clase.gcal_event_id) {
          try {
            const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');
            await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${clase.gcal_event_id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            });
            console.log(`✅ Eliminado evento de Google Calendar: ${clase.gcal_event_id}`);
          } catch (gcalError) {
            console.error(`⚠️ Error eliminando de Google Calendar:`, gcalError);
          }
        }

        // Eliminar de BD
        await base44.asServiceRole.entities.Clase.delete(clase.id);
        console.log(`✅ Eliminada clase: ${clase.id}`);
      } catch (error) {
        console.error(`❌ Error eliminando clase ${clase.id}:`, error);
      }
    }

    // Eliminar TurnoCancha asociados
    const turnosCancha = await base44.asServiceRole.entities.TurnoCancha.list();
    const turnosAEliminar = turnosCancha.filter(t => t.fecha >= hoy && t.tipo_turno === 'clase');

    for (const turno of turnosAEliminar) {
      try {
        await base44.asServiceRole.entities.TurnoCancha.delete(turno.id);
        console.log(`✅ Eliminado turno de cancha: ${turno.id}`);
      } catch (error) {
        console.error(`❌ Error eliminando turno ${turno.id}:`, error);
      }
    }

    return Response.json({
      success: true,
      mensaje: `Se eliminaron ${clasesAEliminar.length} clases y ${turnosAEliminar.length} turnos de cancha`,
      clasesEliminadas: clasesAEliminar.length,
      turnosEliminados: turnosAEliminar.length
    });
  } catch (error) {
    console.error('Error en eliminarTodasLasClases:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});