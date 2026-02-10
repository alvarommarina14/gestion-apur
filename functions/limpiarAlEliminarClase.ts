import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, payload_too_large } = await req.json();

    // Solo procesar eventos de eliminación
    if (event.type !== 'delete') {
      return Response.json({ message: 'No es un evento de delete, se ignora' });
    }

    const claseId = event.entity_id;

    // Si el payload es muy grande, obtener los datos
    let clase = data;
    if (payload_too_large) {
      clase = await base44.asServiceRole.entities.Clase.read(claseId);
    }

    console.log('Limpiando datos relacionados con clase eliminada:', claseId);

    // 1. Eliminar asistencias asociadas
    try {
      const asistencias = await base44.asServiceRole.entities.Asistencia.filter({
        clase_id: claseId
      });
      
      for (const asistencia of asistencias) {
        await base44.asServiceRole.entities.Asistencia.delete(asistencia.id);
      }
      console.log(`Eliminadas ${asistencias.length} asistencias asociadas`);
    } catch (error) {
      console.error('Error eliminando asistencias:', error);
    }

    // 2. Actualizar recuperos asociados
    try {
      const recuperos = await base44.asServiceRole.entities.Recupero.filter({
        clase_original_id: claseId
      });
      
      for (const recupero of recuperos) {
        await base44.asServiceRole.entities.Recupero.update(recupero.id, {
          clase_original_id: null,
          notas: (recupero.notas || '') + ' [Clase original eliminada]'
        });
      }
      console.log(`Actualizados ${recuperos.length} recuperos asociados`);
    } catch (error) {
      console.error('Error actualizando recuperos:', error);
    }

    // 3. Eliminar turno de cancha asociado si existe
    if (clase?.turno_cancha_id) {
      try {
        const turno = await base44.asServiceRole.entities.TurnoCancha.read(clase.turno_cancha_id);
        if (turno) {
          // Eliminar de Google Calendar
          if (turno.gcal_event_id) {
            try {
              await base44.asServiceRole.functions.invoke('sincronizarTurnoGoogleCalendar', {
                turno_id: turno.id,
                action: 'delete'
              });
            } catch (err) {
              console.error('Error eliminando turno de Google Calendar:', err);
            }
          }
          await base44.asServiceRole.entities.TurnoCancha.delete(turno.id);
          console.log('Eliminado turno de cancha asociado');
        }
      } catch (error) {
        console.error('Error eliminando turno:', error);
      }
    }

    // 4. Eliminar de Google Calendar si tiene evento
    if (clase?.gcal_event_id) {
      try {
        await base44.asServiceRole.functions.invoke('sincronizarClaseGoogleCalendar', {
          clase_id: claseId,
          action: 'delete'
        });
      } catch (error) {
        console.error('Error eliminando clase de Google Calendar:', error);
      }
    }

    // 5. Actualizar contadores del profesor
    if (clase?.profesor_id) {
      try {
        const profesor = await base44.asServiceRole.entities.Profesor.read(clase.profesor_id);
        const totalClases = Math.max(0, (profesor.total_clases || 0) - 1);
        await base44.asServiceRole.entities.Profesor.update(clase.profesor_id, {
          total_clases: totalClases
        });
        console.log('Actualizado contador de clases del profesor');
      } catch (error) {
        console.error('Error actualizando profesor:', error);
      }
    }

    return Response.json({
      success: true,
      message: 'Limpieza completada',
      clase_id: claseId
    });
  } catch (error) {
    console.error('Error en limpieza de clase:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});