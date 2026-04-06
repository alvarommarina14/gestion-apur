import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener todas las clases
    const allClases = await base44.asServiceRole.entities.Clase.list('-fecha', 500);
    
    // Filtrar clases que NO fueron creadas por el usuario actual
    const clasesABorrar = allClases.filter(clase => clase.created_by !== user.email);
    
    // Borrar cada clase
    let deletedCount = 0;
    for (const clase of clasesABorrar) {
      try {
        await base44.asServiceRole.entities.Clase.delete(clase.id);
        deletedCount++;
      } catch (e) {
        console.error(`Error al borrar clase ${clase.id}:`, e);
      }
    }

    return Response.json({ 
      mensaje: `✅ Se borraron ${deletedCount} clases de ejemplo`,
      totalBorradas: deletedCount
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});