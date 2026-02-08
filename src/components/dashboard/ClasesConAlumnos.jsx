import React, { useState, useMemo } from 'react';
import { format, parseISO, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, DollarSign, Users, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ClasesConAlumnos({ profesorSeleccionado, onRegistrarPago }) {
  const [claseSeleccionada, setClaseSeleccionada] = useState(null);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos-profesor'],
    queryFn: () => base44.entities.TurnoCancha.list('-fecha'),
  });

  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
  });

  // Agrupar turnos de clase por día de esta semana y próxima
  const clasesAgrupadas = useMemo(() => {
    const hoy = new Date();

    // Filtrar solo clases del profesor, próximos 10 días
    const clasesProximos = turnos.filter(t => {
      if (t.tipo_turno !== 'clase') return false;
      if (profesorSeleccionado && t.profesor !== profesorSeleccionado.nombre) return false;
      const fecha = parseISO(t.fecha);
      return fecha >= hoy && fecha <= addDays(hoy, 9);
    });

    const agrupadas = {};
    clasesProximos.forEach(clase => {
      if (!agrupadas[clase.fecha]) {
        agrupadas[clase.fecha] = [];
      }
      agrupadas[clase.fecha].push(clase);
    });

    // Ordenar por fecha
    return Object.keys(agrupadas).sort().map(fecha => ({
      fecha,
      clases: agrupadas[fecha].sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || ''))
    }));
  }, [turnos, profesorSeleccionado]);

  const obtenerAlumno = (id) => alumnos.find(a => a.id === id);

  return (
    <div className="space-y-4">
      {clasesAgrupadas.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No hay clases programadas próximamente</p>
        </div>
      ) : (
        clasesAgrupadas.map(({ fecha, clases: clasesDelDia }) => (
          <div key={fecha} className="space-y-2">
            {/* Encabezado de fecha */}
            <h3 className="font-semibold text-slate-700 text-sm px-3 py-1">
              {format(parseISO(fecha), "EEEE, d 'de' MMMM", { locale: es })}
            </h3>

            {/* Clases del día */}
            {clasesDelDia.map(clase => {
              const alumnosClase = (clase.alumnos_ids || [])
                .map(id => obtenerAlumno(id))
                .filter(Boolean);

              return (
                <div
                  key={clase.id}
                  className={cn(
                    "border rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow",
                    clase.pagado ? "border-emerald-300 bg-emerald-50/30" : "border-rose-300 bg-rose-50/30"
                  )}
                >
                  {/* Header de clase */}
                  <div
                    className={cn(
                      "p-3 bg-gradient-to-r border-b cursor-pointer transition-colors",
                      clase.pagado
                        ? "from-emerald-50 to-emerald-100/50 hover:from-emerald-100"
                        : "from-rose-50 to-rose-100/50 hover:from-rose-100"
                    )}
                    onClick={() => setClaseSeleccionada(claseSeleccionada?.id === clase.id ? null : clase)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="text-sm font-bold text-emerald-700 bg-emerald-200 rounded px-2 py-1 w-16 text-center">
                          {clase.hora_inicio}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 text-sm">
                            Clase - Cancha {clase.cancha}
                          </p>
                          <p className="text-xs text-slate-500">
                            ${(clase.monto || 0).toLocaleString('es-AR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {clase.pagado ? (
                          <Badge className="bg-emerald-100 text-emerald-700 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Pagado
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-700 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Pendiente
                          </Badge>
                        )}
                        <Badge variant="outline" className="bg-white">
                          {alumnosClase.length}
                        </Badge>
                        <ChevronRight
                          className={cn(
                            'w-5 h-5 text-slate-400 transition-transform',
                            claseSeleccionada?.id === clase.id && 'rotate-90'
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Lista de alumnos (expandible) */}
                  {claseSeleccionada?.id === clase.id && (
                    <div className="bg-slate-50 p-3 space-y-2">
                      {alumnosClase.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-2">Sin alumnos asignados</p>
                      ) : (
                        alumnosClase.map(alumno => (
                          <div
                            key={alumno.id}
                            className={cn(
                              'p-3 rounded-lg border transition-all cursor-pointer',
                              alumnoSeleccionado?.id === alumno.id
                                ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-300'
                                : 'bg-white border-slate-200 hover:border-emerald-300'
                            )}
                            onClick={() => setAlumnoSeleccionado(alumnoSeleccionado?.id === alumno.id ? null : alumno)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-semibold text-emerald-700">
                                  {alumno.nombre?.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-900 text-sm">{alumno.nombre}</p>
                                  <p className="text-xs text-slate-500">
                                    ${(clase.precio || 0).toLocaleString('es-AR')}
                                  </p>
                                </div>
                              </div>

                              {/* Estado de pago */}
                              {alumnoSeleccionado?.id === alumno.id && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    onRegistrarPago({ ...alumno, clase, turnoId: clase.id });
                                    setAlumnoSeleccionado(null);
                                    setClaseSeleccionada(null);
                                  }}
                                  disabled={clase.pagado}
                                  className={cn(
                                    "gap-1",
                                    clase.pagado 
                                      ? "bg-emerald-100 text-emerald-700 cursor-not-allowed"
                                      : "bg-emerald-600 hover:bg-emerald-700"
                                  )}
                                >
                                  <DollarSign className="w-3 h-3" />
                                  {clase.pagado ? 'Pagado' : 'Cobrar'}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}