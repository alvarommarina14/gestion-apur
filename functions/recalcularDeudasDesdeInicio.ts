import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { differenceInMonths } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44Admin = base44.asServiceRole;
    const inicioApp = new Date(2026, 1, 1); // Febrero 2026
    const hoy = new Date();
    const mesesTranscurridos = differenceInMonths(hoy, inicioApp) + 1;

    let alumnosActualizados = 0;
    let clientesActualizados = 0;

    // Recalcular deudas de ALUMNOS
    const alumnos = await base44Admin.entities.Alumno.list();
    for (const alumno of alumnos) {
      // Contar pagos del alumno
      const pagos = await base44Admin.entities.Pago.filter({ alumno_id: alumno.id });
      const cobros = await base44Admin.entities.CobroCliente.filter({ 
        cliente_id: alumno.cliente_id || '',
        estado: 'pagado'
      });
      
      const pagosTotales = pagos.length + cobros.length;
      const mesesAdeudados = Math.max(0, mesesTranscurridos - pagosTotales);
      const deudaTotal = mesesAdeudados * (alumno.precio_mensual || 0);
      
      // Determinar estado: solo moroso si pasó el día 15 y debe el mes actual
      const diaActual = hoy.getDate();
      let nuevoEstado = 'activo';
      if (deudaTotal > 0 && diaActual > 15) {
        nuevoEstado = 'moroso';
      }
      
      await base44Admin.entities.Alumno.update(alumno.id, {
        deuda_total: deudaTotal,
        estado: nuevoEstado
      });
      
      alumnosActualizados++;
    }

    // Recalcular deudas de CLIENTES
    const clientes = await base44Admin.entities.Cliente.list();
    for (const cliente of clientes) {
      // Contar cobros del cliente
      const cobros = await base44Admin.entities.CobroCliente.filter({ 
        cliente_id: cliente.id,
        estado: 'pagado'
      });
      
      const pagosTotales = cobros.length;
      const mesesAdeudados = Math.max(0, mesesTranscurridos - pagosTotales);
      const deudaTotal = mesesAdeudados * (cliente.precio || 0);
      
      await base44Admin.entities.Cliente.update(cliente.id, {
        deuda_total: deudaTotal
      });
      
      clientesActualizados++;
    }

    return Response.json({ 
      success: true,
      mesesTranscurridos,
      alumnosActualizados,
      clientesActualizados,
      mensaje: `Deudas recalculadas correctamente desde febrero 2026`
    });

  } catch (error) {
    console.error('Error recalculando deudas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});