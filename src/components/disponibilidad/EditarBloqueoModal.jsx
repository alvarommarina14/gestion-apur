import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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

export default function EditarBloqueoModal({ open, onOpenChange, bloqueo }) {
  const queryClient = useQueryClient();
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({});

  React.useEffect(() => {
    if (bloqueo) {
      setFormData({
        cancha: bloqueo.cancha,
        fecha_inicio: bloqueo.fecha_inicio,
        fecha_fin: bloqueo.fecha_fin,
        hora_inicio: bloqueo.hora_inicio || '08:00',
        hora_fin: bloqueo.hora_fin || '22:00',
        todo_el_dia: bloqueo.todo_el_dia,
        motivo: bloqueo.motivo,
        descripcion: bloqueo.descripcion || '',
      });
    }
  }, [bloqueo, open]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DisponibilidadCancha.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disponibilidad-canchas'] });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onOpenChange(false);
      }, 1500);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      id: bloqueo.id,
      data: { ...bloqueo, ...formData },
    });
  };

  if (!bloqueo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Bloqueo</DialogTitle>
        </DialogHeader>

        {showSuccess ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900">¡Bloqueo actualizado!</h3>
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
              <Label htmlFor="todo_el_dia_edit" className="text-sm">
                Bloqueo de todo el día
              </Label>
              <Switch
                id="todo_el_dia_edit"
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
                disabled={updateMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}