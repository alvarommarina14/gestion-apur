import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function GoogleCalendarAuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkGoogleCalendarAuth();
  }, []);

  const checkGoogleCalendarAuth = async () => {
    try {
      // Intentar obtener el token para verificar si está autorizado
      const response = await base44.functions.invoke('checkGoogleCalendarAuth');
      if (response.data?.authorized === false) {
        setIsOpen(true);
      }
    } catch (error) {
      // Si hay error, probablemente no está autorizado
      setIsOpen(true);
    } finally {
      setChecking(false);
    }
  };

  const handleAuthorize = () => {
    // El usuario debe hacer clic en el popup de autorización que ya apareció
    alert('Por favor, autoriza Google Calendar en el popup que apareció. Si no lo ves, revisa si tu navegador bloqueó ventanas emergentes.');
  };

  if (checking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Autorización Requerida
          </DialogTitle>
          <DialogDescription className="text-center space-y-3 pt-4">
            <div className="flex items-center justify-center gap-2 text-base font-medium">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <span>Google Calendar</span>
            </div>
            <p className="text-slate-600">
              Para sincronizar los turnos automáticamente con tu calendario compartido, 
              necesitas autorizar la conexión con Google Calendar.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <p className="font-medium">⚠️ Importante:</p>
              <p className="mt-1">
                Busca el popup de autorización que apareció. Si no lo ves, 
                verifica que tu navegador no esté bloqueando ventanas emergentes.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={() => window.location.reload()}
            className="bg-emerald-600 hover:bg-emerald-700 w-full"
          >
            Ya autoricé - Recargar página
          </Button>
          <Button
            variant="outline"
            onClick={handleAuthorize}
            className="w-full"
          >
            ¿Cómo autorizar?
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}