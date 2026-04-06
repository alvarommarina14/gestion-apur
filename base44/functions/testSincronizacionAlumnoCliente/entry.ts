import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const resultados = [];

    // TEST 1: Crear Alumno de prueba (simula crear desde Profesor)
    console.log('TEST 1: Crear Alumno...');
    const testAlumno = await base44.asServiceRole.entities.Alumno.create({
      nombre: 'TEST_Alumno_Sincronización',
      whatsapp: '+5493416969696',
      precio_mensual: 35000,
      clases_por_mes: 4,
      profesor_id: '6788cde7fff3f8fa88000001', // Santiago Galla
      profesor_nombre: 'Santiago Galla',
      estado: 'activo',
      observaciones: 'Alumno de prueba'
    });

    resultados.push({
      test: 1,
      alumnoCreado: {
        id: testAlumno.id,
        nombre: testAlumno.nombre,
        precio_mensual: testAlumno.precio_mensual
      }
    });

    // Esperar un poco a que la automatización procese
    await new Promise(r => setTimeout(r, 2000));

    // Verificar si se creó Cliente automáticamente
    console.log('Verificando si Cliente se creó...');
    const clienteCreado = await base44.asServiceRole.entities.Cliente.filter({
      nombre: 'TEST_Alumno_Sincronización',
      es_alumno: true
    });

    resultados.push({
      test: 1,
      clienteAutomatico: {
        existe: clienteCreado.length > 0,
        cliente: clienteCreado[0] || null
      }
    });

    // TEST 2: Crear Cliente como alumno (opuesto)
    console.log('\nTEST 2: Crear Cliente marcado como es_alumno...');
    const testCliente = await base44.asServiceRole.entities.Cliente.create({
      nombre: 'TEST_Cliente_Sincronización',
      telefono: '+5493416969697',
      precio: 35000,
      es_alumno: true,
      profesor_id: '6788cde7fff3f8fa88000001',
      profesor_nombre: 'Santiago Galla',
      clasificacion: 'recurrente',
      tipo_cliente: 'clase',
      activo: true
    });

    resultados.push({
      test: 2,
      clienteCreado: {
        id: testCliente.id,
        nombre: testCliente.nombre,
        precio: testCliente.precio,
        es_alumno: testCliente.es_alumno
      }
    });

    // Esperar a que procese
    await new Promise(r => setTimeout(r, 2000));

    // Verificar si se creó Alumno automáticamente
    console.log('Verificando si Alumno se creó...');
    const alumnoCreado = await base44.asServiceRole.entities.Alumno.filter({
      nombre: 'TEST_Cliente_Sincronización'
    });

    resultados.push({
      test: 2,
      alumnoAutomatico: {
        existe: alumnoCreado.length > 0,
        alumno: alumnoCreado[0] || null
      }
    });

    return Response.json({
      success: true,
      resultados,
      resumen: {
        test1_cliente_creado_desde_alumno: clienteCreado.length > 0,
        test2_alumno_creado_desde_cliente: alumnoCreado.length > 0,
        ambos_funcionan: clienteCreado.length > 0 && alumnoCreado.length > 0
      }
    });
  } catch (error) {
    console.error('Error en test:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});