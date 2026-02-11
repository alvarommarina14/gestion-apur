import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import ModalCancelarAlquiler from '@/components/agenda/ModalCancelarAlquiler';

const HORARIOS = [];
for (let i = 8; i < 22; i++) {
  HORARIOS.push(`${i.toString().padStart(2, '0')}:00`);
  HORARIOS.push(`${i.toString().padStart(2, '0')}:30`);
}

const CANCHAS = ['1', '2', '3', '4'];

const getStatusColor = (tipo) => {
  if (tipo === 'clase') return 'bg-blue-50 border-l-4 border-blue-500';
  if (tipo === 'alquiler') return 'bg-emerald-50 border-l-4 border-emerald-500';
  return 'bg-gray-50';
};

const getStatusBadge = (tipo) => {
  if (tipo === 'clase') return <Badge className="bg-blue-600">Clase</Badge>;
  if (tipo === 'alquiler') return <Badge className="bg-emerald-600">Alquiler</Badge>;
  return null;
};

const getPagoColor = (pagado) => {
  return pagado ? 'text-emerald-600 font-semibold' : 'text-orange-600 font-semibold';
};

export default function PlanillaCanchas({ date, turnos = [], bloqueos = [], onEdit, onDelete, onEditBloqueo, onDeleteBloqueo }) {
  const [turnoACancelar, setTurnoACancelar] = useState(null);
  const [showModalCancelar, setShowModalCancelar] = useState(false);
  // Calcular rowSpan de un turno (cuántas celdas de 30 min ocupa)
  const calcularRowSpan = (horaInicio, horaFin) => {
    const [hInicio, mInicio] = horaInicio.split(':').map(Number);
    const [hFin, mFin] = horaFin.split(':').map(Number);
    const minutosInicio = hInicio * 60 + mInicio;
    const minutosFin = hFin * 60 + mFin;
    const duracionMinutos = minutosFin - minutosInicio;
    return Math.ceil(duracionMinutos / 30); // Cada celda = 30 minutos
  };

  // Organizar turnos por cancha y horario
  const turnosPorCancha = useMemo(() => {
    const mapa = {};
    const ocupadas = {}; // Para marcar celdas ocupadas por rowSpan

    CANCHAS.forEach(cancha => {
      mapa[cancha] = {};
      ocupadas[cancha] = {};
      HORARIOS.forEach(hora => {
        mapa[cancha][hora] = null;
        ocupadas[cancha][hora] = false;
      });
    });

    // Llenar con turnos existentes
    turnos.forEach(turno => {
      if (mapa[turno.cancha]) {
        const horaInicio = turno.hora_inicio;
        const rowSpan = calcularRowSpan(turno.hora_inicio, turno.hora_fin);
        
        if (mapa[turno.cancha][horaInicio]) {
          // Si hay espacio, agregar como secundario
          if (!mapa[turno.cancha][horaInicio].secundario) {
            mapa[turno.cancha][horaInicio].secundario = [];
          }
          mapa[turno.cancha][horaInicio].secundario.push(turno);
        } else {
          mapa[turno.cancha][horaInicio] = { ...turno, rowSpan };
          
          // Marcar celdas intermedias como ocupadas
          const idxInicio = HORARIOS.indexOf(horaInicio);
          for (let i = 1; i < rowSpan && idxInicio + i < HORARIOS.length; i++) {
            ocupadas[turno.cancha][HORARIOS[idxInicio + i]] = true;
          }
        }
      }
    });

    return { mapa, ocupadas };
  }, [turnos]);

  // Verificar si hay bloqueos para una cancha y hora
  const tieneBloqueo = (cancha, hora) => {
    const fechaStr = format(date, 'yyyy-MM-dd');
    return bloqueos.some(bloqueo => {
      if (bloqueo.cancha !== cancha && bloqueo.cancha !== 'todas') return false;
      if (bloqueo.fecha_inicio !== fechaStr || bloqueo.fecha_fin !== fechaStr) return false;
      if (!bloqueo.hora_inicio || !bloqueo.hora_fin) return false;
      
      const horaNum = parseInt(hora.split(':')[0]);
      const minNum = parseInt(hora.split(':')[1]);
      const bloqueInicio = parseInt(bloqueo.hora_inicio.split(':')[0]);
      const bloqueFin = parseInt(bloqueo.hora_fin.split(':')[0]);
      
      return horaNum >= bloqueInicio && horaNum < bloqueFin;
    });
  };

  const obtenerBloqueo = (cancha, hora) => {
    const fechaStr = format(date, 'yyyy-MM-dd');
    return bloqueos.find(bloqueo => {
      if (bloqueo.cancha !== cancha && bloqueo.cancha !== 'todas') return false;
      if (bloqueo.fecha_inicio !== fechaStr || bloqueo.fecha_fin !== fechaStr) return false;
      if (!bloqueo.hora_inicio || !bloqueo.hora_fin) return false;
      
      const horaNum = parseInt(hora.split(':')[0]);
      const bloqueInicio = parseInt(bloqueo.hora_inicio.split(':')[0]);
      const bloqueFin = parseInt(bloqueo.hora_fin.split(':')[0]);
      
      return horaNum >= bloqueInicio && horaNum < bloqueFin;
    });
  };

  const fechaFormato = format(date, 'cccc, d MMMM yyyy', { locale: es });

  return (
    <div className="space-y-4">
      {/* Encabezado con fecha */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 capitalize">{fechaFormato}</h2>
        <p className="text-sm text-slate-500">{turnos.length} turnos programados</p>
      </div>

      {/* Tabla de planilla */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-200 p-2 text-left text-xs font-semibold text-slate-700 w-16 sticky left-0 z-10 bg-slate-100">
                Horario
              </th>
              {CANCHAS.map(cancha => (
                <th
                  key={cancha}
                  className="border border-slate-200 p-3 text-center text-sm font-bold text-slate-900 min-w-80"
                >
                  <div className="bg-emerald-100 text-emerald-700 py-1 px-2 rounded">
                    Cancha {cancha}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HORARIOS.map((hora, idx) => (
              <tr key={hora} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                {/* Columna de horario */}
                <td className="border border-slate-200 p-2 text-xs font-mono text-slate-600 sticky left-0 z-10 bg-inherit text-center font-semibold">
                  {hora}
                </td>

                {/* Celdas por cancha */}
                {CANCHAS.map(cancha => {
                   // Si esta celda está ocupada por un turno anterior (rowSpan), no renderizar
                   if (turnosPorCancha.ocupadas[cancha]?.[hora]) {
                     return null;
                   }

                   const turno = turnosPorCancha.mapa[cancha]?.[hora];
                   const secundarios = turno?.secundario || [];
                   const bloqueo = obtenerBloqueo(cancha, hora);
                   const rowSpan = turno?.rowSpan || 1;

                   return (
                     <td
                       key={`${cancha}-${hora}`}
                       className="border border-slate-200 p-2 align-top"
                       rowSpan={rowSpan}
                     >
                       {bloqueo ? (
                         <button
                           onClick={() => onEditBloqueo?.(bloqueo)}
                           className="rounded p-2 h-full bg-red-100 border-l-4 border-red-500 flex flex-col items-center justify-center cursor-pointer hover:bg-red-200 transition-colors w-full"
                         >
                           <Badge className="bg-red-600 mb-1">Bloqueado</Badge>
                           <p className="text-xs text-red-700 font-semibold">{bloqueo.motivo}</p>
                           {bloqueo.descripcion && (
                             <p className="text-xs text-red-600 text-center mt-1">{bloqueo.descripcion}</p>
                           )}
                         </button>
                       ) : turno ? (
                         <div className={`rounded p-2 h-full space-y-1 ${getStatusColor(turno.tipo_turno)}`}>
                          {/* Turno principal */}
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-1">
                                {getStatusBadge(turno.tipo_turno)}
                              </div>
                              {turno.tipo_turno === 'alquiler' && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTurnoACancelar(turno);
                                    setShowModalCancelar(true);
                                  }}
                                  className="h-6 w-6 hover:bg-rose-100 hover:text-rose-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                            {turno.tipo_turno === 'clase' && turno.alumnos_nombres?.length > 0 ? (
                              <div className="space-y-0.5">
                                {turno.alumnos_nombres.map((alumno, idx) => (
                                  <p key={idx} className="text-xs font-semibold text-slate-900 truncate">
                                    {alumno}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                {turno.cliente}
                              </p>
                            )}
                            <p className="text-xs text-slate-600">
                              {turno.hora_inicio} - {turno.hora_fin}
                            </p>
                            {turno.tipo_turno === 'clase' && turno.profesor && (
                              <p className="text-xs text-blue-600">Prof: {turno.profesor}</p>
                            )}
                          </div>

                          {/* Turnos secundarios */}
                          {secundarios.length > 0 && (
                            <div className="border-t pt-1 space-y-1">
                              {secundarios.slice(0, 1).map((sec, idx) => (
                                <div key={idx} className="text-xs bg-white/50 p-1 rounded">
                                  <p className="font-semibold text-slate-800 truncate">
                                    {sec.cliente}
                                  </p>
                                  <p className="text-slate-600">
                                    ${sec.monto} {sec.pagado ? '✓' : '(P)'}
                                  </p>
                                </div>
                              ))}
                              {secundarios.length > 1 && (
                                <p className="text-xs text-slate-500 text-center">
                                  +{secundarios.length - 1} más
                                </p>
                              )}
                            </div>
                          )}


                        </div>
                      ) : (
                        <div className="h-full bg-slate-50 rounded flex items-center justify-center">
                          <span className="text-xs text-slate-400">Disponible</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="bg-slate-50 p-3 rounded border border-slate-200 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-600">Clase</Badge>
          <span className="text-slate-600">Clases con profesor</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-600">Alquiler</Badge>
          <span className="text-slate-600">Alquileres de cancha</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-red-600">Bloqueado</Badge>
          <span className="text-slate-600">Cancha no disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-600 font-semibold">✓</span>
          <span className="text-slate-600">Pagado</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-orange-600 font-semibold">(P)</span>
          <span className="text-slate-600">Pendiente</span>
        </div>
      </div>

      {/* Modal de cancelación */}
      {turnoACancelar && (
        <ModalCancelarAlquiler
          open={showModalCancelar}
          onOpenChange={setShowModalCancelar}
          turno={turnoACancelar}
        />
      )}
    </div>
  );
}