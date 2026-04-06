import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Obtener todos los turnos
    const allTurnos = [];
    let offset = 0;
    let hasMore = true;
    
    while (hasMore) {
      const turnos = await base44.asServiceRole.entities.TurnoCancha.list();
      if (turnos.length === 0) {
        hasMore = false;
      } else {
        allTurnos.push(...turnos);
        offset += turnos.length;
      }
    }

    // Borrar en lotes
    for (let i = 0; i < allTurnos.length; i += 10) {
      const batch = allTurnos.slice(i, i + 10);
      for (const turno of batch) {
        try {
          await base44.asServiceRole.entities.TurnoCancha.delete(turno.id);
        } catch (e) {
          console.error('Error borrando turno:', turno.id, e);
        }
      }
      // Pequeño delay entre lotes
      await new Promise(r => setTimeout(r, 100));
    }

    return Response.json({ 
      success: true, 
      message: `${allTurnos.length} turnos eliminados` 
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});