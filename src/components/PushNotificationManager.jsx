import React, { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyCY7Drv1lNbi8NfSJ3AseP3IPVpJ1xei9c",
  authDomain: "gestion-apur.firebaseapp.com",
  projectId: "gestion-apur",
  storageBucket: "gestion-apur.firebasestorage.app",
  messagingSenderId: "43346834046",
  appId: "1:43346834046:web:e10bf11482fe421184de2f"
};

// Nota: Usar la Web Push certificate de Firebase Console, no VAPID keys personalizadas

const app = initializeApp(firebaseConfig);

export default function PushNotificationManager() {
  const queryClient = useQueryClient();
  const subscribed = useRef(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const savePushSubscriptionMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  useEffect(() => {
    if (!user || subscribed.current) return;

    const subscribeToPush = async () => {
      try {
        console.log('🔄 Iniciando suscripción push para:', user.email);
        
        if (!('serviceWorker' in navigator)) {
          console.warn('❌ Service Worker not supported');
          return;
        }

        if (Notification.permission !== 'granted') {
          console.log('⏳ Esperando permisos de notificación. Estado actual:', Notification.permission);
          return;
        }

        console.log('✅ Permisos otorgados, registrando service worker...');
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('✅ Service worker registrado:', registration);
        
        await navigator.serviceWorker.ready;
        console.log('✅ Service worker listo');

        const messaging = getMessaging(app);
        console.log('✅ Firebase Messaging inicializado');
        
        const token = await getToken(messaging, {
          serviceWorkerRegistration: registration,
        });
        console.log('✅ Token FCM obtenido:', token?.substring(0, 50) + '...');

        if (token) {
          console.log('💾 Guardando token en base de datos...');
          await savePushSubscriptionMutation.mutateAsync({
            push_subscription: token,
          });

          subscribed.current = true;
          console.log('✅ FCM token guardado exitosamente en User:', user.email);

          onMessage(messaging, (payload) => {
            console.log('📩 Mensaje en foreground:', payload);
            
            if (Notification.permission === 'granted') {
              new Notification(payload.notification?.title || 'Nueva notificación', {
                body: payload.notification?.body || '',
                icon: '/icon-192x192.png',
                tag: payload.data?.tag || 'default',
              });
            }
          });
        } else {
          console.error('❌ No se pudo obtener el token FCM');
        }
      } catch (error) {
        console.error('❌ Error suscribiendo a FCM:', error);
        console.error('Stack:', error.stack);
      }
    };

    subscribeToPush();
  }, [user]);

  return null;
}