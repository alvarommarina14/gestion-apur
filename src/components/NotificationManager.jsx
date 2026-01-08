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

      // Para admins: calcular tiempo antes del FIN del turno
      // Para empleados: calcular tiempo antes del INICIO del turno
      let minutesUntilNotification;
      let minutosAntes;

      if (user.role === 'admin') {
        // Admin: notificar X minutos antes del FIN
        // Buscar el turno asociado o calcular duración por defecto (60 min)
        const turno = turnos.find(t => t.id === rec.turno_cancha_id);
        const duracion = turno?.duracion || 60;
        
        const finTurno = addMinutes(recordatorioTime, duracion);
        const minutesUntilEnd = differenceInMinutes(finTurno, now);
        
        minutosAntes = rec.minutos_antes || 10;
        minutesUntilNotification = minutesUntilEnd;
      } else {
        // Empleado: notificar X minutos antes del INICIO
        const minutesUntilStart = differenceInMinutes(recordatorioTime, now);
        minutosAntes = rec.minutos_antes || 10;
        minutesUntilNotification = minutesUntilStart;
      }

      // Caso 1: Notificación previa (X minutos antes)
      if (minutesUntilNotification <= minutosAntes && minutesUntilNotification > 0 && !rec.notificado_previo) {
        sendNotification(rec, 'previo', user.role, minutosAntes);
        sentNotifications.current.add(notificationKey);
        
        // Actualizar flag en la base de datos
        base44.entities.RecordatorioCancha.update(rec.id, {
          notificado_previo: true,
        });
      }

      // Caso 2: Notificación a la hora exacta (solo empleados)
      if (user.role !== 'admin' && minutesUntilNotification <= 0 && minutesUntilNotification > -5 && !rec.notificado_hora) {
        sendNotification(rec, 'hora', user.role, minutosAntes);
        sentNotifications.current.add(notificationKey);
        
        base44.entities.RecordatorioCancha.update(rec.id, {
          notificado_hora: true,
        });
      }

      // Caso 3: Reintento después de tolerancia (solo empleados)
      if (user.role !== 'admin') {
        const minutosTolerancia = rec.minutos_tolerancia || 10;
        if (minutesUntilNotification <= -minutosTolerancia && minutesUntilNotification > -(minutosTolerancia + 5) && !rec.reintento_enviado) {
          sendNotification(rec, 'reintento', user.role, minutosAntes);
          sentNotifications.current.add(notificationKey + '_reintento');
          
          base44.entities.RecordatorioCancha.update(rec.id, {
            reintento_enviado: true,
          });
        }
      }

      // Caso 4: Escalado a admin (solo empleados)
      if (user.role !== 'admin') {
        const minutosEscalado = rec.minutos_escalado || 25;
        if (minutesUntilNotification <= -minutosEscalado && !rec.escalado_admin) {
          sendNotification(rec, 'escalado', user.role, minutosAntes);
          sentNotifications.current.add(notificationKey + '_escalado');
          
          base44.entities.RecordatorioCancha.update(rec.id, {
            escalado_admin: true,
          });
        }
      }
    });
  }, [recordatorios, turnos, user]);

  const sendNotification = (recordatorio, tipo, userRole, minutosAntes) => {
    // Verificar compatibilidad
    if (typeof window === 'undefined' || !window.Notification) return;
    if (window.Notification.permission !== 'granted') return;
    
    try {
      let title, body, tag;

      if (userRole === 'admin') {
        // Notificaciones para admin
        switch (tipo) {
          case 'previo':
            title = `⏰ Turno finalizando - Cancha ${recordatorio.cancha}`;
            body = `El turno termina en ${minutosAntes} minutos (${recordatorio.hora}). ${recordatorio.cliente || recordatorio.profesor}`;
            tag = `cancha-admin-previo-${recordatorio.id}`;
            break;
          default:
            return; // Admins solo reciben notificación previa
        }
      } else {
        // Notificaciones para empleados
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
        const url = userRole === 'admin' ? '/RecordatoriosCanchaAdmin' : '/RecordatoriosCanchaEmpleado';
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