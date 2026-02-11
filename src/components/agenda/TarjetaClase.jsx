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
  return (
    <div className="space-y-2.5">
      {/* Profesor - Título */}
      <div>
        <p className="text-sm font-bold text-blue-700">
          {turno.profesor || 'Sin profesor'}
        </p>
      </div>

      {/* Horario */}
      <div className="text-xs text-slate-600">
        {turno.hora_inicio} - {turno.hora_fin}
      </div>

      {/* Cantidad de Alumnos */}
      <div className="text-xs font-semibold text-slate-700">
        Alumnos ({turno.alumnos_nombres?.length || 0})
      </div>

      {/* Lista de Alumnos con Estado de Deuda */}
      <div className="space-y-1 pl-2 border-l-2 border-blue-200">
        {turno.alumnos_nombres?.map((alumno, idx) => {
          const alumnoId = turno.alumnos_ids?.[idx];
          const estadoPago = estadosPago[alumnoId] || 'pendiente';
          return (
            <div key={idx} className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-700 truncate flex-1">
                {alumno}
              </p>
              {getPagoBadge(estadoPago)}
            </div>
          );
        })}
      </div>

      {/* Notas */}
      {turno.notas && (
        <div className="pt-1 border-t border-slate-200">
          <p className="text-xs text-slate-600 italic">
            <span className="font-semibold">Notas: </span>{turno.notas}
          </p>
        </div>
      )}
    </div>
  );
}