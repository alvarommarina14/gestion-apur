import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Calendar } from 'lucide-react';

export default function EditarClaseEnAgendaModal({ open, onOpenChange, turno }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fecha: '',
    hora_inicio: '09:00',
    duracion: 50,
    cancha: '1',
    cliente: '',
    notas: '',
  });

  const { data: profesores = [] } = useQuery({
    queryKey: ['profesores'],
    queryFn: () => base44.entities.Profesor.list(),
    enabled: open,
  });

  useEffect(() => {
    if (turno && open) {
      setFormData({
        fecha: turno.fecha,
        hora_inicio: turno.hora_inicio,
        duracion: turno.duracion || 50,
        cancha: turno.cancha || '1',
        cliente: turno.cliente,
        notas: turno.notas || '',
      });
      setError(null);
    }
  }, [turno, open]);

  const calcularHoraFin = (horaInicio, duracion) => {
    if (!horaInicio) return '00:00';
    const [h, m] = horaInicio.split(':').map(Number);
    const inicio = new Date();
    inicio.setHours(h, m, 0);
    const fin = new Date(inicio.getTime() + duracion * 60000);
    return format(fin, 'HH:mm');
  };

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.TurnoCancha.update(turno.id, {
        ...turno,
        fecha: data.fecha,
        hora_inicio: data.hora_inicio,
        duracion: data.duracion,
        cancha: data.cancha,
        hora_fin: calcularHoraFin(data.hora_inicio, data.duracion),
        cliente: data.cliente,
        notas: data.notas,
      });

      // Actualizar clase sincronizada si existe
      if (turno.turno_cancha_id) {
        const clases = await base44.entities.Clase.filter({ turno_cancha_id: turno.id });
        if (clases.length > 0) {
          await base44.entities.Clase.update(clases[0].id, {
            fecha: data.fecha,
            hora_inicio: data.hora_inicio,
            duracion: data.duracion,
            cancha: data.cancha,
            notas: data.notas,
          });
        }
      }
    },
    onSuccess: () => {
      setIsSubmitting(false);
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      onOpenChange(false);
    },
    onError: (err) => {
      setError(err.message || 'Error al actualizar la clase');
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    if (!formData.cliente || !formData.hora_inicio) {
      setError('Completa los campos requeridos');
      setIsSubmitting(false);
      return;
    }

    updateMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Editar clase
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5" />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Fecha</Label>
            <Input
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              required
            />
          </div>

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
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Hora inicio</Label>
              <Select
                value={formData.hora_inicio}
                onValueChange={(v) => setFormData({ ...formData, hora_inicio: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {Array.from({ length: 28 }, (_, i) => {
                    const h = Math.floor(i / 2) + 8;
                    const m = i % 2 === 0 ? '00' : '30';
                    if (h > 21 || (h === 21 && m === '30')) return null;
                    return `${h.toString().padStart(2, '0')}:${m}`;
                  })
                    .filter(Boolean)
                    .map((hora) => (
                      <SelectItem key={hora} value={hora}>
                        {hora}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duración</Label>
            <Select
              value={formData.duracion.toString()}
              onValueChange={(v) => setFormData({ ...formData, duracion: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 min</SelectItem>
                <SelectItem value="80">80 min</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Hora fin</Label>
            <Input
              value={calcularHoraFin(formData.hora_inicio, formData.duracion)}
              disabled
              className="bg-slate-50"
            />
          </div>

          <div className="space-y-2">
            <Label>Cliente / Nombre *</Label>
            <Input
              value={formData.cliente}
              onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
              placeholder="Nombre del cliente"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Observaciones..."
              rows={2}
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateMutation.isPending || isSubmitting ? 'Guardando...' : 'Actualizar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}