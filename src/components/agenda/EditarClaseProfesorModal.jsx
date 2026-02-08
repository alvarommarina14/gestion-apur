import React, { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function EditarClaseProfesorModal({ open, onOpenChange, turno }) {
  const queryClient = useQueryClient();
  const [deleteMode, setDeleteMode] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    if (open) {
      base44.auth.me().then(setUser).catch(console.error);
    }
  }, [open]);

  // Determinar si es una clase o un turno
  const isClase = turno?.alumnos_ids?.length > 0 || turno?.alumnos_nombres?.length > 0;
  const isRecurrente = isClase ? turno?.es_recurrente : turno?.repeticion_semanal;

  const handleEliminarEsteDia = async () => {
    if (!turno) return;
    setIsDeleting(true);

    try {
      if (isClase) {
        // Eliminar de Google Calendar primero
        try {
          await base44.functions.invoke('sincronizarClaseGoogleCalendar', { 
            clase_id: turno.id, 
            action: 'delete' 
          });
        } catch (err) {
          console.error('Error eliminando de Google Calendar:', err);
          // Continuar aunque falle
        }

        // Eliminar TurnoCancha asociado
        const turnosAsociados = await base44.entities.TurnoCancha.filter({
          fecha: turno.fecha,
          hora_inicio: turno.hora_inicio,
          tipo_turno: 'clase'
        });
        
        for (const t of turnosAsociados) {
          try {
            await base44.functions.invoke('sincronizarTurnoGoogleCalendar', { 
              turno_id: t.id, 
              action: 'delete' 
            });
          } catch (err) {
            console.error('Error eliminando turno de Google Calendar:', err);
          }
          await base44.entities.TurnoCancha.delete(t.id);
        }

        // Eliminar la clase
        await base44.entities.Clase.delete(turno.id);
      } else {
        // Eliminar solo este turno
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

      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Error al cancelar:', error);
      alert('Error al cancelar');
    } finally {
      setIsDeleting(false);
      setDeleteMode(null);
    }
  };

  const handleEliminarTodas = async () => {
    if (!turno) return;
    setIsDeleting(true);

    try {
      if (isClase) {
        // Obtener todas las clases
        const todasClases = await base44.entities.Clase.list('-fecha', 1000);
        
        // Determinar criterios de búsqueda
        let clasesAActualizar = [];
        
        if (turno.serie_recurrente_id) {
          clasesAActualizar = todasClases.filter(c => 
            c.serie_recurrente_id === turno.serie_recurrente_id &&
            new Date(c.fecha) >= new Date(turno.fecha)
          );
        } else {
          clasesAActualizar = todasClases.filter(c => {
            const mismoDiaSemana = new Date(c.fecha).getDay() === new Date(turno.fecha).getDay();
            const mismaHora = c.hora_inicio === turno.hora_inicio;
            const mismosAlumnos = c.alumnos_ids && turno.alumnos_ids && 
              c.alumnos_ids.length === turno.alumnos_ids.length &&
              c.alumnos_ids.every(id => turno.alumnos_ids.includes(id));
            const esFuturo = new Date(c.fecha) >= new Date(turno.fecha);
            const esRecurrente = c.es_recurrente || c.recurrencia_tipo;

            return mismoDiaSemana && mismaHora && mismosAlumnos && esFuturo && esRecurrente;
          });
        }

        console.log(`🗑️ Eliminando ${clasesAActualizar.length} clases recurrentes...`);

        // Eliminar de Google Calendar - buscar y eliminar todos los eventos de la serie
        for (const clase of clasesAActualizar) {
          if (clase.gcal_event_id) {
            try {
              await base44.functions.invoke('borrarEventosGoogleCalendar', {
                event_id: clase.gcal_event_id,
                recurringEventId: clase.serie_recurrente_id
              });
            } catch (err) {
              console.error('Error eliminando evento de Google Calendar:', err);
            }
          }
        }

        // Obtener TODOS los turnos para buscar asociados
        const todosTurnos = await base44.entities.TurnoCancha.list('-fecha', 1000);

        // Eliminar clases y sus turnos asociados
        for (const clase of clasesAActualizar) {
          // Buscar turnos asociados a esta clase específica
          const turnosDeClase = todosTurnos.filter(t =>
            t.fecha === clase.fecha &&
            t.hora_inicio === clase.hora_inicio &&
            t.tipo_turno === 'clase'
          );

          // Eliminar cada turno de Google Calendar y BD
          for (const t of turnosDeClase) {
            if (t.gcal_event_id) {
              try {
                await base44.functions.invoke('borrarEventosGoogleCalendar', { 
                  event_id: t.gcal_event_id 
                });
              } catch (err) {
                console.error('Error eliminando turno de GCal:', err);
              }
            }
            try {
              await base44.entities.TurnoCancha.delete(t.id);
              console.log(`✅ Turno ${t.id} eliminado`);
            } catch (err) {
              console.error('Error eliminando TurnoCancha:', err);
            }
          }

          // Eliminar clase
          try {
            await base44.entities.Clase.delete(clase.id);
            console.log(`✅ Clase ${clase.id} eliminada`);
          } catch (err) {
            console.error('Error eliminando clase:', err);
          }
        }
      } else {
        // Para turnos sin clase asociada
        const todosTurnos = await base44.entities.TurnoCancha.list('-fecha', 1000);

        const turnosAActualizar = todosTurnos.filter(t => {
          const mismaCancha = t.cancha === turno.cancha;
          const mismaHora = t.hora_inicio === turno.hora_inicio;
          const mismoCliente = t.cliente === turno.cliente;
          const mismoProfesor = t.profesor === turno.profesor;
          const esRecurrente = t.repeticion_semanal === true;
          const esFuturo = new Date(t.fecha) >= new Date(turno.fecha);
          const mismoDiaSemana = new Date(t.fecha).getDay() === new Date(turno.fecha).getDay();

          return mismaCancha && mismaHora && mismoCliente && mismoProfesor && esRecurrente && esFuturo && mismoDiaSemana;
        });

        console.log(`🗑️ Eliminando ${turnosAActualizar.length} turnos recurrentes...`);

        for (const t of turnosAActualizar) {
          if (t.gcal_event_id) {
            try {
              await base44.functions.invoke('borrarEventosGoogleCalendar', { 
                event_id: t.gcal_event_id 
              });
            } catch (err) {
              console.error('Error eliminando turno de GCal:', err);
            }
          }
          try {
            await base44.entities.TurnoCancha.delete(t.id);
            console.log(`✅ Turno ${t.id} eliminado`);
          } catch (err) {
            console.error('Error eliminando TurnoCancha:', err);
          }
        }
      }

      // Invalidar queries para refrescar la UI
      await queryClient.refetchQueries({ queryKey: ['turnos-cancha'] });
      await queryClient.refetchQueries({ queryKey: ['clases'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('Error al eliminar');
    } finally {
      setIsDeleting(false);
      setDeleteMode(null);
    }
  };

  if (!turno) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Gestionar Clase
          </DialogTitle>
          <DialogDescription>
            {turno.cliente} - {turno.profesor}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Detalles de la clase */}
          <Card className="bg-slate-50">
            <CardContent className="pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Fecha:</span>
                <span className="font-semibold">
                  {format(new Date(turno.fecha), "d 'de' MMMM", { locale: es })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Hora:</span>
                <span className="font-semibold">{turno.hora_inicio}</span>
              </div>
              <div className="flex justify-between">
                 <span className="text-slate-600">{isClase ? 'Tipo de clase' : 'Tipo'}:</span>
                 <span className="font-semibold">{isClase ? turno.tipo : turno.tipo_turno}</span>
               </div>
               {isRecurrente && (
                 <div className="flex justify-between pt-2 border-t">
                   <span className="text-slate-600">Recurrencia:</span>
                   <span className="font-semibold text-blue-600">
                     {isClase 
                       ? (turno.recurrencia_tipo === 'semanal' ? 'Semanal' : 'Quincenal')
                       : 'Semanal'}
                   </span>
                 </div>
               )}
            </CardContent>
          </Card>

          {/* Opciones de eliminación */}
          {deleteMode === null && (
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => setDeleteMode('este-dia')}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Cancelar solo {isClase ? 'esta clase' : 'este turno'}
              </Button>

              {isRecurrente && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  onClick={() => setDeleteMode('todas')}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Cancelar {isClase ? 'esta y todas las futuras' : 'este y todos los futuros'}
                </Button>
              )}
            </div>
          )}

          {/* Confirmación de eliminación */}
          {deleteMode && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
              <div className="flex gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-rose-900">
                    {deleteMode === 'este-dia'
                      ? `¿Cancelar ${isClase ? 'esta clase' : 'este turno'}?`
                      : `¿Cancelar ${isClase ? 'todas las clases' : 'todos los turnos'} futuros?`}
                  </p>
                  <p className="text-sm text-rose-700 mt-1">
                    {deleteMode === 'este-dia'
                      ? `Se cancelará solo ${isClase ? 'la clase' : 'el turno'} del ` +
                        format(new Date(turno.fecha), 'd MMM', { locale: es })
                      : `Se cancelarán ${isClase ? 'todas las clases' : 'todos los turnos'} desde el ${format(
                          new Date(turno.fecha),
                          'd MMM',
                          { locale: es }
                        )} en adelante`}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteMode(null)}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={
                    deleteMode === 'este-dia'
                      ? handleEliminarEsteDia
                      : handleEliminarTodas
                  }
                  disabled={isDeleting}
                  className="flex-1"
                >
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}