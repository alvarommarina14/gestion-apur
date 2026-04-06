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

    // Borrar en paralelo con delays para evitar rate limit
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // 1. Recordatorios
    try {
      const recordatorios = await base44.asServiceRole.entities.RecordatorioCancha.filter({});
      for (const rec of recordatorios) {
        await base44.asServiceRole.entities.RecordatorioCancha.delete(rec.id);
        stats.recordatorios++;
        await delay(100);
      }
    } catch (e) {
      console.log('Recordatorios error:', e.message);
    }

    // 2. Turnos
    try {
      const turnos = await base44.asServiceRole.entities.TurnoCancha.filter({});
      for (const turno of turnos) {
        await base44.asServiceRole.entities.TurnoCancha.delete(turno.id);
        stats.turnos++;
        await delay(100);
      }
    } catch (e) {
      console.log('Turnos error:', e.message);
    }

    // 3. Clases
    try {
      const clases = await base44.asServiceRole.entities.Clase.filter({});
      for (const clase of clases) {
        await base44.asServiceRole.entities.Clase.delete(clase.id);
        stats.clases++;
        await delay(100);
      }
    } catch (e) {
      console.log('Clases error:', e.message);
    }

    // 4. Cobros
    try {
      const cobros = await base44.asServiceRole.entities.CobroCliente.filter({});
      for (const cobro of cobros) {
        await base44.asServiceRole.entities.CobroCliente.delete(cobro.id);
        stats.cobros++;
        await delay(100);
      }
    } catch (e) {
      console.log('Cobros error:', e.message);
    }

    // 5. Recuperos
    try {
      const recuperos = await base44.asServiceRole.entities.Recupero.filter({});
      for (const recupero of recuperos) {
        await base44.asServiceRole.entities.Recupero.delete(recupero.id);
        stats.recuperos++;
        await delay(100);
      }
    } catch (e) {
      console.log('Recuperos error:', e.message);
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