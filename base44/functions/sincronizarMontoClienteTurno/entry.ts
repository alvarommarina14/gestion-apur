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

    // Buscar todos los TurnoCancha de este cliente que NO estén pagados (clases individuales o alquileres)
    const todosTurnos = await base44.entities.TurnoCancha.list();
    const turnos = todosTurnos.filter(t => 
      t.cliente === cliente.nombre && 
      t.pagado === false && 
      t.estado === 'activo'
    );

    // Actualizar el monto en cada turno
    let actualizados = 0;
    for (const turno of turnos) {
      await base44.entities.TurnoCancha.update(turno.id, {
        monto: nuevo_monto
      });
      actualizados++;
    }

    // Si es alumno, también buscar Clases individuales sincronizadas
    let clasesActualizadas = 0;
    if (cliente.es_alumno) {
      const clasesDelCliente = await base44.entities.Clase.filter({
        alumnos_nombres: cliente.nombre,
        estado: { $ne: 'cancelada_anticipada' }
      });
      
      for (const clase of clasesDelCliente) {
        await base44.entities.Clase.update(clase.id, {
          precio: nuevo_monto
        });
        clasesActualizadas++;
      }
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