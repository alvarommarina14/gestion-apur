import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO, addMinutes, addWeeks } from 'date-fns';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, CheckCircle, AlertTriangle, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import FormularioClaseAdmin from '@/components/agenda/FormularioClaseAdmin';

export default function NuevoTurnoModal({ open, onOpenChange, turno, fecha }) {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [claseData, setClaseData] = useState(null);

  const { data: turnosExistentes = [] } = useQuery({
    queryKey: ['turnos-cancha'],
    queryFn: () => base44.entities.TurnoCancha.list(),
    enabled: open,
  });

  const { data: empleados = [] } = useQuery({
    queryKey: ['users-empleados'],
    queryFn: () => base44.entities.User.list(),
    enabled: open,
  });

  const { data: profesores = [] } = useQuery({
    queryKey: ['profesores'],
    queryFn: () => base44.entities.Profesor.list(),
    enabled: open,
  });

  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
    enabled: open,
  });

  const [formData, setFormData] = useState({
    fecha: format(fecha || new Date(), 'yyyy-MM-dd'),
    hora_inicio: '09:00',
    duracion: 60,
    cancha: '1',
    cliente: '',
    tipo_turno: 'clase',
    profesor_id: '',
    alumnos_ids: [],
    modalidad_alquiler: '',
    monto: '',
    pagado: false,
    notas: '',
    repeticion_semanal: false,
    empleados_asignados_ids: empleados.map(e => e.id),
  });

  useEffect(() => {
    if (turno && open) {
      // Cargar recordatorio asociado de forma asíncrona
      const loadRecordatorio = async () => {
        try {
          const recordatorios = await base44.entities.RecordatorioCancha.filter({ turno_cancha_id: turno.id });
          const recordatorio = recordatorios[0];

          setFormData({
            fecha: turno.fecha,
            hora_inicio: turno.hora_inicio,
            duracion: turno.duracion || 60,
            cancha: turno.cancha,
            cliente: turno.cliente,
            tipo_turno: turno.tipo_turno || 'clase',
            profesor_id: turno.profesor_id || '',
            alumnos_ids: turno.alumnos_ids || [],
            modalidad_alquiler: turno.modalidad_alquiler || '',
            monto: turno.monto,
            pagado: turno.pagado || false,
            notas: turno.notas || '',
            repeticion_semanal: false,
            empleados_asignados_ids: turno.empleados_asignados_ids || [],
          });
        } catch (error) {
          console.error('Error loading recordatorio:', error);
          setFormData({
            fecha: turno.fecha,
            hora_inicio: turno.hora_inicio,
            duracion: turno.duracion || 60,
            cancha: turno.cancha,
            cliente: turno.cliente,
            tipo_turno: turno.tipo_turno || 'clase',
            profesor_id: turno.profesor_id || '',
            alumnos_ids: turno.alumnos_ids || [],
            modalidad_alquiler: turno.modalidad_alquiler || '',
            monto: turno.monto,
            pagado: turno.pagado || false,
            notas: turno.notas || '',
            repeticion_semanal: false,
            empleados_asignados_ids: turno.empleados_asignados_ids || [],
          });
        }
      };

      loadRecordatorio();
    } else if (!turno && open) {
      setFormData({
        fecha: format(fecha || new Date(), 'yyyy-MM-dd'),
        hora_inicio: '09:00',
        duracion: 60,
        cancha: '1',
        cliente: '',
        tipo_turno: 'clase',
        profesor_id: '',
        alumnos_ids: [],
        modalidad_alquiler: '',
        monto: '',
        pagado: false,
        notas: '',
        repeticion_semanal: false,
        notificar: true,
        minutos_antes: 10,
        empleados_asignados_ids: empleados.map(e => e.id),
      });
    }
    setError(null);
  }, [turno, open, fecha]);

  const calcularHoraFin = (horaInicio, duracion) => {
    if (!horaInicio) return '00:00';
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
      const empleadosSeleccionados = empleados.filter(e => data.empleados_asignados_ids.includes(e.id));
      const turnoData = {
        ...data,
        empleados_asignados_emails: empleadosSeleccionados.map(e => e.email),
        empleados_asignados_nombres: empleadosSeleccionados.map(e => e.full_name),
        estado: 'activo',
        make_sync_status: 'pendiente',
        base44_agenda_link: `${window.location.origin}/AgendaEmpleados`,
      };
      const turnoCreado = await base44.entities.TurnoCancha.create(turnoData);
      
      // Sincronizar con Google Calendar
      try {
        await base44.functions.invoke('sincronizarTurnoGoogleCalendar', { turno_id: turnoCreado.id });
      } catch (err) {
        console.error('Error sincronizando con Google Calendar:', err);
      }
      
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
    mutationFn: async ({ id, data, cambios }) => {
      const empleadosSeleccionados = empleados.filter(e => data.empleados_asignados_ids.includes(e.id));
      const turnoData = {
        ...data,
        empleados_asignados_emails: empleadosSeleccionados.map(e => e.email),
        empleados_asignados_nombres: empleadosSeleccionados.map(e => e.full_name),
        make_sync_status: 'pendiente',
        base44_agenda_link: `${window.location.origin}/AgendaEmpleados`,
      };
      await base44.entities.TurnoCancha.update(id, turnoData);
      
      // Sincronizar con Google Calendar
      try {
        await base44.functions.invoke('sincronizarTurnoGoogleCalendar', { turno_id: id });
      } catch (err) {
        console.error('Error sincronizando con Google Calendar:', err);
      }
      
      const recordatorios = await base44.entities.RecordatorioCancha.filter({ turno_cancha_id: id });
      if (recordatorios.length > 0) {
        const recordatorioUpdate = {
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
          notas: data.notas || recordatorios[0].notas,
        };

        await base44.entities.RecordatorioCancha.update(recordatorios[0].id, recordatorioUpdate);
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
            motivo: cambioNotificacion ? 'Turno editado - tiempo de notificación modificado' : 'Turno editado desde Agenda',
            fecha: new Date().toISOString(),
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha-push'] });
      queryClient.invalidateQueries({ queryKey: ['auditoria'] });
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

      // Eliminar de Google Calendar primero (antes de borrar de la BD)
      try {
        await base44.functions.invoke('sincronizarTurnoGoogleCalendar', { 
          turno_id: id, 
          action: 'delete' 
        });
      } catch (err) {
        console.error('Error eliminando de Google Calendar:', err);
        // Continuar con la eliminación aunque falle Calendar
      }

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

     // Si es tipo clase, crear clase en lugar de turno
     if (formData.tipo_turno === 'clase') {
       if (!formData.alumnos_ids || formData.alumnos_ids.length === 0) {
         setError('Debes seleccionar al menos un alumno');
         return;
       }

       if (!formData.profesor_id) {
         setError('Debes seleccionar un profesor');
         return;
       }

       if (!formData.cancha) {
         setError('Debes seleccionar una cancha');
         return;
       }

       const crearClase = async () => {
         try {
           const alumnosSeleccionados = alumnos.filter(a => formData.alumnos_ids.includes(a.id));
           const profesorSeleccionado = profesores.find(p => p.id === formData.profesor_id);

           const claseData = {
             fecha: formData.fecha,
             hora_inicio: formData.hora_inicio,
             duracion: Number(formData.duracion),
             tipo: 'individual',
             sede: 'Sistema',
             cancha: formData.cancha,
             alumnos_ids: formData.alumnos_ids,
             alumnos_nombres: alumnosSeleccionados.map(a => a.nombre),
             precio: formData.monto ? Number(formData.monto) : null,
             estado: 'programada',
             notas: formData.notas,
             asistencia_registrada: false,
             profesor_id: formData.profesor_id,
             estado_aprobacion: 'aprobada',
           };

           if (formData.repeticion_semanal) {
             claseData.es_recurrente = true;
             claseData.recurrencia_tipo = 'semanal';
           }

           const claseCreada = await base44.entities.Clase.create(claseData);

           // Sincronizar con Google Calendar
           try {
             await base44.functions.invoke('sincronizarClaseGoogleCalendar', { clase_id: claseCreada.id });
           } catch (err) {
             console.error('Error sincronizando con Google Calendar:', err);
           }

           setSuccess(true);
           queryClient.invalidateQueries({ queryKey: ['clases'] });
           queryClient.invalidateQueries({ queryKey: ['alumnos'] });
           setTimeout(() => {
             setSuccess(false);
             onOpenChange(false);
           }, 1500);
         } catch (err) {
           console.error('Error creando clase:', err);
           setError('Error al crear la clase');
         }
       };

       crearClase();
       return;
     }

     // Lógica original para alquiler
       // Asignar automáticamente a todos los empleados
       const todosLosEmpleadosIds = empleados.map(e => e.id);
       const dataConEmpleados = {
         ...formData,
         empleados_asignados_ids: todosLosEmpleadosIds,
       };

     if (dataConEmpleados.tipo_turno === 'alquiler' && !dataConEmpleados.modalidad_alquiler) {
       setError('Debes seleccionar la modalidad del alquiler (Abono o Suelto)');
       return;
     }

     const horaFin = calcularHoraFin(dataConEmpleados.hora_inicio, dataConEmpleados.duracion);

     const solapados = validarSolapamiento(dataConEmpleados);
     if (solapados.length > 0) {
       setError(`Ya existe un turno en Cancha ${dataConEmpleados.cancha} a las ${solapados[0].hora_inicio}`);
       return;
     }

     const data = {
       ...dataConEmpleados,
       hora_fin: horaFin,
       monto: dataConEmpleados.pagado ? 0 : Number(dataConEmpleados.monto),
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
         <Label>Tipo de Turno</Label>
         <Select
            value={formData.tipo_turno}
            onValueChange={(v) => setFormData({ ...formData, tipo_turno: v, modalidad_alquiler: v === 'clase' ? '' : formData.modalidad_alquiler })}
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

        {formData.tipo_turno === 'clase' ? (
          <>
            <div className="space-y-2">
              <Label>Profesor *</Label>
              <Select
                value={formData.profesor_id}
                onValueChange={(v) => setFormData({ ...formData, profesor_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar profesor" />
                </SelectTrigger>
                <SelectContent>
                  {profesores.map(profesor => (
                    <SelectItem key={profesor.id} value={profesor.id}>
                      {profesor.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.profesor_id && (
              <div className="space-y-2">
                <Label>Alumnos *</Label>
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {alumnos.filter(a => a.profesor_id === formData.profesor_id && a.estado !== 'pausado').map((alumno) => (
                    <div
                      key={alumno.id}
                      className={cn(
                        'flex items-center gap-3 p-3 border-b last:border-b-0 cursor-pointer hover:bg-slate-50',
                        formData.alumnos_ids.includes(alumno.id) && 'bg-emerald-50'
                      )}
                    >
                      <Checkbox
                        checked={formData.alumnos_ids.includes(alumno.id)}
                        onCheckedChange={() => {
                          setFormData(prev => ({
                            ...prev,
                            alumnos_ids: prev.alumnos_ids.includes(alumno.id)
                              ? prev.alumnos_ids.filter(id => id !== alumno.id)
                              : [...prev.alumnos_ids, alumno.id]
                          }));
                        }}
                      />
                      <span className="text-sm font-medium">{alumno.nombre}</span>
                    </div>
                  ))}
                </div>
                {formData.alumnos_ids.length === 0 && (
                  <p className="text-xs text-rose-500">Selecciona al menos un alumno</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div>
                <Label className="font-medium text-slate-800">Pagado</Label>
                <p className="text-xs text-slate-500 mt-0.5">Marcar si la clase ya está paga</p>
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
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  placeholder="0"
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
        ) : (
          <>
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
              <Label>Profesor (opcional)</Label>
              <Input
                value={formData.profesor}
                onChange={(e) => setFormData({ ...formData, profesor: e.target.value })}
                placeholder="Nombre del profesor"
              />
            </div>

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
        )}

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
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
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