import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO, addMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HistorialAuditoria from '@/components/historial/HistorialAuditoria';
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
import { Calendar, CheckCircle, AlertTriangle, Trash2, Bell } from 'lucide-react';

export default function NuevoTurnoModal({ open, onOpenChange, turno, fecha }) {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const { data: turnosExistentes = [] } = useQuery({
    queryKey: ['turnos-cancha'],
    queryFn: () => base44.entities.TurnoCancha.list(),
    enabled: open,
  });

  const { data: recordatorios = [] } = useQuery({
    queryKey: ['recordatorios-cancha-modal'],
    queryFn: () => base44.entities.RecordatorioCancha.list(),
    enabled: open && !!turno,
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
    repeticion_semanal: false,
    notificar: true,
    minutos_antes: 10,
  });

  useEffect(() => {
    if (turno && open) {
      const recordatorio = recordatorios.find(r => r.turno_cancha_id === turno.id);
      
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
        repeticion_semanal: recordatorio?.repeticion_semanal || false,
        notificar: recordatorio?.notificar ?? true,
        minutos_antes: recordatorio?.minutos_antes || 10,
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
        repeticion_semanal: false,
        notificar: true,
        minutos_antes: 10,
      });
    }
    setError(null);
  }, [turno, open, fecha, recordatorios]);

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
      if (turno && t.id === turno.id) return false;
      if (t.fecha !== data.fecha || t.cancha !== data.cancha) return false;
      
      const tFin = t.hora_fin;
      if (data.hora_inicio >= t.hora_inicio && data.hora_inicio < tFin) return true;
      if (horaFin > t.hora_inicio && horaFin <= tFin) return true;
      if (data.hora_inicio <= t.hora_inicio && horaFin >= tFin) return true;
      
      return false;
    });
    
    return solapados;
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const turnoCreado = await base44.entities.TurnoCancha.create(data);
      
      const diaSemana = format(parseISO(data.fecha), 'EEEE', { locale: es });
      
      await base44.entities.RecordatorioCancha.create({
        turno_cancha_id: turnoCreado.id,
        fecha: data.fecha,
        hora: data.hora_inicio,
        cancha: data.cancha,
        cliente: data.cliente,
        tipo_turno: data.tipo_turno,
        modalidad_alquiler: data.modalidad_alquiler || null,
        profesor: data.profesor || (data.tipo_turno === 'clase' ? 'Sin asignar' : null),
        monto: data.monto,
        pagado: data.pagado,
        repeticion_semanal: data.repeticion_semanal,
        dia_semana: diaSemana,
        notificar: data.notificar,
        minutos_antes: data.minutos_antes,
        notas: data.notas || `Sincronizado con turno de ${data.cliente}`,
      });

      await base44.entities.LogAuditoria.create({
        entidad: 'TurnoCancha',
        entidad_id: turnoCreado.id,
        entidad_nombre: `${data.cliente} - Cancha ${data.cancha}`,
        accion: 'crear',
        motivo: 'Turno creado desde Agenda',
        fecha: new Date().toISOString(),
      });
      
      return turnoCreado;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      await queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
      }, 1500);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, cambios }) => {
      await base44.entities.TurnoCancha.update(id, data);
      
      const recordatorios = await base44.entities.RecordatorioCancha.filter({ turno_cancha_id: id });
      if (recordatorios.length > 0) {
        await base44.entities.RecordatorioCancha.update(recordatorios[0].id, {
          fecha: data.fecha,
          hora: data.hora_inicio,
          cancha: data.cancha,
          cliente: data.cliente,
          tipo_turno: data.tipo_turno,
          modalidad_alquiler: data.modalidad_alquiler || null,
          profesor: data.profesor || (data.tipo_turno === 'clase' ? 'Sin asignar' : null),
          monto: data.monto,
          pagado: data.pagado,
          repeticion_semanal: data.repeticion_semanal,
          notificar: data.notificar,
          minutos_antes: data.minutos_antes,
          notas: data.notas || recordatorios[0].notas,
        });
      }

      if (cambios && cambios.length > 0) {
        for (const cambio of cambios) {
          await base44.entities.LogAuditoria.create({
            entidad: 'TurnoCancha',
            entidad_id: id,
            entidad_nombre: `${data.cliente} - Cancha ${data.cancha}`,
            accion: 'editar',
            campo_modificado: cambio.campo,
            valor_anterior: String(cambio.anterior || ''),
            valor_nuevo: String(cambio.nuevo || ''),
            motivo: 'Turno editado desde Agenda',
            fecha: new Date().toISOString(),
          });
        }
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      await queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
      await queryClient.invalidateQueries({ queryKey: ['auditoria'] });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
      }, 1500);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const turnoData = turnosExistentes.find(t => t.id === id);
      if (turnoData) {
        await base44.entities.LogAuditoria.create({
          entidad: 'TurnoCancha',
          entidad_id: id,
          entidad_nombre: `${turnoData.cliente} - Cancha ${turnoData.cancha}`,
          accion: 'eliminar',
          motivo: 'Turno eliminado desde Agenda',
          fecha: new Date().toISOString(),
        });
      }

      const recordatorios = await base44.entities.RecordatorioCancha.filter({ turno_cancha_id: id });
      for (const rec of recordatorios) {
        await base44.entities.RecordatorioCancha.delete(rec.id);
      }
      
      await base44.entities.TurnoCancha.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['auditoria'] });
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (formData.tipo_turno === 'alquiler' && !formData.modalidad_alquiler) {
      setError('Debes seleccionar la modalidad del alquiler (Abono o Suelto)');
      return;
    }

    const horaFin = calcularHoraFin(formData.hora_inicio, formData.duracion);
    
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
      const cambios = [];
      Object.keys(data).forEach(key => {
        if (key === 'hora_fin') return;

        const oldValue = turno[key];
        const newValue = data[key];

        if (key === 'pagado') {
          if (!!oldValue !== !!newValue) {
            cambios.push({
              campo: key,
              anterior: String(!!oldValue),
              nuevo: String(!!newValue),
            });
          }
        } else if (key === 'monto') {
          if (Number(oldValue) !== Number(newValue)) {
            cambios.push({
              campo: key,
              anterior: String(oldValue),
              nuevo: String(newValue),
            });
          }
        } else if (String(oldValue || '') !== String(newValue || '')) {
          cambios.push({
            campo: key,
            anterior: String(oldValue || ''),
            nuevo: String(newValue || ''),
          });
        }
      });
      
      updateMutation.mutate({ id: turno.id, data, cambios });
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

  const formContent = (
    <>
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
              <SelectValue placeholder="Seleccionar cancha" />
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

      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div>
          <Label className="font-medium text-slate-800">Repetición semanal</Label>
          <p className="text-xs text-slate-500 mt-0.5">
            Se creará automáticamente el mismo turno cada semana
          </p>
        </div>
        <Switch
          checked={formData.repeticion_semanal}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, repeticion_semanal: checked })
          }
        />
      </div>

      <div className="space-y-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-600" />
            <div>
              <Label className="font-medium text-slate-800">Notificación push</Label>
              <p className="text-xs text-slate-500 mt-0.5">
                Enviar alerta automática a los empleados
              </p>
            </div>
          </div>
          <Switch
            checked={formData.notificar}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, notificar: checked })
            }
          />
        </div>

        {formData.notificar && (
          <div className="space-y-2 pt-2">
            <Label className="text-sm">Avisar con anticipación</Label>
            <Select
              value={formData.minutos_antes.toString()}
              onValueChange={(v) =>
                setFormData({ ...formData, minutos_antes: Number(v) })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutos antes</SelectItem>
                <SelectItem value="10">10 minutos antes</SelectItem>
                <SelectItem value="15">15 minutos antes</SelectItem>
                <SelectItem value="30">30 minutos antes</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Los empleados recibirán una notificación en su dispositivo
            </p>
          </div>
        )}
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
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-lg max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            {turno ? 'Editar turno' : 'Nuevo turno'}
          </DialogTitle>
        </DialogHeader>

        {turno ? (
          <Tabs defaultValue="datos" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="datos">Datos</TabsTrigger>
              <TabsTrigger value="historial">Historial</TabsTrigger>
            </TabsList>
            
            <TabsContent value="datos" className="flex-1 overflow-y-auto mt-4">
              <form onSubmit={handleSubmit} className="space-y-4 px-1">
                {formContent}
              </form>
            </TabsContent>
            
            <TabsContent value="historial" className="flex-1 overflow-y-auto mt-4">
              <HistorialAuditoria entidadId={turno?.id} entidad="TurnoCancha" />
            </TabsContent>
          </Tabs>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 px-1">
            {formContent}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}