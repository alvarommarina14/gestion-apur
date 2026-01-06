import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, MapPin, Users, User, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils';

export default function TodayAgenda({ clases = [], onClaseClick, onRegistrarAsistencia }) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  const getTimeStatus = (horaInicio) => {
    if (!horaInicio) return 'future';
    const [h, m] = horaInicio.split(':').map(Number);
    const claseMinutes = h * 60 + m;
    const nowMinutes = currentHour * 60 + currentMinute;
    
    if (claseMinutes + 50 < nowMinutes) return 'past';
    if (claseMinutes <= nowMinutes && claseMinutes + 50 >= nowMinutes) return 'current';
    return 'future';
  };

  if (clases.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">No hay clases programadas para hoy</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {clases.map((clase) => {
        const timeStatus = getTimeStatus(clase.hora_inicio);
        const needsAttendance = timeStatus === 'past' && !clase.asistencia_registrada && clase.estado === 'programada';
        
        return (
          <div
            key={clase.id}
            className={cn(
              'group relative rounded-lg border p-4 transition-all duration-200 cursor-pointer hover:shadow-md',
              timeStatus === 'current' && 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-300',
              timeStatus === 'past' && !clase.asistencia_registrada && 'bg-amber-50/50 border-amber-200',
              timeStatus === 'past' && clase.asistencia_registrada && 'bg-slate-50 border-slate-200',
              timeStatus === 'future' && 'bg-white border-slate-200 hover:border-slate-300'
            )}
            onClick={() => onClaseClick?.(clase)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className={cn(
                    'text-lg font-bold tabular-nums',
                    timeStatus === 'current' && 'text-emerald-700',
                    timeStatus === 'past' && 'text-slate-500',
                    timeStatus === 'future' && 'text-slate-800'
                  )}>
                    {clase.hora_inicio}
                  </span>
                  <StatusBadge status={clase.estado} size="sm" />
                  {clase.es_recupero && (
                    <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-medium rounded">
                      Recupero
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1.5">
                    {clase.tipo === 'individual' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Users className="w-4 h-4" />
                    )}
                    {clase.alumnos_nombres?.join(', ') || 'Sin alumnos'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {clase.sede} {clase.cancha && `- ${clase.cancha}`}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {needsAttendance && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRegistrarAsistencia?.(clase);
                    }}
                  >
                    Registrar asistencia
                  </Button>
                )}
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </div>
            </div>
            
            {timeStatus === 'current' && (
              <div className="absolute -left-px top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-r" />
            )}
          </div>
        );
      })}
    </div>
  );
}