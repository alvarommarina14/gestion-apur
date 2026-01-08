import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, CheckCircle, Settings } from 'lucide-react';

export default function ConfiguracionNotificaciones() {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  // Solo admins pueden ver y configurar esto
  if (!user || user.role !== 'admin') {
    return null;
  }

  const [formData, setFormData] = useState({
    recibir_notificaciones_cancha: user?.recibir_notificaciones_cancha !== false,
  });

  React.useEffect(() => {
    if (user) {
      setFormData({
        recibir_notificaciones_cancha: user.recibir_notificaciones_cancha !== false,
      });
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const requestPermission = async () => {
    if (typeof window !== 'undefined' && window.Notification) {
      try {
        await window.Notification.requestPermission();
      } catch (error) {
        console.warn('Notification permission error:', error);
      }
    }
  };

  const permissionStatus = typeof window !== 'undefined' && window.Notification ? window.Notification.permission : 'unsupported';

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-600" />
          Configuración de Notificaciones
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Estado de permisos */}
          {permissionStatus !== 'granted' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-amber-900">Permisos del navegador</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Necesitás activar los permisos para recibir notificaciones
                  </p>
                </div>
                <Button type="button" size="sm" onClick={requestPermission}>
                  Activar
                </Button>
              </div>
            </div>
          )}

          {/* Switch principal */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-slate-600" />
              <div>
                <Label className="font-medium text-slate-800">
                  Recibir notificaciones push
                </Label>
                <p className="text-sm text-slate-500 mt-0.5">
                  Notificaciones cuando se acerque la hora de los turnos
                </p>
              </div>
            </div>
            <Switch
              checked={formData.recibir_notificaciones_cancha}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, recibir_notificaciones_cancha: checked })
              }
            />
          </div>

          {/* Explicación */}
          {formData.recibir_notificaciones_cancha && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-slate-700">
                El tiempo de anticipación de las notificaciones se configura al crear cada turno.
              </p>
              <p className="text-xs text-slate-600 mt-2">
                Los empleados siempre reciben notificaciones (no pueden desactivarlas).
              </p>
            </div>
          )}

          {/* Botón guardar */}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {updateMutation.isPending ? 'Guardando...' : 'Guardar configuración'}
            </Button>
            
            {success && (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Guardado</span>
              </div>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}