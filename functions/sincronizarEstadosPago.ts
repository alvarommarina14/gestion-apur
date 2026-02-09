import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { format, startOfMonth, endOfMonth, parseISO } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const mesActual = format(new Date(), 'yyyy-MM');
    const inicioMes = format(startOfMonth(parseISO(mesActual + '-01')), 'yyyy-MM-dd');
    const finMes = format(endOfMonth(parseISO(mesActual + '-01')), 'yyyy-MM-dd');

    // Obtener alumnos, pagos y clientes
    const [alumnos, pagos, clientes, cobrosClientes] = await Promise.all([
      base44.asServiceRole.entities.Alumno.list(),
      base44.asServiceRole.entities.Pago.list(),
      base44.asServiceRole.entities.Cliente.list(),
      base44.asServiceRole.entities.CobroCliente.list(),
    ]);

    // Sincronizar alumnos
    let alumnosActualizados = 0;
    for (const alumno of alumnos) {
      const pagosAlumno = pagos.filter(p => p.alumno_id === alumno.id && p.mes_correspondiente === mesActual);
      const montoPagado = pagosAlumno.reduce((sum, p) => sum + (p.monto || 0), 0);
      const deudaMes = Math.max(0, (alumno.precio_mensual || 0) - montoPagado);
      
      const nuevoEstado = deudaMes === 0 ? 'pagado' : deudaMes > 0 && montoPagado === 0 ? 'debe' : 'moroso';
      const deudaTotal = (alumno.deuda_total || 0) + deudaMes;

      if (alumno.estado_mes_actual !== nuevoEstado || alumno.deuda_total !== deudaTotal) {
        await base44.asServiceRole.entities.Alumno.update(alumno.id, {
          estado_mes_actual: nuevoEstado,
          deuda_total: Math.round(deudaTotal * 100) / 100,
          ultimo_pago_fecha: pagosAlumno.length > 0 ? pagosAlumno[pagosAlumno.length - 1].fecha : alumno.ultimo_pago_fecha,
        });
        alumnosActualizados++;
      }
    }

    // Sincronizar clientes
    let clientesActualizados = 0;
    for (const cliente of clientes) {
      if (cliente.tipo_cliente !== 'abono') continue;

      const cobrosCliente = cobrosClientes.filter(c => c.cliente_id === cliente.id && c.mes === mesActual);
      const totalCobrado = cobrosCliente.filter(c => c.estado === 'pagado').reduce((sum, c) => sum + (c.monto || 0), 0);
      const montoEsperado = cliente.precio || 0;
      const deuda = Math.max(0, montoEsperado - totalCobrado);

      const nuevoEstado = deuda === 0 ? 'pagado' : deuda > 0 && totalCobrado === 0 ? 'pendiente' : 'moroso';

      if (cliente.estado !== nuevoEstado || cliente.deuda_total !== deuda) {
        await base44.asServiceRole.entities.Cliente.update(cliente.id, {
          estado: nuevoEstado,
          total_gastado: (cliente.total_gastado || 0) + totalCobrado,
        });
        clientesActualizados++;
      }
    }

    return Response.json({
      message: 'Sincronización completada',
      alumnosActualizados,
      clientesActualizados,
      mes: mesActual,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});