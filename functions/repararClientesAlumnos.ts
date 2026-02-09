import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Obtener o crear profesor "Santiago Galla"
    const profesores = await base44.asServiceRole.entities.Profesor.list();
    let profesor = profesores.find(p => p.nombre.toLowerCase() === 'santiago galla');

    if (!profesor) {
      profesor = await base44.asServiceRole.entities.Profesor.create({
        nombre: 'Santiago Galla',
        email: 'santiago@example.com',
        telefono: '',
        especialidad: '',
        activo: true,
      });
    }

    // Obtener clientes con profesor inválido
    const clientes = await base44.asServiceRole.entities.Cliente.list();
    const clientesAActualizar = clientes.filter(c => 
      c.es_alumno && 
      (c.profesor_nombre === 'Santiago Galla' || c.nombre === 'Jorge Regules' || c.nombre === 'Florentino Gascon')
    );

    let actualizados = 0;
    for (const cliente of clientesAActualizar) {
      await base44.asServiceRole.entities.Cliente.update(cliente.id, {
        profesor_id: profesor.id,
        profesor_nombre: profesor.nombre,
      });
      actualizados++;
    }

    // Ahora sincronizar alumnos
    const alumnosExistentes = await base44.asServiceRole.entities.Alumno.list();
    const alumnosMap = new Map(alumnosExistentes.map(a => [a.nombre.toLowerCase(), a]));

    let sincronizados = 0;
    for (const cliente of clientesAActualizar) {
      const nombreLower = cliente.nombre.toLowerCase();
      
      if (alumnosMap.has(nombreLower)) {
        continue;
      }

      const nuevoAlumno = await base44.asServiceRole.entities.Alumno.create({
        profesor_id: profesor.id,
        profesor_nombre: profesor.nombre,
        nombre: cliente.nombre,
        whatsapp: cliente.telefono || '',
        observaciones: cliente.notas || '',
        estado: 'activo',
        precio_mensual: cliente.precio || 0,
        clases_por_mes: 0,
        clases_a_recuperar: 0,
        deuda_total: 0,
        total_clases_asistidas: 0,
      });
      
      sincronizados++;
    }

    return Response.json({ 
      message: 'Reparación completada',
      profesor: profesor.nombre,
      clientesActualizados: actualizados,
      alumnosCreados: sincronizados,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});