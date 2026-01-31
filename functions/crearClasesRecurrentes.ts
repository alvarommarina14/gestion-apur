import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { format, addWeeks, parseISO } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      fecha,
      hora_inicio,
      duracion,
      tipo,
      cancha,
      alumnos_ids,
      alumnos_nombres,
      precio,
      pagado,
      notas,
      es_recupero,
      clase_original_id,
    } = body;

    // Crear 52 clases de una vez
    const clasesData = [];
    for (let i = 0; i < 52; i++) {
      const fechaClase = addWeeks(parseISO(fecha), i);
      clasesData.push({
        fecha: format(fechaClase, 'yyyy-MM-dd'),
        hora_inicio,
        duracion: Number(duracion),
        tipo,
        sede: 'Sistema',
        cancha: cancha || '',
        alumnos_ids,
        alumnos_nombres,
        precio: precio ? Number(precio) : null,
        estado: 'programada',
        es_recupero: !!es_recupero,
        clase_original_id: clase_original_id || '',
        notas,
        asistencia_registrada: false,
        profesor_id: user.id,
        estado_aprobacion: user.rol === 'profesor' ? 'pendiente' : 'aprobada',
        es_recurrente: true,
        recurrencia_tipo: 'semanal',
      });
    }

    // Crear todas las clases en paralelo
    const clases = await Promise.all(
      clasesData.map(claseData => base44.entities.Clase.create(claseData))
    );

    // Si es admin, crear TurnoCancha para cada clase
    if (user.rol === 'admin') {
      const empleados = await base44.entities.User.list();
      const empleadosIds = empleados.map(e => e.id);
      const empleadosEmails = empleados.map(e => e.email);
      const empleadosNombres = empleados.map(e => e.full_name);

      const horaFin = calcularHoraFin(hora_inicio, duracion);
      const alumnosNombres = Array.isArray(alumnos_nombres) ? alumnos_nombres.join(', ') : alumnos_nombres;

      // Crear todos los turnos en paralelo
      await Promise.all(
        clases.map((clase) => {
          const [horas, minutos] = clase.fecha.split('-');
          return base44.entities.TurnoCancha.create({
            fecha: clase.fecha,
            hora_inicio,
            hora_fin: horaFin,
            duracion: Number(duracion),
            cancha: cancha || '',
            cliente: alumnosNombres || 'Clase',
            tipo_turno: 'clase',
            monto: precio ? Number(precio) : 0,
            pagado: !!pagado,
            empleados_asignados_ids: empleadosIds,
            empleados_asignados_emails: empleadosEmails,
            empleados_asignados_nombres: empleadosNombres,
            estado: 'activo',
            notas: notas || `Clase - ${alumnosNombres}`,
          });
        })
      );

      // Sincronizar con Google Calendar en paralelo
      await Promise.all(
        clases.map((clase) =>
          base44.functions.invoke('sincronizarClaseGoogleCalendar', { clase_id: clase.id }).catch(err => {
            console.error('Error sincronizando clase:', err);
          })
        )
      );
    }

    return Response.json({ 
      success: true, 
      clases_creadas: clases.length 
    });
  } catch (error) {
    console.error('Error en crearClasesRecurrentes:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calcularHoraFin(horaInicio, duracion) {
  if (!horaInicio) return '00:00';
  const [h, m] = horaInicio.split(':').map(Number);
  const inicio = new Date();
  inicio.setHours(h, m, 0);
  const minutos = inicio.getMinutes() + duracion;
  const horas = inicio.getHours() + Math.floor(minutos / 60);
  const mins = minutos % 60;
  return `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}