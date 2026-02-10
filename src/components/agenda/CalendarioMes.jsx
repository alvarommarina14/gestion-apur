import React from 'react';
import { 
  format, 
  eachDayOfInterval, 
  startOfMonth, 
  endOfMonth, 
  isSameMonth, 
  isSameDay,
  startOfWeek,
  endOfWeek 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function CalendarioMes({ selectedDate, turnos = [], onDayClick, onTurnoClick }) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const getTurnosDelDia = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return turnos.filter(t => t.fecha === dateStr);
  };

  return (
    <Card className="shadow-sm">
      <div className="p-4 sm:p-6">
        {/* Encabezados de días */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
            <div key={day} className="text-center font-semibold text-slate-600 text-sm py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendario */}
        <div className="space-y-2">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 gap-2">
              {week.map((date) => {
                const isCurrentMonth = isSameMonth(date, selectedDate);
                const isToday = isSameDay(date, new Date());
                const turnosDelDia = getTurnosDelDia(date);
                const turnosPagados = turnosDelDia.filter(t => t.pagado).length;
                const turnosPendientes = turnosDelDia.filter(t => !t.pagado).length;

                return (
                  <Button
                    key={format(date, 'yyyy-MM-dd')}
                    variant="outline"
                    onClick={() => onDayClick(date)}
                    className={cn(
                      'h-24 sm:h-28 p-2 rounded-lg flex flex-col items-start justify-start text-left transition-all',
                      isCurrentMonth 
                        ? 'bg-white hover:bg-slate-50 border-slate-200' 
                        : 'bg-slate-50 border-slate-100 text-slate-400',
                      isToday && 'border-emerald-500 bg-emerald-50 border-2'
                    )}
                  >
                    <span className={cn(
                      'text-sm font-semibold',
                      !isCurrentMonth && 'text-slate-400',
                      isToday && 'text-emerald-700'
                    )}>
                      {format(date, 'd')}
                    </span>

                    {turnosDelDia.length > 0 && (
                      <div className="space-y-1 w-full mt-1">
                        {turnosPagados > 0 && (
                          <Badge className="bg-emerald-100 text-emerald-700 text-xs w-full justify-center">
                            {turnosPagados} pagado{turnosPagados > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {turnosPendientes > 0 && (
                          <Badge className="bg-rose-100 text-rose-700 text-xs w-full justify-center">
                            {turnosPendientes} pendiente{turnosPendientes > 1 ? 's' : ''}
                          </Badge>
                        )}
                        <div className="space-y-0.5">
                          {turnosDelDia.slice(0, 2).map((turno) => (
                            <button
                              key={turno.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onTurnoClick(turno);
                              }}
                              className="block w-full text-left text-xs p-1 rounded bg-slate-100 hover:bg-slate-200 truncate"
                            >
                              {turno.cliente}
                            </button>
                          ))}
                          {turnosDelDia.length > 2 && (
                            <span className="text-xs text-slate-500 pl-1">
                              +{turnosDelDia.length - 2} más
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </Button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}