import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Obtener todos los turnos en lotes
    let allTurnos = [];
    let hasMore = true;
    let skip = 0;
    
    while (hasMore) {
      const batch = await base44.asServiceRole.entities.TurnoCancha.list(null, 100, skip);
      if (batch.length === 0) {
        hasMore = false;
      } else {
        allTurnos = allTurnos.concat(batch);
        skip += 100;
      }
    }
    
    // Borrar en lotes de 10 para evitar rate limit
    const batchSize = 10;
    for (let i = 0; i < allTurnos.length; i += batchSize) {
      const batch = allTurnos.slice(i, i + batchSize);
      await Promise.all(
        batch.map(turno => base44.asServiceRole.entities.TurnoCancha.delete(turno.id))
      );
      // Pequeña pausa entre lotes
      await new Promise(resolve => setTimeout(resolve, 100));
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