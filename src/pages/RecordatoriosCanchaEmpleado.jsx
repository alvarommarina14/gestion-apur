import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle, Clock, MapPin, User, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import NotificationDebug from '@/components/NotificationDebug';

export default function RecordatoriosCanchaEmpleado() {
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: recordatorios = [], isLoading } = useQuery({
    queryKey: ['recordatorios-cancha', today],
    queryFn: () => base44.entities.RecordatorioCancha.filter({ fecha: today }),
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos-cancha', today],
    queryFn: () => base44.entities.TurnoCancha.filter({ fecha: today }),
  });

  const marcarHechoMutation = useMutation({
    mutationFn: async (recordatorio) => {
      // Actualizar recordatorio
      await base44.entities.RecordatorioCancha.update(recordatorio.id, {
        estado: 'hecho',
        hecho_por: user.email,
        hecho_por_nombre: user.full_name,
        hora_confirmacion: new Date().toISOString(),
      });

      // Si está vinculado a un turno, marcarlo como pagado
      if (recordatorio.turno_cancha_id) {
        await base44.entities.TurnoCancha.update(recordatorio.turno_cancha_id, {
          pagado: true,
        });
      }

      // Si tiene repetición semanal, crear el siguiente
      if (recordatorio.repeticion_semanal) {
        const fechaActual = parseISO(recordatorio.fecha);
        const proximaSemana = new Date(fechaActual);
        proximaSemana.setDate(proximaSemana.getDate() + 7);

        await base44.entities.RecordatorioCancha.create({
          fecha: format(proximaSemana, 'yyyy-MM-dd'),
          hora: recordatorio.hora,
          cancha: recordatorio.cancha,
          profesor: recordatorio.profesor,
          monto: recordatorio.monto,
          repeticion_semanal: true,
          dia_semana: format(proximaSemana, 'EEEE', { locale: es }),
          recordatorio_base_id: recordatorio.recordatorio_base_id || recordatorio.id,
          notas: recordatorio.notas,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
    },
  });

  const recordatoriosConTurnos = useMemo(() => {
    return recordatorios.map(rec => {
      const turno = turnos.find(t => t.id === rec.turno_cancha_id);
      return { ...rec, turno };
    });
  }, [recordatorios, turnos]);

  const recordatoriosOrdenados = useMemo(() => {
    return [...recordatoriosConTurnos].sort((a, b) => {
      const estadoOrder = { pendiente: 0, hecho: 1 };
      if (estadoOrder[a.estado] !== estadoOrder[b.estado]) {
        return estadoOrder[a.estado] - estadoOrder[b.estado];
      }
      return (a.hora || '').localeCompare(b.hora || '');
    });
  }, [recordatoriosConTurnos]);

  const stats = useMemo(() => {
    const pendientes = recordatorios.filter(r => r.estado === 'pendiente').length;
    const hechos = recordatorios.filter(r => r.estado === 'hecho').length;
    const total = recordatorios.length;
    return { pendientes, hechos, total };
  }, [recordatorios]);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Recordatorios de Cancha</h1>
          <p className="text-slate-500 text-sm">
            {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
          </p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-sm text-slate-500 mt-1">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-amber-200 bg-amber-50/30">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-amber-600">{stats.pendientes}</p>
                <p className="text-sm text-slate-500 mt-1">Pendientes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-600">{stats.hechos}</p>
                <p className="text-sm text-slate-500 mt-1">Completados</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de recordatorios */}
        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Recordatorios de hoy</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">
                <Clock className="w-8 h-8 animate-spin mx-auto mb-2 opacity-40" />
                <p>Cargando...</p>
              </div>
            ) : recordatoriosOrdenados.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No hay recordatorios para hoy</p>
              </div>
            ) : (
              <div className="divide-y">
                {recordatoriosOrdenados.map((recordatorio) => (
                  <div
                    key={recordatorio.id}
                    className={cn(
                      'p-4 transition-all',
                      recordatorio.estado === 'hecho' ? 'bg-slate-50' : 'bg-white hover:bg-slate-50/50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'px-3 py-1 rounded-lg font-semibold text-lg',
                            recordatorio.estado === 'hecho' 
                              ? 'bg-slate-200 text-slate-500' 
                              : 'bg-emerald-100 text-emerald-700'
                          )}>
                            {recordatorio.hora}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              <span className={cn(
                                'font-medium',
                                recordatorio.estado === 'hecho' ? 'text-slate-500 line-through' : 'text-slate-800'
                              )}>
                                Cancha {recordatorio.cancha}
                              </span>
                            </div>
                            {recordatorio.profesor && (
                              <div className="flex items-center gap-2 mt-1">
                                <User className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-600">{recordatorio.profesor}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm flex-wrap">
                          <span className={cn(
                            "px-2 py-0.5 text-xs font-medium rounded",
                            recordatorio.tipo_turno === 'clase' 
                              ? "bg-blue-100 text-blue-700" 
                              : "bg-purple-100 text-purple-700"
                          )}>
                            {recordatorio.tipo_turno === 'clase' ? '📚 Clase' : '🎾 Alquiler'}
                            {recordatorio.modalidad_alquiler && ` (${recordatorio.modalidad_alquiler})`}
                          </span>
                          {recordatorio.cliente && (
                            <span className="text-xs text-slate-600">
                              👤 {recordatorio.cliente}
                            </span>
                          )}
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-slate-400" />
                            <span className="font-semibold text-slate-700">
                              {formatMoney(recordatorio.monto)}
                            </span>
                            {recordatorio.pagado && (
                              <CheckCircle className="w-4 h-4 text-emerald-600 ml-1" />
                            )}
                          </div>
                          {recordatorio.repeticion_semanal && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                              Semanal
                            </span>
                          )}
                        </div>

                        {recordatorio.estado === 'hecho' && (
                          <div className="text-xs text-slate-500 pt-1">
                            ✓ Confirmado por {recordatorio.hecho_por_nombre} a las{' '}
                            {format(parseISO(recordatorio.hora_confirmacion), 'HH:mm')}
                          </div>
                        )}
                      </div>

                      {recordatorio.estado === 'pendiente' && (
                        <Button
                          onClick={() => marcarHechoMutation.mutate(recordatorio)}
                          disabled={marcarHechoMutation.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          HECHO
                        </Button>
                      )}

                      {recordatorio.estado === 'hecho' && (
                        <div className="flex items-center gap-2 text-emerald-600 shrink-0">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm font-medium">Completado</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debug de notificaciones */}
        <NotificationDebug />
      </div>
    </div>
  );
}