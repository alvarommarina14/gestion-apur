import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO, addMinutes } from 'date-fns';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NuevoTurnoModal({ open, onOpenChange, turno, fecha }) {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const { data: turnosExistentes = [] } = useQuery({
    queryKey: ['turnos-cancha'],
    queryFn: () => base44.entities.TurnoCancha.list(),
    enabled: open,
  });

  const [formData, setFormData] = useState({
    fecha: format(fecha || new Date(), 'yyyy-MM-dd'),
    hora_inicio: '09:00',
    duracion: 60,
    cancha: '1',
    cliente: '',
    tipo_turno: 'clase',
    profesor: '',
    modalidad_alquiler: '',
    monto: '',
    pagado: false,
    notas: '',
  });

  useEffect(() => {
    if (turno && open) {
      setFormData({
        fecha: turno.fecha,
        hora_inicio: turno.hora_inicio,
        duracion: turno.duracion || 60,
        cancha: turno.cancha,
        cliente: turno.cliente,
        tipo_turno: turno.tipo_turno || 'clase',
        profesor: turno.profesor || '',
        modalidad_alquiler: turno.modalidad_alquiler || '',
        monto: turno.monto,
        pagado: turno.pagado || false,
        notas: turno.notas || '',
      });
    } else if (!turno && open) {
      setFormData({
        fecha: format(fecha || new Date(), 'yyyy-MM-dd'),
        hora_inicio: '09:00',
        duracion: 60,
        cancha: '1',
        cliente: '',
        tipo_turno: 'clase',
        profesor: '',
        modalidad_alquiler: '',
        monto: '',
        pagado: false,
        notas: '',
      });
    }
    setError(null);
  }, [turno, open, fecha]);

  const calcularHoraFin = (horaInicio, duracion) => {
    const [h, m] = horaInicio.split(':').map(Number);
    const inicio = new Date();
    inicio.setHours(h, m, 0);
    const fin = addMinutes(inicio, duracion);
    return format(fin, 'HH:mm');
  };

  const validarSolapamiento = (data) => {
    const horaFin = calcularHoraFin(data.hora_inicio, data.duracion);
    
    const solapados = turnosExistentes.filter(t => {
      // Excluir el turno actual si estamos editando
      if (turno && t.id === turno.id) return false;
      
      // Solo verificar misma fecha y cancha
      if (t.fecha !== data.fecha || t.cancha !== data.cancha) return false;
      
      // Verificar solapamiento de horarios
      const tFin = t.hora_fin;
      
      // Caso 1: el nuevo turno empieza durante un turno existente
      if (data.hora_inicio >= t.hora_inicio && data.hora_inicio < tFin) return true;
      
      // Caso 2: el nuevo turno termina durante un turno existente
      if (horaFin > t.hora_inicio && horaFin <= tFin) return true;
      
      // Caso 3: el nuevo turno contiene completamente un turno existente
      if (data.hora_inicio <= t.hora_inicio && horaFin >= tFin) return true;
      
      return false;
    });
    
    return solapados;
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const turnoCreado = await base44.entities.TurnoCancha.create(data);
      
      // Crear recordatorio de cancha vinculado automáticamente
      await base44.entities.RecordatorioCancha.create({
        turno_cancha_id: turnoCreado.id,
        fecha: data.fecha,
        hora: data.hora_inicio,
        cancha: data.cancha,
        profesor: data.profesor || 'Sin asignar',
        monto: data.monto,
        repeticion_semanal: false,
        dia_semana: new Date(data.fecha).toLocaleDateString('es-ES', { weekday: 'long' }),
        notas: `Turno creado desde Agenda - Cliente: ${data.cliente}`,
      });
      
      return turnoCreado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
      }, 1500);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.TurnoCancha.update(id, data);
      
      // Buscar y actualizar recordatorio vinculado
      const recordatorios = await base44.entities.RecordatorioCancha.filter({ turno_cancha_id: id });
      if (recordatorios.length > 0) {
        await base44.entities.RecordatorioCancha.update(recordatorios[0].id, {
          fecha: data.fecha,
          hora: data.hora_inicio,
          cancha: data.cancha,
          profesor: data.profesor || recordatorios[0].profesor,
          monto: data.monto,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
      }, 1500);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Eliminar recordatorio vinculado primero
      const recordatorios = await base44.entities.RecordatorioCancha.filter({ turno_cancha_id: id });
      for (const rec of recordatorios) {
        await base44.entities.RecordatorioCancha.delete(rec.id);
      }
      
      // Luego eliminar el turno
      await base44.entities.TurnoCancha.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    // Validar alquiler sin modalidad
    if (formData.tipo_turno === 'alquiler' && !formData.modalidad_alquiler) {
      setError('Debes seleccionar la modalidad del alquiler (Abono o Suelto)');
      return;
    }

    const horaFin = calcularHoraFin(formData.hora_inicio, formData.duracion);
    
    // Validar solapamiento
    const solapados = validarSolapamiento(formData);
    if (solapados.length > 0) {
      setError(`Ya existe un turno en Cancha ${formData.cancha} a las ${solapados[0].hora_inicio}`);
      return;
    }

    const data = {
      ...formData,
      hora_fin: horaFin,
      monto: formData.pagado ? 0 : Number(formData.monto),
    };

    if (turno) {
      updateMutation.mutate({ id: turno.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (confirm('¿Eliminar este turno?')) {
      deleteMutation.mutate(turno.id);
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
              {turno ? '¡Turno actualizado!' : '¡Turno creado!'}
            </h3>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            {turno ? 'Editar turno' : 'Nuevo turno'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5" />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

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

          <div className="space-y-2">
            <Label>Cliente / Nombre</Label>
            <Input
              value={formData.cliente}
              onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
              placeholder="Nombre del cliente"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Turno</Label>
            <Select
              value={formData.tipo_turno}
              onValueChange={(v) => setFormData({ ...formData, tipo_turno: v, profesor: v === 'alquiler' ? '' : formData.profesor, modalidad_alquiler: v === 'clase' ? '' : formData.modalidad_alquiler })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clase">Clase</SelectItem>
                <SelectItem value="alquiler">Alquiler</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.tipo_turno === 'clase' && (
            <div className="space-y-2">
              <Label>Profesor (opcional)</Label>
              <Input
                value={formData.profesor}
                onChange={(e) => setFormData({ ...formData, profesor: e.target.value })}
                placeholder="Nombre del profesor"
              />
            </div>
          )}

          {formData.tipo_turno === 'alquiler' && (
            <div className="space-y-2">
              <Label>Modalidad de Alquiler</Label>
              <Select
                value={formData.modalidad_alquiler}
                onValueChange={(v) => setFormData({ ...formData, modalidad_alquiler: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar modalidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="abono">Abono</SelectItem>
                  <SelectItem value="suelto">Suelto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <div>
              <Label className="font-medium text-slate-800">Pagado</Label>
              <p className="text-xs text-slate-500 mt-0.5">Marcar si el turno ya está pago</p>
            </div>
            <Switch
              checked={formData.pagado}
              onCheckedChange={(checked) => setFormData({ ...formData, pagado: checked })}
            />
          </div>

          {!formData.pagado && (
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                type="number"
                value={formData.monto}
                onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                placeholder="0"
                required
              />
            </div>
          )}

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
            {turno && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                className="text-rose-600 hover:text-rose-700 sm:mr-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {turno ? 'Actualizar' : 'Crear turno'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}