import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cobro_id, cliente_id, cliente_nombre, fecha_pago, medio_pago, monto, notas, mes } = await req.json();

    // 1. Actualizar el cobro existente a pagado
    await base44.entities.CobroCliente.update(cobro_id, {
      estado: 'pagado',
      fecha_pago: fecha_pago,
      medio_pago: medio_pago,
      notas: notas,
    });

    return Response.json({ 
      success: true, 
      message: 'Pago registrado exitosamente'
    });
  } catch (error) {
    console.error('Error en registrarPagoClienteCompleto:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});