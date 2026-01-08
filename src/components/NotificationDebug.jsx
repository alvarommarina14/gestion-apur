import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, differenceInMinutes } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotificationDebug() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [permissionStatus, setPermissionStatus] = useState(
    typeof window !== 'undefined' && window.Notification ? window.Notification.permission : 'unsupported'
  );
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: recordatorios = [] } = useQuery({
    queryKey: ['recordatorios-cancha-debug', today],
    queryFn: () => base44.entities.RecordatorioCancha.filter({
      fecha: today,
      notificar: true,
    }),
    refetchInterval: 5000,
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos-cancha-debug', today],
    queryFn: () => base44.entities.TurnoCancha.filter({ fecha: today }),
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const requestPermission = async () => {
    if (typeof window !== 'undefined' && window.Notification) {
      try {
        const permission = await window.Notification.requestPermission();
        setPermissionStatus(permission);
      } catch (error) {
        console.warn('Notification permission error:', error);
      }
    }
  };

  const sendTestNotification = () => {
    if (typeof window !== 'undefined' && window.Notification && window.Notification.permission === 'granted') {
      try {
        new window.Notification('🧪 Prueba de Notificación', {
          body: 'Si ves esto, las notificaciones funcionan correctamente',
        });
      } catch (error) {
        console.warn('Test notification error:', error);
      }
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'granted':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'denied':
        return <XCircle className="w-5 h-5 text-rose-600" />;
      case 'default':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      default:
        return <XCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'granted':
        return 'Permitidas ✅';
      case 'denied':
        return 'Bloqueadas ❌';
      case 'default':
        return 'Sin configurar ⚠️';
      default:
        return 'No soportadas';
    }
  };

  const getTimeUntilNotification = (rec) => {
    const [hours, minutes] = rec.hora.split(':').map(Number);
    const recordatorioTime = new Date();
    recordatorioTime.setHours(hours, minutes, 0, 0);
    
    if (user?.role === 'admin') {
      const turno = turnos.find(t => t.id === rec.turno_cancha_id);
      const duracion = turno?.duracion || 60;
      const finTurno = new Date(recordatorioTime.getTime() + duracion * 60000);
      const minutesUntilEnd = differenceInMinutes(finTurno, currentTime);
      const minutosAntes = user.minutos_antes_fin_cancha || 10;
      
      if (minutesUntilEnd > minutosAntes) {
        return `Faltan ${minutesUntilEnd - minutosAntes} min para la notificación (${minutosAntes} min antes del fin)`;
      } else if (minutesUntilEnd > 0) {
        return `⏰ Debería notificar AHORA (termina en ${minutesUntilEnd} min)`;
      } else {
        return `Ya terminó (hace ${Math.abs(minutesUntilEnd)} min)`;
      }
    } else {
      const minutesUntil = differenceInMinutes(recordatorioTime, currentTime);
      const minutosAntes = rec.minutos_antes || 10;
      const notificationTime = minutesUntil + minutosAntes;

      if (notificationTime > 0) {
        return `Faltan ${notificationTime} min para la notificación`;
      } else if (minutesUntil > 0) {
        return `⏰ Debería notificar AHORA (${minutosAntes} min antes)`;
      } else if (minutesUntil > -5) {
        return `⏰ Es la hora exacta! (${rec.hora})`;
      } else {
        return `Ya pasó (${Math.abs(minutesUntil)} min)`;
      }
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Card className="shadow-sm border-2 border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="w-5 h-5 text-blue-600" />
          Estado de Notificaciones Push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estado del sistema */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-3">
              {getStatusIcon(permissionStatus)}
              <div>
                <p className="font-medium text-slate-900">Permisos del navegador</p>
                <p className="text-sm text-slate-500">{getStatusText(permissionStatus)}</p>
              </div>
            </div>
            {permissionStatus !== 'granted' && (
              <Button size="sm" onClick={requestPermission}>
                Activar
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-slate-400" />
              <div>
                <p className="font-medium text-slate-900">Hora actual</p>
                <p className="text-sm text-slate-500">{format(currentTime, 'HH:mm:ss')}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-3">
              {user.recibir_notificaciones_cancha === false ? (
                <XCircle className="w-5 h-5 text-rose-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              )}
              <div>
                <p className="font-medium text-slate-900">
                  Tu rol: {user.role} - 
                  {user.recibir_notificaciones_cancha === false ? ' Notificaciones OFF' : ' Notificaciones ON'}
                </p>
                <p className="text-sm text-slate-500">
                  {user.recibir_notificaciones_cancha === false 
                    ? '❌ Has desactivado las notificaciones' 
                    : user.role === 'admin'
                    ? `✅ Recibirás notificaciones ${user.minutos_antes_fin_cancha || 10} min antes del FIN`
                    : '✅ Recibirás notificaciones antes del INICIO'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Botón de prueba */}
        {permissionStatus === 'granted' && (
          <Button 
            onClick={sendTestNotification}
            variant="outline" 
            className="w-full"
          >
            🧪 Enviar notificación de prueba
          </Button>
        )}

        {/* Recordatorios de hoy */}
        <div className="space-y-2">
          <p className="font-semibold text-sm text-slate-700">
            Recordatorios de hoy ({recordatorios.length})
          </p>
          {recordatorios.length === 0 ? (
            <p className="text-sm text-slate-500 p-3 bg-white rounded-lg border text-center">
              No hay recordatorios programados para hoy
            </p>
          ) : (
            <div className="space-y-2">
              {recordatorios.map((rec) => {
                const [hours, minutes] = rec.hora.split(':').map(Number);
                const recordatorioTime = new Date();
                recordatorioTime.setHours(hours, minutes, 0, 0);
                const minutesUntil = differenceInMinutes(recordatorioTime, currentTime);
                const shouldNotifyNow = minutesUntil <= (rec.minutos_antes || 10) && minutesUntil > 0;

                return (
                  <div
                    key={rec.id}
                    className={`p-3 rounded-lg border ${
                      shouldNotifyNow ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-slate-900">
                          Cancha {rec.cancha} - {rec.hora}
                        </p>
                        <p className="text-sm text-slate-600">{rec.profesor || rec.cliente}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          rec.estado === 'hecho'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {rec.estado}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-xs">
                      <p className={shouldNotifyNow ? 'text-amber-700 font-medium' : 'text-slate-500'}>
                        {getTimeUntilNotification(rec)}
                      </p>
                      <div className="flex gap-3 text-slate-500">
                        <span>✅ Notificar: {rec.notificar ? 'Sí' : 'No'}</span>
                        <span>⏰ Anticipación: {rec.minutos_antes || 10} min</span>
                      </div>
                      <div className="flex gap-3 text-slate-500">
                        <span>📨 Previo: {rec.notificado_previo ? '✅' : '❌'}</span>
                        <span>🔔 Hora: {rec.notificado_hora ? '✅' : '❌'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Instrucciones */}
        <div className="p-3 bg-white rounded-lg border border-blue-200">
          <p className="text-sm font-medium text-slate-900 mb-2">📋 Requisitos para que funcione:</p>
          <ul className="text-xs text-slate-600 space-y-1">
            <li>✅ Permisos de notificación activados</li>
            <li>✅ La app debe estar abierta en el navegador</li>
            <li>✅ Tener notificaciones activadas (en Configuración)</li>
            <li>✅ El recordatorio debe ser de hoy</li>
            <li>✅ El recordatorio debe tener notificar=true</li>
            <li>✅ El recordatorio debe estar pendiente</li>
            <li>📌 Admins: Notifican antes del FIN del turno</li>
            <li>📌 Empleados: Notifican antes del INICIO del turno</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}