import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Solo admins' }, { status: 403 });
    }

    console.log('🗑️ Borrando turnos restantes...');

    // Obtener todos los turnos
    const todosTurnos = await base44.entities.TurnoCancha.list();
    console.log(`📋 Turnos encontrados: ${todosTurnos.length}`);

    // Obtener todos los recordatorios
    const todosRecordatorios = await base44.entities.RecordatorioCancha.list();
    console.log(`📋 Recordatorios encontrados: ${todosRecordatorios.length}`);

    // Eliminar recordatorios con delay para evitar rate limit
    for (const rec of todosRecordatorios) {
      await base44.entities.RecordatorioCancha.delete(rec.id);
      await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
    }
    console.log(`✅ ${todosRecordatorios.length} recordatorios eliminados`);

    // Eliminar turnos con delay
    for (const turno of todosTurnos) {
      await base44.entities.TurnoCancha.delete(turno.id);
      await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
    }
    console.log(`✅ ${todosTurnos.length} turnos eliminados`);

    return Response.json({ 
      success: true,
      turnosEliminados: todosTurnos.length,
      recordatoriosEliminados: todosRecordatorios.length
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});