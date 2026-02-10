import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { turnoId, pagado, tipo_turno, modalidad_alquiler } = await req.json();

    const base44Admin = base44.asServiceRole;

    // Obtener turno
    const turno = await base44Admin.entities.TurnoCancha.read(turnoId);
    if (!turno) {
      return Response.json({ error: 'Turno no encontrado' }, { status: 404 });
    }

    // Actualizar turno
    await base44Admin.entities.TurnoCancha.update(turnoId, { pagado });

    // Si es alquiler con abono, sincronizar a CobroCliente
    if (tipo_turno === 'alquiler' && modalidad_alquiler === 'abono') {
      const mes = turno.fecha.substring(0, 7); // YYYY-MM
      
      // Buscar CobroCliente existente
      const cobrosExistentes = await base44Admin.entities.CobroCliente.filter({
        cliente_id: turno.cliente_id,
        tipo_cobro: 'abono_mensual',
        mes: mes
      });

      if (cobrosExistentes.length > 0) {
        // Actualizar existente
        await base44Admin.entities.CobroCliente.update(cobrosExistentes[0].id, {
          estado: pagado ? 'pagado' : 'pendiente',
          fecha_pago: pagado ? turno.fecha : null
        });
      } else {
        // Crear nuevo
        await base44Admin.entities.CobroCliente.create({
          cliente_id: turno.cliente_id,
          cliente_nombre: turno.cliente,
          tipo_cobro: 'abono_mensual',
          mes: mes,
          monto: turno.monto,
          estado: pagado ? 'pagado' : 'pendiente',
          fecha_pago: pagado ? turno.fecha : null
        });
      }
    }

    // Si es clase, sincronizar abono mensual del alumno
    if (tipo_turno === 'clase' && pagado) {
      const mes = turno.fecha.substring(0, 7); // YYYY-MM
      const alumnosIds = turno.alumnos_ids || [];

      for (const alumnoId of alumnosIds) {
        const alumno = await base44Admin.entities.Alumno.read(alumnoId);
        if (alumno?.cliente_id) {
          // Buscar o crear CobroCliente para abono mensual
          const cobrosExistentes = await base44Admin.entities.CobroCliente.filter({
            cliente_id: alumno.cliente_id,
            tipo_cobro: 'abono_mensual',
            mes: mes
          });

          if (cobrosExistentes.length === 0) {
            await base44Admin.entities.CobroCliente.create({
              cliente_id: alumno.cliente_id,
              cliente_nombre: alumno.nombre,
              tipo_cobro: 'abono_mensual',
              mes: mes,
              monto: alumno.precio_mensual || 0,
              estado: 'pagado',
              fecha_pago: turno.fecha
            });
          }
        }
      }
    }

    return Response.json({ success: true, turnoId });
  } catch (error) {
    console.error('Error sincronizando pagos:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});