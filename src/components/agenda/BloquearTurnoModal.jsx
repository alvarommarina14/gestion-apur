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

export default function BloquearTurnoModal({ isOpen, onClose, initialDate }) {
  const [cancha, setCancha] = useState('1');
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFin, setHoraFin] = useState('09:00');
  const [motivo, setMotivo] = useState('mantenimiento');
  const [descripcion, setDescripcion] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const fechaInicio = format(initialDate, 'yyyy-MM-dd');
      const fechaFin = format(initialDate, 'yyyy-MM-dd');

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
    },
    onSuccess: () => {
      toast.success('Turno bloqueado correctamente');
      queryClient.invalidateQueries({ queryKey: ['bloqueos'] });
      queryClient.invalidateQueries({ queryKey: ['turnos'] });
      handleClose();
    },
    onError: (error) => {
      toast.error('Error al bloquear: ' + error.message);
    }
  });

  const handleClose = () => {
    setCancha('1');
    setHoraInicio('08:00');
    setHoraFin('09:00');
    setMotivo('mantenimiento');
    setDescripcion('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bloquear Cancha</DialogTitle>
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
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {mutation.isPending ? 'Bloqueando...' : 'Bloquear'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}