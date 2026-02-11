import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cliente_id, nuevo_monto } = await req.json();

    if (!cliente_id || nuevo_monto === undefined) {
      return Response.json(
        { error: 'cliente_id y nuevo_monto son requeridos' },
        { status: 400 }
      );
    }

    // Obtener el cliente
    const cliente = await base44.entities.Cliente.read(cliente_id);
    
    if (!cliente) {
      return Response.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Buscar todos los TurnoCancha de este cliente que NO estén pagados
    const turnos = await base44.entities.TurnoCancha.filter({
      cliente: cliente.nombre,
      pagado: false,
      estado: 'activo'
    });

    // Actualizar el monto en cada turno
    let actualizados = 0;
    for (const turno of turnos) {
      await base44.entities.TurnoCancha.update(turno.id, {
        monto: nuevo_monto
      });
      actualizados++;
    }

    return Response.json({
      success: true,
      message: `Se actualizaron ${actualizados} turnos con el nuevo monto`,
      cliente_nombre: cliente.nombre,
      nuevo_monto,
      turnos_actualizados: actualizados
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});