import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Solo administradores pueden eliminar turnos' }, { status: 403 });
    }

    // Obtener todos los turnos
    const todosTurnos = await base44.asServiceRole.entities.TurnoCancha.list();
    console.log(`📋 Encontrados ${todosTurnos.length} turnos para eliminar`);

    // Eliminar recordatorios asociados
    const todosRecordatorios = await base44.asServiceRole.entities.RecordatorioCancha.list();
    let recordatoriosEliminados = 0;
    
    for (const recordatorio of todosRecordatorios) {
      await base44.asServiceRole.entities.RecordatorioCancha.delete(recordatorio.id);
      recordatoriosEliminados++;
    }
    console.log(`✅ ${recordatoriosEliminados} recordatorios eliminados`);

    // Eliminar todos los turnos
    let turnosEliminados = 0;
    for (const turno of todosTurnos) {
      await base44.asServiceRole.entities.TurnoCancha.delete(turno.id);
      turnosEliminados++;
    }
    console.log(`✅ ${turnosEliminados} turnos eliminados`);

    return Response.json({ 
      success: true, 
      turnosEliminados,
      recordatoriosEliminados,
      mensaje: `Se eliminaron ${turnosEliminados} turnos y ${recordatoriosEliminados} recordatorios` 
    });

  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});