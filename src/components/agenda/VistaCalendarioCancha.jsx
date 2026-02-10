import React, { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Clock, User, DollarSign, Bell, MoreVertical, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import TarjetaClaseConPagos from './TarjetaClaseConPagos';
import PagoRapidoModal from './PagoRapidoModal';

// Función para verificar si un cliente pagó su abono en el mes
const verificarClientePagadoEnMes = async (clienteId, mesVerificar) => {
  try {
    const cobros = await base44.entities.CobroCliente.filter({
      cliente_id: clienteId,
      mes: mesVerificar,
      estado: 'pagado'
    });
    return cobros.length > 0;
  } catch (error) {
    console.error('Error verificando cobro cliente:', error);
    return false;
  }
};

const HORARIOS = [];
for (let h = 8; h <= 21; h++) {
  HORARIOS.push(`${h.toString().padStart(2, '0')}:00`);
  if (h < 21) HORARIOS.push(`${h.toString().padStart(2, '0')}:30`);
}

const CANCHAS = ['1', '2', '3', '4'];

export default function VistaCalendarioCancha({ turnos = [], recordatorios = [], bloqueos = [], selectedDate, selectedCancha, fecha, isAdmin, onTurnoClick, onEditarClase, onCancelarCancha, isLoading }) {
  const [profesorTurnos, setProfesorTurnos] = useState(new Set());
  const [actualizandoId, setActualizandoId] = useState(null);
  const [turnoParaPago, setTurnoParaPago] = useState(null);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const queryClient = useQueryClient();
  const { mutate: updatePago } = useMutation({
    mutationFn: async ({ turnoId, pagado }) => {
      if (pagado) {
        return await base44.functions.invoke('sincronizarPagosCompleto', {
          tipo_evento: 'turno_pagado',
          turnoId
        });
      } else {
        return await base44.entities.TurnoCancha.update(turnoId, { pagado: false });
      }
    },
    onSuccess: () => {
      setActualizandoId(null);
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['cobros-clientes'] });
      queryClient.invalidateQueries({ queryKey: ['alumnos'] });
    }
  });
  
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: cobrosClientes = [] } = useQuery({
    queryKey: ['cobros-clientes'],
    queryFn: () => base44.entities.CobroCliente.list(),
  });

  useEffect(() => {
    if (user?.profesor_id) {
      const turnosProfsor = turnos
        .filter(t => t.tipo_turno === 'clase' && t.profesor_id === user.profesor_id)
        .map(t => t.id);
      setProfesorTurnos(new Set(turnosProfsor));
    }
  }, [turnos, user?.profesor_id]);
  const turnosPorCanchaHora = useMemo(() => {
    const map = {};
    CANCHAS.forEach(cancha => {
      map[cancha] = {};
      HORARIOS.forEach(hora => {
        map[cancha][hora] = null;
      });
    });

    const fechaStr = format(selectedDate, 'yyyy-MM-dd');
    
    // Primero agregar bloqueos
    bloqueos.forEach(bloqueo => {
      const fechaInicio = new Date(bloqueo.fecha_inicio);
      const fechaFin = new Date(bloqueo.fecha_fin);
      const fechaSeleccionada = new Date(fechaStr);
      
      if (fechaSeleccionada >= fechaInicio && fechaSeleccionada <= fechaFin) {
        const canchasAfectadas = bloqueo.cancha === 'todas' ? CANCHAS : [bloqueo.cancha];
        
        canchasAfectadas.forEach(cancha => {
          if (bloqueo.todo_el_dia) {
            // Bloquear todos los horarios
            HORARIOS.forEach(hora => {
              if (map[cancha] && map[cancha][hora] !== undefined) {
                map[cancha][hora] = { ...bloqueo, tipo: 'bloqueo', hora_inicio: hora };
              }
            });
          } else if (bloqueo.hora_inicio && bloqueo.hora_fin) {
            // Bloquear solo el rango de horas
            HORARIOS.forEach(hora => {
              if (hora >= bloqueo.hora_inicio && hora < bloqueo.hora_fin) {
                if (map[cancha] && map[cancha][hora] !== undefined) {
                  map[cancha][hora] = { ...bloqueo, tipo: 'bloqueo', hora_inicio: hora };
                }
              }
            });
          }
        });
      }
    });
    
    // Luego agregar turnos reales (tienen prioridad sobre bloqueos) - excluir cancelados
    turnos.forEach(turno => {
      if (turno.estado !== 'cancelado' && map[turno.cancha] && map[turno.cancha][turno.hora_inicio] !== undefined) {
        map[turno.cancha][turno.hora_inicio] = { ...turno, tipo: 'turno' };
      }
    });

    // Finalmente agregar recordatorios que NO tienen turno asociado
    const recordatoriosFiltrados = recordatorios.filter(r => 
      r.fecha === fechaStr && 
      !r.turno_cancha_id && // Solo los que NO están vinculados a un turno
      (selectedCancha === 'todas' || r.cancha === selectedCancha)
    );

    recordatoriosFiltrados.forEach(rec => {
      let hora = rec.hora.length === 5 ? rec.hora : rec.hora.substring(0, 5); // Asegurar formato HH:MM

      // Si la hora no existe en los slots (ej: 18:22), redondear al slot más cercano
      if (map[rec.cancha] && map[rec.cancha][hora] === undefined) {
        const [h, m] = hora.split(':').map(Number);
        const minutos = m < 30 ? '00' : '30';
        hora = `${h.toString().padStart(2, '0')}:${minutos}`;
      }

      if (map[rec.cancha] && map[rec.cancha][hora] !== undefined && !map[rec.cancha][hora]) {
        map[rec.cancha][hora] = { ...rec, tipo: 'recordatorio' };
      }
    });
    
    return map;
  }, [turnos, recordatorios, bloqueos, selectedDate, selectedCancha]);

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
    <>
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
                      
                      // Si hay turno, recordatorio o bloqueo en este slot
                      if (turno) {
                        // Si es un bloqueo
                        if (turno.tipo === 'bloqueo') {
                          return (
                            <td
                              key={cancha}
                              className="p-2 border-r border-slate-200 align-top"
                            >
                              <div className="h-full rounded-lg border-2 border-rose-300 bg-rose-50/50 p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Ban className="w-4 h-4 text-rose-600" />
                                  <span className="text-xs font-bold text-rose-700 uppercase">
                                    No Disponible
                                  </span>
                                </div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {turno.descripcion || turno.motivo}
                                </p>
                                {turno.todo_el_dia && (
                                  <p className="text-xs text-slate-600 mt-1">Todo el día</p>
                                )}
                              </div>
                            </td>
                          );
                        }
                        
                        // Si es un recordatorio sin turno
                        if (turno.tipo === 'recordatorio') {
                          return (
                            <td
                              key={cancha}
                              className="p-2 border-r border-slate-200 align-top"
                            >
                              <div
                                className={cn(
                                  'h-full rounded-lg border-2 p-3 transition-all',
                                  turno.estado === 'hecho'
                                    ? 'bg-emerald-50 border-emerald-400'
                                    : 'bg-amber-50 border-amber-400'
                                )}
                              >
                                {/* Header con estado */}
                                <div className="flex items-center justify-between mb-2">
                                  <span className={cn(
                                    'px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1',
                                    turno.estado === 'hecho'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-amber-100 text-amber-700'
                                  )}>
                                    <Bell className="w-3 h-3" />
                                    {turno.estado === 'hecho' ? 'LISTO' : 'PENDIENTE'}
                                  </span>
                                </div>

                                {/* Contenido */}
                                <div className="space-y-2">
                                  <div>
                                    <p className="text-xs font-semibold text-amber-700 mb-1">
                                      🧹 Sacar cancha
                                    </p>
                                    <p className="font-bold text-slate-900 text-base leading-tight">
                                      {turno.profesor}
                                    </p>
                                    <p className="text-sm text-slate-600 mt-0.5">
                                      {turno.hora}
                                    </p>
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

                        // Si es un turno real
                         const filas = calcularFilas(turno);
                         const esDelProfesor = profesorTurnos.has(turno.id);

                          return (
                            <td
                              key={cancha}
                              rowSpan={filas}
                              className={cn(
                                'p-2 border-r border-slate-200 align-top',
                                isAdmin && 'cursor-pointer hover:bg-slate-100'
                              )}
                              onClick={() => turno.tipo === 'turno' && onTurnoClick?.(turno)}
                            >
                              {turno.tipo_turno === 'clase' ? (
                                <TarjetaClaseConPagos 
                                  turno={turno} 
                                  isAdmin={isAdmin}
                                  onTurnoClick={onTurnoClick}
                                />
                              ) : (
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
                                    <Badge
                                      variant={turno.pagado ? 'default' : 'destructive'}
                                      className={cn(
                                        'flex items-center gap-1',
                                        turno.pagado && 'bg-emerald-600'
                                      )}
                                    >
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
                                    </Badge>
                                    <span className="text-xs font-semibold text-slate-500">
                                      {turno.duracion} min
                                    </span>
                                     {isAdmin && (
                                       <DropdownMenu>
                                         <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                           <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                                             <MoreVertical className="w-3 h-3" />
                                           </Button>
                                         </DropdownMenuTrigger>
                                         <DropdownMenuContent align="end">
                                           {turno.tipo_turno === 'alquiler' && turno.modalidad_alquiler === 'abono' && (
                                             <DropdownMenuItem onClick={(e) => {
                                               e.stopPropagation();
                                               onCancelarCancha?.(turno);
                                             }} className="text-rose-600">
                                               <Ban className="w-4 h-4 mr-2" />
                                               Cancelar cancha
                                             </DropdownMenuItem>
                                           )}
                                         </DropdownMenuContent>
                                       </DropdownMenu>
                                     )}
                                   </div>

                                  {/* Contenido principal */}
                                  <div className="space-y-2">
                                    {/* Cliente */}
                                    <div>
                                      <p className="font-bold text-slate-900 text-sm leading-tight">
                                        {turno.cliente}
                                      </p>
                                      <p className="text-xs text-slate-600 mt-0.5">
                                        {turno.hora_inicio} - {turno.hora_fin}
                                      </p>
                                    </div>

                                    {/* Tipo de turno y Profesor */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                                        Alquiler - {turno.modalidad_alquiler === 'abono' ? 'Abono' : 'Suelto'}
                                      </span>
                                      {turno.modalidad_alquiler === 'abono' && (
                                        <Badge variant="outline" className="text-xs bg-emerald-50 border-emerald-200 text-emerald-700">
                                          Abono pagado
                                        </Badge>
                                      )}
                                      {turno.modalidad_alquiler === 'suelto' && turno.pagado && (
                                        <Badge variant="outline" className="text-xs bg-emerald-50 border-emerald-200 text-emerald-700">
                                          Cancha pagada
                                        </Badge>
                                      )}
                                    </div>

                                     {/* Precio y botón de pago */}
                                     <div className="flex items-center justify-between gap-2 p-2 bg-white/50 rounded border border-slate-200">
                                       <div className="flex items-center gap-1.5">
                                         <DollarSign className="w-4 h-4 text-slate-600" />
                                         <span className="font-bold text-slate-900">
                                           {formatMoney(turno.monto)}
                                         </span>
                                       </div>
                                       {!turno.pagado && isAdmin && (
                                         <Button
                                           size="sm"
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             setTurnoParaPago(turno);
                                             setShowPagoModal(true);
                                           }}
                                           className="h-7 bg-emerald-600 hover:bg-emerald-700 text-xs"
                                         >
                                           <CheckCircle className="w-3 h-3 mr-1" />
                                           Cobrar
                                         </Button>
                                       )}
                                       {turno.pagado && (
                                         <Badge className="bg-emerald-600">
                                           <CheckCircle className="w-3 h-3 mr-1" />
                                           Pagado
                                         </Badge>
                                       )}
                                     </div>

                                     {turno.notas && (
                                       <p className="text-xs text-slate-500 italic mt-2 border-t pt-2">
                                         {turno.notas}
                                       </p>
                                     )}
                                   </div>
                                 </div>
                              )}
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
    
    {turnoParaPago && (
      <PagoRapidoModal
        open={showPagoModal}
        onOpenChange={setShowPagoModal}
        turno={turnoParaPago}
      />
    )}
    </>
  );
}