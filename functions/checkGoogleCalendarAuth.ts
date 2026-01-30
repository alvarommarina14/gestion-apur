import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'No autorizado' }, { status: 403 });
    }

    try {
      // Intentar obtener el token
      const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');
      
      if (accessToken) {
        return Response.json({ authorized: true });
      } else {
        return Response.json({ authorized: false });
      }
    } catch (error) {
      return Response.json({ authorized: false });
    }
  } catch (error) {
    return Response.json({ error: error.message, authorized: false }, { status: 500 });
  }
});