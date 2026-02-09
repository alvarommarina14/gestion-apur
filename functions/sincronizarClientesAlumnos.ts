import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Solo admins pueden ejecutar esto
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Obtener todos los clientes
    const clientes = await base44.asServiceRole.entities.Cliente.list();
    
    // Filtrar clientes que son alumnos y tienen profesor
    const clientesConProfesor = clientes.filter(c => 
      c.es_alumno && c.profesor_id && c.profesor_id.trim() !== ''
    );

    if (clientesConProfesor.length === 0) {
      return Response.json({ 
        message: 'No hay clientes para sincronizar',
        sincronizados: 0 
      });
    }

    // Obtener alumnos existentes
    const alumnosExistentes = await base44.asServiceRole.entities.Alumno.list();
    const alumnosMap = new Map(alumnosExistentes.map(a => [a.nombre.toLowerCase(), a]));

    let sincronizados = 0;
    const creados = [];
    const errores = [];

    // Crear alumnos para los clientes que no existen
    for (const cliente of clientesConProfesor) {
      try {
        const nombreLower = cliente.nombre.toLowerCase();
        
        // Si ya existe con mismo profesor, saltar
        if (alumnosMap.has(nombreLower)) {
          const alumnoExistente = alumnosMap.get(nombreLower);
          if (alumnoExistente.profesor_id === cliente.profesor_id) {
            continue; // Ya sincronizado
          }
        }

        // Validar que el profesor existe
        let profesor;
        try {
          profesor = await base44.asServiceRole.entities.Profesor.read(cliente.profesor_id);
        } catch (e) {
          errores.push({
            cliente: cliente.nombre,
            error: `Profesor con ID ${cliente.profesor_id} no existe`
          });
          continue;
        }

        // Crear el alumno
        const nuevoAlumno = await base44.asServiceRole.entities.Alumno.create({
          profesor_id: cliente.profesor_id,
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
        creados.push(cliente.nombre);
        alumnosMap.set(nombreLower, nuevoAlumno);
      } catch (err) {
        errores.push({
          cliente: cliente.nombre,
          error: err.message
        });
      }
    }

    return Response.json({ 
      message: 'Sincronización completada',
      sincronizados,
      creados,
      totalClientes: clientesConProfesor.length,
      errores: errores.length > 0 ? errores : []
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});