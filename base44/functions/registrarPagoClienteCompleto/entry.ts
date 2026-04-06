import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cobro_id, cliente_id, cliente_nombre, fecha_pago, medio_pago, monto, notas, mes, tipo_cobro } = await req.json();

    let cobroIdReal = cobro_id;

    // Si es un cobro virtual (empieza con 'virtual-'), crear uno real en la BD
    if (cobro_id.startsWith('virtual-')) {
      const nuevoCobroData = {
        cliente_id,
        cliente_nombre,
        tipo_cobro: tipo_cobro || 'abono_mensual',
        mes,
        monto: parseFloat(monto),
        estado: 'pagado',
        fecha_pago,
        medio_pago,
        notas,
      };
      const cobroCreado = await base44.entities.CobroCliente.create(nuevoCobroData);
      cobroIdReal = cobroCreado.id;
    } else {
      // Si no es virtual, actualizar el cobro existente
      await base44.entities.CobroCliente.update(cobroIdReal, {
        estado: 'pagado',
        fecha_pago,
        medio_pago,
        notas,
      });
    }

    return Response.json({ 
      success: true, 
      message: 'Pago registrado exitosamente',
      cobro_id: cobroIdReal
    });
  } catch (error) {
    console.error('Error en registrarPagoClienteCompleto:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});