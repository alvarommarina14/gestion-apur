import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO, differenceInMinutes, addMinutes } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

export default function NotificationDebugDetailed() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const now = new Date();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: recordatorios = [] } = useQuery({
    queryKey: ['recordatorios-cancha-debug', today],
    queryFn: () => base44.entities.RecordatorioCancha.filter({ fecha: today }),
    refetchInterval: 5000,
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos-cancha-debug', today],
    queryFn: () => base44.entities.TurnoCancha.filter({ fecha: today }),
  });

  const getNotificationStatus = (rec) => {
    const [hours, minutes] = rec.hora.split(':').map(Number);
    const recordatorioTime = new Date();
    recordatorioTime.setHours(hours, minutes, 0, 0);

    let targetTime, minutesUntil, notificationType;

    if (user?.role === 'admin') {
      const turno = turnos.find(t => t.id === rec.turno_cancha_id);
      const duracion = turno?.duracion || 60;
      const finTurno = addMinutes(recordatorioTime, duracion);
      minutesUntil = differenceInMinutes(finTurno, now);
      targetTime = finTurno;
      notificationType = 'Antes del fin del turno';
    } else {
      minutesUntil = differenceInMinutes(recordatorioTime, now);
      targetTime = recordatorioTime;
      notificationType = 'Antes del inicio';
    }

    const minutosAntes = user?.role === 'admin' 
      ? (user?.minutos_antes_fin_cancha || 10)
      : (rec.minutos_antes || 10);

    const shouldNotify = minutesUntil <= minutosAntes && minutesUntil > 0;
    const isPast = minutesUntil <= 0;
    const isFuture = minutesUntil > minutosAntes;

    return {
      targetTime,
      minutesUntil,
      minutosAntes,
      shouldNotify,
      isPast,
      isFuture,
      notificationType,
      flags: {
        notificar: rec.notificar,
        estado: rec.estado,
        notificado_previo: rec.notificado_previo,
        notificado_hora: rec.notificado_hora,
        reintento_enviado: rec.reintento_enviado,
        escalado_admin: rec.escalado_admin,
      }
    };
  };

  if (!user) return null;

  const permissionGranted = typeof window !== 'undefined' && window.Notification?.permission === 'granted';
  const notificationsEnabled = user.recibir_notificaciones_cancha !== false;

  return (
    <Card className="shadow-sm border-2 border-blue-500">
      <CardHeader className="bg-blue-50">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-blue-600" />
          Debug de Notificaciones - {format(now, 'HH:mm:ss')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Estado general */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
            <span className="font-medium">Permisos del navegador:</span>
            <span className={permissionGranted ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
              {permissionGranted ? '✓ Concedidos' : '✗ No concedidos'}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
            <span className="font-medium">Notificaciones habilitadas:</span>
            <span className={notificationsEnabled ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
              {notificationsEnabled ? '✓ Sí' : '✗ No'}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
            <span className="font-medium">Rol:</span>
            <span className="font-semibold">{user.role}</span>
          </div>
          {user.role === 'admin' && (
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
              <span className="font-medium">Minutos antes del fin:</span>
              <span className="font-semibold">{user.minutos_antes_fin_cancha || 10} min</span>
            </div>
          )}
        </div>

        {/* Recordatorios */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Recordatorios de hoy ({recordatorios.length})</h4>
          {recordatorios.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No hay recordatorios para hoy</p>
          ) : (
            recordatorios.map(rec => {
              const status = getNotificationStatus(rec);
              
              return (
                <div key={rec.id} className="border rounded p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">
                      {rec.hora} - Cancha {rec.cancha}
                    </div>
                    {status.shouldNotify && !status.flags.notificado_previo ? (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold">
                        ✓ DEBE NOTIFICAR
                      </span>
                    ) : status.flags.notificado_previo ? (
                      <span className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs">
                        Ya notificado
                      </span>
                    ) : status.isFuture ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        Futuro
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded text-xs">
                        Pasado
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500">Minutos hasta {status.notificationType}:</span>
                      <div className="font-semibold">{status.minutesUntil} min</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Notificar a:</span>
                      <div className="font-semibold">{status.minutosAntes} min antes</div>
                    </div>
                  </div>

                  <div className="space-y-1 pt-2 border-t">
                    <div className="text-slate-600 font-medium">Flags:</div>
                    <div className="grid grid-cols-2 gap-1">
                      <div className={status.flags.notificar ? 'text-emerald-600' : 'text-rose-600'}>
                        {status.flags.notificar ? '✓' : '✗'} notificar
                      </div>
                      <div className={status.flags.estado === 'pendiente' ? 'text-emerald-600' : 'text-amber-600'}>
                        Estado: {status.flags.estado}
                      </div>
                      <div className={!status.flags.notificado_previo ? 'text-emerald-600' : 'text-slate-500'}>
                        {!status.flags.notificado_previo ? '✓' : '✗'} Sin notif. previa
                      </div>
                      <div className={!status.flags.notificado_hora ? 'text-emerald-600' : 'text-slate-500'}>
                        {!status.flags.notificado_hora ? '✓' : '✗'} Sin notif. hora
                      </div>
                    </div>
                  </div>

                  {!status.flags.notificar && (
                    <div className="bg-rose-50 border border-rose-200 rounded p-2 text-rose-700">
                      ⚠️ Este recordatorio tiene notificar=false
                    </div>
                  )}

                  {status.flags.estado === 'hecho' && (
                    <div className="bg-slate-50 border border-slate-200 rounded p-2 text-slate-700">
                      ✓ Recordatorio marcado como hecho
                    </div>
                  )}

                  {status.shouldNotify && status.flags.notificado_previo && (
                    <div className="bg-amber-50 border border-amber-200 rounded p-2 text-amber-700">
                      ⚠️ Debería notificar pero ya tiene flag notificado_previo=true
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="pt-2 border-t text-xs text-slate-500">
          <p className="font-medium mb-1">Diagnóstico:</p>
          {!permissionGranted && <p>• Falta conceder permisos del navegador</p>}
          {!notificationsEnabled && <p>• Las notificaciones están deshabilitadas en tu configuración</p>}
          {recordatorios.filter(r => r.notificado_previo).length > 0 && (
            <p>• {recordatorios.filter(r => r.notificado_previo).length} recordatorio(s) ya tiene flag notificado_previo=true</p>
          )}
          {recordatorios.filter(r => !r.notificar).length > 0 && (
            <p>• {recordatorios.filter(r => !r.notificar).length} recordatorio(s) tiene notificar=false</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}