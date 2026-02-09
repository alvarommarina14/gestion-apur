import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Solo admins pueden ejecutar esta función
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Obtener todos los turnos activos
    const turnos = await base44.asServiceRole.entities.TurnoCancha.filter({
      estado: 'activo'
    });

    let sincronizados = 0;
    let errores = 0;

    for (const turno of turnos) {
      try {
        // Verificar si ya existe recordatorio para este turno
        const recordatoriosExistentes = await base44.asServiceRole.entities.RecordatorioCancha.filter({
          turno_cancha_id: turno.id,
        });

        if (!recordatoriosExistentes || recordatoriosExistentes.length === 0) {
          // Crear nuevo recordatorio
          await base44.asServiceRole.entities.RecordatorioCancha.create({
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
          });
          sincronizados++;
        }
      } catch (error) {
        console.error(`Error sincronizando turno ${turno.id}:`, error);
        errores++;
      }
    }

    return Response.json({
      success: true,
      message: `Sincronización completada: ${sincronizados} recordatorios creados, ${errores} errores`,
      sincronizados,
      errores,
      totalTurnos: turnos.length,
    });
  } catch (error) {
    console.error('Error en sincronización masiva:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});