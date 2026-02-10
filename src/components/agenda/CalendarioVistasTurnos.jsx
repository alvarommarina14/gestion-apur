import React, { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab'];

export default function CalendarioVistasTurnos({ date, turnos = [], onDateClick }) {
  const [currentMonth, setCurrentMonth] = React.useState(date);

  const turnosPorFecha = useMemo(() => {
    const mapa = {};
    turnos.forEach(turno => {
      const fecha = turno.fecha;
      if (!mapa[fecha]) {
        mapa[fecha] = [];
      }
      mapa[fecha].push(turno);
    });
    return mapa;
  }, [turnos]);

  const diasDelMes = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const primerDiaIndice = getDay(diasDelMes[0]);
  const diasVacios = Array(primerDiaIndice).fill(null);
  const todasLasCeldas = [...diasVacios, ...diasDelMes];

  const handleAnterior = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleSiguiente = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <div className="space-y-4">
      {/* Header del calendario */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleAnterior}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleSiguiente}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Grid de días de la semana */}
      <div className="grid grid-cols-7 gap-1">
        {/* Headers de días */}
        {DIAS_SEMANA.map(dia => (
          <div key={dia} className="text-center font-semibold text-slate-600 text-xs py-2">
            {dia}
          </div>
        ))}

        {/* Celdas del calendario */}
        {todasLasCeldas.map((dia, idx) => {
          if (!dia) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const fechaStr = format(dia, 'yyyy-MM-dd');
          const turnosDelDia = turnosPorFecha[fechaStr] || [];
          const esHoy = isToday(dia);
          const esMesActual = isSameMonth(dia, currentMonth);

          return (
            <div
              key={fechaStr}
              onClick={() => onDateClick && onDateClick(dia)}
              className={cn(
                'aspect-square border rounded-lg p-2 cursor-pointer transition-all hover:shadow-md overflow-hidden',
                esHoy && 'border-emerald-500 bg-emerald-50',
                !esHoy && esMesActual && 'border-slate-200 bg-white',
                !esMesActual && 'border-slate-100 bg-slate-50 opacity-50'
              )}
            >
              {/* Número del día */}
              <div className={cn(
                'text-xs font-semibold mb-1',
                esHoy ? 'text-emerald-700' : 'text-slate-700'
              )}>
                {format(dia, 'd')}
              </div>

              {/* Turnos del día */}
              <div className="space-y-0.5 text-xs max-h-16 overflow-y-auto">
                {turnosDelDia.slice(0, 3).map((turno, i) => (
                  <div
                    key={i}
                    className={cn(
                      'px-1 py-0.5 rounded text-white truncate text-xs font-medium',
                      turno.tipo_turno === 'clase' ? 'bg-blue-500' : 'bg-emerald-500'
                    )}
                    title={`${turno.cliente} - ${turno.hora_inicio}`}
                  >
                    {turno.cliente}
                  </div>
                ))}
                {turnosDelDia.length > 3 && (
                  <div className="text-slate-500 text-xs px-1">
                    +{turnosDelDia.length - 3} más
                  </div>
                )}
              </div>

              {/* Indicador de cantidad */}
              {turnosDelDia.length > 0 && (
                <div className="absolute top-1 right-1">
                  <Badge variant="secondary" className="text-xs">
                    {turnosDelDia.length}
                  </Badge>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="bg-slate-50 p-3 rounded border border-slate-200 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span className="text-slate-600">Clases</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-500 rounded"></div>
          <span className="text-slate-600">Alquileres</span>
        </div>
      </div>
    </div>
  );
}