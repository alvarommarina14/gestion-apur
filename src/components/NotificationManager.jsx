import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO, differenceInMinutes } from 'date-fns';

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
    refetchInterval: 30000, // Verificar cada 30 segundos
    enabled: !!user && user.role !== 'admin', // Solo empleados
  });

  useEffect(() => {
    if (!user || user.role === 'admin' || !recordatorios.length) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const now = new Date();
    
    recordatorios.forEach((rec) => {
      const notificationKey = `${rec.id}`;
      
      // Si ya se envió notificación para este recordatorio, skip
      if (sentNotifications.current.has(notificationKey)) return;

      // Parsear hora del recordatorio
      const [hours, minutes] = rec.hora.split(':').map(Number);
      const recordatorioTime = new Date();
      recordatorioTime.setHours(hours, minutes, 0, 0);

      const minutesUntil = differenceInMinutes(recordatorioTime, now);
      const minutosAntes = rec.minutos_antes || 10;

      // Caso 1: Notificación previa (X minutos antes)
      if (minutesUntil <= minutosAntes && minutesUntil > 0 && !rec.notificado_previo) {
        sendNotification(rec, 'previo');
        sentNotifications.current.add(notificationKey);
        
        // Actualizar flag en la base de datos
        base44.entities.RecordatorioCancha.update(rec.id, {
          notificado_previo: true,
        });
      }

      // Caso 2: Notificación a la hora exacta
      if (minutesUntil <= 0 && minutesUntil > -5 && !rec.notificado_hora) {
        sendNotification(rec, 'hora');
        sentNotifications.current.add(notificationKey);
        
        // Actualizar flag en la base de datos
        base44.entities.RecordatorioCancha.update(rec.id, {
          notificado_hora: true,
        });
      }

      // Caso 3: Reintento después de tolerancia
      const minutosTolerancia = rec.minutos_tolerancia || 10;
      if (minutesUntil <= -minutosTolerancia && minutesUntil > -(minutosTolerancia + 5) && !rec.reintento_enviado) {
        sendNotification(rec, 'reintento');
        sentNotifications.current.add(notificationKey + '_reintento');
        
        // Actualizar flag en la base de datos
        base44.entities.RecordatorioCancha.update(rec.id, {
          reintento_enviado: true,
        });
      }

      // Caso 4: Escalado a admin
      const minutosEscalado = rec.minutos_escalado || 25;
      if (minutesUntil <= -minutosEscalado && !rec.escalado_admin) {
        sendNotification(rec, 'escalado');
        sentNotifications.current.add(notificationKey + '_escalado');
        
        // Actualizar flag en la base de datos
        base44.entities.RecordatorioCancha.update(rec.id, {
          escalado_admin: true,
        });
      }
    });
  }, [recordatorios, user]);

  const sendNotification = (recordatorio, tipo) => {
    try {
      let title, body, tag;

      switch (tipo) {
        case 'previo':
          title = `🧹 Sacar cancha ${recordatorio.cancha}`;
          body = `En ${recordatorio.minutos_antes || 10} minutos (${recordatorio.hora}). Tocá para confirmar cuando esté lista.`;
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

      const notification = new Notification(title, {
        body,
        icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695d6dfcd27b13c53e363146/1275db596_WhatsAppImage2026-01-06at155639.jpeg',
        badge: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695d6dfcd27b13c53e363146/1275db596_WhatsAppImage2026-01-06at155639.jpeg',
        tag,
        requireInteraction: tipo === 'hora' || tipo === 'escalado',
        vibrate: [200, 100, 200],
        data: {
          recordatorioId: recordatorio.id,
          url: '/RecordatoriosCanchaEmpleado',
        },
      });

      notification.onclick = () => {
        window.focus();
        window.location.href = '/RecordatoriosCanchaEmpleado';
        notification.close();
      };
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  return null; // Este componente no renderiza nada visible
}