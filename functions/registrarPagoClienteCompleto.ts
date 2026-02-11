import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cobro_id, cliente_id, fecha_pago, medio_pago, monto, notas, mes } = await req.json();

    // Actualizar cobro a pagado
    await base44.entities.CobroCliente.update(cobro_id, {
      estado: 'pagado',
      fecha_pago,
      medio_pago,
      notas,
    });

    // Crear registro de pago para trazabilidad
    await base44.entities.CobroCliente.create({
      cliente_id,
      cliente_nombre: (await base44.entities.Cliente.read(cliente_id)).nombre,
      fecha: fecha_pago,
      monto: parseFloat(monto),
      medio_pago,
      mes_correspondiente: mes,
      notas,
    });

    // Actualizar estado del cliente a "pagado"
    await base44.entities.Cliente.update(cliente_id, {
      estado: 'pagado',
    });

    return Response.json({ success: true, message: 'Pago registrado' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});