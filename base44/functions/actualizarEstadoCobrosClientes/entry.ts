import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Solo administradores pueden actualizar cobros' }, { status: 403 });
    }

    const hoy = new Date();
    const diaActual = hoy.getDate();

    // Obtener todos los cobros pendientes
    const todosCobros = await base44.asServiceRole.entities.CobroCliente.filter({ estado: 'pendiente' });
    
    let actualizados = 0;
    let morosidades = 0;

    for (const cobro of todosCobros) {
      // Calcular vencimiento
      const fechaVencimiento = new Date(cobro.fecha_vencimiento);
      
      // Si pasamos el día 15 (vencimiento), marcar como moroso
      if (hoy > fechaVencimiento) {
        await base44.asServiceRole.entities.CobroCliente.update(cobro.id, {
          estado: 'moroso'
        });
        morosidades++;
        actualizados++;
      }
    }

    console.log(`✅ ${actualizados} cobros actualizados, ${morosidades} marcados como morosos`);

    return Response.json({
      success: true,
      actualizados,
      morosidades,
      mensaje: `Se actualizaron ${actualizados} cobros`
    });

  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});