import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function RecordatoriosCanchaAdmin() {
  const queryClient = useQueryClient();
  const [vista, setVista] = useState('semana');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [nuevoModal, setNuevoModal] = useState({ open: false, recordatorio: null });
  const [seleccionados, setSeleccionados] = useState([]);

  const { data: recordatorios = [], isLoading } = useQuery({
    queryKey: ['recordatorios-cancha'],
    queryFn: () => base44.entities.RecordatorioCancha.list('-fecha'),
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos-cancha-all'],
    queryFn: () => base44.entities.TurnoCancha.list(),
  });

  const eliminarMutation = useMutation({
    mutationFn: (id) => base44.entities.RecordatorioCancha.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
    },
  });

  const eliminarMultiplesMutation = useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map(id => base44.entities.RecordatorioCancha.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
      setSeleccionados([]);
    },
  });

  const weekStart = startOfWeek(currentWeek, { locale: es });
  const weekEnd = endOfWeek(currentWeek, { locale: es });

  const recordatoriosConTurnos = useMemo(() => {
    return recordatorios.map(rec => {
      const turno = turnos.find(t => t.id === rec.turno_cancha_id);
      return { ...rec, turno };
    });
  }, [recordatorios, turnos]);

  const recordatoriosFiltrados = useMemo(() => {
    if (vista === 'todos') return recordatoriosConTurnos;
    
    return recordatoriosConTurnos.filter(r => {
      const fecha = parseISO(r.fecha);
      return fecha >= weekStart && fecha <= weekEnd;
    });
  }, [recordatoriosConTurnos, vista, weekStart, weekEnd]);

  const recordatoriosPorDia = useMemo(() => {
    const dias = {};
    for (let i = 0; i < 7; i++) {
      const dia = addDays(weekStart, i);
      const diaStr = format(dia, 'yyyy-MM-dd');
      dias[diaStr] = recordatoriosFiltrados
        .filter(r => r.fecha === diaStr)
        .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    }
    return dias;
  }, [recordatoriosFiltrados, weekStart]);

  const stats = useMemo(() => {
    const pendientes = recordatoriosFiltrados.filter(r => r.estado === 'pendiente').length;
    const hechos = recordatoriosFiltrados.filter(r => r.estado === 'hecho').length;
    const montoTotal = recordatoriosFiltrados.reduce((sum, r) => sum + (r.monto || 0), 0);
    const montoCobrado = recordatoriosFiltrados
      .filter(r => r.estado === 'hecho')
      .reduce((sum, r) => sum + (r.monto || 0), 0);
    return { pendientes, hechos, montoTotal, montoCobrado };
  }, [recordatoriosFiltrados]);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const handleEliminar = (id) => {
    if (confirm('¿Eliminar este recordatorio?')) {
      eliminarMutation.mutate(id);
    }
  };

  const handleEliminarSeleccionados = () => {
    if (seleccionados.length === 0) return;
    
    if (confirm(`¿Eliminar ${seleccionados.length} recordatorio${seleccionados.length > 1 ? 's' : ''}?`)) {
      eliminarMultiplesMutation.mutate(seleccionados);
    }
  };

  const toggleSeleccion = (id) => {
    setSeleccionados(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSeleccionarTodos = () => {
    if (seleccionados.length === recordatoriosFiltrados.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(recordatoriosFiltrados.map(r => r.id));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Recordatorios de Cancha</h1>
            <p className="text-slate-500 text-sm">Gestión administrativa - Los recordatorios se crean automáticamente desde Agenda</p>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{recordatoriosFiltrados.length}</p>
                <p className="text-sm text-slate-500 mt-1">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-amber-200 bg-amber-50/30">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{stats.pendientes}</p>
                <p className="text-sm text-slate-500 mt-1">Pendientes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{stats.hechos}</p>
                <p className="text-sm text-slate-500 mt-1">Completados</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-blue-200 bg-blue-50/30">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-xl font-bold text-blue-600">{formatMoney(stats.montoCobrado)}</p>
                <p className="text-xs text-slate-500 mt-1">de {formatMoney(stats.montoTotal)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Acciones de selección múltiple */}
        {seleccionados.length > 0 && (
          <Card className="shadow-md border-emerald-200 bg-emerald-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-slate-700">
                  {seleccionados.length} recordatorio{seleccionados.length > 1 ? 's' : ''} seleccionado{seleccionados.length > 1 ? 's' : ''}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSeleccionados([])}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleEliminarSeleccionados}
                    disabled={eliminarMultiplesMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar seleccionados
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vista selector y navegación */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Tabs value={vista} onValueChange={setVista}>
              <TabsList>
                <TabsTrigger value="semana">Semana</TabsTrigger>
                <TabsTrigger value="todos">Todos</TabsTrigger>
              </TabsList>
            </Tabs>
            {recordatoriosFiltrados.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSeleccionarTodos}
              >
                <Checkbox 
                  checked={seleccionados.length === recordatoriosFiltrados.length && recordatoriosFiltrados.length > 0}
                  className="mr-2"
                />
                {seleccionados.length === recordatoriosFiltrados.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </Button>
            )}
          </div>

          {vista === 'semana' && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium text-slate-700 min-w-[200px] text-center">
                {format(weekStart, "d 'de' MMM", { locale: es })} -{' '}
                {format(weekEnd, "d 'de' MMM yyyy", { locale: es })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(new Date())}
              >
                Hoy
              </Button>
            </div>
          )}
        </div>

        {/* Vista semanal */}
        {vista === 'semana' && (
          <div className="grid lg:grid-cols-7 gap-4">
            {Object.entries(recordatoriosPorDia).map(([fecha, recs]) => {
              const dia = parseISO(fecha);
              const esHoy = format(new Date(), 'yyyy-MM-dd') === fecha;
              
              return (
                <Card key={fecha} className={cn(
                  'shadow-sm',
                  esHoy && 'ring-2 ring-emerald-500'
                )}>
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-sm text-center">
                      <div className="font-semibold text-slate-900">
                        {format(dia, 'EEEE', { locale: es })}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {format(dia, "d 'de' MMM", { locale: es })}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    {recs.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">Sin recordatorios</p>
                    ) : (
                      <div className="space-y-2">
                        {recs.map((rec) => (
                          <div
                            key={rec.id}
                            className={cn(
                              'p-2 rounded-lg border text-xs space-y-1',
                              rec.estado === 'hecho'
                                ? 'bg-emerald-50 border-emerald-200'
                                : 'bg-white border-slate-200',
                              seleccionados.includes(rec.id) && 'ring-2 ring-emerald-500'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={seleccionados.includes(rec.id)}
                                onCheckedChange={() => toggleSeleccion(rec.id)}
                              />
                              <div className="font-semibold text-slate-800">{rec.hora}</div>
                            </div>
                            <div className="text-slate-600">Cancha {rec.cancha}</div>
                            <div className="text-slate-500">{rec.profesor}</div>
                            {rec.turno && (
                              <>
                                <span className={cn(
                                  "inline-block px-1.5 py-0.5 text-[10px] font-medium rounded",
                                  rec.turno.tipo_turno === 'clase' 
                                    ? "bg-blue-100 text-blue-700" 
                                    : "bg-purple-100 text-purple-700"
                                )}>
                                  {rec.turno.tipo_turno === 'clase' ? 'Clase' : 'Alquiler'}
                                </span>
                                {rec.turno.cliente && (
                                  <div className="text-[10px] text-slate-600">👤 {rec.turno.cliente}</div>
                                )}
                              </>
                            )}
                            <div className="flex items-center gap-1 font-semibold text-emerald-600">
                              {formatMoney(rec.monto)}
                              {rec.turno?.pagado && <CheckCircle className="w-3 h-3" />}
                            </div>
                            {rec.repeticion_semanal && (
                              <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-medium rounded">
                                Semanal
                              </span>
                            )}
                            {rec.estado === 'hecho' && (
                              <div className="text-[10px] text-emerald-600 pt-1">
                                ✓ {rec.hecho_por_nombre}
                              </div>
                            )}
                            <div className="flex gap-1 pt-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setNuevoModal({ open: true, recordatorio: rec })}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-rose-600 hover:text-rose-700"
                                onClick={() => handleEliminar(rec.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Vista todos */}
        {vista === 'todos' && (
          <Card className="shadow-sm">
            <CardHeader className="border-b">
              <CardTitle>Todos los recordatorios</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {recordatoriosFiltrados.map((rec) => (
                  <div 
                    key={rec.id} 
                    className={cn(
                      "p-4 hover:bg-slate-50 transition-colors",
                      seleccionados.includes(rec.id) && "bg-emerald-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={seleccionados.includes(rec.id)}
                          onCheckedChange={() => toggleSeleccion(rec.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-800">
                            {format(parseISO(rec.fecha), "d 'de' MMM", { locale: es })} - {rec.hora}
                          </span>
                          <span className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium',
                            rec.estado === 'hecho'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          )}>
                            {rec.estado === 'hecho' ? 'Completado' : 'Pendiente'}
                          </span>
                          {rec.repeticion_semanal && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                              Semanal
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-600">
                          Cancha {rec.cancha} - {rec.profesor}
                        </div>
                        {rec.turno && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn(
                              "px-2 py-0.5 text-xs font-medium rounded",
                              rec.turno.tipo_turno === 'clase' 
                                ? "bg-blue-100 text-blue-700" 
                                : "bg-purple-100 text-purple-700"
                            )}>
                              {rec.turno.tipo_turno === 'clase' ? '📚 Clase' : '🎾 Alquiler'}
                              {rec.turno.modalidad_alquiler && ` (${rec.turno.modalidad_alquiler})`}
                            </span>
                            {rec.turno.cliente && (
                              <span className="text-xs text-slate-600">👤 {rec.turno.cliente}</span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
                          {formatMoney(rec.monto)}
                          {rec.turno?.pagado && <CheckCircle className="w-4 h-4 ml-1" />}
                        </div>
                        {rec.estado === 'hecho' && rec.hora_confirmacion && (
                          <div className="text-xs text-slate-500">
                            ✓ Completado por {rec.hecho_por_nombre} el{' '}
                            {format(parseISO(rec.hora_confirmacion), "d/MM/yyyy 'a las' HH:mm")}
                          </div>
                        )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setNuevoModal({ open: true, recordatorio: rec })}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-rose-600 hover:text-rose-700"
                          onClick={() => handleEliminar(rec.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {recordatoriosFiltrados.length === 0 && (
                  <div className="p-12 text-center text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p>No hay recordatorios</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <NuevoRecordatorioCanchaModal
        open={nuevoModal.open}
        onOpenChange={(open) => setNuevoModal({ ...nuevoModal, open })}
        recordatorio={nuevoModal.recordatorio}
      />
    </div>
  );
}