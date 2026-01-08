import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO, differenceInMinutes, addMinutes } from 'date-fns';
import { createPageUrl } from '@/utils';

export default function NotificationManager() {
  const sentNotifications = useRef(new Set());
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: recordatorios = [] } = useQuery({
    queryKey: ['recordatorios-cancha-push', today],
    queryFn: () => base44.entities.RecordatorioCancha.filter({
      fecha: today,
      estado: 'pendiente',
      notificar: true,
    }),
    refetchInterval: 10000, // Revisar cada 10 segundos
    enabled: !!user && (user.role !== 'admin' || user.recibir_notificaciones_cancha !== false),
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos-cancha-push', today],
    queryFn: () => base44.entities.TurnoCancha.filter({ fecha: today }),
    enabled: !!user && (user.role !== 'admin' || user.recibir_notificaciones_cancha !== false),
  });

  useEffect(() => {
    if (!user) return;
    // Solo bloquear notificaciones si es admin y las desactivó
    if (user.role === 'admin' && user.recibir_notificaciones_cancha === false) return;
    if (!recordatorios.length) return;
    
    // Soporte para Safari: verificar si Notification está disponible
    if (typeof window === 'undefined' || !window.Notification) return;
    if (window.Notification.permission !== 'granted') return;

    const now = new Date();

    recordatorios.forEach((rec) => {
    const notificationKey = `${rec.id}`;

    // Parsear hora del recordatorio
    const [hours, minutes] = rec.hora.split(':').map(Number);
    const recordatorioTime = new Date();
    recordatorioTime.setHours(hours, minutes, 0, 0);

    // TODOS reciben notificación X minutos antes del INICIO del turno
    const minutesUntilStart = differenceInMinutes(recordatorioTime, now);
    const minutosAntes = rec.minutos_antes || 10;

    console.log(`[Notif Debug] Recordatorio ${rec.id} - Cancha ${rec.cancha} - ${rec.hora}`);
    console.log(`  Minutes until start: ${minutesUntilStart}, anticipación: ${minutosAntes}`);
    console.log(`  Flags: previo=${rec.notificado_previo}, hora=${rec.notificado_hora}`);

    // Caso 1: Notificación previa (X minutos antes)
    if (minutesUntilStart <= minutosAntes && minutesUntilStart > 0 && !rec.notificado_previo) {
      console.log(`  ✅ ENVIANDO notificación previa`);
      sendNotification(rec, 'previo', minutosAntes);
      sentNotifications.current.add(notificationKey);

      // Actualizar flag en la base de datos
      base44.entities.RecordatorioCancha.update(rec.id, {
        notificado_previo: true,
      }).catch(err => console.error('Error actualizando recordatorio:', err));
    }

    // Caso 2: Notificación a la hora exacta
    if (minutesUntilStart <= 0 && minutesUntilStart > -5 && !rec.notificado_hora) {
      console.log(`  ✅ ENVIANDO notificación a la hora`);
      sendNotification(rec, 'hora', minutosAntes);
      sentNotifications.current.add(notificationKey);

      base44.entities.RecordatorioCancha.update(rec.id, {
        notificado_hora: true,
      }).catch(err => console.error('Error actualizando recordatorio:', err));
    }

    // Caso 3: Reintento después de tolerancia
    const minutosTolerancia = rec.minutos_tolerancia || 10;
    if (minutesUntilStart <= -minutosTolerancia && minutesUntilStart > -(minutosTolerancia + 5) && !rec.reintento_enviado) {
      sendNotification(rec, 'reintento', minutosAntes);
      sentNotifications.current.add(notificationKey + '_reintento');

      base44.entities.RecordatorioCancha.update(rec.id, {
        reintento_enviado: true,
      });
    }

    // Caso 4: Escalado a admin
    const minutosEscalado = rec.minutos_escalado || 25;
    if (minutesUntilStart <= -minutosEscalado && !rec.escalado_admin) {
      sendNotification(rec, 'escalado', minutosAntes);
      sentNotifications.current.add(notificationKey + '_escalado');

      base44.entities.RecordatorioCancha.update(rec.id, {
        escalado_admin: true,
      });
    }
    });
  }, [recordatorios, turnos, user]);

  const sendNotification = (recordatorio, tipo, minutosAntes) => {
    console.log(`[Notif] Intentando enviar notificación tipo: ${tipo} para cancha ${recordatorio.cancha}`);
    
    // Verificar compatibilidad
    if (typeof window === 'undefined' || !window.Notification) {
      console.log('[Notif] Window.Notification no disponible');
      return;
    }
    if (window.Notification.permission !== 'granted') {
      console.log('[Notif] Permiso no otorgado:', window.Notification.permission);
      return;
    }
    
    try {
      let title, body, tag;

      // MISMA notificación para todos (admin y empleados)
      switch (tipo) {
        case 'previo':
          title = `🧹 Sacar cancha ${recordatorio.cancha}`;
          body = `En ${minutosAntes} minutos (${recordatorio.hora}). Tocá para confirmar cuando esté lista.`;
          tag = `cancha-previo-${recordatorio.id}`;
          break;

        case 'hora':
          title = `🧹 Sacar cancha ${recordatorio.cancha} AHORA`;
          body = `Es hora de preparar la cancha (${recordatorio.hora}). Tocá para confirmar.`;
          tag = `cancha-hora-${recordatorio.id}`;
          break;

        case 'reintento':
          title = `⚠️ Recordatorio: Cancha ${recordatorio.cancha}`;
          body = `¿Ya sacaste la cancha? Recordá confirmar cuando esté lista.`;
          tag = `cancha-reintento-${recordatorio.id}`;
          break;

        case 'escalado':
          title = `🚨 URGENTE: Cancha ${recordatorio.cancha}`;
          body = `La cancha aún no fue confirmada. Por favor verificar.`;
          tag = `cancha-escalado-${recordatorio.id}`;
          break;
      }

      const notificationOptions = {
        body,
        tag,
      };
      
      // Agregar opciones solo si son soportadas
      // Icon removido para mejor performance
      if ('requireInteraction' in window.Notification.prototype) {
        notificationOptions.requireInteraction = tipo === 'hora' || tipo === 'escalado';
      }
      
      const notification = new window.Notification(title, notificationOptions);
      console.log(`[Notif] ✅ Notificación enviada exitosamente: ${title}`);

      notification.onclick = () => {
        window.focus();
        const url = user?.role === 'admin' ? createPageUrl('RecordatoriosCanchaAdmin') : createPageUrl('RecordatoriosCanchaEmpleado');
        window.location.href = url;
        notification.close();
      };
    } catch (error) {
      console.error('[Notif] ❌ Error enviando notificación:', error);
    }
  };

  return null;
}