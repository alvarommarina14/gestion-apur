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
import { Calendar, CheckCircle, Bell } from 'lucide-react';

export default function NuevoRecordatorioCanchaModal({ open, onOpenChange, recordatorio }) {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState(
    recordatorio
      ? {
          fecha: recordatorio.fecha,
          hora: recordatorio.hora,
          cancha: recordatorio.cancha,
          cliente: recordatorio.cliente || '',
          tipo_turno: recordatorio.tipo_turno || 'clase',
          profesor: recordatorio.profesor || '',
          modalidad_alquiler: recordatorio.modalidad_alquiler || '',
          monto: recordatorio.monto,
          pagado: recordatorio.pagado || false,
          repeticion_semanal: recordatorio.repeticion_semanal || false,
          notificar: recordatorio.notificar !== false,
          minutos_antes: recordatorio.minutos_antes || 10,
          notas: recordatorio.notas || '',
        }
      : {
          fecha: format(new Date(), 'yyyy-MM-dd'),
          hora: '09:00',
          cancha: '',
          cliente: '',
          tipo_turno: 'clase',
          profesor: '',
          modalidad_alquiler: '',
          monto: '',
          pagado: false,
          repeticion_semanal: false,
          notificar: true,
          minutos_antes: 10,
          notas: '',
        }
  );

  React.useEffect(() => {
    if (recordatorio) {
      setFormData({
        fecha: recordatorio.fecha,
        hora: recordatorio.hora,
        cancha: recordatorio.cancha,
        cliente: recordatorio.cliente || '',
        tipo_turno: recordatorio.tipo_turno || 'clase',
        profesor: recordatorio.profesor || '',
        modalidad_alquiler: recordatorio.modalidad_alquiler || '',
        monto: recordatorio.monto,
        pagado: recordatorio.pagado || false,
        repeticion_semanal: recordatorio.repeticion_semanal || false,
        notificar: recordatorio.notificar !== false,
        minutos_antes: recordatorio.minutos_antes || 10,
        notas: recordatorio.notas || '',
      });
    } else {
      setFormData({
        fecha: format(new Date(), 'yyyy-MM-dd'),
        hora: '09:00',
        cancha: '',
        cliente: '',
        tipo_turno: 'clase',
        profesor: '',
        modalidad_alquiler: '',
        monto: '',
        pagado: false,
        repeticion_semanal: false,
        notificar: true,
        minutos_antes: 10,
        notas: '',
      });
    }
  }, [recordatorio, open]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Crear recordatorio sin vinculación a turno (creación manual)
      const recordatorio = await base44.entities.RecordatorioCancha.create({
        ...data,
        turno_cancha_id: null, // Sin vinculación a turno de agenda
      });

      // Registrar auditoría
      await base44.entities.LogAuditoria.create({
        entidad: 'RecordatorioCancha',
        entidad_id: recordatorio.id,
        entidad_nombre: `${data.profesor} - Cancha ${data.cancha}`,
        accion: 'crear',
        motivo: 'Recordatorio creado manualmente',
        fecha: new Date().toISOString(),
      });
    },
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
    mutationFn: async ({ id, data, cambios }) => {
      await base44.entities.RecordatorioCancha.update(id, data);

      // Registrar auditoría para cada cambio
      if (cambios && cambios.length > 0) {
        for (const cambio of cambios) {
          await base44.entities.LogAuditoria.create({
            entidad: 'RecordatorioCancha',
            entidad_id: id,
            entidad_nombre: `${data.profesor} - Cancha ${data.cancha}`,
            accion: 'editar',
            campo_modificado: cambio.campo,
            valor_anterior: cambio.anterior,
            valor_nuevo: cambio.nuevo,
            motivo: 'Recordatorio editado',
            fecha: new Date().toISOString(),
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['auditoria'] });
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
      monto: formData.pagado ? 0 : Number(formData.monto),
    };

    if (recordatorio) {
      // Detectar cambios
      const cambios = [];
      Object.keys(data).forEach(key => {
        if (recordatorio[key] !== data[key]) {
          cambios.push({
            campo: key,
            anterior: String(recordatorio[key] || ''),
            nuevo: String(data[key] || ''),
          });
        }
      });
      
      updateMutation.mutate({ id: recordatorio.id, data, cambios });
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

  const formContent = (
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
          <Label>Hora</Label>
          <Input
            type="time"
            value={formData.hora}
            onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
            required
          />
        </div>
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
          <Label>Monto a pagar</Label>
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

      {/* Configuración de notificaciones push */}
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
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            {recordatorio ? 'Editar recordatorio' : 'Nuevo recordatorio de cancha'}
          </DialogTitle>
        </DialogHeader>

        {recordatorio ? (
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
              <HistorialAuditoria entidadId={recordatorio?.id} entidad="RecordatorioCancha" />
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