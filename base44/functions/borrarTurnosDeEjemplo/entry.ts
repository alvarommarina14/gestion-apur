import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener todos los turnos
    const allTurnos = await base44.asServiceRole.entities.TurnoCancha.list('-fecha', 500);
    
    // Filtrar turnos que NO fueron creados por el usuario actual
    const turnosABorrar = allTurnos.filter(turno => turno.created_by !== user.email);
    
    // Borrar cada turno
    let deletedCount = 0;
    for (const turno of turnosABorrar) {
      try {
        await base44.asServiceRole.entities.TurnoCancha.delete(turno.id);
        deletedCount++;
      } catch (e) {
        console.error(`Error al borrar turno ${turno.id}:`, e);
      }
    }

    return Response.json({ 
      mensaje: `✅ Se borraron ${deletedCount} turnos de ejemplo`,
      totalBorrados: deletedCount
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});