import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { format, startOfMonth, endOfMonth, parseISO } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const ahora = new Date();
    const inicio = startOfMonth(ahora);
    const fin = endOfMonth(ahora);

    // Obtener todos los turnos del mes
    const turnos = await base44.asServiceRole.entities.TurnoCancha.list();
    
    const turnosDelMes = turnos.filter(t => {
      const fecha = parseISO(t.fecha);
      return fecha >= inicio && fecha <= fin;
    });

    // Eliminar cada turno
    let eliminados = 0;
    for (const turno of turnosDelMes) {
      await base44.asServiceRole.entities.TurnoCancha.delete(turno.id);
      eliminados++;
    }

    return Response.json({ 
      message: 'Turnos eliminados',
      eliminados,
      periodo: `${format(inicio, 'yyyy-MM-dd')} a ${format(fin, 'yyyy-MM-dd')}`,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});