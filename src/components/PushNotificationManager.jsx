import React, { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const VAPID_PUBLIC_KEY = 'TU_VAPID_PUBLIC_KEY'; // Reemplazar con tu key

export default function PushNotificationManager() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: (subscription) => base44.auth.updateMe({ 
      push_subscription: JSON.stringify(subscription) 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  useEffect(() => {
    if (!user) return;
    
    // Verificar soporte
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported');
      return;
    }

    // Registrar service worker
    registerServiceWorker();
  }, [user]);

  const registerServiceWorker = async () => {
    try {
      // Registrar service worker
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered:', registration);

      // Esperar a que esté activo
      await navigator.serviceWorker.ready;

      // Verificar permiso de notificaciones
      if (Notification.permission === 'granted') {
        subscribeToPush(registration);
      } else if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          subscribeToPush(registration);
        }
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const subscribeToPush = async (registration) => {
    try {
      // Verificar si ya está suscrito
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Crear nueva suscripción
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      // Guardar en base de datos
      updateSubscriptionMutation.mutate(subscription.toJSON());
      console.log('Push subscription saved:', subscription);
    } catch (error) {
      console.error('Push subscription failed:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  return null;
}