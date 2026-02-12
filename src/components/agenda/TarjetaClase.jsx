import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import GestionarClaseModal from './GestionarClaseModal';

export default function TarjetaClase({ turno, onEdit }) {
  const [mostrarGestionar, setMostrarGestionar] = useState(false);
  const queryClient = useQueryClient();

  // Buscar la clase asociada si el turno tiene clase_id
  const { data: clase } = useQuery({
    queryKey: ['clase', turno.clase_id || turno.id],
    queryFn: async () => {
      if (turno.clase_id) {
        try {
          return await base44.entities.Clase.read(turno.clase_id);
        } catch (e) {
          return null;
        }
      }
      return null;
    },
    enabled: !!turno.clase_id || !!turno.id,
  });

  // Buscar turnos futuros con mismo patrón (para detectar abonos recurrentes)
  const { data: turnosFuturos = [] } = useQuery({
    queryKey: ['turnosFuturos', turno.id, turno.cliente, turno.cancha, turno.hora_inicio],
    queryFn: async () => {
      if (turno.tipo_turno === 'alquiler' && turno.modalidad_alquiler === 'abono') {
        try {
          const todos = await base44.entities.TurnoCancha.list();
          return todos.filter(t => 
            t.id !== turno.id &&
            t.cliente === turno.cliente &&
            t.cancha === turno.cancha &&
            t.hora_inicio === turno.hora_inicio &&
            t.tipo_turno === 'alquiler' &&
            t.modalidad_alquiler === 'abono' &&
            t.fecha > turno.fecha
          );
        } catch (e) {
          return [];
        }
      }
      return [];
    },
    enabled: turno.tipo_turno === 'alquiler' && turno.modalidad_alquiler === 'abono',
  });

  // Detectar si es clase recurrente o abono recurrente
  const esClaseRecurrente = clase?.es_recurrente === true;
  const esAbonoRecurrente = turno.es_recurrente === true && turno.tipo_turno === 'alquiler' && turno.modalidad_alquiler === 'abono';

  const eliminarTurnoMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.TurnoCancha.delete(turno.id);
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Turno eliminado');
      queryClient.invalidateQueries({ queryKey: ['turnos'] });
      queryClient.invalidateQueries({ queryKey: ['clases'] });
    },
    onError: (error) => {
      toast.error('Error al eliminar: ' + error.message);
    }
  });

  const eliminarRecurrenciaMutation = useMutation({
    mutationFn: async () => {
      if (esClaseRecurrente) {
        const res = await base44.functions.invoke('eliminarRecurrenciaClase', {
          turnoId: turno.id,
          claseId: clase?.id,
          tipo: 'clase'
        });
        return res.data;
      } else if (esAbonoRecurrente) {
        const res = await base44.functions.invoke('borrarRecurrenciaAlquiler', {
          turnoId: turno.id
        });
        return res.data;
      }
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Recurrencia eliminada');
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      queryClient.invalidateQueries({ queryKey: ['turnos'] });
      queryClient.invalidateQueries({ queryKey: ['turnoCancha'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Error al eliminar recurrencia');
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
          {(esClaseRecurrente || esAbonoRecurrente) && (
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                const msg = esClaseRecurrente ? '¿Eliminar esta fecha y todas las futuras clases de la recurrencia?' : '¿Eliminar todos los turnos de recurrencia semanal?';
                if (confirm(msg)) {
                  eliminarRecurrenciaMutation.mutate();
                }
              }}
              disabled={eliminarRecurrenciaMutation.isPending}
              className="h-6 w-6 hover:bg-amber-100 hover:text-amber-600"
              title={esClaseRecurrente ? "Eliminar recurrencia de clase" : "Borrar recurrencia semanal"}
            >
              <X className="w-3 h-3" />
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