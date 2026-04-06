import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Solo admin' }, { status: 403 });
    }

    const hoy = new Date();
    const diaDelMes = hoy.getDate();
    const mesActual = hoy.toISOString().substring(0, 7); // YYYY-MM

    const clientes = await base44.entities.Cliente.list();

    for (const cliente of clientes) {
      // Día 1: Reset a "pendiente" (nuevo mes)
      if (diaDelMes === 1) {
        if (cliente.estado !== 'pagado') {
          await base44.entities.Cliente.update(cliente.id, { estado: 'pendiente' });
        }
      }
      // Día 16+: Marcar como "moroso" si sigue "pendiente"
      else if (diaDelMes >= 16 && cliente.estado === 'pendiente') {
        await base44.entities.Cliente.update(cliente.id, { estado: 'moroso' });
      }
    }

    return Response.json({ 
      success: true, 
      message: `Estados actualizados - Día ${diaDelMes}`,
      clientesProcesados: clientes.length 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});