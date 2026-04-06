import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, payload_too_large } = await req.json();

    // Solo procesar eventos de eliminación
    if (event.type !== 'delete') {
      return Response.json({ message: 'No es un evento de delete, se ignora' });
    }

    const clienteId = event.entity_id;

    // Si el payload es muy grande, obtener los datos
    let cliente = data;
    if (payload_too_large) {
      cliente = await base44.asServiceRole.entities.Cliente.read(clienteId);
    }

    console.log('Limpiando datos relacionados con cliente eliminado:', clienteId);

    // 1. Eliminar cobros del cliente
    try {
      const cobros = await base44.asServiceRole.entities.CobroCliente.filter({
        cliente_id: clienteId
      });
      
      for (const cobro of cobros) {
        await base44.asServiceRole.entities.CobroCliente.delete(cobro.id);
      }
      console.log(`Eliminados ${cobros.length} cobros asociados`);
    } catch (error) {
      console.error('Error eliminando cobros:', error);
    }

    // 2. Eliminar turnos de cancha del cliente
    try {
      const turnos = await base44.asServiceRole.entities.TurnoCancha.filter({
        cliente: cliente?.nombre
      });
      
      for (const turno of turnos) {
        // Eliminar de Google Calendar si tiene evento
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
      }
      console.log(`Eliminados ${turnos.length} turnos de cancha asociados`);
    } catch (error) {
      console.error('Error eliminando turnos:', error);
    }

    // 3. Si es alumno sincronizado, eliminar el alumno también
    if (cliente?.es_alumno && cliente?.profesor_id) {
      try {
        const alumnos = await base44.asServiceRole.entities.Alumno.filter({
          nombre: cliente.nombre,
          whatsapp: cliente.telefono
        });
        
        for (const alumno of alumnos) {
          await base44.asServiceRole.entities.Alumno.delete(alumno.id);
        }
        console.log(`Eliminados ${alumnos.length} alumnos sincronizados`);
      } catch (error) {
        console.error('Error eliminando alumnos:', error);
      }
    }

    return Response.json({
      success: true,
      message: 'Limpieza completada',
      cliente_id: clienteId
    });
  } catch (error) {
    console.error('Error en limpieza de cliente:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});