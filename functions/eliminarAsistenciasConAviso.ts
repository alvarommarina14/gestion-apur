import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Obtener todas las asistencias con "ausente_con_aviso"
    const asistencias = await base44.asServiceRole.entities.Asistencia.list();
    const asistenciasConAviso = asistencias.filter(a => a.estado === 'ausente_con_aviso');

    // Eliminar en batches
    let eliminadas = 0;
    for (let i = 0; i < asistenciasConAviso.length; i += 10) {
      const batch = asistenciasConAviso.slice(i, i + 10);
      for (const asistencia of batch) {
        await base44.asServiceRole.entities.Asistencia.delete(asistencia.id);
        eliminadas++;
      }
      if (i + 10 < asistenciasConAviso.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return Response.json({
      message: `${eliminadas} asistencias eliminadas`,
      eliminadas
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});