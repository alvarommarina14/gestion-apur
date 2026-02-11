import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Solo admin puede ejecutar esta función
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const hoy = new Date();
    const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

    // Traer todos los alumnos activos
    const alumnos = await base44.entities.Alumno.filter({ estado: 'activo' });

    // Traer cobros del mes actual
    const cobrosDelMes = await base44.entities.CobroCliente.filter({ mes: mesActual });
    const cobrosPorAlumno = new Set(cobrosDelMes.map(c => c.cliente_id));

    // Crear cobros para alumnos sin cobro en el mes
    const nuevosCobros = [];
    for (const alumno of alumnos) {
      if (!cobrosPorAlumno.has(alumno.id)) {
        nuevosCobros.push({
          cliente_id: alumno.id,
          cliente_nombre: alumno.nombre,
          tipo_cobro: 'abono_mensual',
          mes: mesActual,
          monto: alumno.precio_mensual,
          estado: 'pendiente',
          fecha_vencimiento: `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-15`
        });
      }
    }

    if (nuevosCobros.length > 0) {
      await base44.asServiceRole.entities.CobroCliente.bulkCreate(nuevosCobros);
    }

    return Response.json({ 
      success: true,
      message: `${nuevosCobros.length} cobros creados para alumnos recurrentes`,
      creados: nuevosCobros.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});