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

    // Buscar todas las clases de la misma serie recurrente
    const hoy = new Date().toISOString().split('T')[0];
    let clasesDelaSerie = [];
    
    if (clase.serie_recurrente_id) {
      clasesDelaSerie = await base44.entities.Clase.filter({
        serie_recurrente_id: clase.serie_recurrente_id
      }, '-fecha');
    } else {
      // Si no tiene serie_recurrente_id, incluir solo clases con mismos alumnos/profesor/horario
      clasesDelaSerie = await base44.entities.Clase.filter({
        profesor_id: clase.profesor_id,
        hora_inicio: clase.hora_inicio,
        tipo: clase.tipo
      }, '-fecha');
    }

    // Obtener los turnos asociados a esas clases que sean futuros
    const clasesIds = clasesDelaSerie
      .filter(c => c.fecha >= hoy)
      .map(c => c.turno_cancha_id)
      .filter(id => id); // Solo los que tienen turno_cancha_id

    // Buscar los turnos por ID
    const turnosAEliminar = [];
    for (const turnoId of clasesIds) {
      try {
        await base44.entities.TurnoCancha.read(turnoId);
        turnosAEliminar.push(turnoId);
      } catch (e) {
        // Turno no existe, ignorar
      }
    }

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