import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { turnoId } = await req.json();

    // Obtener el turno base
    const turnoBase = await base44.asServiceRole.entities.TurnoCancha.read(turnoId);
    
    if (!turnoBase) {
      return Response.json({ error: 'Turno no encontrado' }, { status: 404 });
    }

    // Obtener todos los turnos
    const allTurnos = await base44.asServiceRole.entities.TurnoCancha.list();
    
    // Filtrar los que coinciden con el patrón (cliente, cancha, hora_inicio)
    const turnosABorrar = allTurnos.filter(t => 
      t.cliente === turnoBase.cliente &&
      t.cancha === turnoBase.cancha &&
      t.hora_inicio === turnoBase.hora_inicio &&
      t.tipo_turno === 'alquiler' &&
      t.modalidad_alquiler === 'abono' &&
      t.es_recurrente === true
    );

    // Borrar en lotes
    let deleted = 0;
    for (let i = 0; i < turnosABorrar.length; i += 10) {
      const batch = turnosABorrar.slice(i, i + 10);
      for (const turno of batch) {
        try {
          await base44.asServiceRole.entities.TurnoCancha.delete(turno.id);
          deleted++;
        } catch (e) {
          console.error('Error borrando turno:', turno.id, e);
        }
      }
      await new Promise(r => setTimeout(r, 50));
    }

    return Response.json({ 
      success: true, 
      message: `${deleted} turnos de recurrencia eliminados`
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});