import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, addMinutes, addWeeks } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function FormularioClaseAdmin({ fecha, onDataChange }) {
  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
  });

  const alumnosActivos = alumnos.filter(a => a.estado !== 'pausado');

  const [formData, setFormData] = useState({
    fecha: format(fecha || new Date(), 'yyyy-MM-dd'),
    hora_inicio: '09:00',
    duracion: 50,
    tipo: 'individual',
    cancha: '',
    alumnos_ids: [],
    precio: '',
    pagado: false,
    notas: '',
    repeticion_semanal: false,
  });

  useEffect(() => {
    onDataChange(formData);
  }, [formData]);

  const calcularHoraFin = (horaInicio, duracion) => {
    if (!horaInicio) return '00:00';
    const [h, m] = horaInicio.split(':').map(Number);
    const inicio = new Date();
    inicio.setHours(h, m, 0);
    const fin = addMinutes(inicio, duracion);
    return format(fin, 'HH:mm');
  };

  const handleAlumnoToggle = (alumnoId) => {
    setFormData(prev => ({
      ...prev,
      alumnos_ids: prev.alumnos_ids.includes(alumnoId)
        ? prev.alumnos_ids.filter(id => id !== alumnoId)
        : [...prev.alumnos_ids, alumnoId]
    }));
  };

  return (
    <>
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
          <Label>Cancha (opcional)</Label>
          <Select
            value={formData.cancha}
            onValueChange={(v) => setFormData({ ...formData, cancha: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Sin asignar</SelectItem>
              <SelectItem value="1">Cancha 1</SelectItem>
              <SelectItem value="2">Cancha 2</SelectItem>
              <SelectItem value="3">Cancha 3</SelectItem>
              <SelectItem value="4">Cancha 4</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
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
              }).filter(Boolean).map(hora => (
                <SelectItem key={hora} value={hora}>{hora}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              <SelectItem value="60">60 min</SelectItem>
              <SelectItem value="90">90 min</SelectItem>
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select
            value={formData.tipo}
            onValueChange={(v) => setFormData({ ...formData, tipo: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="grupal">Grupal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Alumnos</Label>
        <div className="border rounded-lg max-h-40 overflow-y-auto">
          {alumnosActivos.map((alumno) => (
            <div
              key={alumno.id}
              className={cn(
                'flex items-center gap-3 p-3 border-b last:border-b-0 cursor-pointer hover:bg-slate-50',
                formData.alumnos_ids.includes(alumno.id) && 'bg-emerald-50'
              )}
            >
              <Checkbox
                checked={formData.alumnos_ids.includes(alumno.id)}
                onCheckedChange={() => handleAlumnoToggle(alumno.id)}
              />
              <span className="text-sm font-medium">{alumno.nombre}</span>
            </div>
          ))}
        </div>
        {formData.alumnos_ids.length === 0 && (
          <p className="text-xs text-rose-500">Selecciona al menos un alumno</p>
        )}
      </div>

      <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
        <div>
          <Label className="font-medium text-slate-800">Pagado</Label>
          <p className="text-xs text-slate-500 mt-0.5">Marcar si ya está pago</p>
        </div>
        <Switch
          checked={formData.pagado}
          onCheckedChange={(checked) => setFormData({ ...formData, pagado: checked })}
        />
      </div>

      {!formData.pagado && (
        <div className="space-y-2">
          <Label>Precio (opcional)</Label>
          <Input
            type="number"
            value={formData.precio}
            onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
            placeholder="Dejar vacío para usar precio mensual"
          />
        </div>
      )}

      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div>
          <Label className="font-medium text-slate-800">Repetición semanal</Label>
          <p className="text-xs text-slate-500 mt-0.5">
            Se creará automáticamente cada semana
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
          placeholder="Observaciones..."
          rows={2}
        />
      </div>
    </>
  );
}