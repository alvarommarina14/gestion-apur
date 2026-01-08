import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function NotificationPermissionModal() {
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState(
    typeof window !== 'undefined' && window.Notification ? window.Notification.permission : 'default'
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.Notification) return;
    
    const permissionAsked = localStorage.getItem('notification_permission_asked');
    
    if (!permissionAsked && permission === 'default') {
      const timer = setTimeout(() => {
        setOpen(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [permission]);

  const handleRequestPermission = async () => {
    if (typeof window === 'undefined' || !window.Notification) return;
    
    try {
      const result = await window.Notification.requestPermission();
      setPermission(result);
      localStorage.setItem('notification_permission_asked', 'true');
      
      if (result === 'granted') {
        try {
          new window.Notification('🎾 Notificaciones activadas', {
            body: 'Recibirás recordatorios de canchas en tu dispositivo',
          });
        } catch (e) {
          console.warn('Test notification error:', e);
        }
      }
      
      setOpen(false);
    } catch (error) {
      console.warn('Error requesting notification permission:', error);
      localStorage.setItem('notification_permission_asked', 'true');
      setOpen(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('notification_permission_asked', 'true');
    setOpen(false);
  };

  if (typeof window === 'undefined' || !window.Notification) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-emerald-600" />
          </div>
          <DialogTitle className="text-center text-xl">
            Activar notificaciones
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Recibí alertas automáticas cuando tengas que sacar una cancha. 
            Te avisaremos unos minutos antes para que no te olvides.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDismiss}
            className="w-full sm:w-auto"
          >
            Ahora no
          </Button>
          <Button
            type="button"
            onClick={handleRequestPermission}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
          >
            <Bell className="w-4 h-4 mr-2" />
            Activar notificaciones
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}