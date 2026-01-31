import React, { useState, useEffect } from 'react';
import { format, addDays, addWeeks, addMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';
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
  
  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
  });
  
  const alumnosActivos = alumnos.filter(a => a.estado !== 'pausado');
  
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const [formData, setFormData] = useState({
    fecha: new Date(),
    hora_inicio: '09:00',
    duracion: 50,
    tipo: 'individual',
    sede: '',
    cancha: '',
    alumnos_ids: recupero ? [recupero.alumno_id] : [],
    precio: '',
    pagado: false,
    notas: '',
    repeticion_semanal: false,
    es_recupero: !!recupero,
    clase_original_id: recupero?.clase_original_id || '',
    es_recurrente: false,
    recurrencia_tipo: 'semanal',
    recurrencia_cantidad: 4,
  });

  useEffect(() => {
    if (recupero) {
      setFormData(prev => ({
        ...prev,
        alumnos_ids: [recupero.alumno_id],
        es_recupero: true,
        clase_original_id: recupero.clase_original_id,
        notas: `Recupero de clase del ${recupero.fecha_original}`,
      }));
    }
  }, [recupero]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.alumnos_ids.length === 0) {
      return;
    }
    
    setLoading(true);
    
    try {
      const alumnosSeleccionados = alumnosActivos.filter(a => formData.alumnos_ids.includes(a.id));
      
      // Si es recurrente, crear múltiples clases
      if (formData.es_recurrente && !recupero) {
        const serieId = uuidv4();
        const clases = [];
        const cantidadSemanas = formData.recurrencia_tipo === 'semanal' ? 1 : 2;
        
        for (let i = 0; i < formData.recurrencia_cantidad; i++) {
          const fechaClase = addWeeks(formData.fecha, i * cantidadSemanas);
          clases.push({
            fecha: format(fechaClase, 'yyyy-MM-dd'),
            hora_inicio: formData.hora_inicio,
            duracion: Number(formData.duracion),
            tipo: formData.tipo,
            sede: formData.sede,
            cancha: formData.cancha,
            alumnos_ids: formData.alumnos_ids,
            alumnos_nombres: alumnosSeleccionados.map(a => a.nombre),
            precio: formData.precio ? Number(formData.precio) : null,
            estado: 'programada',
            es_recupero: false,
            es_recurrente: true,
            recurrencia_tipo: formData.recurrencia_tipo,
            serie_recurrente_id: serieId,
            notas: formData.notas,
            asistencia_registrada: false,
          });
        }
        
        // Crear todas las clases
        await Promise.all(clases.map(clase => base44.entities.Clase.create({
          ...clase,
          profesor_id: user?.id,
          estado_aprobacion: user?.rol === 'profesor' ? 'pendiente' : 'aprobada',
          estado: 'programada',
        })));
      } else {
        // Crear clase única
        await base44.entities.Clase.create({
          fecha: format(formData.fecha, 'yyyy-MM-dd'),
          hora_inicio: formData.hora_inicio,
          duracion: Number(formData.duracion),
          tipo: formData.tipo,
          sede: formData.sede,
          cancha: formData.cancha,
          alumnos_ids: formData.alumnos_ids,
          alumnos_nombres: alumnosSeleccionados.map(a => a.nombre),
          precio: formData.precio ? Number(formData.precio) : null,
          estado: 'programada',
          es_recupero: formData.es_recupero,
          clase_original_id: formData.clase_original_id,
          notas: formData.notas,
          asistencia_registrada: false,
          profesor_id: user?.id,
          estado_aprobacion: user?.rol === 'profesor' ? 'pendiente' : 'aprobada',
        });
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
      queryClient.invalidateQueries({ queryKey: ['recuperos'] });
      queryClient.invalidateQueries({ queryKey: ['alumnos'] });
      
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
        setFormData({
          fecha: new Date(),
          hora_inicio: '09:00',
          duracion: 50,
          tipo: 'individual',
          sede: '',
          cancha: '',
          alumnos_ids: [],
          precio: '',
          pagado: false,
          notas: '',
          repeticion_semanal: false,
          es_recupero: false,
          clase_original_id: '',
          es_recurrente: false,
          recurrencia_tipo: 'semanal',
          recurrencia_cantidad: 4,
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
                    onSelect={(date) => date && setFormData({ ...formData, fecha: date })}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>Hora inicio</Label>
              <Input
                type="time"
                value={formData.hora_inicio}
                onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                required
              />
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
            
            <div className="space-y-2">
              <Label>Cancha</Label>
              <Select
                value={formData.cancha}
                onValueChange={(v) => setFormData({ ...formData, cancha: v })}
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
          
          {/* Selección de alumnos */}
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
                  onClick={() => !recupero && handleAlumnoToggle(alumno.id)}
                >
                  <Checkbox
                    checked={formData.alumnos_ids.includes(alumno.id)}
                    disabled={!!recupero}
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
          
          {/* Recurrencia - Solo si no es recupero */}
          {!recupero && (
            <div className="space-y-3 p-4 border rounded-lg bg-slate-50">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.es_recurrente}
                  onCheckedChange={(checked) => setFormData({ ...formData, es_recurrente: checked })}
                  id="es_recurrente"
                />
                <Label htmlFor="es_recurrente" className="font-medium cursor-pointer">
                  Clase recurrente
                </Label>
              </div>
              
              {formData.es_recurrente && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div className="space-y-2">
                    <Label className="text-xs">Frecuencia</Label>
                    <Select
                      value={formData.recurrencia_tipo}
                      onValueChange={(v) => setFormData({ ...formData, recurrencia_tipo: v })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="quincenal">Quincenal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Cantidad</Label>
                    <Input
                      type="number"
                      min="2"
                      max="20"
                      value={formData.recurrencia_cantidad}
                      onChange={(e) => setFormData({ ...formData, recurrencia_cantidad: Number(e.target.value) })}
                      className="h-9"
                    />
                  </div>
                  
                  <p className="text-xs text-slate-500 col-span-2">
                    Se crearán {formData.recurrencia_cantidad} clases {formData.recurrencia_tipo === 'semanal' ? 'semanales' : 'quincenales'}
                  </p>
                </div>
              )}
            </div>
          )}
          
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