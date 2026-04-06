import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Obtener todos los turnos
    const turnos = await base44.asServiceRole.entities.TurnoCancha.list();
    
    // Borrar cada uno
    let deletedCount = 0;
    for (const turno of turnos) {
      await base44.asServiceRole.entities.TurnoCancha.delete(turno.id);
      deletedCount++;
    }

    return Response.json({ success: true, deletedCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});