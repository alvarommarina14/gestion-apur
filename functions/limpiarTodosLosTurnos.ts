import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Solo administradores' }, { status: 403 });
    }

    let stats = {
      recordatorios: 0,
      turnos: 0,
      clases: 0,
      cobros: 0,
      recuperos: 0
    };

    // 1. Borrar recordatorios de cancha
    const recordatorios = await base44.asServiceRole.entities.RecordatorioCancha.list(null, 1000);
    for (const rec of recordatorios) {
      await base44.asServiceRole.entities.RecordatorioCancha.delete(rec.id);
      stats.recordatorios++;
    }

    // 2. Borrar turnos de cancha
    const turnos = await base44.asServiceRole.entities.TurnoCancha.list(null, 1000);
    for (const turno of turnos) {
      await base44.asServiceRole.entities.TurnoCancha.delete(turno.id);
      stats.turnos++;
    }

    // 3. Borrar clases
    const clases = await base44.asServiceRole.entities.Clase.list(null, 1000);
    for (const clase of clases) {
      await base44.asServiceRole.entities.Clase.delete(clase.id);
      stats.clases++;
    }

    // 4. Borrar cobros de clientes
    const cobros = await base44.asServiceRole.entities.CobroCliente.list(null, 1000);
    for (const cobro of cobros) {
      await base44.asServiceRole.entities.CobroCliente.delete(cobro.id);
      stats.cobros++;
    }

    // 5. Borrar recuperos
    const recuperos = await base44.asServiceRole.entities.Recupero.list(null, 1000);
    for (const recupero of recuperos) {
      await base44.asServiceRole.entities.Recupero.delete(recupero.id);
      stats.recuperos++;
    }

    return Response.json({
      status: 'success',
      message: `Limpieza profunda completada. Total eliminado: ${Object.values(stats).reduce((a, b) => a + b, 0)} registros`,
      stats
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});