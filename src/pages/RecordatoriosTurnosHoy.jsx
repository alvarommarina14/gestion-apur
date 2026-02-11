import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, isToday, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, ChevronLeft, ChevronRight, Save } from 'lucide-react';

export default function RecordatoriosTurnosHoy() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [preciosEditables, setPreciosEditables] = useState({});
  const queryClient = useQueryClient();
  const today = format(selectedDate, 'yyyy-MM-dd');

  // Fetch turnos del día
  const { data: turnos = [], isLoading: loadingTurnos } = useQuery({
    queryKey: ['turnos-hoy', today],
    queryFn: async () => {
      const allTurnos = await base44.entities.TurnoCancha.list();
      return allTurnos.filter(t => t.fecha === today && t.estado === 'activo');
    },
  });

  // Fetch clientes y alumnos para info de pagos y precios
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list(),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
  });

  const { data: cobrosClientes = [] } = useQuery({
    queryKey: ['cobros-clientes'],
    queryFn: () => base44.entities.CobroCliente.list(),
  });

  // Helper para buscar cliente (case-insensitive)
  const buscarCliente = (nombreTurno) => {
    return clientes.find(c => 
      c.nombre.toLowerCase().trim() === nombreTurno.toLowerCase().trim()
    );
  };

  // Procesar turnos
  const { alquileres, clases } = useMemo(() => {
    const mesActual = today.substring(0, 7);

    const alquileres = [];
    const clases = [];

    turnos.forEach(turno => {
      if (turno.tipo_turno === 'alquiler') {
        const cliente = buscarCliente(turno.cliente);
        const cobro = cobrosClientes.find(
          c => c.cliente_nombre === turno.cliente && c.mes === mesActual
        );

        // Usar el precio actualizado del cliente en lugar del monto antiguo del turno
        const montoActual = cliente?.precio || turno.monto || 0;

        let estado = 'pendiente';
        let deuda = 0;

        if (turno.pagado) {
          estado = 'pagado';
        } else if (cliente?.activo === false) {
          estado = 'moroso';
          deuda = montoActual;
        } else if (cobro?.estado === 'moroso') {
          estado = 'moroso';
          deuda = cobro.monto || montoActual;
        } else {
          deuda = montoActual;
        }

        alquileres.push({
          id: turno.id,
          nombre: turno.cliente,
          modalidad: turno.modalidad_alquiler === 'abono' ? 'Abono' : 'Suelta',
          horaInicio: turno.hora_inicio,
          horaFin: turno.hora_fin,
          cancha: turno.cancha,
          precio: montoActual,
          estado,
          deuda,
        });
      } else if (turno.tipo_turno === 'clase') {
        // Si es clase grupal, crear una sola tarjeta con todos los alumnos
        if (turno.alumnos_ids && turno.alumnos_ids.length > 0) {
          const alumnosData = turno.alumnos_ids.map((alumnoId, idx) => {
            const alumno = alumnos.find(a => a.id === alumnoId);
            if (alumno) {
              let estado = alumno.estado_mes_actual || 'pendiente';
              const deuda = estado === 'debe' || estado === 'moroso' ? alumno.precio_mensual || 0 : 0;
              return {
                id: alumnoId,
                nombre: alumno.nombre,
                precio: alumno.precio_mensual || 0,
                estado,
                deuda,
              };
            }
            return null;
          }).filter(Boolean);

          clases.push({
            id: turno.id,
            profesor: turno.profesor,
            horaInicio: turno.hora_inicio,
            horaFin: turno.hora_fin,
            cancha: turno.cancha,
            esGrupal: true,
            alumnos: alumnosData,
            precioTotal: alumnosData.reduce((sum, a) => sum + a.precio, 0),
            deudaTotal: alumnosData.reduce((sum, a) => sum + a.deuda, 0),
          });
        } else {
          // Clase individual - usar precio actualizado del cliente
          const cliente = buscarCliente(turno.cliente);
          const montoActual = cliente?.precio || turno.monto || 0;

          let estado = 'pendiente';
          let deuda = 0;

          if (turno.pagado) {
            estado = 'pagado';
          } else if (cliente?.activo === false) {
            estado = 'moroso';
            deuda = montoActual;
          } else {
            deuda = montoActual;
          }

          clases.push({
            id: turno.id,
            nombre: turno.cliente,
            profesor: turno.profesor,
            horaInicio: turno.hora_inicio,
            horaFin: turno.hora_fin,
            cancha: turno.cancha,
            esGrupal: false,
            precio: montoActual,
            estado,
            deuda,
          });
        }
      }
    });

    return {
      alquileres: alquileres.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
      clases: clases.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
    };
  }, [turnos, clientes, alumnos, cobrosClientes, today, buscarCliente]);

  const getEstadoBadge = (estado) => {
    if (estado === 'pagado') return <Badge className="bg-green-100 text-green-800">✓ Al día</Badge>;
    if (estado === 'moroso') return <Badge className="bg-red-100 text-red-800">✗ Moroso</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800">⏳ Pendiente</Badge>;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header con navegación */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-slate-900">Recordatorios</h1>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                className="h-10 w-10"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="text-center min-w-[200px]">
                <p className="text-sm font-medium text-slate-600">
                  {format(selectedDate, 'EEEE', { locale: es })}
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {format(selectedDate, 'd MMMM yyyy', { locale: es })}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                className="h-10 w-10"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {loadingTurnos ? (
          <div className="text-center text-slate-600">Cargando...</div>
        ) : (
          <div className="space-y-8">
            {/* Sección Alquileres */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Alquileres</h2>
              {alquileres.length === 0 ? (
                <Card className="bg-white">
                  <CardContent className="pt-6">
                    <p className="text-slate-500 text-center">No hay alquileres programados para hoy</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {alquileres.map(alquiler => (
                    <Card key={alquiler.id} className="bg-white hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">{alquiler.nombre}</h3>
                            <p className="text-sm text-slate-600 mt-1">
                              {alquiler.horaInicio} - {alquiler.horaFin} | Cancha {alquiler.cancha}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-emerald-600">
                              ${alquiler.precio.toLocaleString('es-AR')}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">{alquiler.modalidad}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                          <div className="flex-1">
                            {getEstadoBadge(alquiler.estado)}
                          </div>
                          {alquiler.deuda > 0 && (
                            <div className="flex items-center gap-2 ml-4 p-3 bg-red-50 rounded-lg">
                              <AlertCircle className="w-5 h-5 text-red-600" />
                              <div className="text-right">
                                <p className="text-xs text-red-600 font-semibold">DEBE</p>
                                <p className="text-lg font-bold text-red-600">
                                  ${alquiler.deuda.toLocaleString('es-AR')}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Sección Clases */}
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Clases</h2>
              {clases.length === 0 ? (
                <Card className="bg-white">
                  <CardContent className="pt-6">
                    <p className="text-slate-500 text-center">No hay clases programadas para hoy</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {clases.map(clase => (
                    <Card key={clase.id} className="bg-white hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              {clase.esGrupal ? 'Clase Grupal' : clase.nombre}
                            </h3>
                            <p className="text-sm text-slate-600 mt-1">
                              {clase.horaInicio} - {clase.horaFin} | Cancha {clase.cancha}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">Profesor: {clase.profesor || '-'}</p>
                          </div>
                        </div>

                        {/* Si es clase grupal, listar alumnos */}
                        {clase.esGrupal ? (
                          <div className="space-y-3 pt-4 border-t border-slate-200">
                            {clase.alumnos.map(alumno => (
                              <div key={alumno.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div>
                                  <p className="font-medium text-slate-900">{alumno.nombre}</p>
                                  <p className="text-xs text-slate-500">Mensual</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <p className="font-bold text-blue-600">
                                    ${alumno.precio.toLocaleString('es-AR')}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    {getEstadoBadge(alumno.estado)}
                                    {alumno.deuda > 0 && (
                                      <div className="text-right">
                                        <p className="text-xs font-semibold text-red-600">
                                          DEBE: ${alumno.deuda.toLocaleString('es-AR')}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          /* Clase individual */
                          <div>
                            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                              <div className="flex-1">
                                <p className="font-medium text-slate-900">{clase.nombre}</p>
                              </div>
                              <div className="text-right mr-3">
                                <p className="text-lg font-bold text-blue-600">
                                  ${clase.precio.toLocaleString('es-AR')}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-4">
                              <div className="flex-1">
                                {getEstadoBadge(clase.estado)}
                              </div>
                              {clase.deuda > 0 && (
                                <div className="flex items-center gap-2 ml-4 p-3 bg-red-50 rounded-lg">
                                  <AlertCircle className="w-5 h-5 text-red-600" />
                                  <div className="text-right">
                                    <p className="text-xs text-red-600 font-semibold">DEBE</p>
                                    <p className="text-lg font-bold text-red-600">
                                      ${clase.deuda.toLocaleString('es-AR')}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Resumen */}
            {(alquileres.length > 0 || clases.length > 0) && (
              <Card className="bg-emerald-50 border-emerald-200">
                <CardHeader>
                  <CardTitle className="text-emerald-900">Resumen del Día</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-slate-700">
                    <span>Alquileres:</span>
                    <span className="font-semibold">
                      ${alquileres.reduce((sum, a) => sum + a.precio, 0).toLocaleString('es-AR')}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Clases:</span>
                    <span className="font-semibold">
                      ${clases.reduce((sum, c) => sum + (c.precio || c.precioTotal || 0), 0).toLocaleString('es-AR')}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-emerald-200 flex justify-between text-lg font-bold text-emerald-900">
                    <span>Total Esperado:</span>
                    <span>
                      ${(alquileres.reduce((sum, a) => sum + a.precio, 0) + 
                          clases.reduce((sum, c) => sum + (c.precio || c.precioTotal || 0), 0)).toLocaleString('es-AR')}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-emerald-200 flex justify-between text-lg font-bold text-red-600">
                    <span>Total a Cobrar:</span>
                    <span>
                      ${(alquileres.reduce((sum, a) => sum + a.deuda, 0) + 
                          clases.reduce((sum, c) => sum + (c.deuda || c.deudaTotal || 0), 0)).toLocaleString('es-AR')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}