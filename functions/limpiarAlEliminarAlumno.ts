import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, payload_too_large } = await req.json();

    // Solo procesar eventos de eliminación
    if (event.type !== 'delete') {
      return Response.json({ message: 'No es un evento de delete, se ignora' });
    }

    const alumnoId = event.entity_id;

    // Si el payload es muy grande, obtener los datos
    let alumno = data;
    if (payload_too_large) {
      alumno = await base44.asServiceRole.entities.Alumno.read(alumnoId);
    }

    console.log('Limpiando datos relacionados con alumno eliminado:', alumnoId);

    // 1. Eliminar pagos del alumno
    try {
      const pagos = await base44.asServiceRole.entities.Pago.filter({
        alumno_id: alumnoId
      });
      
      for (const pago of pagos) {
        await base44.asServiceRole.entities.Pago.delete(pago.id);
      }
      console.log(`Eliminados ${pagos.length} pagos asociados`);
    } catch (error) {
      console.error('Error eliminando pagos:', error);
    }

    // 2. Eliminar asistencias del alumno
    try {
      const asistencias = await base44.asServiceRole.entities.Asistencia.filter({
        alumno_id: alumnoId
      });
      
      for (const asistencia of asistencias) {
        await base44.asServiceRole.entities.Asistencia.delete(asistencia.id);
      }
      console.log(`Eliminadas ${asistencias.length} asistencias asociadas`);
    } catch (error) {
      console.error('Error eliminando asistencias:', error);
    }

    // 3. Eliminar recuperos del alumno
    try {
      const recuperos = await base44.asServiceRole.entities.Recupero.filter({
        alumno_id: alumnoId
      });
      
      for (const recupero of recuperos) {
        await base44.asServiceRole.entities.Recupero.delete(recupero.id);
      }
      console.log(`Eliminados ${recuperos.length} recuperos asociados`);
    } catch (error) {
      console.error('Error eliminando recuperos:', error);
    }

    // 4. Eliminar recordatorios del alumno
    try {
      const recordatorios = await base44.asServiceRole.entities.Recordatorio.filter({
        alumno_id: alumnoId
      });
      
      for (const recordatorio of recordatorios) {
        await base44.asServiceRole.entities.Recordatorio.delete(recordatorio.id);
      }
      console.log(`Eliminados ${recordatorios.length} recordatorios asociados`);
    } catch (error) {
      console.error('Error eliminando recordatorios:', error);
    }

    // 5. Eliminar o actualizar clases donde el alumno está asignado
    try {
      const todasClases = await base44.asServiceRole.entities.Clase.list();
      const clasesConAlumno = todasClases.filter(c => 
        c.alumnos_ids && c.alumnos_ids.includes(alumnoId)
      );
      
      for (const clase of clasesConAlumno) {
        const nuevosAlumnosIds = clase.alumnos_ids.filter(id => id !== alumnoId);
        const nuevosAlumnosNombres = clase.alumnos_nombres?.filter((_, idx) => 
          clase.alumnos_ids[idx] !== alumnoId
        ) || [];
        
        if (nuevosAlumnosIds.length === 0) {
          // Si no quedan alumnos, eliminar la clase
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
        } else {
          // Actualizar la clase sin este alumno
          await base44.asServiceRole.entities.Clase.update(clase.id, {
            alumnos_ids: nuevosAlumnosIds,
            alumnos_nombres: nuevosAlumnosNombres
          });
        }
      }
      console.log(`Actualizadas/eliminadas ${clasesConAlumno.length} clases asociadas`);
    } catch (error) {
      console.error('Error actualizando clases:', error);
    }

    // 6. Actualizar contadores del profesor
    if (alumno?.profesor_id) {
      try {
        const profesor = await base44.asServiceRole.entities.Profesor.read(alumno.profesor_id);
        const totalAlumnos = Math.max(0, (profesor.total_alumnos || 0) - 1);
        await base44.asServiceRole.entities.Profesor.update(alumno.profesor_id, {
          total_alumnos: totalAlumnos
        });
        console.log('Actualizado contador de alumnos del profesor');
      } catch (error) {
        console.error('Error actualizando profesor:', error);
      }
    }

    // 7. Eliminar cliente sincronizado si existe
    if (alumno?.es_alumno) {
      try {
        const clientes = await base44.asServiceRole.entities.Cliente.filter({
          nombre: alumno.nombre,
          telefono: alumno.whatsapp
        });
        
        for (const cliente of clientes) {
          await base44.asServiceRole.entities.Cliente.delete(cliente.id);
        }
        console.log(`Eliminados ${clientes.length} clientes sincronizados`);
      } catch (error) {
        console.error('Error eliminando clientes:', error);
      }
    }

    return Response.json({
      success: true,
      message: 'Limpieza completada',
      alumno_id: alumnoId
    });
  } catch (error) {
    console.error('Error en limpieza de alumno:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});