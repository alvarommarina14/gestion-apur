import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { startOfMonth, endOfMonth, parseISO } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { tipo, periodo, profesor_id, tipos_cobro } = await req.json();

    let eliminados = 0;

    if (tipo === 'periodo') {
      // Limpiar por período (turnos, clases, cobros)
      const [mes, año] = periodo.split('-');
      const inicio = startOfMonth(parseISO(`${año}-${mes}-01`));
      const fin = endOfMonth(inicio);
      const inicioStr = inicio.toISOString().split('T')[0];
      const finStr = fin.toISOString().split('T')[0];

      // Eliminar turnos del período
      const turnos = await base44.asServiceRole.entities.TurnoCancha.list();
      const turnosPeriodo = turnos.filter(t =>
        t.fecha >= inicioStr && t.fecha <= finStr
      );
      for (const turno of turnosPeriodo) {
        await base44.asServiceRole.entities.TurnoCancha.delete(turno.id);
        eliminados++;
      }

      // Eliminar clases del período
      const clases = await base44.asServiceRole.entities.Clase.list();
      const clasesPeriodo = clases.filter(c =>
        c.fecha >= inicioStr && c.fecha <= finStr
      );
      for (const clase of clasesPeriodo) {
        await base44.asServiceRole.entities.Clase.delete(clase.id);
        eliminados++;
      }

      // Eliminar pagos del período
      const pagos = await base44.asServiceRole.entities.Pago.list();
      const pagosPeriodo = pagos.filter(p => p.mes_correspondiente === periodo);
      for (const pago of pagosPeriodo) {
        await base44.asServiceRole.entities.Pago.delete(pago.id);
        eliminados++;
      }

      // Eliminar cobros del período
      const cobrosClientes = await base44.asServiceRole.entities.CobroCliente.list();
      const cobrosClientes Periodo = cobrosClientes.filter(c => c.mes === periodo);
      for (const cobro of cobrosClientesPeriodo) {
        await base44.asServiceRole.entities.CobroCliente.delete(cobro.id);
        eliminados++;
      }
    } else if (tipo === 'profesor') {
      // Limpiar por profesor (clases y pagos)
      const clases = await base44.asServiceRole.entities.Clase.list();
      const clasesProfesor = clases.filter(c => c.profesor_id === profesor_id);
      for (const clase of clasesProfesor) {
        await base44.asServiceRole.entities.Clase.delete(clase.id);
        eliminados++;
      }

      // Eliminar asistencias del profesor
      const asistencias = await base44.asServiceRole.entities.Asistencia.list();
      const asistenciasProfesor = asistencias.filter(a =>
        clasesProfesor.some(c => c.id === a.clase_id)
      );
      for (const asistencia of asistenciasProfesor) {
        await base44.asServiceRole.entities.Asistencia.delete(asistencia.id);
        eliminados++;
      }

      // Eliminar pagos del profesor
      const alumnos = await base44.asServiceRole.entities.Alumno.list();
      const alumnosProfesor = alumnos.filter(a => a.profesor_id === profesor_id);
      const pagos = await base44.asServiceRole.entities.Pago.list();
      const pagosProfesor = pagos.filter(p =>
        alumnosProfesor.some(a => a.id === p.alumno_id)
      );
      for (const pago of pagosProfesor) {
        await base44.asServiceRole.entities.Pago.delete(pago.id);
        eliminados++;
      }
    } else if (tipo === 'cobros') {
      // Limpiar cobros específicos
      const cobrosClientes = await base44.asServiceRole.entities.CobroCliente.list();
      const cobrosFiltrados = cobrosClientes.filter(c =>
        tipos_cobro.includes(c.tipo_cobro)
      );
      for (const cobro of cobrosFiltrados) {
        await base44.asServiceRole.entities.CobroCliente.delete(cobro.id);
        eliminados++;
      }
    }

    return Response.json({
      success: true,
      message: `Se eliminaron ${eliminados} registros`,
      eliminados,
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});