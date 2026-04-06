import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener todos los recordatorios sin pagar
    const recordatorios = await base44.asServiceRole.entities.RecordatorioCancha.list();
    const turnos = await base44.asServiceRole.entities.TurnoCancha.list();

    let actualizados = 0;

    for (const rec of recordatorios) {
      // Si el recordatorio está marcado como "hecho", no tocar
      if (rec.estado === 'hecho') continue;

      // Buscar el turno asociado
      const turnoActual = turnos.find(t => t.id === rec.turno_cancha_id);
      
      if (!turnoActual) continue;

      // Si el turno está pagado, eliminar el recordatorio
      if (turnoActual.pagado) {
        await base44.asServiceRole.entities.RecordatorioCancha.delete(rec.id);
        actualizados++;
        continue;
      }

      // Si el turno no está pagado y la fecha del recordatorio es anterior a hoy
      const hoy = new Date().toISOString().split('T')[0];
      if (rec.fecha < hoy && !turnoActual.pagado) {
        // Buscar el próximo turno de esta cancha que no esté pagado
        const proximoTurno = turnos
          .filter(t => 
            t.cancha === rec.cancha && 
            t.fecha >= hoy && 
            t.tipo_turno === rec.tipo_turno &&
            t.cliente === rec.cliente &&
            !t.pagado
          )
          .sort((a, b) => a.fecha.localeCompare(b.fecha))[0];

        if (proximoTurno) {
          // Actualizar el recordatorio al próximo turno
          await base44.asServiceRole.entities.RecordatorioCancha.update(rec.id, {
            turno_cancha_id: proximoTurno.id,
            fecha: proximoTurno.fecha,
            hora: proximoTurno.hora_inicio,
            monto: proximoTurno.monto,
            cliente: proximoTurno.cliente,
            notificado_previo: false,
            notificado_hora: false,
            reintento_enviado: false,
            escalado_admin: false,
          });
          actualizados++;
        } else {
          // No hay próximo turno no pagado, eliminar recordatorio
          await base44.asServiceRole.entities.RecordatorioCancha.delete(rec.id);
          actualizados++;
        }
      }
    }

    return Response.json({ 
      mensaje: `${actualizados} recordatorios actualizados/eliminados`,
      actualizados 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});