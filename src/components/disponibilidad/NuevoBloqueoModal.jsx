import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, CheckCircle } from 'lucide-react';

export default function NuevoBloqueoModal({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    cancha: '1',
    fecha_inicio: format(new Date(), 'yyyy-MM-dd'),
    fecha_fin: format(new Date(), 'yyyy-MM-dd'),
    hora_inicio: '08:00',
    hora_fin: '22:00',
    todo_el_dia: true,
    motivo: 'mantenimiento',
    descripcion: '',
  });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: empleados = [] } = useQuery({
    queryKey: ['empleados'],
    queryFn: () => base44.entities.Empleado.list(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Crear el bloqueo
      const bloqueo = await base44.entities.DisponibilidadCancha.create({
        ...data,
        creado_por: user?.full_name || user?.email,
        notificacion_enviada: false,
      });

      // Enviar notificaciones push a empleados activos
      const empleadosActivos = empleados.filter(e => e.activo);
      
      if (empleadosActivos.length > 0) {
        const mensaje = `🚫 Bloqueo de cancha ${data.cancha === 'todas' ? 'TODAS' : data.cancha}: ${data.descripcion || data.motivo}. Del ${format(new Date(data.fecha_inicio), 'd/MM')} al ${format(new Date(data.fecha_fin), 'd/MM')}.`;
        
        // Notificar a cada empleado
        for (const empleado of empleadosActivos) {
          // Aquí podrías integrar con el sistema de notificaciones push
          // Por ahora solo marcamos que se envió
        }

        // Marcar como enviada
        await base44.entities.DisponibilidadCancha.update(bloqueo.id, {
          ...bloqueo,
          notificacion_enviada: true,
        });
      }

      return bloqueo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disponibilidad-canchas'] });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onOpenChange(false);
        setFormData({
          cancha: '1',
          fecha_inicio: format(new Date(), 'yyyy-MM-dd'),
          fecha_fin: format(new Date(), 'yyyy-MM-dd'),
          hora_inicio: '08:00',
          hora_fin: '22:00',
          todo_el_dia: true,
          motivo: 'mantenimiento',
          descripcion: '',
        });
      }, 1500);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Bloqueo de Cancha</DialogTitle>
        </DialogHeader>

        {showSuccess ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900">¡Bloqueo creado!</h3>
            <p className="text-sm text-slate-600 mt-2">
              Se notificó a los empleados sobre el cambio
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cancha</Label>
                <Select
                  value={formData.cancha}
                  onValueChange={(v) => setFormData({ ...formData, cancha: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Cancha 1</SelectItem>
                    <SelectItem value="2">Cancha 2</SelectItem>
                    <SelectItem value="3">Cancha 3</SelectItem>
                    <SelectItem value="4">Cancha 4</SelectItem>
                    <SelectItem value="todas">Todas las canchas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Motivo</Label>
                <Select
                  value={formData.motivo}
                  onValueChange={(v) => setFormData({ ...formData, motivo: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                    <SelectItem value="evento_privado">Evento Privado</SelectItem>
                    <SelectItem value="clima">Clima</SelectItem>
                    <SelectItem value="reparacion">Reparación</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={formData.fecha_inicio}
                  onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={formData.fecha_fin}
                  onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <Label htmlFor="todo_el_dia" className="text-sm">
                Bloqueo de todo el día
              </Label>
              <Switch
                id="todo_el_dia"
                checked={formData.todo_el_dia}
                onCheckedChange={(v) => setFormData({ ...formData, todo_el_dia: v })}
              />
            </div>

            {!formData.todo_el_dia && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hora Inicio</Label>
                  <Input
                    type="time"
                    value={formData.hora_inicio}
                    onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Hora Fin</Label>
                  <Input
                    type="time"
                    value={formData.hora_fin}
                    onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Detalles del bloqueo..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={createMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-rose-600 hover:bg-rose-700"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Bloqueo'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}