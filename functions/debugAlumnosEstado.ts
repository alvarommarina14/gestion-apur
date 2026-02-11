import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Traer datos para febrero 2026
    const mes = '2026-02';
    
    const [alumnos, cobros, turnos] = await Promise.all([
      base44.entities.Alumno.list(),
      base44.entities.CobroCliente.filter({ mes }),
      base44.entities.TurnoCancha.list(),
    ]);

    // Buscar turnos de clase para el mes de febrero
    const clasesEnFebrero = turnos.filter(t => {
      const turnoMes = t.fecha.substring(0, 7);
      return t.tipo_turno === 'clase' && turnoMes === mes && t.alumnos_ids?.length > 0;
    });

    // Mapear alumnos a cobros
    const alumnosDebug = [];
    clasesEnFebrero.forEach(turno => {
      turno.alumnos_ids.forEach((alumnoId, idx) => {
        const alumno = alumnos.find(a => a.id === alumnoId);
        if (alumno) {
          alumnosDebug.push({
            nombre: alumno.nombre,
            alumno_id: alumnoId,
            profesor: turno.profesor,
            cliente_nombre: turno.cliente,
            estado_mes_actual: alumno.estado_mes_actual,
            precio_mensual: alumno.precio_mensual,
            cobros_relacionados: cobros.filter(c => 
              c.cliente_nombre === turno.cliente || 
              c.cliente_id === alumnoId
            ),
          });
        }
      });
    });

    return Response.json({
      mes,
      total_alumnos_en_clases: alumnosDebug.length,
      total_cobros: cobros.length,
      alumnos: alumnosDebug,
      cobros,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});