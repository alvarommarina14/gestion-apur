import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Solo admin
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Solo admins pueden hacer esto' }, { status: 403 });
    }

    console.log('🗑️ Iniciando limpieza completa...');

    // 1. Obtener todos los turnos
    const todosTurnos = await base44.entities.TurnoCancha.list();
    console.log(`📋 Turnos encontrados: ${todosTurnos.length}`);

    // 2. Obtener todos los recordatorios
    const todosRecordatorios = await base44.entities.RecordatorioCancha.list();
    console.log(`📋 Recordatorios encontrados: ${todosRecordatorios.length}`);

    // 3. Eliminar recordatorios
    for (const rec of todosRecordatorios) {
      await base44.entities.RecordatorioCancha.delete(rec.id);
    }
    console.log(`✅ ${todosRecordatorios.length} recordatorios eliminados`);

    // 4. Eliminar turnos y recolectar IDs de Google Calendar
    const gcalEventIds = [];
    for (const turno of todosTurnos) {
      if (turno.gcal_event_id) {
        gcalEventIds.push(turno.gcal_event_id);
      }
      await base44.entities.TurnoCancha.delete(turno.id);
    }
    console.log(`✅ ${todosTurnos.length} turnos eliminados`);

    // 5. Eliminar eventos de Google Calendar
    if (gcalEventIds.length > 0) {
      console.log(`🗓️ Intentando eliminar ${gcalEventIds.length} eventos de Google Calendar...`);
      try {
        await base44.functions.invoke('limpiarGoogleCalendar');
        console.log(`✅ Google Calendar limpiado`);
      } catch (err) {
        console.warn('⚠️ Error limpiando Google Calendar:', err.message);
      }
    }

    return Response.json({ 
      success: true,
      mensaje: 'Base de datos limpiada completamente',
      datos: {
        turnosEliminados: todosTurnos.length,
        recordatoriosEliminados: todosRecordatorios.length,
        eventosGoogleCalendar: gcalEventIds.length
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});