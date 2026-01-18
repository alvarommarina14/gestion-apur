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

const VAPID_KEY = 'BKLJw62FZZWoMh1-ITeGLKIfrnyBG4zpZX_d3-IZrgLe4w32fcuZZ73N3B8NL2jm3FvAcwYg8u-MsE1x-GytLss';

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
        if (!('serviceWorker' in navigator)) {
          console.warn('Service Worker not supported');
          return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Notification permission denied');
          return;
        }

        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;

        const messaging = getMessaging(app);
        
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (token) {
          await savePushSubscriptionMutation.mutateAsync({
            push_subscription: token,
          });

          subscribed.current = true;
          console.log('FCM token saved successfully');

          onMessage(messaging, (payload) => {
            console.log('Foreground message received:', payload);
            
            if (Notification.permission === 'granted') {
              new Notification(payload.notification?.title || 'Nueva notificación', {
                body: payload.notification?.body || '',
                icon: '/icon-192x192.png',
                tag: payload.data?.tag || 'default',
              });
            }
          });
        }
      } catch (error) {
        console.error('Error subscribing to FCM:', error);
      }
    };

    subscribeToPush();
  }, [user]);

  return null;
}