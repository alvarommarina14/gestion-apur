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
    
    // Admins: verificar si tienen activadas las notificaciones de sacar cancha
    if (user.role === 'admin' && user.notificaciones_admin_sacar_cancha === false) return;
    
    if (!recordatorios.length) return;
    
    // Soporte para Safari: verificar si Notification está disponible
    if (typeof window === 'undefined' || !window.Notification) return;
    if (window.Notification.permission !== 'granted') return;

    const now = new Date();
    
    // Agrupar recordatorios por tiempo y tipo de notificación para eficiencia
    const gruposPorTiempo = {};
    
    recordatorios.forEach((rec) => {
      // Parsear hora del recordatorio
      const [hours, minutes] = rec.hora.split(':').map(Number);
      const recordatorioTime = new Date();
      recordatorioTime.setHours(hours, minutes, 0, 0);

      let minutesUntilNotification;
      let minutosAntes;

      if (user.role === 'admin') {
        const turno = turnos.find(t => t.id === rec.turno_cancha_id);
        const duracion = turno?.duracion || 60;
        const finTurno = addMinutes(recordatorioTime, duracion);
        const minutesUntilEnd = differenceInMinutes(finTurno, now);
        
        minutosAntes = rec.minutos_antes || 10;
        minutesUntilNotification = minutesUntilEnd;
      } else {
        const minutesUntilStart = differenceInMinutes(recordatorioTime, now);
        minutosAntes = rec.minutos_antes || 10;
        minutesUntilNotification = minutesUntilStart;
      }

      // Caso 1: Notificación previa (X minutos antes)
      if (minutesUntilNotification <= minutosAntes && minutesUntilNotification > 0 && !rec.notificado_previo) {
        const groupKey = `previo_${rec.hora}_${minutosAntes}`;
        if (!gruposPorTiempo[groupKey]) {
          gruposPorTiempo[groupKey] = { tipo: 'previo', recordatorios: [], minutosAntes, hora: rec.hora };
        }
        gruposPorTiempo[groupKey].recordatorios.push(rec);
      }

      // Caso 2: Notificación a la hora exacta (solo empleados)
      if (user.role !== 'admin' && minutesUntilNotification <= 0 && minutesUntilNotification > -5 && !rec.notificado_hora) {
        const groupKey = `hora_${rec.hora}`;
        if (!gruposPorTiempo[groupKey]) {
          gruposPorTiempo[groupKey] = { tipo: 'hora', recordatorios: [], hora: rec.hora };
        }
        gruposPorTiempo[groupKey].recordatorios.push(rec);
      }

      // Caso 3: Reintento después de tolerancia (solo empleados)
      if (user.role !== 'admin') {
        const minutosTolerancia = rec.minutos_tolerancia || 10;
        if (minutesUntilNotification <= -minutosTolerancia && minutesUntilNotification > -(minutosTolerancia + 5) && !rec.reintento_enviado) {
          const groupKey = `reintento_${rec.hora}`;
          if (!gruposPorTiempo[groupKey]) {
            gruposPorTiempo[groupKey] = { tipo: 'reintento', recordatorios: [], hora: rec.hora };
          }
          gruposPorTiempo[groupKey].recordatorios.push(rec);
        }
      }

      // Caso 4: Escalado a admin (solo empleados)
      if (user.role !== 'admin') {
        const minutosEscalado = rec.minutos_escalado || 25;
        if (minutesUntilNotification <= -minutosEscalado && !rec.escalado_admin) {
          const groupKey = `escalado_${rec.hora}`;
          if (!gruposPorTiempo[groupKey]) {
            gruposPorTiempo[groupKey] = { tipo: 'escalado', recordatorios: [], hora: rec.hora };
          }
          gruposPorTiempo[groupKey].recordatorios.push(rec);
        }
      }
    });

    // Enviar notificaciones agrupadas
    Object.entries(gruposPorTiempo).forEach(([groupKey, grupo]) => {
      if (sentNotifications.current.has(groupKey)) return;
      
      sendGroupedNotification(grupo, user.role);
      sentNotifications.current.add(groupKey);
      
      // Actualizar flags en la base de datos
      grupo.recordatorios.forEach(rec => {
        const updateData = {};
        if (grupo.tipo === 'previo') updateData.notificado_previo = true;
        if (grupo.tipo === 'hora') updateData.notificado_hora = true;
        if (grupo.tipo === 'reintento') updateData.reintento_enviado = true;
        if (grupo.tipo === 'escalado') updateData.escalado_admin = true;
        
        if (Object.keys(updateData).length > 0) {
          base44.entities.RecordatorioCancha.update(rec.id, updateData);
        }
      });
    });
  }, [recordatorios, turnos, user]);

  const sendGroupedNotification = (grupo, userRole) => {
    // Verificar compatibilidad
    if (typeof window === 'undefined' || !window.Notification) return;
    if (window.Notification.permission !== 'granted') return;
    
    try {
      const recordatorios = grupo.recordatorios;
      const cantidad = recordatorios.length;
      let title, body, tag;

      if (userRole === 'admin') {
        // Notificaciones para admin
        if (grupo.tipo === 'previo') {
          if (cantidad === 1) {
            const rec = recordatorios[0];
            title = `🧹 Preparar Cancha ${rec.cancha}`;
            body = `En ${grupo.minutosAntes} min (${rec.hora}). ${rec.cliente || rec.profesor}`;
          } else {
            const canchas = recordatorios.map(r => r.cancha).sort().join(', ');
            title = `🧹 Preparar ${cantidad} Canchas`;
            body = `En ${grupo.minutosAntes} min (${grupo.hora}) - Canchas: ${canchas}`;
          }
          tag = `cancha-admin-previo-${grupo.hora}`;
        }
      } else {
        // Notificaciones para empleados
        switch (grupo.tipo) {
          case 'previo':
            if (cantidad === 1) {
              const rec = recordatorios[0];
              title = `🧹 Sacar cancha ${rec.cancha}`;
              body = `En ${grupo.minutosAntes} min (${rec.hora}). Tocá para confirmar cuando esté lista.`;
            } else {
              const canchas = recordatorios.map(r => r.cancha).sort().join(', ');
              title = `🧹 Sacar ${cantidad} canchas`;
              body = `En ${grupo.minutosAntes} min (${grupo.hora}) - Canchas: ${canchas}. Tocá para ver detalles.`;
            }
            tag = `cancha-previo-${grupo.hora}`;
            break;

          case 'hora':
            if (cantidad === 1) {
              const rec = recordatorios[0];
              title = `🧹 Sacar cancha ${rec.cancha} AHORA`;
              body = `Es hora de preparar (${rec.hora}). Tocá para confirmar.`;
            } else {
              const canchas = recordatorios.map(r => r.cancha).sort().join(', ');
              title = `🧹 Sacar ${cantidad} canchas AHORA`;
              body = `Hora: ${grupo.hora} - Canchas: ${canchas}`;
            }
            tag = `cancha-hora-${grupo.hora}`;
            break;

          case 'reintento':
            if (cantidad === 1) {
              const rec = recordatorios[0];
              title = `⚠️ Recordatorio: Cancha ${rec.cancha}`;
              body = `¿Ya sacaste la cancha? Recordá confirmar.`;
            } else {
              const canchas = recordatorios.map(r => r.cancha).sort().join(', ');
              title = `⚠️ Recordatorio: ${cantidad} canchas`;
              body = `Canchas ${canchas} - ¿Ya las sacaste? Confirmá cuando estén listas.`;
            }
            tag = `cancha-reintento-${grupo.hora}`;
            break;

          case 'escalado':
            if (cantidad === 1) {
              const rec = recordatorios[0];
              title = `🚨 URGENTE: Cancha ${rec.cancha}`;
              body = `Aún no fue confirmada. Por favor verificar.`;
            } else {
              const canchas = recordatorios.map(r => r.cancha).sort().join(', ');
              title = `🚨 URGENTE: ${cantidad} canchas`;
              body = `Canchas ${canchas} aún sin confirmar. Verificar urgente.`;
            }
            tag = `cancha-escalado-${grupo.hora}`;
            break;
        }
      }

      const notificationOptions = {
        body,
        tag,
      };
      
      // Agregar opciones solo si son soportadas
      if ('requireInteraction' in window.Notification.prototype) {
        notificationOptions.requireInteraction = grupo.tipo === 'hora' || grupo.tipo === 'escalado';
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