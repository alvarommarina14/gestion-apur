import React, { useState } from 'react';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  XCircle, 
  AlertTriangle,
  CloudRain,
  User,
  Clock,
  CheckCircle,
  CalendarClock,
  Trash2
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const motivoOptions = [
  { 
    value: 'cancelacion_alumno', 
    label: 'Canceló el alumno (con aviso)', 
    icon: User,
    generaRecupero: true,
  },
  { 
    value: 'cancelacion_alumno_tarde', 
    label: 'Canceló el alumno (tarde/-24h)', 
    icon: Clock,
    generaRecupero: false,
  },
  { 
    value: 'cancelacion_profesor', 
    label: 'Canceló el profesor', 
    icon: XCircle,
    generaRecupero: true,
  },
  { 
    value: 'clima', 
    label: 'Clima (lluvia)', 
    icon: CloudRain,
    generaRecupero: true,
  },
  { 
    value: 'reprogramar', 
    label: 'Reprogramar clase', 
    icon: CalendarClock,
    generaRecupero: false,
  },
  { 
    value: 'otro', 
    label: 'Otro motivo', 
    icon: AlertTriangle,
    generaRecupero: false,
  },
];

export default function CancelarClaseModal({ open, onOpenChange, clase }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [notas, setNotas] = useState('');
  const [nuevaFecha, setNuevaFecha] = useState(null);
  const [nuevaHora, setNuevaHora] = useState('');
  const [deleteMode, setDeleteMode] = useState(null); // 'single' o 'series'

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const selectedOption = motivoOptions.find(o => o.value === motivo);

  const handleDeleteSingle = async () => {
    if (!clase) return;
    if (!confirm('¿Eliminar solo esta clase? Se eliminará de Google Calendar.')) return;
    
    setLoading(true);
    try {
      await base44.entities.Clase.delete(clase.id);
      
      // Eliminar de Google Calendar
      try {
        await base44.functions.invoke('sincronizarClaseGoogleCalendar', { 
          clase_id: clase.id, 
          action: 'delete' 
        });
      } catch (err) {
        console.error('Error eliminando de Google Calendar:', err);
      }
      
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
        setDeleteMode(null);
      }, 1500);
    } catch (error) {
      console.error('Error eliminando clase:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSeries = async () => {
    if (!clase || !clase.serie_recurrente_id) return;
    if (!confirm('¿Eliminar TODA la serie de clases recurrentes? Se eliminarán todas de Google Calendar.')) return;
    
    setLoading(true);
    try {
      // Obtener todas las clases de la serie
      const clasesSerieData = await base44.entities.Clase.filter({ 
        serie_recurrente_id: clase.serie_recurrente_id 
      });
      
      // Eliminar cada clase
      for (const c of clasesSerieData) {
        await base44.entities.Clase.delete(c.id);
        
        // Eliminar de Google Calendar
        try {
          await base44.functions.invoke('sincronizarClaseGoogleCalendar', { 
            clase_id: c.id, 
            action: 'delete' 
          });
        } catch (err) {
          console.error('Error eliminando de Google Calendar:', err);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
        setDeleteMode(null);
      }, 1500);
    } catch (error) {
      console.error('Error eliminando serie:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!clase || !motivo) return;
    if (motivo === 'reprogramar' && (!nuevaFecha || !nuevaHora)) return;
    
    // Solo admin puede cancelar (sin restricción para sus propias clases)
    if (user?.rol !== 'admin') {
      alert('Solo administradores pueden cancelar clases');
      return;
    }

    // Confirmar antes de proceder
    const mensajeConfirmacion = motivo === 'reprogramar' 
      ? '¿Confirmar reprogramación de esta clase?'
      : selectedOption?.generaRecupero 
        ? '¿Confirmar cancelación? Se generarán recuperos para los alumnos.'
        : '¿Confirmar cancelación? Esta clase NO generará recupero y se considerará perdida.';
    
    if (!confirm(mensajeConfirmacion)) {
      return;
    }
    
    setLoading(true);
    
    try {
      let nuevoEstado = '';

      // Si es reprogramación, crear nueva clase y marcar la actual como reprogramada
      if (motivo === 'reprogramar') {
        // Crear la nueva clase
        const nuevaClase = await base44.entities.Clase.create({
          fecha: format(nuevaFecha, 'yyyy-MM-dd'),
          hora_inicio: nuevaHora,
          duracion: clase.duracion,
          tipo: clase.tipo,
          sede: clase.sede,
          cancha: clase.cancha,
          alumnos_ids: clase.alumnos_ids,
          alumnos_nombres: clase.alumnos_nombres,
          precio: clase.precio,
          estado: 'programada',
          es_reprogramacion: true,
          clase_original_id: clase.id,
          notas: `Reprogramación de clase del ${clase.fecha} ${clase.hora_inicio}. ${notas}`,
          asistencia_registrada: false,
        });
        
        // Actualizar la clase original
        await base44.entities.Clase.update(clase.id, {
          estado: 'reprogramada',
          clase_reprogramada_id: nuevaClase.id,
          motivo_cancelacion: notas || 'Clase reprogramada',
        });

        nuevoEstado = 'reprogramada';
      } else {
        // Determinar el nuevo estado de la clase
        nuevoEstado = 'cancelada_anticipada';
        if (motivo === 'cancelacion_alumno_tarde') {
          nuevoEstado = 'cancelada_tarde';
        } else if (motivo === 'clima') {
          nuevoEstado = 'suspendida';
        }
        
        // Actualizar la clase
        await base44.entities.Clase.update(clase.id, {
          estado: nuevoEstado,
          motivo_cancelacion: notas || selectedOption?.label,
          cancelado_por: motivo.includes('alumno') ? 'alumno' : motivo === 'clima' ? 'clima' : 'profesor',
        });

        // Si la clase está cancelada, también eliminarla de Google Calendar
        try {
          await base44.functions.invoke('sincronizarClaseGoogleCalendar', { 
            clase_id: clase.id, 
            action: 'delete' 
          });
        } catch (err) {
          console.error('Error eliminando de Google Calendar:', err);
        }
      }
      
      // Si genera recupero y no es reprogramación, crear recuperos para cada alumno
      if (selectedOption?.generaRecupero && motivo !== 'reprogramar') {
        for (let i = 0; i < (clase.alumnos_ids?.length || 0); i++) {
          const alumnoId = clase.alumnos_ids[i];
          const alumnoNombre = clase.alumnos_nombres?.[i] || 'Alumno';
          
          await base44.entities.Recupero.create({
            alumno_id: alumnoId,
            alumno_nombre: alumnoNombre,
            clase_original_id: clase.id,
            fecha_original: clase.fecha,
            motivo: motivo === 'clima' ? 'clima' : motivo.includes('profesor') ? 'cancelacion_profesor' : 'cancelacion_alumno',
            estado: 'pendiente',
            notas: notas,
          });
          
          // Actualizar clases a recuperar del alumno
          const alumnos = await base44.entities.Alumno.filter({ id: alumnoId });
          if (alumnos.length > 0) {
            await base44.entities.Alumno.update(alumnoId, {
              clases_a_recuperar: (alumnos[0].clases_a_recuperar || 0) + 1,
            });
          }
        }
      }
      
      // Actualizar KPIs del mes
      const mesClave = clase.fecha.substring(0, 7); // "YYYY-MM"
      const configuracionMes = await base44.entities.ConfiguracionMes.filter({ mes: mesClave });
      
      if (configuracionMes.length > 0) {
        const config = configuracionMes[0];
        const updates = {};

        if (nuevoEstado === 'cancelada_anticipada' || nuevoEstado === 'cancelada_tarde' || nuevoEstado === 'suspendida') {
          updates.total_clases_canceladas = (config.total_clases_canceladas || 0) + 1;
        }

        if (Object.keys(updates).length > 0) {
          await base44.entities.ConfiguracionMes.update(config.id, updates);
        }
      }

      // Log de auditoría
      await base44.entities.LogAuditoria.create({
        entidad: 'Clase',
        entidad_id: clase.id,
        entidad_nombre: `Clase ${clase.fecha} ${clase.hora_inicio}`,
        accion: 'cambio_estado',
        campo_modificado: 'estado',
        valor_anterior: clase.estado,
        valor_nuevo: nuevoEstado,
        motivo: notas || selectedOption?.label,
        fecha: new Date().toISOString(),
      });
      
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      queryClient.invalidateQueries({ queryKey: ['recuperos'] });
      queryClient.invalidateQueries({ queryKey: ['alumnos'] });
      
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
        setMotivo('');
        setNotas('');
        setNuevaFecha(null);
        setNuevaHora('');
      }, 1500);
      
    } catch (error) {
      console.error('Error cancelando clase:', error);
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
            <h3 className="text-lg font-semibold text-slate-900">
              {deleteMode === 'single' ? 'Clase eliminada' : deleteMode === 'series' ? 'Serie eliminada' : (motivo === 'reprogramar' ? 'Clase reprogramada' : 'Clase cancelada')}
            </h3>
            {deleteMode === 'series' && (
              <p className="text-slate-500 mt-1">Se eliminaron todas las clases de la serie</p>
            )}
            {motivo === 'reprogramar' && (
              <p className="text-slate-500 mt-1">Se creó la nueva clase para {nuevaFecha && format(nuevaFecha, "d 'de' MMM", { locale: es })}</p>
            )}
            {selectedOption?.generaRecupero && motivo !== 'reprogramar' && (
              <p className="text-slate-500 mt-1">Se generaron recuperos para los alumnos</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Vista de eliminación
  if (deleteMode) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="w-5 h-5" />
              Eliminar clase
            </DialogTitle>
            <DialogDescription>
              {clase?.fecha && format(new Date(clase.fecha), "EEEE d 'de' MMMM", { locale: es })} - {clase?.hora_inicio}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {deleteMode === 'single' && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <p className="text-sm text-rose-700">Se eliminará solo esta clase individual de Google Calendar.</p>
              </div>
            )}
            {deleteMode === 'series' && clase?.serie_recurrente_id && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <p className="text-sm text-rose-700">Se eliminarán TODAS las clases de esta serie recurrente de Google Calendar.</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteMode(null)}>
              Volver
            </Button>
            <Button 
              onClick={deleteMode === 'single' ? handleDeleteSingle : handleDeleteSeries}
              disabled={loading}
              variant="destructive"
            >
              {loading ? 'Eliminando...' : 'Confirmar eliminación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <XCircle className="w-5 h-5" />
            Cancelar clase
          </DialogTitle>
          <DialogDescription>
            {clase?.fecha && format(new Date(clase.fecha), "EEEE d 'de' MMMM", { locale: es })} - {clase?.hora_inicio}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Motivo de cancelación</Label>
            <div className="grid grid-cols-1 gap-2">
              {motivoOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = motivo === option.value;
                
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMotivo(option.value)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left',
                      isSelected 
                        ? 'border-rose-500 bg-rose-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <Icon className={cn(
                      'w-5 h-5',
                      isSelected ? 'text-rose-600' : 'text-slate-400'
                    )} />
                    <div className="flex-1">
                      <span className={cn(
                        'text-sm font-medium',
                        isSelected ? 'text-rose-700' : 'text-slate-700'
                      )}>
                        {option.label}
                      </span>
                      {option.generaRecupero && (
                        <span className="ml-2 text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          Genera recupero
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Si es reprogramación, mostrar selector de nueva fecha */}
          {motivo === 'reprogramar' && (
            <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Label className="text-blue-900 font-medium">Nueva fecha y hora</Label>
              <div className="grid grid-cols-2 gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarClock className="mr-2 h-4 w-4" />
                      {nuevaFecha ? format(nuevaFecha, "d 'de' MMM", { locale: es }) : 'Seleccionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={nuevaFecha}
                      onSelect={setNuevaFecha}
                      locale={es}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
                
                <Input
                  type="time"
                  value={nuevaHora}
                  onChange={(e) => setNuevaHora(e.target.value)}
                  placeholder="Hora"
                />
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalle del motivo..."
              rows={2}
            />
          </div>
          
          {selectedOption && !selectedOption.generaRecupero && motivo !== 'reprogramar' && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
              <p className="text-amber-700">
                Esta cancelación <strong>no genera recupero</strong>. La clase se considera perdida.
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="w-full sm:mr-auto flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteMode('single')}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar solo este día
            </Button>
            {clase?.serie_recurrente_id && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteMode('series')}
                className="text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-300 w-full sm:w-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar toda la serie
              </Button>
            )}
          </div>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Volver
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={
              loading || 
              !motivo || 
              (motivo === 'reprogramar' && (!nuevaFecha || !nuevaHora))
            }
            variant={motivo === 'reprogramar' ? 'default' : 'destructive'}
            className={motivo === 'reprogramar' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            {loading 
              ? (motivo === 'reprogramar' ? 'Reprogramando...' : 'Cancelando...') 
              : (motivo === 'reprogramar' ? 'Confirmar reprogramación' : 'Confirmar cancelación')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}