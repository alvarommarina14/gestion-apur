import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday, parseISO, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function CalendarioCompleto({ turnos = [], recordatorios = [], selectedDate, onDateSelect, onCreateTurno, onTurnoClick }) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: es, weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { locale: es, weekStartsOn: 1 });
  
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const turnosPorFecha = useMemo(() => {
    const map = {};
    turnos.forEach(turno => {
      if (!map[turno.fecha]) map[turno.fecha] = [];
      map[turno.fecha].push(turno);
    });
    return map;
  }, [turnos]);

  const recordatoriosPorFecha = useMemo(() => {
    const map = {};
    recordatorios.forEach(rec => {
      if (!rec.turno_cancha_id) { // Solo recordatorios sin turno vinculado
        if (!map[rec.fecha]) map[rec.fecha] = [];
        map[rec.fecha].push(rec);
      }
    });
    return map;
  }, [recordatorios]);

  const getEventosDelDia = (fecha) => {
    const fechaStr = format(fecha, 'yyyy-MM-dd');
    const turnosDelDia = turnosPorFecha[fechaStr] || [];
    const recordatoriosDelDia = recordatoriosPorFecha[fechaStr] || [];
    return { turnos: turnosDelDia, recordatorios: recordatoriosDelDia };
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <Card className="p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-bold text-slate-900 min-w-[200px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const today = new Date();
            setCurrentMonth(today);
            onDateSelect(today);
          }}
        >
          <CalendarIcon className="w-4 h-4 mr-2" />
          Hoy
        </Button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(dia => (
          <div key={dia} className="text-center text-xs font-semibold text-slate-600 py-2">
            {dia}
          </div>
        ))}
      </div>

      {/* Días del calendario */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((dia, idx) => {
          const { turnos: turnosDelDia, recordatorios: recordatoriosDelDia } = getEventosDelDia(dia);
          const totalEventos = turnosDelDia.length + recordatoriosDelDia.length;
          const esHoy = isToday(dia);
          const esMesActual = isSameMonth(dia, currentMonth);
          const estaSeleccionado = isSameDay(dia, selectedDate);

          return (
            <div
              key={idx}
              onClick={() => onDateSelect(dia)}
              className={cn(
                'min-h-[120px] p-2 border rounded-lg cursor-pointer transition-all hover:border-emerald-300 hover:shadow-sm',
                esHoy && 'ring-2 ring-emerald-500',
                estaSeleccionado && 'bg-emerald-50 border-emerald-400',
                !esMesActual && 'bg-slate-50/50 opacity-50',
                esMesActual && !estaSeleccionado && 'bg-white'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  'text-sm font-semibold',
                  esHoy && 'bg-emerald-600 text-white rounded-full w-6 h-6 flex items-center justify-center',
                  !esHoy && 'text-slate-700'
                )}>
                  {format(dia, 'd')}
                </span>
                {esMesActual && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateTurno(dia);
                    }}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                )}
              </div>

              {/* Eventos del día */}
              <div className="space-y-1">
                {turnosDelDia.slice(0, 3).map((turno, i) => (
                  <div
                    key={`t-${i}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTurnoClick(turno);
                    }}
                    className={cn(
                      'text-xs p-1.5 rounded border-l-2 cursor-pointer hover:bg-slate-50 transition-colors',
                      turno.pagado 
                        ? 'bg-emerald-50 border-emerald-400' 
                        : 'bg-rose-50 border-rose-400'
                    )}
                  >
                    <div className="font-medium truncate text-slate-800">
                      {turno.hora_inicio} - C{turno.cancha}
                    </div>
                    <div className="truncate text-slate-600">
                      {turno.cliente}
                    </div>
                  </div>
                ))}

                {recordatoriosDelDia.slice(0, 3 - turnosDelDia.length).map((rec, i) => (
                  <div
                    key={`r-${i}`}
                    className="text-xs p-1.5 rounded bg-amber-50 border-l-2 border-amber-400"
                  >
                    <div className="font-medium truncate text-slate-800">
                      {rec.hora} - C{rec.cancha}
                    </div>
                    <div className="truncate text-slate-600">
                      🧹 {rec.profesor || rec.cliente}
                    </div>
                  </div>
                ))}

                {totalEventos > 3 && (
                  <div className="text-xs text-center text-slate-500 font-medium pt-1">
                    +{totalEventos - 3} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-50 border-l-2 border-emerald-400"></div>
          <span className="text-slate-600">Pagado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-rose-50 border-l-2 border-rose-400"></div>
          <span className="text-slate-600">Pendiente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-50 border-l-2 border-amber-400"></div>
          <span className="text-slate-600">Recordatorio</span>
        </div>
      </div>
    </Card>
  );
}