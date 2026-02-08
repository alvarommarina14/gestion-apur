import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { alumno_id } = await req.json();

    if (!alumno_id) {
      return Response.json({ error: 'alumno_id requerido' }, { status: 400 });
    }

    if (!user.profesor_id) {
      return Response.json({ error: 'Usuario no tiene profesor asignado' }, { status: 400 });
    }

    // Obtener el profesor
    const profesor = await base44.entities.Profesor.read(user.profesor_id);

    // Actualizar alumno
    await base44.entities.Alumno.update(alumno_id, {
      profesor_id: user.profesor_id,
      profesor_nombre: profesor.nombre,
    });

    return Response.json({ success: true, message: 'Profesor asignado correctamente' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});