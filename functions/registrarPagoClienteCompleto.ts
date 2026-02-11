import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cobro_id, cliente_id, cliente_nombre, fecha_pago, medio_pago, monto, notas, mes } = await req.json();

    // 1. Actualizar cobro a pagado
    await base44.entities.CobroCliente.update(cobro_id, {
      estado: 'pagado',
      fecha_pago,
      medio_pago,
      notas,
    });

    // 2. Crear registro de pago para trazabilidad
    await base44.entities.CobroCliente.create({
      cliente_id,
      cliente_nombre,
      fecha: fecha_pago,
      monto: parseFloat(monto),
      medio_pago,
      mes_correspondiente: mes,
      notas,
    });

    // 3. Obtener cliente para verificar si es alumno
    const cliente = await base44.entities.Cliente.read(cliente_id);

    // 4. Si es alumno, actualizar su estado_mes_actual a "pagado"
    if (cliente.es_alumno && cliente.profesor_id) {
      const alumnos = await base44.entities.Alumno.filter({ 
        nombre: cliente.nombre 
      });
      
      if (alumnos.length > 0) {
        await base44.entities.Alumno.update(alumnos[0].id, {
          estado_mes_actual: 'pagado'
        });
      }
    }

    // 5. Actualizar Cliente a estado "pagado"
    await base44.entities.Cliente.update(cliente_id, {
      estado: 'pagado'
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