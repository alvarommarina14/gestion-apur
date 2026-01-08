import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO, differenceInMinutes, addMinutes } from 'date-fns';

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
    refetchInterval: 30000,
    enabled: !!user && user.recibir_notificaciones_cancha !== false,
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos-cancha-push', today],
    queryFn: () => base44.entities.TurnoCancha.filter({ fecha: today }),
    enabled: !!user && user.recibir_notificaciones_cancha !== false,
  });

  useEffect(() => {
    if (!user || user.recibir_notificaciones_cancha === false) return;
    if (!recordatorios.length) return;
    
    // Soporte para Safari: verificar si Notification está disponible
    if (typeof window === 'undefined' || !window.Notification) return;
    if (window.Notification.permission !== 'granted') return;

    const now = new Date();

    recordatorios.forEach((rec) => {
    const notificationKey = `${rec.id}`;

    // Si ya se envió notificación para este recordatorio, skip
    if (sentNotifications.current.has(notificationKey)) return;

    // Parsear hora del recordatorio
    const [hours, minutes] = rec.hora.split(':').map(Number);
    const recordatorioTime = new Date();
    recordatorioTime.setHours(hours, minutes, 0, 0);

    // TODOS reciben notificación X minutos antes del INICIO del turno
    const minutesUntilStart = differenceInMinutes(recordatorioTime, now);
    const minutosAntes = rec.minutos_antes || 10;

    // Caso 1: Notificación previa (X minutos antes)
    if (minutesUntilStart <= minutosAntes && minutesUntilStart > 0 && !rec.notificado_previo) {
      sendNotification(rec, 'previo', minutosAntes);
      sentNotifications.current.add(notificationKey);

      // Actualizar flag en la base de datos
      base44.entities.RecordatorioCancha.update(rec.id, {
        notificado_previo: true,
      });
    }

    // Caso 2: Notificación a la hora exacta
    if (minutesUntilStart <= 0 && minutesUntilStart > -5 && !rec.notificado_hora) {
      sendNotification(rec, 'hora', minutosAntes);
      sentNotifications.current.add(notificationKey);

      base44.entities.RecordatorioCancha.update(rec.id, {
        notificado_hora: true,
      });
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
    // Verificar compatibilidad
    if (typeof window === 'undefined' || !window.Notification) return;
    if (window.Notification.permission !== 'granted') return;
    
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

      notification.onclick = () => {
        window.focus();
        const url = user?.role === 'admin' ? '/RecordatoriosCanchaAdmin' : '/RecordatoriosCanchaEmpleado';
        window.location.href = url;
        notification.close();
      };
    } catch (error) {
      // Silenciar error en Safari
      console.warn('Notification not supported:', error);
    }
  };

  return null;
}