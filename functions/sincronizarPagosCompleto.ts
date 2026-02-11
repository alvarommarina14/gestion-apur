import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { 
      tipo_evento, // 'turno_pagado', 'alumno_pago', 'cliente_pago'
      turnoId,
      alumnoId,
      clienteId,
      monto,
      fecha = format(new Date(), 'yyyy-MM-dd'),
      mes,
      medio_pago = 'Efectivo'
    } = await req.json();

    const base44Admin = base44.asServiceRole;
    const fechaHoy = new Date();
    const diaActual = fechaHoy.getDate();
    const mesActual = format(fechaHoy, 'yyyy-MM');

    // Determinar estado de pago (pagado si es 5-15, moroso si es después del 15)
    const determinarEstado = (dia) => {
      return dia <= 15 ? 'pagado' : 'moroso';
    };

    // ===== SINCRONIZACIÓN DESDE TURNO PAGADO =====
    if (tipo_evento === 'turno_pagado' && turnoId) {
      const turno = await base44Admin.entities.TurnoCancha.read(turnoId);
      if (!turno) return Response.json({ error: 'Turno no encontrado' }, { status: 404 });

      const mesTurno = turno.fecha.substring(0, 7);
      const estado = determinarEstado(diaActual);

      // Si es alquiler con abono, sincronizar CobroCliente
      if (turno.tipo_turno === 'alquiler' && turno.modalidad_alquiler === 'abono') {
        const cobrosExistentes = await base44Admin.entities.CobroCliente.filter({
          cliente_id: turno.cliente_id,
          tipo_cobro: 'abono_mensual',
          mes: mesTurno
        });

        if (cobrosExistentes.length > 0) {
          await base44Admin.entities.CobroCliente.update(cobrosExistentes[0].id, {
            estado,
            fecha_pago: format(new Date(), 'yyyy-MM-dd')
          });
        } else {
          await base44Admin.entities.CobroCliente.create({
            cliente_id: turno.cliente_id || '',
            cliente_nombre: turno.cliente,
            tipo_cobro: 'abono_mensual',
            mes: mesTurno,
            monto: turno.monto,
            estado,
            fecha_pago: format(new Date(), 'yyyy-MM-dd')
          });
        }
      }

      // Si es clase, sincronizar abono de alumnos
      if (turno.tipo_turno === 'clase' && turno.alumnos_ids?.length > 0) {
        for (const aid of turno.alumnos_ids) {
          const alumno = await base44Admin.entities.Alumno.read(aid);
          if (alumno?.cliente_id) {
            const cobroExistente = await base44Admin.entities.CobroCliente.filter({
              cliente_id: alumno.cliente_id,
              tipo_cobro: 'abono_mensual',
              mes: mesTurno
            });

            if (cobroExistente.length === 0) {
              await base44Admin.entities.CobroCliente.create({
                cliente_id: alumno.cliente_id,
                cliente_nombre: alumno.nombre,
                tipo_cobro: 'abono_mensual',
                mes: mesTurno,
                monto: alumno.precio_mensual || 0,
                estado: 'pagado',
                fecha_pago: format(new Date(), 'yyyy-MM-dd')
              });
            }
          }

          // Actualizar alumno
          await base44Admin.entities.Alumno.update(aid, {
            estado_mes_actual: 'pagado',
            ultimo_pago_fecha: format(new Date(), 'yyyy-MM-dd'),
            deuda_total: Math.max(0, (alumno.deuda_total || 0) - (alumno.precio_mensual || 0))
          });
        }
      }
    }

    // ===== SINCRONIZACIÓN DESDE PAGO DE ALUMNO =====
    if (tipo_evento === 'alumno_pago' && alumnoId) {
      const alumno = await base44Admin.entities.Alumno.read(alumnoId);
      if (!alumno) return Response.json({ error: 'Alumno no encontrado' }, { status: 404 });

      const estado = determinarEstado(diaActual);
      const mesPago = mes || mesActual;

      // Crear o actualizar CobroCliente
      if (alumno.cliente_id) {
        const cobrosExistentes = await base44Admin.entities.CobroCliente.filter({
          cliente_id: alumno.cliente_id,
          tipo_cobro: 'abono_mensual',
          mes: mesPago
        });

        if (cobrosExistentes.length > 0) {
          await base44Admin.entities.CobroCliente.update(cobrosExistentes[0].id, {
            estado,
            fecha_pago: fecha
          });
        } else {
          await base44Admin.entities.CobroCliente.create({
            cliente_id: alumno.cliente_id,
            cliente_nombre: alumno.nombre,
            tipo_cobro: 'abono_mensual',
            mes: mesPago,
            monto: monto || alumno.precio_mensual || 0,
            estado,
            fecha_pago: fecha
          });
        }
      }

      // Actualizar alumno
      const nuevaDeuda = Math.max(0, (alumno.deuda_total || 0) - (monto || alumno.precio_mensual || 0));
      await base44Admin.entities.Alumno.update(alumnoId, {
        estado_mes_actual: 'pagado',
        estado: nuevaDeuda > 0 ? 'moroso' : 'activo',
        deuda_total: nuevaDeuda,
        ultimo_pago_fecha: fecha,
        ultimo_pago_nota: `Pago ${medio_pago}`
      });
    }

    // ===== SINCRONIZACIÓN DESDE PAGO DE CLIENTE =====
    if (tipo_evento === 'cliente_pago' && clienteId) {
      try {
        const cliente = await base44Admin.entities.Cliente.read(clienteId);
        if (!cliente) return Response.json({ error: 'Cliente no encontrado' }, { status: 404 });

        const estado = determinarEstado(diaActual);
        const mesPago = mes || mesActual;

        // Crear o actualizar CobroCliente
        const cobrosExistentes = await base44Admin.entities.CobroCliente.filter({
          cliente_id: clienteId,
          tipo_cobro: 'abono_mensual',
          mes: mesPago
        });

        if (cobrosExistentes.length > 0) {
          await base44Admin.entities.CobroCliente.update(cobrosExistentes[0].id, {
            estado,
            fecha_pago: fecha
          });
        } else {
          await base44Admin.entities.CobroCliente.create({
            cliente_id: clienteId,
            cliente_nombre: cliente.nombre,
            tipo_cobro: 'abono_mensual',
            mes: mesPago,
            monto: monto || cliente.precio || 0,
            estado,
            fecha_pago: fecha
          });
        }

        // Si el cliente es alumno, sincronizar también el alumno
        if (cliente.es_alumno) {
          const alumnoSincronizado = await base44Admin.entities.Alumno.filter({
            nombre: cliente.nombre
          });
          if (alumnoSincronizado.length > 0) {
            const alumno = alumnoSincronizado[0];
            const nuevaDeuda = Math.max(0, (alumno.deuda_total || 0) - (monto || alumno.precio_mensual || 0));
            await base44Admin.entities.Alumno.update(alumno.id, {
              estado_mes_actual: 'pagado',
              estado: nuevaDeuda > 0 ? 'moroso' : 'activo',
              deuda_total: nuevaDeuda,
              ultimo_pago_fecha: fecha
            });
          }
        }
      } catch (clienteError) {
        console.error('Error procesando pago de cliente:', clienteError);
        // Continuar si es cliente_pago
      }
    }

    return Response.json({ 
      success: true,
      tipo: tipo_evento,
      estado: determinarEstado(diaActual)
    });

  } catch (error) {
    console.error('Error sincronizando pagos:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});