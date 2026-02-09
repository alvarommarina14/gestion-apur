import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const { event, data } = body;
    
    if (!data) {
      return Response.json({ error: 'No data provided' }, { status: 400 });
    }

    const turno = data;

    // Si el turno fue cancelado, eliminar el recordatorio
    if (turno.estado === 'cancelado') {
      const recordatorios = await base44.asServiceRole.entities.RecordatorioCancha.filter({
        turno_cancha_id: turno.id,
      });
      
      if (recordatorios && recordatorios.length > 0) {
        await Promise.all(
          recordatorios.map(rec => base44.asServiceRole.entities.RecordatorioCancha.delete(rec.id))
        );
      }
      
      return Response.json({ 
        success: true, 
        message: 'Recordatorios eliminados (turno cancelado)',
        action: 'deleted'
      });
    }

    // Verificar si ya existe recordatorio para este turno
    const recordatoriosExistentes = await base44.asServiceRole.entities.RecordatorioCancha.filter({
      turno_cancha_id: turno.id,
    });

    if (recordatoriosExistentes && recordatoriosExistentes.length > 0) {
      // Actualizar el recordatorio existente
      const rec = recordatoriosExistentes[0];
      await base44.asServiceRole.entities.RecordatorioCancha.update(rec.id, {
        fecha: turno.fecha,
        hora: turno.hora_inicio,
        cancha: turno.cancha,
        cliente: turno.cliente,
        tipo_turno: turno.tipo_turno,
        modalidad_alquiler: turno.modalidad_alquiler,
        profesor: turno.profesor,
        monto: turno.monto,
        pagado: turno.pagado,
      });

      return Response.json({ 
        success: true, 
        message: 'Recordatorio actualizado',
        action: 'updated'
      });
    } else {
      // Crear nuevo recordatorio
      const nuevoRecordatorio = {
        turno_cancha_id: turno.id,
        tipo: 'sacar_cancha',
        fecha: turno.fecha,
        hora: turno.hora_inicio,
        cancha: turno.cancha,
        cliente: turno.cliente,
        tipo_turno: turno.tipo_turno,
        modalidad_alquiler: turno.modalidad_alquiler,
        profesor: turno.profesor,
        monto: turno.monto,
        pagado: turno.pagado,
        asignado_a: 'Empleado',
        notificar: true,
        minutos_antes: 10,
        estado: 'pendiente',
      };

      await base44.asServiceRole.entities.RecordatorioCancha.create(nuevoRecordatorio);

      return Response.json({ 
        success: true, 
        message: 'Recordatorio creado',
        action: 'created'
      });
    }
  } catch (error) {
    console.error('Error sincronizando turnos:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});