import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Clock, User, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

const HORARIOS = [];
for (let h = 8; h <= 21; h++) {
  HORARIOS.push(`${h.toString().padStart(2, '0')}:00`);
  if (h < 21) HORARIOS.push(`${h.toString().padStart(2, '0')}:30`);
}

const CANCHAS = ['1', '2', '3', '4'];

export default function VistaCalendarioCancha({ turnos, fecha, isAdmin, onTurnoClick, isLoading }) {
  const turnosPorCanchaHora = useMemo(() => {
    const map = {};
    CANCHAS.forEach(cancha => {
      map[cancha] = {};
      HORARIOS.forEach(hora => {
        map[cancha][hora] = null;
      });
    });
    
    turnos.forEach(turno => {
      if (map[turno.cancha] && map[turno.cancha][turno.hora_inicio] !== undefined) {
        map[turno.cancha][turno.hora_inicio] = turno;
      }
    });
    
    return map;
  }, [turnos]);

  const calcularFilas = (turno) => {
    if (!turno) return 1;
    return turno.duracion === 90 ? 3 : 2; // 90 min = 3 slots de 30min, 60 min = 2 slots
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-12 text-center">
          <Clock className="w-12 h-12 animate-spin mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500">Cargando agenda...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-300">
                <th className="sticky left-0 z-10 bg-slate-100 border-r-2 border-slate-300 p-3 text-left font-bold text-slate-700 w-24">
                  Hora
                </th>
                {CANCHAS.map(cancha => (
                  <th
                    key={cancha}
                    className="p-3 text-center font-bold text-slate-700 border-r border-slate-200 min-w-[200px]"
                  >
                    Cancha {cancha}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HORARIOS.map((hora, idx) => {
                // Verificar si esta fila debe ser omitida porque está ocupada por un turno anterior
                const debeOmitir = CANCHAS.some(cancha => {
                  // Buscar si hay un turno en slots anteriores que todavía ocupa esta hora
                  for (let i = Math.max(0, idx - 2); i < idx; i++) {
                    const horaAnterior = HORARIOS[i];
                    const turnoAnterior = turnosPorCanchaHora[cancha][horaAnterior];
                    if (turnoAnterior) {
                      const filas = calcularFilas(turnoAnterior);
                      const indiceTurno = HORARIOS.indexOf(turnoAnterior.hora_inicio);
                      if (idx < indiceTurno + filas) {
                        return true;
                      }
                    }
                  }
                  return false;
                });

                return (
                  <tr key={hora} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="sticky left-0 z-10 bg-white border-r-2 border-slate-300 p-3 text-sm font-semibold text-slate-700">
                      {hora}
                    </td>
                    {CANCHAS.map(cancha => {
                      const turno = turnosPorCanchaHora[cancha][hora];
                      
                      // Si hay turno en este slot
                      if (turno) {
                        const filas = calcularFilas(turno);
                        
                        return (
                          <td
                            key={cancha}
                            rowSpan={filas}
                            className={cn(
                              'p-2 border-r border-slate-200 align-top',
                              isAdmin && 'cursor-pointer hover:bg-slate-100'
                            )}
                            onClick={() => onTurnoClick?.(turno)}
                          >
                            <div
                              className={cn(
                                'h-full rounded-lg border-2 p-3 transition-all',
                                turno.pagado
                                  ? 'bg-emerald-50 border-emerald-400'
                                  : 'bg-rose-50 border-rose-400'
                              )}
                            >
                              {/* Header con estado de pago */}
                              <div className="flex items-center justify-between mb-2">
                                <span className={cn(
                                  'px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1',
                                  turno.pagado
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-rose-100 text-rose-700'
                                )}>
                                  {turno.pagado ? (
                                    <>
                                      <CheckCircle className="w-3 h-3" />
                                      PAGADO
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-3 h-3" />
                                      PENDIENTE
                                    </>
                                  )}
                                </span>
                                <span className="text-xs font-semibold text-slate-500">
                                  {turno.duracion} min
                                </span>
                              </div>

                              {/* Contenido principal */}
                              <div className="space-y-2">
                                <div>
                                  <p className="font-bold text-slate-900 text-base leading-tight">
                                    {turno.cliente}
                                  </p>
                                  <p className="text-sm text-slate-600 mt-0.5">
                                    {turno.hora_inicio} - {turno.hora_fin}
                                  </p>
                                </div>

                                {/* Tipo de turno */}
                                <div className="flex items-center gap-1.5">
                                  {turno.tipo_turno === 'clase' ? (
                                    <>
                                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                                        Clase
                                      </span>
                                      {turno.profesor && (
                                        <div className="flex items-center gap-1 text-sm text-slate-600">
                                          <User className="w-3.5 h-3.5" />
                                          <span>{turno.profesor}</span>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                                      Alquiler - {turno.modalidad_alquiler === 'abono' ? 'Abono' : 'Suelto'}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <DollarSign className="w-4 h-4 text-slate-500" />
                                  <span className="font-bold text-slate-900 text-base">
                                    {formatMoney(turno.monto)}
                                  </span>
                                </div>

                                {turno.notas && (
                                  <p className="text-xs text-slate-500 italic mt-2 border-t pt-2">
                                    {turno.notas}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      }
                      
                      // Verificar si este slot está ocupado por un turno que empezó antes
                      let ocupado = false;
                      for (let i = Math.max(0, idx - 2); i < idx; i++) {
                        const horaAnterior = HORARIOS[i];
                        const turnoAnterior = turnosPorCanchaHora[cancha][horaAnterior];
                        if (turnoAnterior) {
                          const filas = calcularFilas(turnoAnterior);
                          const indiceTurno = HORARIOS.indexOf(turnoAnterior.hora_inicio);
                          if (idx < indiceTurno + filas) {
                            ocupado = true;
                            break;
                          }
                        }
                      }
                      
                      if (ocupado) {
                        return null; // Este slot está ocupado por rowSpan anterior
                      }
                      
                      // Slot vacío
                      return (
                        <td
                          key={cancha}
                          className="p-2 border-r border-slate-200 bg-slate-50/30"
                        >
                          <div className="h-12 rounded-lg border border-dashed border-slate-300 flex items-center justify-center">
                            <span className="text-xs text-slate-400">Libre</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}