import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const HORAS = Array.from({ length: 29 }, (_, i) => {
  const hora = Math.floor(i / 2) + 8;
  const minuto = (i % 2) * 30;
  return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
});

const CANCHAS = ['1', '2', '3', '4'];

export default function CalendarioAgendaCanchas({ fecha, turnos = [], bloqueos = [], onNuevoTurno }) {
  const fechaStr = format(fecha, 'yyyy-MM-dd');

  const turnosDia = useMemo(() => {
    return turnos.filter(t => t.fecha === fechaStr && t.estado === 'activo');
  }, [turnos, fechaStr]);

  const bloqueosDia = useMemo(() => {
    return bloqueos.filter(b => {
      const inicio = format(new Date(b.fecha_inicio), 'yyyy-MM-dd');
      const fin = format(new Date(b.fecha_fin), 'yyyy-MM-dd');
      return inicio <= fechaStr && fechaStr <= fin && b.estado === 'activo';
    });
  }, [bloqueos, fechaStr]);

  const getTurnoEnSlot = (cancha, horario) => {
    return turnosDia.find(t => 
      t.cancha === cancha && 
      t.hora_inicio === horario
    );
  };

  const getBloqueoEnSlot = (cancha, horario) => {
    return bloqueosDia.find(b => {
      if (b.cancha !== cancha && b.cancha !== 'todas') return false;
      if (b.todo_el_dia) return true;
      if (b.hora_inicio && b.hora_fin) {
        return horario >= b.hora_inicio && horario < b.hora_fin;
      }
      return false;
    });
  };

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Header con canchas */}
        <div className="flex gap-px bg-slate-200 rounded-t-lg overflow-hidden">
          <div className="w-24 bg-slate-100 border border-slate-200 p-3 font-semibold text-slate-700 text-sm">
            Hora
          </div>
          {CANCHAS.map(cancha => (
            <div 
              key={cancha}
              className="flex-1 min-w-[250px] bg-emerald-50 border border-slate-200 p-3 font-semibold text-emerald-700 text-center text-sm"
            >
              Cancha {cancha}
            </div>
          ))}
        </div>

        {/* Filas de horarios */}
        {HORAS.map((hora, idx) => (
          <div key={hora} className="flex gap-px">
            {/* Columna de hora */}
            <div className={cn(
              'w-24 border border-slate-200 p-2 text-xs font-mono flex items-center justify-center',
              idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'
            )}>
              {idx % 2 === 0 && hora}
            </div>

            {/* Celdas de canchas */}
            {CANCHAS.map(cancha => {
              const turno = getTurnoEnSlot(cancha, hora);
              const bloqueo = getBloqueoEnSlot(cancha, hora);

              return (
                <div
                  key={`${cancha}-${hora}`}
                  className={cn(
                    'flex-1 min-w-[250px] border border-slate-200 p-2 text-xs h-16',
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50',
                    bloqueo && 'bg-amber-100'
                  )}
                >
                  {bloqueo ? (
                    <div className="h-full flex items-center justify-center">
                      <Badge className="bg-amber-600 text-white text-xs">
                        {bloqueo.motivo}
                      </Badge>
                    </div>
                  ) : turno ? (
                    <div className="h-full flex flex-col gap-1">
                      <p className="font-semibold text-slate-900">{turno.cliente}</p>
                      {turno.profesor && (
                        <p className="text-slate-600">Prof: {turno.profesor}</p>
                      )}
                      <div className="flex gap-1 flex-wrap mt-auto">
                        <Badge className={cn(
                          'text-xs',
                          turno.tipo_turno === 'clase' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        )}>
                          {turno.tipo_turno === 'clase' ? 'Clase' : 'Alquiler'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {turno.modalidad_alquiler ? turno.modalidad_alquiler.charAt(0).toUpperCase() + turno.modalidad_alquiler.slice(1) : 'Clase'}
                        </Badge>
                      </div>
                      {turno.alumnos_nombres && turno.alumnos_nombres.length > 0 && (
                        <p className="text-slate-500 text-xs mt-1">
                          <Users className="w-3 h-3 inline mr-1" />
                          {turno.alumnos_nombres.length} alumno{turno.alumnos_nombres.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="h-full" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}