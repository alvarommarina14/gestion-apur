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
        // Eliminar clase
        await base44.entities.Clase.update(turno.id, {
          estado: 'cancelada_anticipada',
          cancelado_por: 'profesor',
        });
      } else {
        // Eliminar solo este turno (crear uno nuevo con estado cancelado o eliminar)
        await base44.entities.TurnoCancha.update(turno.id, {
          estado: 'cancelado',
        });
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
        // Obtener todas las clases recurrentes
        const clases = await base44.entities.Clase.filter({
          serie_recurrente_id: turno.serie_recurrente_id,
        });

        const clasesAActualizar = clases.filter(
          c => new Date(c.fecha) >= new Date(turno.fecha)
        );

        await Promise.all(
          clasesAActualizar.map(clase =>
            base44.entities.Clase.update(clase.id, {
              estado: 'cancelada_anticipada',
              cancelado_por: 'profesor',
            })
          )
        );
      } else {
        // Obtener todos los turnos recurrentes
        const turnos = await base44.entities.TurnoCancha.filter({
          cliente: turno.cliente,
          cancha: turno.cancha,
          repeticion_semanal: true,
        });

        const turnosAActualizar = turnos.filter(
          t => new Date(t.fecha) >= new Date(turno.fecha) && t.hora_inicio === turno.hora_inicio
        );

        await Promise.all(
          turnosAActualizar.map(t =>
            base44.entities.TurnoCancha.update(t.id, {
              estado: 'cancelado',
            })
          )
        );
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
                Cancelar solo esta clase
              </Button>

              {turno.es_recurrente && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  onClick={() => setDeleteMode('todas')}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Cancelar esta y todas las futuras
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
                      ? '¿Cancelar esta clase?'
                      : '¿Cancelar todas las clases futuras?'}
                  </p>
                  <p className="text-sm text-rose-700 mt-1">
                    {deleteMode === 'este-dia'
                      ? 'Se cancelará solo la clase del ' +
                        format(new Date(turno.fecha), 'd MMM', { locale: es })
                      : `Se cancelarán todas las clases desde el ${format(
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