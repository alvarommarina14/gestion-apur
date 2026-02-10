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
    const recordatorios = await base44.asServiceRole.entities.RecordatorioCancha.filter({});
    const recIds = recordatorios.map(r => r.id);
    if (recIds.length > 0) {
      for (let i = 0; i < recIds.length; i += 10) {
        const batch = recIds.slice(i, i + 10);
        for (const id of batch) {
          await base44.asServiceRole.entities.RecordatorioCancha.delete(id);
          stats.recordatorios++;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 2. Borrar turnos de cancha
    const turnos = await base44.asServiceRole.entities.TurnoCancha.filter({});
    const turnoIds = turnos.map(t => t.id);
    if (turnoIds.length > 0) {
      for (let i = 0; i < turnoIds.length; i += 10) {
        const batch = turnoIds.slice(i, i + 10);
        for (const id of batch) {
          await base44.asServiceRole.entities.TurnoCancha.delete(id);
          stats.turnos++;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 3. Borrar clases
    const clases = await base44.asServiceRole.entities.Clase.filter({});
    const claseIds = clases.map(c => c.id);
    if (claseIds.length > 0) {
      for (let i = 0; i < claseIds.length; i += 10) {
        const batch = claseIds.slice(i, i + 10);
        for (const id of batch) {
          await base44.asServiceRole.entities.Clase.delete(id);
          stats.clases++;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 4. Borrar cobros
    const cobros = await base44.asServiceRole.entities.CobroCliente.filter({});
    const cobroIds = cobros.map(c => c.id);
    if (cobroIds.length > 0) {
      for (let i = 0; i < cobroIds.length; i += 10) {
        const batch = cobroIds.slice(i, i + 10);
        for (const id of batch) {
          await base44.asServiceRole.entities.CobroCliente.delete(id);
          stats.cobros++;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 5. Borrar recuperos
    const recuperos = await base44.asServiceRole.entities.Recupero.filter({});
    const recuperoIds = recuperos.map(r => r.id);
    if (recuperoIds.length > 0) {
      for (let i = 0; i < recuperoIds.length; i += 10) {
        const batch = recuperoIds.slice(i, i + 10);
        for (const id of batch) {
          await base44.asServiceRole.entities.Recupero.delete(id);
          stats.recuperos++;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
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