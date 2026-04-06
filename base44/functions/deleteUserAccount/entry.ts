import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all related data
    const alumnosToDelete = await base44.asServiceRole.entities.Alumno.filter({
      created_by: user.email,
    });

    for (const alumno of alumnosToDelete) {
      await base44.asServiceRole.entities.Alumno.delete(alumno.id);
    }

    // Delete user account
    const response = await fetch('https://api.base44.io/v1/auth/delete-account', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${req.headers.get('authorization')}`,
      },
    });

    if (!response.ok) {
      return Response.json(
        { error: 'Failed to delete account' },
        { status: response.status }
      );
    }

    return Response.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});