import React, { useState, useEffect } from 'react';
import { format, addDays, addWeeks, addMinutes, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon, Plus, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

export default function NuevaClaseModal({ open, onOpenChange, recupero = null }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState(() => ({
    fecha: new Date(),
    hora_inicio: '09:00',
    duracion: 50,
    tipo: 'individual',
    sede: '',
    cancha: '',
    profesor_id: '',
    alumnos_ids: recupero ? [recupero.alumno_id] : [],
    precio: '',
    pagado: false,
    notas: recupero ? `Recupero de clase del ${recupero.fecha_original}` : '',
    repeticion_semanal: false,
    es_recupero: !!recupero,
    clase_original_id: recupero?.clase_original_id || '',
    es_recurrente: false,
    recurrencia_tipo: 'semanal',
    recurrencia_cantidad: 4,
  }));

  const { data: alumnos = [], isLoading: loadingAlumnos } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list('-nombre', 500),
  });
  
  const { data: profesores = [] } = useQuery({
    queryKey: ['profesores'],
    queryFn: () => base44.entities.Profesor.list(),
  });
  
  const alumnosActivos = alumnos.filter(a => a.estado !== 'pausado');
  
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        profesor_id: '',
        alumnos_ids: recupero ? [recupero.alumno_id] : [],
        es_recupero: !!recupero,
        clase_original_id: recupero?.clase_original_id || '',
        notas: recupero ? `Recupero de clase del ${recupero.fecha_original}` : '',
        fecha: new Date(),
      }));
    }
  }, [open]);

  const calcularHoraFin = (horaInicio, duracion) => {
    if (!horaInicio) return '00:00';
    const [h, m] = horaInicio.split(':').map(Number);
    const inicio = new Date();
    inicio.setHours(h, m, 0);
    const fin = addMinutes(inicio, duracion);
    return format(fin, 'HH:mm');
  };

  const handleAlumnoToggle = (alumnoId) => {
    setFormData(prev => {
      const isSelected = prev.alumnos_ids.includes(alumnoId);
      
      if (prev.tipo === 'individual') {
        // Individual: solo puede haber 1 alumno
        return {
          ...prev,
          alumnos_ids: isSelected ? [] : [alumnoId]
        };
      } else {
        // Grupal: puede haber múltiples
        return {
          ...prev,
          alumnos_ids: isSelected
            ? prev.alumnos_ids.filter(id => id !== alumnoId)
            : [...prev.alumnos_ids, alumnoId]
        };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.alumnos_ids.length === 0) {
      return;
    }
    
    setLoading(true);
    
    try {
      const alumnosSeleccionados = alumnosActivos.filter(a => formData.alumnos_ids.includes(a.id));
      const alumnosNombres = alumnosSeleccionados.map(a => a.nombre);
      
      // Si es recurrente, llamar función backend para crear 52 clases en paralelo
      if (formData.repeticion_semanal) {
        await base44.functions.invoke('crearClasesRecurrentes', {
          fecha: format(formData.fecha, 'yyyy-MM-dd'),
          hora_inicio: formData.hora_inicio,
          duracion: formData.duracion,
          tipo: formData.tipo,
          cancha: formData.cancha,
          alumnos_ids: formData.alumnos_ids,
          alumnos_nombres: alumnosNombres,
          precio: formData.precio,
          pagado: formData.pagado,
          notas: formData.notas,
          es_recupero: formData.es_recupero,
          clase_original_id: formData.clase_original_id,
          sincronizar_calendar: user?.rol === 'admin',
        });
      } else {
        // Crear una sola clase sin repetición
        const horaFin = calcularHoraFin(formData.hora_inicio, formData.duracion);
        
        const claseData = {
          fecha: format(formData.fecha, 'yyyy-MM-dd'),
          hora_inicio: formData.hora_inicio,
          duracion: Number(formData.duracion),
          tipo: formData.tipo,
          sede: 'Sistema',
          cancha: formData.cancha || '',
          alumnos_ids: formData.alumnos_ids,
          alumnos_nombres: alumnosNombres,
          precio: formData.precio ? Number(formData.precio) : null,
          estado: 'programada',
          es_recupero: formData.es_recupero,
          clase_original_id: formData.clase_original_id,
          notas: formData.notas,
          asistencia_registrada: false,
          profesor_id: user?.id,
          estado_aprobacion: user?.rol === 'profesor' ? 'pendiente' : 'aprobada',
        };

        const claseCreada = await base44.entities.Clase.create(claseData);

        // Crear TurnoCancha solo si se especificó una cancha
        if (formData.cancha) {
          try {
            const empleados = await base44.entities.User.list();
            const empleadosIds = empleados.map(e => e.id);
            const empleadosEmails = empleados.map(e => e.email);
            const empleadosNombres = empleados.map(e => e.full_name);

            await base44.entities.TurnoCancha.create({
              fecha: format(formData.fecha, 'yyyy-MM-dd'),
              hora_inicio: formData.hora_inicio,
              hora_fin: horaFin,
              duracion: Number(formData.duracion),
              cancha: formData.cancha,
              cliente: alumnosNombres.join(', ') || 'Clase',
              tipo_turno: 'clase',
              monto: formData.precio ? Number(formData.precio) : 0,
              pagado: formData.pagado,
              empleados_asignados_ids: empleadosIds,
              empleados_asignados_emails: empleadosEmails,
              empleados_asignados_nombres: empleadosNombres,
              estado: 'activo',
              notas: formData.notas || `Clase - ${alumnosNombres.join(', ')}`,
            });
          } catch (err) {
            console.error('Error creando TurnoCancha:', err);
          }
        }

        // Sincronizar con Google Calendar
        try {
          await base44.functions.invoke('sincronizarClaseGoogleCalendar', { clase_id: claseCreada.id });
        } catch (err) {
          console.error('Error sincronizando con Google Calendar:', err);
        }
      }
      
      // Si es recupero, actualizar el estado del recupero
      if (recupero) {
        await base44.entities.Recupero.update(recupero.id, {
          estado: 'programado',
          fecha_programada: format(formData.fecha, 'yyyy-MM-dd'),
        });
        
        // Actualizar clases a recuperar del alumno
        const alumno = alumnosActivos.find(a => a.id === recupero.alumno_id);
        if (alumno) {
          await base44.entities.Alumno.update(recupero.alumno_id, {
            clases_a_recuperar: Math.max(0, (alumno.clases_a_recuperar || 1) - 1),
          });
        }
      }
      
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      queryClient.invalidateQueries({ queryKey: ['mis-clases'] });
      queryClient.invalidateQueries({ queryKey: ['clases-profesor'] });
      queryClient.invalidateQueries({ queryKey: ['recuperos'] });
      queryClient.invalidateQueries({ queryKey: ['alumnos'] });
      queryClient.invalidateQueries({ queryKey: ['clases-pendientes'] });
      
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
        setFormData({
          fecha: new Date(),
          hora_inicio: '09:00',
          duracion: 50,
          tipo: 'individual',
          cancha: '',
          profesor_id: '',
          alumnos_ids: [],
          precio: '',
          pagado: false,
          notas: '',
          repeticion_semanal: false,
          es_recupero: false,
          clase_original_id: '',
        });
      }, 1500);
      
    } catch (error) {
      console.error('Error creando clase:', error);
    } finally {
      setLoading(false);
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
            <h3 className="text-lg font-semibold text-slate-900">¡Clase programada!</h3>
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
            <Plus className="w-5 h-5" />
            {recupero ? 'Programar recupero' : 'Nueva clase'}
          </DialogTitle>
          <DialogDescription>
            Completa los datos para crear una nueva clase
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.fecha, "d 'de' MMM", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                   <Calendar
                     mode="single"
                     selected={formData.fecha}
                     onSelect={(date) => date && setFormData(prev => ({ ...prev, fecha: date }))}
                     locale={es}
                   />
                 </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>Hora inicio</Label>
              <Select
                 value={formData.hora_inicio}
                 onValueChange={(v) => setFormData(prev => ({ ...prev, hora_inicio: v }))}
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
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duración</Label>
              <Select
                 value={formData.duracion.toString()}
                 onValueChange={(v) => setFormData(prev => ({ ...prev, duracion: Number(v) }))}
               >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 min</SelectItem>
                  <SelectItem value="80">80 min</SelectItem>
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
                 onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v, alumnos_ids: [] }))}
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
            
            <div className="space-y-2">
              <Label>Cancha</Label>
              <Select
                 value={formData.cancha}
                 onValueChange={(v) => setFormData(prev => ({ ...prev, cancha: v }))}
               >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Sin cancha asignada</SelectItem>
                  <SelectItem value="1">Cancha 1</SelectItem>
                  <SelectItem value="2">Cancha 2</SelectItem>
                  <SelectItem value="3">Cancha 3</SelectItem>
                  <SelectItem value="4">Cancha 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Profesor</Label>
            <Select
               value={formData.profesor_id}
               onValueChange={(v) => setFormData(prev => ({ ...prev, profesor_id: v, alumnos_ids: [] }))}
             >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar profesor" />
              </SelectTrigger>
              <SelectContent>
                {profesores.filter(p => p.activo).map(profesor => (
                  <SelectItem key={profesor.id} value={profesor.id}>
                    {profesor.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Selección de alumnos */}
           <div className="space-y-2">
             <Label>
               {formData.tipo === 'individual' ? 'Alumno' : 'Alumnos'}
               <span className="text-rose-500 ml-1">*</span>
             </Label>
             {loadingAlumnos ? (
              <p className="text-xs text-slate-500 p-3 bg-slate-50 rounded-lg border border-slate-200">
                Cargando alumnos...
              </p>
            ) : alumnosActivos.length === 0 ? (
              <p className="text-xs text-slate-500 p-3 bg-slate-50 rounded-lg border border-slate-200">
                Este profesor no tiene alumnos activos
              </p>
            ) : alumnosActivos.length === 0 ? (
               <p className="text-xs text-slate-500 p-3 bg-slate-50 rounded-lg border border-slate-200">
                 No hay alumnos creados
               </p>
             ) : (
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
                        disabled={!!recupero}
                        onCheckedChange={() => !recupero && handleAlumnoToggle(alumno.id)}
                      />
                      <span className="text-sm font-medium">{alumno.nombre}</span>
                    </div>
                  ))}
              </div>
            )}
            {formData.alumnos_ids.length === 0 && alumnosActivos.length > 0 && (
              <p className="text-xs text-rose-500">Selecciona al menos un alumno</p>
            )}
          </div>
          
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
                setFormData(prev => ({ ...prev, repeticion_semanal: checked }))
              }
            />
          </div>
          
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={formData.notas}
              onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
              placeholder="Observaciones..."
              rows={2}
            />
          </div>
          

          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || formData.alumnos_ids.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? 'Guardando...' : recupero ? 'Programar recupero' : 'Crear clase'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}