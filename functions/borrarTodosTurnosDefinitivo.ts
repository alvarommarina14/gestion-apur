import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Obtener TODOS los turnos sin filtrar
    const todosTurnos = await base44.asServiceRole.entities.TurnoCancha.list(null, 1000);
    
    let eliminados = 0;
    let errores = 0;

    // Eliminar cada turno
    for (const turno of todosTurnos) {
      try {
        await base44.asServiceRole.entities.TurnoCancha.delete(turno.id);
        eliminados++;
      } catch (error) {
        console.error(`Error eliminando turno ${turno.id}:`, error.message);
        errores++;
      }
    }

    return Response.json({
      mensaje: `✅ Se eliminaron ${eliminados} turnos de la base de datos`,
      eliminados,
      errores,
      total: todosTurnos.length
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});