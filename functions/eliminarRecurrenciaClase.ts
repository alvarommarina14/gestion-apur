import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { turnoId, claseId, tipo } = await req.json();
    const base44SR = base44.asServiceRole;
    
    const hoy = new Date().toISOString().split('T')[0];
    let turnosABorrar = [];
    let clasesABorrar = [];

    // CASO 1: Clase recurrente
    if (tipo === 'clase' && claseId) {
      const clase = await base44SR.entities.Clase.read(claseId);
      
      if (!clase.es_recurrente) {
        return Response.json({ error: 'La clase no es recurrente' }, { status: 400 });
      }

      // Si tiene serie_recurrente_id, buscar todas de esa serie
      if (clase.serie_recurrente_id) {
        clasesABorrar = await base44SR.entities.Clase.filter({
          serie_recurrente_id: clase.serie_recurrente_id,
          es_recurrente: true
        }, '-fecha');
      } else {
        // Si no, buscar por profesor + hora + tipo
        clasesABorrar = await base44SR.entities.Clase.filter({
          profesor_id: clase.profesor_id,
          hora_inicio: clase.hora_inicio,
          tipo: clase.tipo,
          es_recurrente: true
        }, '-fecha');
      }

      // Filtrar solo las futuras a partir de la fecha actual
      clasesABorrar = clasesABorrar.filter(c => c.fecha >= hoy && c.id !== claseId);

      // Obtener los IDs de turnos asociados
      const turnoIds = clasesABorrar
        .map(c => c.turno_cancha_id)
        .filter(id => id);

      // Verificar que existan
      for (const tId of turnoIds) {
        try {
          await base44SR.entities.TurnoCancha.read(tId);
          turnosABorrar.push(tId);
        } catch (e) {
          // Turno no existe
        }
      }

      // Actualizar la clase actual para quitar recurrencia
      await base44SR.entities.Clase.update(claseId, {
        es_recurrente: false,
        recurrencia_tipo: null,
        recurrencia_hasta: null,
        recurrencia_cantidad: null,
        serie_recurrente_id: null
      });
    } 
    // CASO 2: Abono/Alquiler recurrente
    else if (tipo === 'abono' && turnoId) {
      const turno = await base44.entities.TurnoCancha.read(turnoId);
      
      // Buscar todos los turnos con mismo cliente, cancha, hora y estado activo
      const allTurnos = await base44.entities.TurnoCancha.filter({
        cliente: turno.cliente,
        cancha: turno.cancha,
        hora_inicio: turno.hora_inicio,
        estado: 'activo'
      }, '-fecha');

      // Filtrar solo los futuros desde hoy
      turnosABorrar = allTurnos
        .filter(t => t.fecha >= hoy && t.id !== turnoId)
        .map(t => t.id);
    }

    // Eliminar turnos en lotes
    let conteoTurnos = 0;
    for (let i = 0; i < turnosABorrar.length; i += 5) {
      const batch = turnosABorrar.slice(i, i + 5);
      await Promise.all(batch.map(id => base44.entities.TurnoCancha.delete(id)));
      conteoTurnos += batch.length;
      if (i + 5 < turnosABorrar.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Eliminar clases futuras si aplica
    for (let i = 0; i < clasesABorrar.length; i += 5) {
      const batch = clasesABorrar.slice(i, i + 5);
      await Promise.all(batch.map(c => base44.entities.Clase.delete(c.id)));
      if (i + 5 < clasesABorrar.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return Response.json({ 
      success: true, 
      message: `Recurrencia eliminada. Se borraron ${conteoTurnos} turnos y ${clasesABorrar.length} clases.`
    });
  } catch (error) {
    console.error('Error en eliminarRecurrenciaClase:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});