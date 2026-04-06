import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Solo admins pueden ejecutar esto
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Solo administradores pueden ejecutar esta función' }, { status: 403 });
    }

    // Borrar todas las clases
    const clases = await base44.asServiceRole.entities.Clase.list(null, 1000);
    let clasesEliminadas = 0;
    for (const clase of clases) {
      await base44.asServiceRole.entities.Clase.delete(clase.id);
      clasesEliminadas++;
    }

    // Borrar todos los turnos de cancha
    const turnos = await base44.asServiceRole.entities.TurnoCancha.list(null, 1000);
    let turnosEliminados = 0;
    for (const turno of turnos) {
      await base44.asServiceRole.entities.TurnoCancha.delete(turno.id);
      turnosEliminados++;
    }

    return Response.json({
      status: 'success',
      clasesEliminadas,
      turnosEliminados,
      total: clasesEliminadas + turnosEliminados
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});