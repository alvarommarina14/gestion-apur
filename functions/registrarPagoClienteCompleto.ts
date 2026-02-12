import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cobro_id, cliente_id, cliente_nombre, fecha_pago, medio_pago, monto, notas, mes, tipo_cobro } = await req.json();

    let cobroIdReal = cobro_id;

    // Si es un cobro virtual (empieza con 'virtual-'), crear uno real en la BD
    if (cobro_id.startsWith('virtual-')) {
      const nuevoCobroData = {
        cliente_id,
        cliente_nombre,
        tipo_cobro: tipo_cobro || 'abono_mensual',
        mes,
        monto: parseFloat(monto),
        estado: 'pagado',
        fecha_pago,
        medio_pago,
        notas,
      };
      const cobroCreado = await base44.entities.CobroCliente.create(nuevoCobroData);
      cobroIdReal = cobroCreado.id;
    } else {
      // Si no es virtual, actualizar el cobro existente
      await base44.entities.CobroCliente.update(cobroIdReal, {
        estado: 'pagado',
        fecha_pago,
        medio_pago,
        notas,
      });
    }

    // Buscar si el cliente es un alumno y crear el Pago correspondiente
    const cliente = await base44.entities.Cliente.read(cliente_id);
    
    if (cliente && cliente.es_alumno) {
      // Buscar el alumno correspondiente por nombre
      const alumnos = await base44.entities.Alumno.filter({ 
        nombre: cliente_nombre 
      });
      
      if (alumnos.length > 0) {
        const alumno = alumnos[0];
        
        // Verificar si ya existe un pago para este mes
        const pagosExistentes = await base44.entities.Pago.filter({
          alumno_id: alumno.id,
          mes_correspondiente: mes
        });
        
        if (pagosExistentes.length === 0) {
          // Crear el registro en Pago
          await base44.entities.Pago.create({
            alumno_id: alumno.id,
            alumno_nombre: alumno.nombre,
            fecha: fecha_pago,
            monto: parseFloat(monto),
            medio_pago: medio_pago,
            mes_correspondiente: mes,
            notas: notas || `Pago registrado desde Clientes`
          });
        }
        
        // Invocar sincronización para actualizar deuda_total del alumno
        await base44.functions.invoke('sincronizarPagosCompleto', {
          tipo_evento: 'cliente_pago',
          clienteId: cliente_id,
          monto: parseFloat(monto),
          fecha: fecha_pago,
          mes: mes,
          medio_pago: medio_pago
        });
      }
    } else {
      // Si es cliente sin alumno, también sincronizar para actualizar deuda_total
      await base44.functions.invoke('sincronizarPagosCompleto', {
        tipo_evento: 'cliente_pago',
        clienteId: cliente_id,
        monto: parseFloat(monto),
        fecha: fecha_pago,
        mes: mes,
        medio_pago: medio_pago
      });
    }

    return Response.json({ 
      success: true, 
      message: 'Pago registrado exitosamente',
      cobro_id: cobroIdReal
    });
  } catch (error) {
    console.error('Error en registrarPagoClienteCompleto:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});