import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { profesorNombre, hora, fecha } = body;

    // Buscar la clase de Santiago Galla a las 09:00
    const clases = await base44.entities.Clase.filter({
      hora_inicio: hora || '09:00',
      profesor: profesorNombre || 'Santiago Galla'
    });

    if (!clases || clases.length === 0) {
      return Response.json({ error: 'Clase no encontrada' }, { status: 404 });
    }

    // Tomar la primera clase que coincida
    const clase = clases[0];

    // Actualizar como recurrente
    await base44.entities.Clase.update(clase.id, {
      es_recurrente: true,
      recurrencia_tipo: 'semanal'
    });

    return Response.json({ 
      success: true, 
      message: `Clase ${clase.id} marcada como recurrente`,
      clase: clase.id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});