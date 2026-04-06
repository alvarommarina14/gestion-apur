import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Solo procesar creación de usuarios
    if (event.type !== 'create' || event.entity_name !== 'User') {
      return Response.json({ success: true, message: 'Not a user creation event' });
    }

    console.log('🆕 Nuevo usuario creado:', data.email);

    // Verificar si ya existe un empleado con ese email
    const empleadosExistentes = await base44.asServiceRole.entities.Empleado.filter({
      email_gmail: data.email
    });

    if (empleadosExistentes.length > 0) {
      console.log('✅ Empleado ya existe para:', data.email);
      return Response.json({ 
        success: true, 
        message: 'Empleado ya existe',
        empleado_id: empleadosExistentes[0].id 
      });
    }

    // Crear empleado automáticamente
    const empleado = await base44.asServiceRole.entities.Empleado.create({
      nombre: data.full_name || data.email.split('@')[0],
      email_gmail: data.email,
      tel: '', // Se completará manualmente
      activo: true,
      rol: data.role || 'empleado',
    });

    console.log('✅ Empleado creado automáticamente:', empleado.id);

    return Response.json({
      success: true,
      message: 'Empleado creado',
      empleado_id: empleado.id,
    });

  } catch (error) {
    console.error('❌ Error creando empleado:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});