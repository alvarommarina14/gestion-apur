import React, { useState, useEffect } from 'react';
import { format, addWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
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
import { CheckCircle, CalendarIcon, Trash2, AlertTriangle, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import CancelarCanchaModal from '@/components/agenda/CancelarCanchaModal';

export default function EditarClaseModal({ open, onOpenChange, clase }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({});
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Obtener turno asociado a la clase
  const { data: turnoAsociado } = useQuery({
    queryKey: ['turno-clase', clase?.turno_cancha_id],
    queryFn: () => clase?.turno_cancha_id 
      ? base44.entities.TurnoCancha.read(clase.turno_cancha_id)
      : null,
    enabled: !!clase?.turno_cancha_id,
  });

  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    if (clase) {
      setFormData({
        fecha: clase.fecha ? new Date(clase.fecha) : new Date(),
        hora_inicio: clase.hora_inicio || '09:00',
        duracion: clase.duracion || 50,
        tipo: clase.tipo || 'individual',
        cancha: clase.cancha || '',
        alumnos_ids: clase.alumnos_ids || [],
        precio: clase.precio || '',
        notas: clase.notas || '',
      });
    }
  }, [clase]);

  const alumnosSeleccionados = alumnos.filter(a =>
    formData.alumnos_ids?.includes(a.id)
  );

  const handleToggleAlumno = (alumnoId) => {
    setFormData(prev => ({
      ...prev,
      alumnos_ids: prev.alumnos_ids?.includes(alumnoId)
        ? prev.alumnos_ids.filter(id => id !== alumnoId)
        : [...(prev.alumnos_ids || []), alumnoId]
    }));
  };

  const handleSubmit = async () => {
    if (!clase || !formData.alumnos_ids?.length) return;

    // Solo admin puede editar clases de otros profesores
    if (user?.rol !== 'admin' && clase.profesor_id !== user?.id) {
      alert('No tienes permiso para editar esta clase');
      return;
    }

    setLoading(true);
    try {
      await base44.entities.Clase.update(clase.id, {
        fecha: format(formData.fecha, 'yyyy-MM-dd'),
        hora_inicio: formData.hora_inicio,
        duracion: Number(formData.duracion),
        tipo: formData.tipo,
        cancha: formData.cancha || '',
        alumnos_ids: formData.alumnos_ids,
        alumnos_nombres: alumnosSeleccionados.map(a => a.nombre),
        precio: formData.precio ? Number(formData.precio) : null,
        notas: formData.notas,
      });

      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      console.error('Error editando clase:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (eliminarSerie = false) => {
    if (!clase) return;

    // Solo admin puede eliminar clases de otros profesores
    if (user?.rol !== 'admin' && clase.profesor_id !== user?.id) {
      alert('No tienes permiso para eliminar esta clase');
      return;
    }

    setLoading(true);
    try {
      if (eliminarSerie) {
        // Eliminar toda la serie recurrente
        const todasClases = await base44.entities.Clase.list();
        const clasesRelacionadas = todasClases.filter(c => 
          c.alumnos_ids && clase.alumnos_ids &&
          JSON.stringify(c.alumnos_ids.sort()) === JSON.stringify(clase.alumnos_ids.sort()) &&
          c.hora_inicio === clase.hora_inicio &&
          c.duracion === clase.duracion &&
          new Date(c.fecha).getDay() === new Date(clase.fecha).getDay()
        );

        // Usar Promise.all para paralelizar eliminaciones
        await Promise.all(
          clasesRelacionadas.map(async (claseRel) => {
            try {
              // Eliminar de Google Calendar
              try {
                await base44.functions.invoke('sincronizarClaseGoogleCalendar', { 
                  clase_id: claseRel.id, 
                  action: 'delete' 
                });
              } catch (err) {
                console.error('Error eliminando clase de Google Calendar:', err);
              }

              // Eliminar TurnoCancha asociado si existe
              try {
                const turnosRelacionados = await base44.entities.TurnoCancha.filter({ 
                  fecha: claseRel.fecha,
                  hora_inicio: claseRel.hora_inicio,
                  tipo_turno: 'clase'
                });
                
                for (const turno of turnosRelacionados) {
                  try {
                    await base44.functions.invoke('sincronizarTurnoGoogleCalendar', { 
                      turno_id: turno.id, 
                      action: 'delete' 
                    });
                  } catch (err) {
                    console.error('Error eliminando turno de Google Calendar:', err);
                  }
                  await base44.entities.TurnoCancha.delete(turno.id);
                }
              } catch (err) {
                console.error('Error eliminando turnos:', err);
              }

              // Eliminar la clase
              await base44.entities.Clase.delete(claseRel.id);
            } catch (err) {
              console.error('Error en cadena de eliminación:', err);
            }
          })
        );
      } else {
        // Eliminar solo esta clase
        try {
          await base44.functions.invoke('sincronizarClaseGoogleCalendar', { 
            clase_id: clase.id, 
            action: 'delete' 
          });
        } catch (err) {
          console.error('Error eliminando de Google Calendar:', err);
        }

        try {
          const turnosRelacionados = await base44.entities.TurnoCancha.filter({ 
            fecha: clase.fecha,
            hora_inicio: clase.hora_inicio,
            tipo_turno: 'clase'
          });
          
          for (const turno of turnosRelacionados) {
            try {
              await base44.functions.invoke('sincronizarTurnoGoogleCalendar', { 
                turno_id: turno.id, 
                action: 'delete' 
              });
            } catch (err) {
              console.error('Error eliminando turno de Google Calendar:', err);
            }
            await base44.entities.TurnoCancha.delete(turno.id);
          }
        } catch (err) {
          console.error('Error eliminando turnos:', err);
        }

        await base44.entities.Clase.delete(clase.id);
      }

      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      console.error('Error eliminando clase:', error);
      alert('Error al eliminar: ' + error.message);
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
            <h3 className="text-lg font-semibold text-slate-900">Clase actualizada</h3>
            <p className="text-slate-500 mt-1">Los cambios se guardaron correctamente</p>
            </div>
            </DialogContent>
            </Dialog>

            {turnoAsociado && (
            <CancelarCanchaModal
            open={showCancelModal}
            onOpenChange={setShowCancelModal}
            turno={turnoAsociado}
            onSuccess={() => {
            setShowCancelModal(false);
            queryClient.invalidateQueries({ queryKey: ['cancelaciones-cancha'] });
            }}
            />
            )}
            </>
            );
            }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar clase</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal w-full">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.fecha || new Date(), 'd MMM yyyy', { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.fecha}
                    onSelect={(date) => setFormData(prev => ({ ...prev, fecha: date }))}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Hora</Label>
              <Input
                type="time"
                value={formData.hora_inicio || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, hora_inicio: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duración (minutos)</Label>
              <Select
                value={String(formData.duracion || 50)}
                onValueChange={(value) => setFormData(prev => ({ ...prev, duracion: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 minutos</SelectItem>
                  <SelectItem value="60">60 minutos</SelectItem>
                  <SelectItem value="90">90 minutos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={formData.tipo || 'individual'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value }))}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cancha</Label>
              <Input
                placeholder="Número o nombre"
                value={formData.cancha || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, cancha: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Precio</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.precio || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, precio: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Alumnos</Label>
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {alumnos.map(alumno => (
                <div key={alumno.id} className="flex items-center gap-2">
                  <Checkbox
                    id={alumno.id}
                    checked={formData.alumnos_ids?.includes(alumno.id) || false}
                    onCheckedChange={() => handleToggleAlumno(alumno.id)}
                  />
                  <label
                    htmlFor={alumno.id}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {alumno.nombre}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              placeholder="Observaciones..."
              value={formData.notas || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
           <div className="w-full sm:mr-auto flex flex-col gap-2">
             <Button
               type="button"
               variant="outline"
               onClick={() => {
                 if (confirm('¿Eliminar solo esta clase? La clase se eliminará de Google Calendar.')) {
                   handleDelete(false);
                 }
               }}
               className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 w-full sm:w-auto"
             >
               <Trash2 className="w-4 h-4 mr-2" />
               Eliminar solo este día
             </Button>
             <Button
               type="button"
               variant="outline"
               onClick={() => {
                 if (confirm('¿Eliminar TODA la serie de clases recurrentes (mismo día y horario de todas las semanas)? Se eliminarán todas de Google Calendar.')) {
                   handleDelete(true);
                 }
               }}
               className="text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-300 w-full sm:w-auto"
             >
               <Trash2 className="w-4 h-4 mr-2" />
               Eliminar toda la serie
             </Button>
             {turnoAsociado && (
               <Button
                 type="button"
                 variant="outline"
                 onClick={() => setShowCancelModal(true)}
                 className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200 w-full sm:w-auto"
               >
                 <Zap className="w-4 h-4 mr-2" />
                 Cancelar cancha
               </Button>
             )}
           </div>
           <Button variant="outline" onClick={() => onOpenChange(false)}>
             Cancelar
           </Button>
           <Button
             onClick={handleSubmit}
             disabled={loading || !formData.alumnos_ids?.length}
             className="bg-emerald-600 hover:bg-emerald-700"
           >
             {loading ? 'Guardando...' : 'Guardar cambios'}
           </Button>
         </DialogFooter>
      </DialogContent>
      </Dialog>

      {turnoAsociado && (
      <CancelarCanchaModal
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        turno={turnoAsociado}
        onSuccess={() => {
          setShowCancelModal(false);
          queryClient.invalidateQueries({ queryKey: ['cancelaciones-cancha'] });
        }}
      />
      )}
      </>
      );
      }