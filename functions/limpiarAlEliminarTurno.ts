import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, payload_too_large } = await req.json();

    // Solo procesar eventos de eliminación
    if (event.type !== 'delete') {
      return Response.json({ message: 'No es un evento de delete, se ignora' });
    }

    const turnoId = event.entity_id;

    // Si el payload es muy grande, obtener los datos
    let turno = data;
    if (payload_too_large) {
      turno = await base44.asServiceRole.entities.TurnoCancha.read(turnoId);
    }

    console.log('Limpiando datos relacionados con turno eliminado:', turnoId);

    // 1. Eliminar recordatorios de cancha asociados
    try {
      const recordatorios = await base44.asServiceRole.entities.RecordatorioCancha.filter({
        turno_cancha_id: turnoId
      });
      
      for (const recordatorio of recordatorios) {
        await base44.asServiceRole.entities.RecordatorioCancha.delete(recordatorio.id);
      }
      console.log(`Eliminados ${recordatorios.length} recordatorios asociados`);
    } catch (error) {
      console.error('Error eliminando recordatorios:', error);
    }

    // 2. Eliminar cancelaciones asociadas
    try {
      const cancelaciones = await base44.asServiceRole.entities.CancelacionCancha.filter({
        turno_id: turnoId
      });
      
      for (const cancelacion of cancelaciones) {
        await base44.asServiceRole.entities.CancelacionCancha.delete(cancelacion.id);
      }
      console.log(`Eliminadas ${cancelaciones.length} cancelaciones asociadas`);
    } catch (error) {
      console.error('Error eliminando cancelaciones:', error);
    }

    // 3. Eliminar clase asociada si existe
    if (turno?.tipo_turno === 'clase') {
      try {
        const clases = await base44.asServiceRole.entities.Clase.filter({
          turno_cancha_id: turnoId
        });
        
        for (const clase of clases) {
          // Eliminar de Google Calendar si tiene evento
          if (clase.gcal_event_id) {
            try {
              await base44.asServiceRole.functions.invoke('sincronizarClaseGoogleCalendar', {
                clase_id: clase.id,
                action: 'delete'
              });
            } catch (err) {
              console.error('Error eliminando clase de Google Calendar:', err);
            }
          }
          await base44.asServiceRole.entities.Clase.delete(clase.id);
        }
        console.log(`Eliminadas ${clases.length} clases asociadas`);
      } catch (error) {
        console.error('Error eliminando clases:', error);
      }
    }

    // 4. Eliminar de Google Calendar si tiene evento
    if (turno?.gcal_event_id) {
      try {
        await base44.asServiceRole.functions.invoke('sincronizarTurnoGoogleCalendar', {
          turno_id: turnoId,
          action: 'delete'
        });
      } catch (error) {
        console.error('Error eliminando turno de Google Calendar:', error);
      }
    }

    return Response.json({
      success: true,
      message: 'Limpieza completada',
      turno_id: turnoId
    });
  } catch (error) {
    console.error('Error en limpieza de turno:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});