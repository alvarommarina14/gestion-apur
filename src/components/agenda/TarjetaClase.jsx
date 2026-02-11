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
      {/* Profesor (título) */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-blue-700">
          {turno.profesor || 'Sin profesor'}
        </p>
      </div>

      {/* Individual */}
      {esIndividual && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-1">
            <p className="text-xs font-semibold text-slate-900 truncate">
              {turno.alumnos_nombres[0]}
            </p>
            {getPagoBadge(estadosPago[turno.alumnos_ids?.[0]] || 'pendiente')}
          </div>
          <p className="text-xs text-slate-600">
            {turno.hora_inicio} - {turno.hora_fin}
          </p>
          {turno.notas && (
            <p className="text-xs text-slate-500 italic">{turno.notas}</p>
          )}
        </div>
      )}

      {/* Grupal */}
      {esGrupal && (
        <div className="space-y-1.5">
          <div className="space-y-1">
            {turno.alumnos_nombres.map((alumno, idx) => (
              <div key={idx} className="flex items-center justify-between gap-1">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {alumno}
                </p>
                {/* Badge de pago individual por alumno */}
                {/* Nota: Si necesitas traer data de pago por alumno, debes pasarla como prop */}
                {getPagoBadge(turno.pagado)}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600">
            {turno.hora_inicio} - {turno.hora_fin}
          </p>
          {turno.notas && (
            <p className="text-xs text-slate-500 italic">{turno.notas}</p>
          )}
        </div>
      )}
    </div>
  );
}