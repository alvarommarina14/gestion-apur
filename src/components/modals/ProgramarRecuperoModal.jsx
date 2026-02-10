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
  DialogDescription,
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
import { AlertCircle, Clock } from 'lucide-react';

export default function ProgramarRecuperoModal({ open, onOpenChange, recupero, profesores = [] }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    fecha: format(new Date(), 'yyyy-MM-dd'),
    hora_inicio: '10:00',
    profesor_id: '',
    duracion: 50,
    notas: '',
  });

  React.useEffect(() => {
    if (recupero?.profesor_id) {
      setFormData(prev => ({ ...prev, profesor_id: recupero.profesor_id }));
    }
  }, [recupero]);

  const programarMutation = useMutation({
    mutationFn: async () => {
      // 1. Crear la clase de recupero
      const claseData = {
        fecha: formData.fecha,
        hora_inicio: formData.hora_inicio,
        duracion: formData.duracion,
        tipo: 'individual',
        sede: recupero?.sede || 'Principal',
        alumnos_ids: [recupero.alumno_id],
        alumnos_nombres: [recupero.alumno_nombre],
        precio: 0,
        estado: 'programada',
        es_recupero: true,
        clase_original_id: recupero?.clase_original_id,
        profesor_id: formData.profesor_id,
        notas: formData.notas || '',
      };

      if (formData.profesor_id) {
        const profesor = profesores.find(p => p.id === formData.profesor_id);
        if (profesor) {
          claseData.profesor_nombre = profesor.nombre;
        }
      }

      const nuevaClase = await base44.entities.Clase.create(claseData);

      // 2. Actualizar el recupero a "programado"
      await base44.entities.Recupero.update(recupero.id, {
        estado: 'programado',
        fecha_programada: formData.fecha,
        clase_recupero_id: nuevaClase.id,
      });

      return nuevaClase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recuperos'] });
      queryClient.invalidateQueries({ queryKey: ['clases-lista'] });
      onOpenChange(false);
      setFormData({
        fecha: format(new Date(), 'yyyy-MM-dd'),
        hora_inicio: '10:00',
        profesor_id: '',
        duracion: 50,
        notas: '',
      });
    },
  });

  if (!recupero) return null;

  const handleSubmit = async () => {
    if (!formData.fecha || !formData.hora_inicio) {
      alert('Completa la fecha y hora');
      return;
    }
    await programarMutation.mutateAsync();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Programar Recupero</DialogTitle>
          <DialogDescription>
            {recupero.alumno_nombre}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del recupero original */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-blue-900 font-medium">Clase original</p>
              <p className="text-blue-700">
                {recupero.fecha_original && format(parseISO(recupero.fecha_original), "d 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            </div>
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha del recupero</Label>
            <Input
              id="fecha"
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          {/* Hora */}
          <div className="space-y-2">
            <Label htmlFor="hora">Hora de inicio</Label>
            <Input
              id="hora"
              type="time"
              value={formData.hora_inicio}
              onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
            />
          </div>

          {/* Duración */}
          <div className="space-y-2">
            <Label htmlFor="duracion">Duración (minutos)</Label>
            <Input
              id="duracion"
              type="number"
              value={formData.duracion}
              onChange={(e) => setFormData({ ...formData, duracion: parseInt(e.target.value) })}
              min="30"
              max="120"
            />
          </div>

          {/* Profesor */}
          {profesores.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="profesor">Profesor</Label>
              <Select
                value={formData.profesor_id}
                onValueChange={(v) => setFormData({ ...formData, profesor_id: v })}
              >
                <SelectTrigger id="profesor">
                  <SelectValue placeholder="Seleccionar profesor" />
                </SelectTrigger>
                <SelectContent>
                  {profesores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Detalles del recupero..."
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
            onClick={handleSubmit}
            disabled={programarMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {programarMutation.isPending ? 'Programando...' : 'Programar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}