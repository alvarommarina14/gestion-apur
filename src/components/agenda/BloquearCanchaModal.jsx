import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, addDays } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function BloquearCanchaModal({ open, onOpenChange, fecha }) {
  const [cancha, setCancha] = useState('1');
  const [motivo, setMotivo] = useState('mantenimiento');
  const [fechaInicio, setFechaInicio] = useState(format(fecha, 'yyyy-MM-dd'));
  const [fechaFin, setFechaFin] = useState(format(fecha, 'yyyy-MM-dd'));
  const [todoElDia, setTodoElDia] = useState(true);
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFin, setHoraFin] = useState('22:00');

  const queryClient = useQueryClient();

  const bloquearMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.DisponibilidadCancha.create({
        cancha,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        todo_el_dia: todoElDia,
        hora_inicio: !todoElDia ? horaInicio : undefined,
        hora_fin: !todoElDia ? horaFin : undefined,
        motivo,
        descripcion: `Bloqueo de cancha ${cancha} por ${motivo}`,
        estado: 'activo',
      });
    },
    onSuccess: () => {
      toast.success('Cancha bloqueada');
      queryClient.invalidateQueries({ queryKey: ['bloqueos'] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Error al bloquear cancha');
    }
  });

  const resetForm = () => {
    setCancha('1');
    setMotivo('mantenimiento');
    setFechaInicio(format(new Date(), 'yyyy-MM-dd'));
    setFechaFin(format(new Date(), 'yyyy-MM-dd'));
    setTodoElDia(true);
    setHoraInicio('08:00');
    setHoraFin('22:00');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bloquear Cancha</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cancha</Label>
            <Select value={cancha} onValueChange={setCancha}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['1', '2', '3', '4', 'todas'].map(c => (
                  <SelectItem key={c} value={c}>
                    {c === 'todas' ? 'Todas las canchas' : `Cancha ${c}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Motivo</Label>
            <Select value={motivo} onValueChange={setMotivo}>
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

          <div className="space-y-2">
            <Label>Fecha Inicio</Label>
            <Input 
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Fecha Fin</Label>
            <Input 
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox"
              id="todoElDia"
              checked={todoElDia}
              onChange={(e) => setTodoElDia(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="todoElDia" className="mb-0">Todo el día</Label>
          </div>

          {!todoElDia && (
            <>
              <div className="space-y-2">
                <Label>Hora Inicio</Label>
                <Input 
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora Fin</Label>
                <Input 
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                />
              </div>
            </>
          )}

          <Button 
            onClick={() => bloquearMutation.mutate()}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={bloquearMutation.isPending}
          >
            Bloquear
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}