import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Obtener todos los alumnos
    const alumnos = await base44.asServiceRole.entities.Alumno.list();
    
    // Obtener todos los clientes
    const clientes = await base44.asServiceRole.entities.Cliente.list();
    
    let sincronizados = 0;
    let errores = 0;

    // Por cada alumno, verificar si existe como cliente
    for (const alumno of alumnos) {
      try {
        // Buscar si ya existe un cliente con el mismo nombre y teléfono
        const clienteExistente = clientes.find(c => 
          c.nombre.toLowerCase() === alumno.nombre.toLowerCase() && 
          c.telefono === (alumno.whatsapp || '')
        );

        if (!clienteExistente) {
          // Obtener datos del profesor si existe
          let profesorNombre = '';
          if (alumno.profesor_id) {
            try {
              const profesor = await base44.asServiceRole.entities.Profesor.read(alumno.profesor_id);
              profesorNombre = profesor?.nombre || '';
            } catch (e) {
              console.log(`No se encontró profesor ${alumno.profesor_id}`);
            }
          }

          // Crear cliente sincronizado
          await base44.asServiceRole.entities.Cliente.create({
            nombre: alumno.nombre,
            telefono: alumno.whatsapp || '',
            email: '',
            clasificacion: 'recurrente',
            tipo_cliente: 'clase',
            notas: `Alumno sincronizado - Profesor: ${profesorNombre || 'Sin asignar'}`,
            activo: alumno.estado === 'activo',
          });
          
          sincronizados++;
          console.log(`✅ Alumno sincronizado: ${alumno.nombre}`);
        } else {
          console.log(`⏭️  Cliente ya existe: ${alumno.nombre}`);
        }
      } catch (err) {
        errores++;
        console.error(`❌ Error sincronizando ${alumno.nombre}:`, err.message);
      }
    }

    return Response.json({
      success: true,
      totalAlumnos: alumnos.length,
      sincronizados,
      errores,
      mensaje: `Se sincronizaron ${sincronizados} alumnos. ${errores} errores.`
    });

  } catch (error) {
    console.error('Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});