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
   const [fechaSeleccionada, setFechaSeleccionada] = useState(format(new Date(), 'yyyy-MM-dd'));

   const { data: recordatorios = [] } = useQuery({
     queryKey: ['recordatorios-cancha'],
     queryFn: () => base44.entities.RecordatorioCancha.list('-fecha'),
   });

   const { data: turnos = [] } = useQuery({
     queryKey: ['turnos-cancha-all'],
     queryFn: () => base44.entities.TurnoCancha.list(),
   });

   const recordatoriosConTurnos = useMemo(() => {
     return recordatorios.map(rec => {
       const turno = turnos.find(t => t.id === rec.turno_cancha_id);
       return { ...rec, turno };
     });
   }, [recordatorios, turnos]);

   const recordatoriosFiltrados = useMemo(() => {
     return recordatoriosConTurnos
       .filter(r => r.fecha === fechaSeleccionada)
       .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
   }, [recordatoriosConTurnos, fechaSeleccionada]);

   const stats = useMemo(() => {
     const abonos = recordatoriosFiltrados.filter(r => r.turno?.modalidad_alquiler === 'abono').length;
     const clases = recordatoriosFiltrados.filter(r => r.turno?.tipo_turno === 'clase').length;
     const montoTotal = recordatoriosFiltrados.reduce((sum, r) => sum + (r.monto || 0), 0);
     return { abonos, clases, montoTotal };
   }, [recordatoriosFiltrados]);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Canchas - Admin</h1>
            <p className="text-slate-500 text-sm">Vista de recordatorios - Selecciona una fecha para ver los detalles</p>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-slate-400" />
            <Input
              type="date"
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              className="w-full sm:w-auto"
            />
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{recordatoriosFiltrados.length}</p>
                <p className="text-sm text-slate-500 mt-1">Total del día</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-blue-200 bg-blue-50/30">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.abonos}</p>
                <p className="text-sm text-slate-500 mt-1">Abonos</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{stats.clases}</p>
                <p className="text-sm text-slate-500 mt-1">Clases</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de recordatorios del día */}
        {recordatoriosFiltrados.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="pt-12 text-center pb-12">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-slate-500">No hay recordatorios para esta fecha</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {recordatoriosFiltrados.map((rec) => (
              <Card key={rec.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Encabezado */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-bold text-slate-900 min-w-[60px]">
                          {rec.hora}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            Cancha {rec.cancha}
                          </div>
                          <div className="text-sm text-slate-500 mt-0.5">
                            {format(parseISO(rec.fecha), "EEEE, d 'de' MMMM", { locale: es })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          'inline-block px-3 py-1 rounded-full text-sm font-semibold',
                          rec.turno?.tipo_turno === 'clase'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        )}>
                          {rec.turno?.tipo_turno === 'clase' ? '📚 Clase' : '🎾 Alquiler'}
                        </span>
                      </div>
                    </div>

                    {/* Información del turno */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                      <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Cliente / De quién</p>
                        <p className="text-sm font-medium text-slate-900 mt-1">{rec.turno?.cliente || rec.cliente || 'N/A'}</p>
                      </div>
                      {rec.turno?.tipo_turno === 'clase' && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase font-semibold">Profesor</p>
                          <p className="text-sm font-medium text-slate-900 mt-1">{rec.turno?.profesor || 'No asignado'}</p>
                        </div>
                      )}
                      {rec.turno?.tipo_turno === 'clase' && rec.turno?.alumnos_nombres && (
                        <div className="col-span-2">
                          <p className="text-xs text-slate-500 uppercase font-semibold flex items-center gap-1">
                            <Users className="w-3 h-3" /> Alumnos
                          </p>
                          <div className="text-sm font-medium text-slate-900 mt-1">
                            {Array.isArray(rec.turno.alumnos_nombres) 
                              ? rec.turno.alumnos_nombres.join(', ')
                              : rec.turno.alumnos_nombres}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Modalidad</p>
                        <p className="text-sm font-medium text-slate-900 mt-1 capitalize">
                          {rec.turno?.modalidad_alquiler || rec.turno?.tipo_turno || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">Precio</p>
                        <p className="text-sm font-bold text-emerald-600 mt-1">{formatMoney(rec.monto)}</p>
                      </div>
                    </div>

                    {/* Notas */}
                    {rec.notas && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-xs text-slate-500 uppercase font-semibold">Notas</p>
                        <p className="text-sm text-slate-700 mt-1 bg-slate-50 p-2 rounded">{rec.notas}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
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