import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Obtener todos los alumnos
    const alumnos = await base44.asServiceRole.entities.Alumno.list();
    console.log(`📊 Encontrados ${alumnos.length} alumnos`);

    // Obtener todos los clientes
    const clientes = await base44.asServiceRole.entities.Cliente.list();
    console.log(`📊 Encontrados ${clientes.length} clientes`);

    let actualizados = 0;
    let creados = 0;
    let errores = 0;

    for (const alumno of alumnos) {
      try {
        // Buscar cliente por nombre
        const clienteExistente = clientes.find(c => 
          c.nombre.toLowerCase().trim() === alumno.nombre.toLowerCase().trim()
        );

        if (clienteExistente) {
          // Actualizar cliente existente
          await base44.asServiceRole.entities.Cliente.update(clienteExistente.id, {
            tipo_cliente: 'clase',
            precio: alumno.precio_mensual || 0,
            es_alumno: true,
            profesor_id: alumno.profesor_id || '',
            profesor_nombre: alumno.profesor_nombre || 'Sin asignar',
            clasificacion: 'recurrente',
            notas: clienteExistente.notas || `Alumno sincronizado - Profesor: ${alumno.profesor_nombre || 'Sin asignar'}`,
            activo: alumno.estado === 'activo'
          });
          actualizados++;
          console.log(`✅ Cliente actualizado: ${alumno.nombre}`);
        } else {
          // Crear nuevo cliente si no existe
          await base44.asServiceRole.entities.Cliente.create({
            nombre: alumno.nombre,
            telefono: alumno.whatsapp || '',
            email: '',
            precio: alumno.precio_mensual || 0,
            tipo_cliente: 'clase',
            es_alumno: true,
            profesor_id: alumno.profesor_id || '',
            profesor_nombre: alumno.profesor_nombre || 'Sin asignar',
            clasificacion: 'recurrente',
            notas: `Alumno sincronizado - Profesor: ${alumno.profesor_nombre || 'Sin asignar'}`,
            activo: alumno.estado === 'activo'
          });
          creados++;
          console.log(`➕ Cliente creado: ${alumno.nombre}`);
        }
      } catch (err) {
        console.error(`❌ Error con alumno ${alumno.nombre}:`, err);
        errores++;
      }
    }

    return Response.json({
      success: true,
      actualizados,
      creados,
      errores,
      total: alumnos.length
    });

  } catch (error) {
    console.error('Error en reparación:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});