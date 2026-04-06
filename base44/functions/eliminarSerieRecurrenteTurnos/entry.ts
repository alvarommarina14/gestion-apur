import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { format, parseISO } from 'npm:date-fns@3.6.0';
import { es } from 'npm:date-fns@3.6.0/locale';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { turno_id } = await req.json();

    if (!turno_id) {
      return Response.json({ error: 'turno_id requerido' }, { status: 400 });
    }

    console.log('🗑️ Iniciando eliminación de serie recurrente...');

    // Obtener turno original
    const todosTurnos = await base44.asServiceRole.entities.TurnoCancha.list();
    const turnoData = todosTurnos.find(t => t.id === turno_id);

    if (!turnoData) {
      return Response.json({ error: 'Turno no encontrado' }, { status: 404 });
    }

    // Verificar si es recurrente
    const recordatorios = await base44.asServiceRole.entities.RecordatorioCancha.filter({ 
      turno_cancha_id: turno_id 
    });
    
    const recordatorioBase = recordatorios[0];

    if (!recordatorioBase?.repeticion_semanal) {
      return Response.json({ 
        error: 'Este turno no es recurrente',
        success: false 
      }, { status: 400 });
    }

    // Encontrar todos los turnos de la serie
    const turnosRelacionados = todosTurnos.filter(t => 
      t.cliente === turnoData.cliente &&
      t.cancha === turnoData.cancha &&
      t.hora_inicio === turnoData.hora_inicio &&
      format(parseISO(t.fecha), 'EEEE', { locale: es }) === 
        format(parseISO(turnoData.fecha), 'EEEE', { locale: es }) &&
      new Date(t.fecha) >= new Date(turnoData.fecha)
    );

    console.log(`🗑️ Encontrados ${turnosRelacionados.length} turnos relacionados`);

    // Eliminar de Google Calendar (el primero con gcal_event_id)
    const primerTurnoConGcal = turnosRelacionados.find(t => t.gcal_event_id);
    if (primerTurnoConGcal?.gcal_event_id) {
      try {
        console.log('🔥 Eliminando serie de Google Calendar...');
        await base44.functions.invoke('sincronizarSerieRecurrenteGoogleCalendar', {
          recurringEventId: primerTurnoConGcal.gcal_event_id
        });
        console.log('✅ Google Calendar sincronizado');
      } catch (err) {
        console.error('⚠️ No se pudo eliminar de Google Calendar:', err.message);
        // Continuar de todas formas
      }
    }

    // Obtener recordatorios relacionados
    const todosRecordatorios = await base44.asServiceRole.entities.RecordatorioCancha.list();
    const recordatoriosRelacionados = todosRecordatorios.filter(r => 
      turnosRelacionados.some(t => t.id === r.turno_cancha_id)
    );

    console.log(`🗑️ Eliminando ${recordatoriosRelacionados.length} recordatorios y ${turnosRelacionados.length} turnos...`);

    // Eliminar secuencialmente con pequeños delays para evitar rate limit
    const BATCH_SIZE = 10;
    const DELAY_MS = 100;

    // Eliminar recordatorios en batches
    for (let i = 0; i < recordatoriosRelacionados.length; i += BATCH_SIZE) {
      const batch = recordatoriosRelacionados.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(rec => 
          base44.asServiceRole.entities.RecordatorioCancha.delete(rec.id)
            .catch(e => console.error(`Error eliminando recordatorio ${rec.id}:`, e.message))
        )
      );
      if (i + BATCH_SIZE < recordatoriosRelacionados.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    console.log(`✅ ${recordatoriosRelacionados.length} recordatorios eliminados`);

    // Eliminar turnos en batches
    for (let i = 0; i < turnosRelacionados.length; i += BATCH_SIZE) {
      const batch = turnosRelacionados.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(turno => 
          base44.asServiceRole.entities.TurnoCancha.delete(turno.id)
            .catch(e => console.error(`Error eliminando turno ${turno.id}:`, e.message))
        )
      );
      if (i + BATCH_SIZE < turnosRelacionados.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    console.log(`✅ ${turnosRelacionados.length} turnos eliminados`);

    return Response.json({
      success: true,
      mensaje: `Serie recurrente eliminada: ${recordatoriosRelacionados.length} recordatorios y ${turnosRelacionados.length} turnos`,
      turnosEliminados: turnosRelacionados.length,
      recordatoriosEliminados: recordatoriosRelacionados.length
    });

  } catch (error) {
    console.error('❌ Error eliminando serie:', error);
    return Response.json({ 
      error: error.message || 'Error al eliminar la serie',
      success: false 
    }, { status: 500 });
  }
});