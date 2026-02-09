import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Obtener todos los alumnos
    const alumnos = await base44.asServiceRole.entities.Alumno.list();
    let sincronizados = 0;
    let errores = [];

    // Para cada alumno, buscar su cliente correspondiente y sincronizar precio
    for (const alumno of alumnos) {
      if (!alumno.precio_mensual) continue;

      try {
        // Buscar cliente con el mismo nombre
        const clientes = await base44.asServiceRole.entities.Cliente.filter({
          nombre: alumno.nombre
        });

        if (clientes.length > 0) {
          const cliente = clientes[0];
          // Actualizar precio del cliente si es diferente
          if (cliente.precio !== alumno.precio_mensual) {
            await base44.asServiceRole.entities.Cliente.update(cliente.id, {
              precio: alumno.precio_mensual
            });
            sincronizados++;
          }
        }
      } catch (error) {
        errores.push({
          alumno: alumno.nombre,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      sincronizados,
      errores,
      mensaje: `${sincronizados} clientes sincronizados exitosamente`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});