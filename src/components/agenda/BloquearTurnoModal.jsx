import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';

const MOTIVOS = [
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'evento_privado', label: 'Evento privado' },
  { value: 'clima', label: 'Clima' },
  { value: 'reparacion', label: 'Reparación' },
  { value: 'otro', label: 'Otro' }
];

export default function BloquearTurnoModal({ isOpen, onClose, initialDate, bloqueo }) {
  const [cancha, setCancha] = useState(bloqueo?.cancha || '1');
  const [horaInicio, setHoraInicio] = useState(bloqueo?.hora_inicio || '08:00');
  const [horaFin, setHoraFin] = useState(bloqueo?.hora_fin || '09:00');
  const [motivo, setMotivo] = useState(bloqueo?.motivo || 'mantenimiento');
  const [descripcion, setDescripcion] = useState(bloqueo?.descripcion || '');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const fechaInicio = format(initialDate, 'yyyy-MM-dd');
      const fechaFin = format(initialDate, 'yyyy-MM-dd');

      if (bloqueo?.id) {
        return await base44.entities.DisponibilidadCancha.update(bloqueo.id, {
          cancha,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          motivo,
          descripcion
        });
      } else {
        return await base44.entities.DisponibilidadCancha.create({
          cancha,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          motivo,
          descripcion,
          todo_el_dia: false,
          estado: 'activo'
        });
      }
    },
    onSuccess: () => {
      toast.success(bloqueo?.id ? 'Bloqueo actualizado' : 'Turno bloqueado correctamente');
      queryClient.invalidateQueries({ queryKey: ['bloqueos'] });
      queryClient.invalidateQueries({ queryKey: ['turnos'] });
      handleClose();
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    }
  });

  const handleClose = () => {
    setCancha(bloqueo?.cancha || '1');
    setHoraInicio(bloqueo?.hora_inicio || '08:00');
    setHoraFin(bloqueo?.hora_fin || '09:00');
    setMotivo(bloqueo?.motivo || 'mantenimiento');
    setDescripcion(bloqueo?.descripcion || '');
    onClose();
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este bloqueo?')) return;
    try {
      await base44.entities.DisponibilidadCancha.delete(bloqueo.id);
      toast.success('Bloqueo eliminado');
      queryClient.invalidateQueries({ queryKey: ['bloqueos'] });
      handleClose();
    } catch (error) {
      toast.error('Error al eliminar: ' + error.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{bloqueo?.id ? 'Editar Bloqueo' : 'Bloquear Cancha'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Cancha
            </label>
            <Select value={cancha} onValueChange={setCancha}>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Hora inicio
              </label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Hora fin
              </label>
              <input
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Motivo
            </label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS.map(m => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Descripción (opcional)
            </label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detalles adicionales..."
              className="resize-none h-24"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            {bloqueo?.id && (
              <Button
                onClick={handleDelete}
                variant="destructive"
              >
                Eliminar
              </Button>
            )}
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {mutation.isPending ? 'Guardando...' : bloqueo?.id ? 'Actualizar' : 'Bloquear'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}