import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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
import { AlertCircle } from 'lucide-react';

const DURACIONES = [60, 90];
const CANCHAS = ['1', '2', '3', '4'];

export default function EditarAlquilerModal({ open, onOpenChange, turno }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    cancha: '',
    hora_inicio: '',
    duracion: 60,
    cliente: '',
    notas: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (turno && open) {
      setFormData({
        cancha: turno.cancha,
        hora_inicio: turno.hora_inicio,
        duracion: turno.duracion || 60,
        cliente: turno.cliente,
        notas: turno.notas || '',
      });
      setError('');
    }
  }, [turno, open]);

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos-cancha-lista'],
    queryFn: () => base44.entities.TurnoCancha.list('-fecha', 200),
  });

  const calcularHoraFin = (horaInicio, duracion) => {
    const [h, m] = horaInicio.split(':').map(Number);
    const totalMinutos = h * 60 + m + duracion;
    const hFin = Math.floor(totalMinutos / 60);
    const mFin = totalMinutos % 60;
    return `${hFin.toString().padStart(2, '0')}:${mFin.toString().padStart(2, '0')}`;
  };

  const validarDisponibilidad = () => {
    const fechaStr = turno.fecha;
    const horaFin = calcularHoraFin(formData.hora_inicio, formData.duracion);

    return !turnos.some(t => {
      if (t.id === turno.id) return false; // Excluir el turno actual
      if (t.fecha !== fechaStr || t.cancha !== formData.cancha) return false;

      const horaInicio = parseInt(formData.hora_inicio.split(':')[0]);
      const minInicio = parseInt(formData.hora_inicio.split(':')[1]);
      const horaFin_ = parseInt(horaFin.split(':')[0]);
      const minFin_ = parseInt(horaFin.split(':')[1]);

      const tHoraInicio = parseInt(t.hora_inicio.split(':')[0]);
      const tMinInicio = parseInt(t.hora_inicio.split(':')[1]);
      const tHoraFin = parseInt(t.hora_fin.split(':')[0]);
      const tMinFin = parseInt(t.hora_fin.split(':')[1]);

      const minutosInicio = horaInicio * 60 + minInicio;
      const minutosFin = horaFin_ * 60 + minFin_;
      const tMinutosInicio = tHoraInicio * 60 + tMinInicio;
      const tMinutosFin = tHoraFin * 60 + tMinFin;

      return !(minutosFin <= tMinutosInicio || minutosInicio >= tMinutosFin);
    });
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const horaFin = calcularHoraFin(formData.hora_inicio, formData.duracion);

      // Actualizar turno en BD
      await base44.entities.TurnoCancha.update(turno.id, {
        cancha: formData.cancha,
        hora_inicio: formData.hora_inicio,
        hora_fin: horaFin,
        duracion: formData.duracion,
        cliente: formData.cliente,
        notas: formData.notas,
      });

      // Actualizar evento en Google Calendar si existe
      if (turno.gcal_event_id && turno.gcal_event_id.trim()) {
        try {
          await base44.functions.invoke('sincronizarTurnoGoogleCalendar', {
            turno_id: turno.id,
            isUpdate: true,
          });
        } catch (error) {
          console.error('Error sincronizando con Google Calendar:', error);
        }
      }

      // Actualizar recordatorios asociados
      try {
        const recordatorios = await base44.entities.RecordatorioCancha.filter({ turno_cancha_id: turno.id });
        for (const recordatorio of recordatorios) {
          await base44.entities.RecordatorioCancha.update(recordatorio.id, {
            hora: formData.hora_inicio,
            fecha: turno.fecha,
          });
        }
      } catch (error) {
        console.error('Error actualizando recordatorios:', error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha-lista'] });
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
      onOpenChange(false);
    },
    onError: (error) => {
      setError('Error al actualizar: ' + error.message);
    },
  });

  const handleActualizar = () => {
    if (!validarDisponibilidad()) {
      setError('La cancha no está disponible en ese horario');
      return;
    }
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar alquiler</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Cancha *</Label>
            <Select value={formData.cancha} onValueChange={(v) => setFormData({ ...formData, cancha: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CANCHAS.map(cancha => (
                  <SelectItem key={cancha} value={cancha}>
                    Cancha {cancha}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Hora inicio *</Label>
              <Input
                type="time"
                value={formData.hora_inicio}
                onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Duración (minutos) *</Label>
              <Select value={formData.duracion.toString()} onValueChange={(v) => setFormData({ ...formData, duracion: parseInt(v) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURACIONES.map(d => (
                    <SelectItem key={d} value={d.toString()}>
                      {d} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cliente</Label>
            <Input
              value={formData.cliente}
              onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
              placeholder="Nombre del cliente"
            />
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Detalles adicionales..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleActualizar}
            disabled={updateMutation.isPending || !formData.cancha || !formData.hora_inicio}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {updateMutation.isPending ? 'Actualizando...' : 'Actualizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}