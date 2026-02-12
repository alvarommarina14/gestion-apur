import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Obtener todos los turnos
    const turnos = await base44.asServiceRole.entities.TurnoCancha.list();
    
    // Borrar todos
    for (const turno of turnos) {
      await base44.asServiceRole.entities.TurnoCancha.delete(turno.id);
    }

    return Response.json({ 
      success: true, 
      message: `Se eliminaron ${turnos.length} turnos`,
      count: turnos.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});