import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { claseId, turnoId } = await req.json();

    // Obtener la clase para saber la fecha y serie recurrente
    const clase = await base44.entities.Clase.read(claseId);
    
    if (!clase.es_recurrente) {
      return Response.json({ error: 'La clase no es recurrente' }, { status: 400 });
    }

    // Buscar todos los turnos de esta serie que sean posteriores a hoy
    const hoy = new Date().toISOString().split('T')[0];
    const turnos = await base44.entities.TurnoCancha.filter({
      serie_recurrente_id: clase.serie_recurrente_id
    }, '-fecha');

    // Eliminar turnos futuros en lotes
    const turnosAEliminar = turnos
      .filter(t => t.fecha >= hoy)
      .map(t => t.id);

    if (turnosAEliminar.length > 0) {
      for (let i = 0; i < turnosAEliminar.length; i += 10) {
        const batch = turnosAEliminar.slice(i, i + 10);
        await Promise.all(batch.map(id => base44.entities.TurnoCancha.delete(id)));
        if (i + 10 < turnosAEliminar.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }

    // Actualizar la clase para eliminar recurrencia
    await base44.entities.Clase.update(claseId, {
      es_recurrente: false,
      recurrencia_tipo: null,
      recurrencia_hasta: null,
      recurrencia_cantidad: null
    });

    return Response.json({ 
      success: true, 
      message: `Recurrencia eliminada. Se borraron ${turnosAEliminar.length} turnos futuros.`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});