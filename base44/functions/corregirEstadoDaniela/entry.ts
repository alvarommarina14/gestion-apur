import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Solo admin' }, { status: 403 });
    }

    // Buscar a Daniela Quiroz
    const alumnos = await base44.entities.Alumno.list();
    const daniela = alumnos.find(a => a.nombre === 'Daniela Quiroz');

    if (!daniela) {
      return Response.json({ error: 'Daniela no encontrada' }, { status: 404 });
    }

    // Actualizar estado
    await base44.entities.Alumno.update(daniela.id, {
      estado_mes_actual: 'pendiente'
    });

    return Response.json({ success: true, message: 'Estado corregido' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});