import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Solo procesar eventos de creación
    if (event.type !== 'create') {
      return Response.json({ success: true, skipped: 'No es evento de creación' });
    }

    const cliente = data;

    // Solo procesar si es alumno
    if (!cliente.es_alumno || !cliente.profesor_id) {
      return Response.json({ success: true, skipped: 'No es alumno con profesor' });
    }

    // Verificar si ya existe Alumno con este nombre y profesor
    const alumnosExistentes = await base44.asServiceRole.entities.Alumno.filter({
      nombre: cliente.nombre,
      profesor_id: cliente.profesor_id
    });

    if (alumnosExistentes && alumnosExistentes.length > 0) {
      return Response.json({ success: true, skipped: 'Alumno ya existe' });
    }

    // Crear Alumno automáticamente
    const nuevoAlumno = await base44.asServiceRole.entities.Alumno.create({
      nombre: cliente.nombre,
      whatsapp: cliente.telefono || '',
      precio_mensual: cliente.precio || 0,
      clases_por_mes: 4,
      profesor_id: cliente.profesor_id,
      profesor_nombre: cliente.profesor_nombre,
      observaciones: cliente.notas || '',
      estado: cliente.activo ? 'activo' : 'pausado'
    });

    return Response.json({
      success: true,
      alumnoCreado: true,
      alumnoId: nuevoAlumno.id,
      mensaje: `Alumno ${cliente.nombre} creado automáticamente`
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});