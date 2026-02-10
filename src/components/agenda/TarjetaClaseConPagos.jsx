import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TarjetaClaseConPagos({ turno, isAdmin, onTurnoClick }) {
  const { data: profesor } = useQuery({
    queryKey: ['profesor', turno.profesor_id],
    queryFn: async () => {
      if (!turno.profesor_id) return null;
      try {
        return await base44.entities.Profesor.read(turno.profesor_id);
      } catch (e) {
        return null;
      }
    },
    enabled: !!turno.profesor_id && !turno.profesor,
  });

  return (
    <div
      className="h-full rounded-lg border-2 border-blue-300 bg-blue-50 p-3 transition-all"
      onClick={() => onTurnoClick?.(turno)}
    >
      {/* Header con duración */}
      <div className="flex items-center justify-between mb-2">
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
          Clase
        </span>
        <span className="text-xs font-semibold text-slate-500">
          {turno.duracion} min
        </span>
      </div>

      {/* Cliente y horario */}
      <div className="mb-2">
        <p className="font-bold text-slate-900 text-sm leading-tight">
          {turno.cliente}
        </p>
        <p className="text-xs text-slate-600 mt-0.5">
          {turno.hora_inicio} - {turno.hora_fin}
        </p>
      </div>

      {/* Profesor */}
      {(turno.profesor || profesor?.nombre) && (
        <div className="flex items-center gap-1 text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded mb-2 w-fit">
          <User className="w-3 h-3" />
          <span>Prof. {turno.profesor || profesor?.nombre}</span>
        </div>
      )}

      {/* Alumnos */}
      {turno.alumnos_nombres?.length > 0 && (
        <div className="mb-2 pt-2 border-t border-slate-200">
          <p className="text-xs font-semibold text-slate-700 mb-1">Alumnos:</p>
          <ul className="space-y-0.5">
            {turno.alumnos_nombres.map((nombre, idx) => (
              <li key={idx} className="text-xs text-slate-600">• {nombre}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Notas */}
      {turno.notas && (
        <p className="text-xs text-slate-500 italic mt-2 border-t border-slate-200 pt-2">
          {turno.notas}
        </p>
      )}
    </div>
  );
}