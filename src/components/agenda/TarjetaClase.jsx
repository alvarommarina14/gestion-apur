import React from 'react';
import { Badge } from '@/components/ui/badge';

const getPagoBadge = (estado) => {
  if (estado === 'pagado') {
    return <Badge className="bg-emerald-600 text-xs">Pagado</Badge>;
  }
  if (estado === 'moroso') {
    return <Badge className="bg-rose-600 text-xs">Moroso</Badge>;
  }
  return <Badge className="bg-orange-600 text-xs">Pendiente</Badge>;
};

export default function TarjetaClase({ turno, estadosPago = {} }) {
  const esIndividual = turno.alumnos_nombres?.length === 1;
  const esGrupal = turno.alumnos_nombres?.length > 1;

  return (
    <div className="space-y-2">
      {/* Profesor (título principal) */}
      <p className="text-xs font-bold text-slate-900">
        {turno.profesor || 'Sin profesor'}
      </p>

      {/* Alumnos */}
      <div className="space-y-1">
        {turno.alumnos_nombres?.map((alumno, idx) => {
          const alumnoId = turno.alumnos_ids?.[idx];
          const estadoPago = estadosPago[alumnoId] || 'pendiente';
          return (
            <div key={idx} className="flex items-center justify-between gap-1">
              <p className="text-xs text-slate-700 truncate">
                {alumno}
              </p>
              {getPagoBadge(estadoPago)}
            </div>
          );
        })}
      </div>

      {/* Horario */}
      <p className="text-xs text-slate-600">
        {turno.hora_inicio} - {turno.hora_fin}
      </p>

      {/* Notas */}
      {turno.notas && (
        <p className="text-xs text-slate-500 italic">{turno.notas}</p>
      )}
    </div>
  );
}