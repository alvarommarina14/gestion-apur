import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
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
import { Switch } from '@/components/ui/switch';
import { Calendar, CheckCircle } from 'lucide-react';

export default function NuevoRecordatorioCanchaModal({ open, onOpenChange, recordatorio }) {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState(
    recordatorio
      ? {
          fecha: recordatorio.fecha,
          hora: recordatorio.hora,
          cancha: recordatorio.cancha,
          profesor: recordatorio.profesor,
          monto: recordatorio.monto,
          repeticion_semanal: recordatorio.repeticion_semanal || false,
          notas: recordatorio.notas || '',
        }
      : {
          fecha: format(new Date(), 'yyyy-MM-dd'),
          hora: '09:00',
          cancha: '',
          profesor: '',
          monto: '',
          repeticion_semanal: false,
          notas: '',
        }
  );

  React.useEffect(() => {
    if (recordatorio) {
      setFormData({
        fecha: recordatorio.fecha,
        hora: recordatorio.hora,
        cancha: recordatorio.cancha,
        profesor: recordatorio.profesor,
        monto: recordatorio.monto,
        repeticion_semanal: recordatorio.repeticion_semanal || false,
        notas: recordatorio.notas || '',
      });
    } else {
      setFormData({
        fecha: format(new Date(), 'yyyy-MM-dd'),
        hora: '09:00',
        cancha: '',
        profesor: '',
        monto: '',
        repeticion_semanal: false,
        notas: '',
      });
    }
  }, [recordatorio, open]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RecordatorioCancha.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
      }, 1500);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RecordatorioCancha.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
      }, 1500);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const fecha = parseISO(formData.fecha);
    const diaSemana = format(fecha, 'EEEE', { locale: es });

    const data = {
      ...formData,
      dia_semana: diaSemana,
      monto: Number(formData.monto),
    };

    if (recordatorio) {
      updateMutation.mutate({ id: recordatorio.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              {recordatorio ? '¡Recordatorio actualizado!' : '¡Recordatorio creado!'}
            </h3>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            {recordatorio ? 'Editar recordatorio' : 'Nuevo recordatorio de cancha'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input
                type="time"
                value={formData.hora}
                onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cancha</Label>
              <Input
                value={formData.cancha}
                onChange={(e) => setFormData({ ...formData, cancha: e.target.value })}
                placeholder="Ej: 1, 2, Central..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Profesor</Label>
              <Input
                value={formData.profesor}
                onChange={(e) => setFormData({ ...formData, profesor: e.target.value })}
                placeholder="Nombre del profesor"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Monto a pagar</Label>
            <Input
              type="number"
              value={formData.monto}
              onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
              placeholder="0"
              required
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <Label className="font-medium text-slate-800">Repetición semanal</Label>
              <p className="text-xs text-slate-500 mt-0.5">
                Se creará automáticamente el mismo recordatorio cada semana
              </p>
            </div>
            <Switch
              checked={formData.repeticion_semanal}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, repeticion_semanal: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Observaciones adicionales..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {recordatorio ? 'Actualizar' : 'Crear recordatorio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}