import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, Clock, MapPin } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export default function RecordatoriosCanchaHoySection({ onEditarTurno, onEditarRecordatorio, fechaHoy }) {
  const queryClient = useQueryClient();
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: null, id: null });
  const fechaStr = format(fechaHoy, 'yyyy-MM-dd');

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos-hoy', fechaStr],
    queryFn: () => base44.entities.TurnoCancha.filter({ fecha: fechaStr }),
  });

  const { data: clases = [] } = useQuery({
    queryKey: ['clases-hoy', fechaStr],
    queryFn: async () => {
      const allClases = await base44.entities.Clase.list('-hora_inicio', 500);
      return allClases.filter(c => c.fecha === fechaStr);
    },
  });

  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos-list'],
    queryFn: () => base44.entities.Alumno.list('-nombre', 500),
  });

  const { data: recordatorios = [] } = useQuery({
    queryKey: ['recordatorios-hoy', fechaStr],
    queryFn: () => base44.entities.RecordatorioCancha.filter({ fecha: fechaStr }),
  });

  const handleEliminarTurno = async () => {
    if (deleteDialog.type === 'turno') {
      try {
        await base44.entities.TurnoCancha.delete(deleteDialog.id);
        queryClient.invalidateQueries({ queryKey: ['turnos-hoy'] });
        setDeleteDialog({ open: false, type: null, id: null });
      } catch (error) {
        console.error('Error eliminando turno:', error);
      }
    } else if (deleteDialog.type === 'recordatorio') {
      try {
        await base44.entities.RecordatorioCancha.delete(deleteDialog.id);
        queryClient.invalidateQueries({ queryKey: ['recordatorios-hoy'] });
        setDeleteDialog({ open: false, type: null, id: null });
      } catch (error) {
        console.error('Error eliminando recordatorio:', error);
      }
    }
  };

  const getAlumnoInfo = (alumnoId) => {
    return alumnos.find(a => a.id === alumnoId);
  };

  const turnosActivos = turnos.filter(t => t.estado !== 'cancelado');
  const clasesActivas = clases.filter(c => !['cancelada_anticipada', 'cancelada_tarde'].includes(c.estado));

  if (turnosActivos.length === 0 && clasesActivas.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <p className="text-slate-500 text-center py-8">No hay turnos programados para hoy</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Recordatorios Canchas Hoy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Turnos de cancha */}
          {turnosActivos.map(turno => (
            <div
              key={turno.id}
              className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 space-y-3">
                  {/* Header con cancha y horario */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-blue-100 text-blue-800 font-semibold">
                      Cancha {turno.cancha}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Clock className="w-4 h-4" />
                      {turno.hora_inicio} - {turno.hora_fin}
                    </div>
                  </div>

                  {/* Información del turno */}
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-900">{turno.cliente}</p>
                    
                    {/* Tipo de turno */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-600">Tipo:</span>
                      <Badge variant="outline">
                        {turno.tipo_turno === 'clase' ? 'Clase' : 'Alquiler'}
                      </Badge>
                      {turno.tipo_turno === 'alquiler' && turno.modalidad_alquiler && (
                        <Badge variant="outline" className="bg-amber-50">
                          {turno.modalidad_alquiler === 'abono' ? 'Abono' : 'Cancha Suelta'}
                        </Badge>
                      )}
                    </div>

                    {/* Monto */}
                    {turno.monto && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-slate-600">Monto:</span>
                        <span className="font-semibold text-slate-900">
                          ${turno.monto.toFixed(0)}
                        </span>
                        <Badge variant={turno.pagado ? 'default' : 'secondary'}>
                          {turno.pagado ? 'Pagado' : 'Pendiente'}
                        </Badge>
                      </div>
                    )}

                    {/* Profesor si es clase */}
                    {turno.tipo_turno === 'clase' && turno.profesor && (
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Profesor:</span> {turno.profesor}
                      </p>
                    )}
                  </div>
                </div>

                {/* Botones */}
                <div className="flex gap-2 sm:flex-col">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditarTurno(turno)}
                    className="flex-1 sm:flex-none"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 flex-1 sm:flex-none"
                    onClick={() => setDeleteDialog({ open: true, type: 'turno', id: turno.id })}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Clases */}
          {clasesActivas.map(clase => (
            <div
              key={clase.id}
              className="p-4 border-2 border-emerald-200 rounded-lg hover:bg-emerald-50 transition bg-emerald-50/50"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {clase.cancha && (
                      <Badge className="bg-emerald-100 text-emerald-800 font-semibold">
                        Cancha {clase.cancha}
                      </Badge>
                    )}
                    <Badge className="bg-purple-100 text-purple-800 font-semibold">
                      {clase.tipo === 'individual' ? 'Individual' : 'Grupal'}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Clock className="w-4 h-4" />
                      {clase.hora_inicio} - {clase.hora_fin || `${parseInt(clase.hora_inicio) + Math.floor(clase.duracion / 60)}:${String(clase.duracion % 60).padStart(2, '0')}`}
                    </div>
                  </div>

                  {/* Alumnos y precios */}
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-900 text-sm">Integrantes:</p>
                    <div className="space-y-1">
                      {clase.alumnos_ids?.map((alumnoId, idx) => {
                        const alumno = getAlumnoInfo(alumnoId);
                        return (
                          <div key={alumnoId} className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                            <span className="text-sm font-medium text-slate-900">
                              {alumno?.nombre || clase.alumnos_nombres?.[idx] || 'Alumno desconocido'}
                            </span>
                            <span className="text-sm font-semibold text-emerald-700">
                              ${alumno?.precio_mensual?.toFixed(0) || '0'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notas si existen */}
                  {clase.notas && (
                    <p className="text-xs text-slate-600 italic">Nota: {clase.notas}</p>
                  )}
                </div>

                {/* Botones */}
                <div className="flex gap-2 sm:flex-col">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditarTurno(clase)}
                    className="flex-1 sm:flex-none"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Recordatorios de cancha */}
          {recordatorios.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold text-slate-900 mb-3 text-sm">Recordatorios</h3>
              <div className="space-y-2">
                {recordatorios.map(rec => (
                  <div
                    key={rec.id}
                    className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between"
                  >
                    <div className="text-sm">
                      <p className="font-medium text-slate-900">Cancha {rec.cancha} - {rec.hora}</p>
                      <p className="text-slate-600">{rec.cliente}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditarRecordatorio?.(rec)}
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        onClick={() => setDeleteDialog({ open: true, type: 'recordatorio', id: rec.id })}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmación */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, type: null, id: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar {deleteDialog.type === 'turno' ? 'turno' : 'recordatorio'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleEliminarTurno} className="bg-rose-600 hover:bg-rose-700">
            Eliminar
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}