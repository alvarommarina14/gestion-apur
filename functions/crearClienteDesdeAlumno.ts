import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Solo procesar eventos de creación
    if (event.type !== 'create') {
      return Response.json({ success: true, skipped: 'No es evento de creación' });
    }

    const alumno = data;

    // Verificar si ya existe Cliente con este nombre
    const clientesExistentes = await base44.asServiceRole.entities.Cliente.filter({
      nombre: alumno.nombre,
      es_alumno: true,
      profesor_id: alumno.profesor_id
    });

    if (clientesExistentes && clientesExistentes.length > 0) {
      return Response.json({ success: true, skipped: 'Cliente ya existe' });
    }

    // Crear Cliente automáticamente
    const nuevoCliente = await base44.asServiceRole.entities.Cliente.create({
      nombre: alumno.nombre,
      telefono: alumno.whatsapp || '',
      precio: alumno.precio_mensual || 0,
      clasificacion: 'recurrente',
      tipo_cliente: 'clase',
      es_alumno: true,
      profesor_id: alumno.profesor_id,
      profesor_nombre: alumno.profesor_nombre,
      notas: alumno.observaciones || '',
      activo: true
    });

    return Response.json({
      success: true,
      clienteCreado: true,
      clienteId: nuevoCliente.id,
      mensaje: `Cliente ${alumno.nombre} creado automáticamente`
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});