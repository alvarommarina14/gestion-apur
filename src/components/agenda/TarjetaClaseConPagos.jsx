import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { User, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function TarjetaClaseConPagos({ turno, isAdmin, onTurnoClick, onEditarClase }) {
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
      {/* Header con duración y menú */}
      <div className="flex items-center justify-between mb-2">
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
          Clase
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">
            {turno.duracion} min
          </span>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                  <Edit className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onEditarClase?.(turno);
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar clase
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
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

      {/* Profesor a cargo */}
      {(turno.profesor || profesor?.nombre) && (
        <div className="mb-2 pt-2 border-t border-slate-200">
          <p className="text-xs font-semibold text-slate-700 mb-1">Prof. a cargo:</p>
          <p className="text-sm font-medium text-slate-900">{turno.profesor || profesor?.nombre}</p>
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