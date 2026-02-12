import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { claseId, turnoId } = await req.json();

    // Obtener la clase
    const clase = await base44.entities.Clase.read(claseId);
    
    if (!clase.es_recurrente) {
      return Response.json({ error: 'La clase no es recurrente' }, { status: 400 });
    }

    const fechaClase = clase.fecha;

    // Buscar turnos futuro con mismos criterios (profesor, hora, dia semana)
    const allTurnos = await base44.entities.TurnoCancha.list('', 1000);
    
    const turnosABorrar = allTurnos.filter(t => 
      t.profesor === clase.profesor_id || 
      (t.fecha > fechaClase && t.hora_inicio === clase.hora_inicio)
    );

    // Eliminar turnos en lotes
    let conteo = 0;
    for (let i = 0; i < turnosABorrar.length; i += 5) {
      const batch = turnosABorrar.slice(i, i + 5);
      await Promise.all(batch.map(t => base44.entities.TurnoCancha.delete(t.id)));
      conteo += batch.length;
      if (i + 5 < turnosABorrar.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
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
      message: `Recurrencia eliminada. Se borraron ${conteo} turnos.`
    });
  } catch (error) {
    console.error('Error en eliminarRecurrenciaClase:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});