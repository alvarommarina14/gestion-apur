import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { addMinutes, format as formatDate } from 'date-fns';

export default function ModalEditarTurno({ isOpen, onClose, turno }) {
  const [formData, setFormData] = useState({
    hora_inicio: turno?.hora_inicio || '09:00',
    duracion: turno?.duracion || 60,
    cliente: turno?.cliente || '',
    cancha: turno?.cancha || '1',
    monto: turno?.monto || 0,
    notas: turno?.notas || '',
    profesor_id: turno?.profesor_id || '',
    alumnos_ids: turno?.alumnos_ids || [],
  });

  const queryClient = useQueryClient();

  const { data: profesores = [] } = useQuery({
    queryKey: ['profesores'],
    queryFn: () => base44.entities.Profesor.list(),
    enabled: isOpen,
  });

  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
    enabled: isOpen,
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list(),
    enabled: isOpen,
  });

  const calcularHoraFin = (horaInicio, duracion) => {
    if (!horaInicio) return '00:00';
    const [h, m] = horaInicio.split(':').map(Number);
    const inicio = new Date();
    inicio.setHours(h, m, 0);
    const fin = addMinutes(inicio, duracion);
    return formatDate(fin, 'HH:mm');
  };

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const horaFin = calcularHoraFin(data.hora_inicio, data.duracion);
      
      await base44.entities.TurnoCancha.update(turno.id, {
        ...data,
        hora_fin: horaFin,
      });

      // Actualizar recordatorio si existe
      const recordatorios = await base44.entities.RecordatorioCancha.filter({ 
        turno_cancha_id: turno.id 
      });
      
      if (recordatorios.length > 0) {
        await base44.entities.RecordatorioCancha.update(recordatorios[0].id, {
          hora: data.hora_inicio,
          cliente: data.cliente,
          cancha: data.cancha,
          monto: data.monto,
          notas: data.notas,
        });
      }
    },
    onSuccess: () => {
      toast.success('Turno actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
      onClose();
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    }
  });

  const handleSave = async () => {
    if (!formData.cliente || !formData.hora_inicio) {
      toast.error('Completa los campos requeridos');
      return;
    }

    await updateMutation.mutateAsync(formData);
  };

  const horaFin = calcularHoraFin(formData.hora_inicio, formData.duracion);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            Editar Turno
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cliente / Nombre</Label>
            <Select
              value={formData.cliente}
              onValueChange={(v) => setFormData({ ...formData, cliente: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map(c => (
                  <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={formData.cliente}
              onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
              placeholder="O ingresa un nombre"
              className="mt-2"
            />
          </div>

          {/* Cancha y Horario */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cancha</Label>
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
              <Label className="text-sm font-medium">Hora inicio</Label>
              <input
                type="time"
                value={formData.hora_inicio}
                onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
          </div>

          {/* Duración y Hora fin */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Duración</Label>
              <Select
                value={formData.duracion.toString()}
                onValueChange={(v) => setFormData({ ...formData, duracion: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 min</SelectItem>
                  <SelectItem value="80">80 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Hora fin</Label>
              <Input
                value={horaFin}
                disabled
                className="bg-slate-50 text-sm"
              />
            </div>
          </div>

          {/* Profesor (si es clase) */}
          {turno?.tipo_turno === 'clase' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Profesor</Label>
              <Select
                value={formData.profesor_id}
                onValueChange={(v) => setFormData({ ...formData, profesor_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar profesor" />
                </SelectTrigger>
                <SelectContent>
                  {profesores.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Monto */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Monto</Label>
            <Input
              type="number"
              value={formData.monto}
              onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) })}
              placeholder="0"
              className="text-sm"
            />
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Notas (opcional)</Label>
            <Textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Detalles adicionales..."
              className="resize-none h-16 text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}