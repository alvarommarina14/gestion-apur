import { base44 } from '@/api/base44Client';

/**
 * Registra un evento de auditoría en el sistema
 */
export async function registrarAuditoria({
  entidad,
  entidad_id,
  entidad_nombre,
  accion,
  campo_modificado,
  valor_anterior,
  valor_nuevo,
  motivo,
}) {
  try {
    const user = await base44.auth.me();
    
    await base44.entities.LogAuditoria.create({
      entidad,
      entidad_id,
      entidad_nombre,
      accion,
      campo_modificado,
      valor_anterior: valor_anterior ? String(valor_anterior) : null,
      valor_nuevo: valor_nuevo ? String(valor_nuevo) : null,
      motivo,
      fecha: new Date().toISOString(),
      created_by: user.email,
    });
  } catch (error) {
    console.error('Error registrando auditoría:', error);
  }
}

/**
 * Registra cambios en permisos de usuario
 */
export async function registrarCambioPermisos(usuario, cambios, motivo = 'Actualización de permisos') {
  await registrarAuditoria({
    entidad: 'PermisoUsuario',
    entidad_id: usuario.id,
    entidad_nombre: usuario.full_name || usuario.email,
    accion: 'editar',
    campo_modificado: 'permisos',
    valor_anterior: null,
    valor_nuevo: JSON.stringify(cambios),
    motivo,
  });
}

/**
 * Registra aprobación o rechazo de usuario
 */
export async function registrarAprobacionUsuario(usuario, aprobado) {
  await registrarAuditoria({
    entidad: 'User',
    entidad_id: usuario.id,
    entidad_nombre: usuario.full_name,
    accion: 'cambio_estado',
    campo_modificado: 'estado_aprobacion',
    valor_anterior: 'pendiente',
    valor_nuevo: aprobado ? 'aprobado' : 'rechazado',
    motivo: aprobado ? 'Usuario aprobado por administrador' : 'Usuario rechazado por administrador',
  });
}

/**
 * Registra aprobación o rechazo de clase
 */
export async function registrarAprobacionClase(clase, aprobado) {
  await registrarAuditoria({
    entidad: 'Clase',
    entidad_id: clase.id,
    entidad_nombre: `Clase ${clase.fecha} - ${clase.hora_inicio}`,
    accion: 'cambio_estado',
    campo_modificado: 'estado_aprobacion',
    valor_anterior: 'pendiente',
    valor_nuevo: aprobado ? 'aprobada' : 'rechazada',
    motivo: aprobado ? 'Clase aprobada por administrador' : 'Clase rechazada por administrador',
  });
}

/**
 * Registra modificación de datos de cliente
 */
export async function registrarCambioCliente(clienteId, clienteNombre, campo, valorAnterior, valorNuevo) {
  await registrarAuditoria({
    entidad: 'Cliente',
    entidad_id: clienteId,
    entidad_nombre: clienteNombre,
    accion: 'editar',
    campo_modificado: campo,
    valor_anterior: valorAnterior,
    valor_nuevo: valorNuevo,
    motivo: `Actualización de ${campo}`,
  });
}

/**
 * Registra modificación de datos de alumno
 */
export async function registrarCambioAlumno(alumnoId, alumnoNombre, campo, valorAnterior, valorNuevo) {
  await registrarAuditoria({
    entidad: 'Alumno',
    entidad_id: alumnoId,
    entidad_nombre: alumnoNombre,
    accion: 'editar',
    campo_modificado: campo,
    valor_anterior: valorAnterior,
    valor_nuevo: valorNuevo,
    motivo: `Actualización de ${campo}`,
  });
}

/**
 * Registra modificación de datos de profesor
 */
export async function registrarCambioProfesor(profesorId, profesorNombre, campo, valorAnterior, valorNuevo) {
  await registrarAuditoria({
    entidad: 'Profesor',
    entidad_id: profesorId,
    entidad_nombre: profesorNombre,
    accion: 'editar',
    campo_modificado: campo,
    valor_anterior: valorAnterior,
    valor_nuevo: valorNuevo,
    motivo: `Actualización de ${campo}`,
  });
}

/**
 * Registra creación de entidad
 */
export async function registrarCreacion(entidad, entidad_id, entidad_nombre) {
  await registrarAuditoria({
    entidad,
    entidad_id,
    entidad_nombre,
    accion: 'crear',
    motivo: `Nuevo ${entidad} creado`,
  });
}

/**
 * Registra eliminación de entidad
 */
export async function registrarEliminacion(entidad, entidad_id, entidad_nombre, motivo) {
  await registrarAuditoria({
    entidad,
    entidad_id,
    entidad_nombre,
    accion: 'eliminar',
    motivo: motivo || `${entidad} eliminado`,
  });
}