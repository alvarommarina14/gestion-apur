import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import GestionarClaseModal from './GestionarClaseModal';

export default function TarjetaClase({ turno, onEdit }) {
  const [mostrarGestionar, setMostrarGestionar] = useState(false);
  const queryClient = useQueryClient();

  const eliminarRecurrenciaMutation = useMutation({
    mutationFn: async () => {
      const claseId = turno.clase_id || turno.id;
      await base44.entities.Clase.update(claseId, {
        es_recurrente: false,
        recurrencia_tipo: null,
        recurrencia_hasta: null,
        recurrencia_cantidad: null
      });
    },
    onSuccess: () => {
      toast.success('Recurrencia eliminada');
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      queryClient.invalidateQueries({ queryKey: ['turnos'] });
      queryClient.invalidateQueries({ queryKey: ['turnoCancha'] });
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  return (
    <div className="space-y-2.5">
      {/* Profesor - Título y botones editar/eliminar */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-blue-700">
          {turno.profesor || 'Sin profesor'}
        </p>
        <div className="flex gap-1">
          {turno.recurrencia_tipo === 'semanal' && (
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('¿Eliminar la recurrencia semanal?')) {
                  eliminarRecurrenciaMutation.mutate();
                }
              }}
              disabled={eliminarRecurrenciaMutation.isPending}
              className="h-6 w-6 hover:bg-amber-100 hover:text-amber-600"
              title="Eliminar recurrencia semanal"
            >
              <Repeat className="w-3 h-3" />
            </Button>
          )}
          {onEdit && (
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(turno);
              }}
              className="h-6 w-6 hover:bg-blue-100 hover:text-blue-600"
            >
              <Edit2 className="w-3 h-3" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setMostrarGestionar(true);
            }}
            className="h-6 w-6 hover:bg-rose-100 hover:text-rose-600"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Horario */}
      <div className="text-xs text-slate-600">
        {turno.hora_inicio} - {turno.hora_fin}
      </div>

      {/* Cantidad de Alumnos */}
      <div className="text-xs font-semibold text-slate-700">
        Alumnos ({turno.alumnos_nombres?.length || 0})
      </div>

      {/* Lista de Alumnos */}
      <div className="space-y-1 pl-2 border-l-2 border-blue-200">
        {turno.alumnos_nombres?.map((alumno, idx) => (
          <p key={idx} className="text-xs text-slate-700 truncate">
            {alumno}
          </p>
        ))}
      </div>

      {/* Notas */}
      {turno.notas && (
        <div className="pt-1 border-t border-slate-200">
          <p className="text-xs text-slate-600 italic">
            <span className="font-semibold">Notas: </span>{turno.notas}
          </p>
        </div>
      )}

      {/* Modal Gestionar Clase */}
      <GestionarClaseModal 
        isOpen={mostrarGestionar} 
        onClose={() => setMostrarGestionar(false)} 
        clase={{...turno, turno_cancha_id: turno.id}}
      />
    </div>
  );
}