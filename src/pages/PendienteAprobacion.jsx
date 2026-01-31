import React from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function PendienteAprobacion() {
  const handleLogout = () => {
    if (confirm('¿Querés cerrar sesión?')) {
      base44.auth.logout();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl border-2 border-amber-200">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-900 mb-3">
            Pendiente de Aprobación
          </h1>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 text-left">
                Tu solicitud de acceso como <strong>Administrador</strong> está siendo revisada por el propietario del sistema.
              </p>
            </div>
          </div>
          
          <p className="text-slate-600 mb-6">
            Recibirás una notificación cuando tu cuenta sea aprobada. Esto puede tomar algunas horas.
          </p>
          
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full"
          >
            Cerrar Sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}