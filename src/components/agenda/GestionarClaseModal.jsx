import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

export default function GestionarClaseModal({ isOpen, onClose, clase }) {
  const [expandedAlumno, setExpandedAlumno] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [mostrarMotivoAlumno, setMostrarMotivoAlumno] = useState(null);
  const queryClient = useQueryClient();

  const eliminarSerieMutation = useMutation({
    mutationFn: async () => {
      if (!clase.serie_recurrente_id) {
        throw new Error('Esta clase no es recurrente');
      }

      // Obtener todas las clases de la serie
      const clases = await base44.entities.Clase.filter({
        serie_recurrente_id: clase.serie_recurrente_id
      });

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      // Borrar solo las futuras
      for (const c of clases) {
        const fechaClase = new Date(c.fecha);
        fechaClase.setHours(0, 0, 0, 0);
        if (fechaClase > hoy) {
          // Borrar turno asociado si existe
          if (c.turno_cancha_id) {
            await base44.entities.TurnoCancha.delete(c.turno_cancha_id);
          }
          // Borrar clase
          await base44.entities.Clase.delete(c.id);
        }
      }
    },
    onSuccess: () => {
      toast.success('Serie de clases eliminada');
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      queryClient.invalidateQueries({ queryKey: ['turnos'] });
      onClose();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const pierdeClaseMutation = useMutation({
    mutationFn: async (alumnoId) => {
      await base44.entities.Asistencia.create({
        clase_id: clase.id,
        alumno_id: alumnoId,
        alumno_nombre: clase.alumnos_nombres?.find((_, i) => clase.alumnos_ids[i] === alumnoId) || '',
        fecha: clase.fecha,
        estado: 'ausente_sin_aviso',
        genera_recupero: false
      });
    },
    onSuccess: () => {
      toast.success('Asistencia registrada');
      queryClient.invalidateQueries({ queryKey: ['asistencia'] });
      setExpandedAlumno(null);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const recuperaClaseMutation = useMutation({
    mutationFn: async ({ alumnoId, motivo: motivoSel }) => {
      if (!motivoSel) {
        throw new Error('Selecciona un motivo');
      }

      // Crear Recupero
      const alumnoNombre = clase.alumnos_nombres?.find((_, i) => clase.alumnos_ids[i] === alumnoId) || '';
      await base44.entities.Recupero.create({
        alumno_id: alumnoId,
        alumno_nombre: alumnoNombre,
        clase_original_id: clase.id,
        fecha_original: clase.fecha,
        motivo: motivoSel,
        estado: 'pendiente'
      });

      // Crear Asistencia
      await base44.entities.Asistencia.create({
        clase_id: clase.id,
        alumno_id: alumnoId,
        alumno_nombre: alumnoNombre,
        fecha: clase.fecha,
        estado: 'ausente_con_aviso',
        genera_recupero: true
      });
    },
    onSuccess: () => {
      toast.success('Recupero creado');
      queryClient.invalidateQueries({ queryKey: ['recuperos'] });
      queryClient.invalidateQueries({ queryKey: ['asistencia'] });
      setExpandedAlumno(null);
      setMostrarMotivoAlumno(null);
      setMotivo('');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const registraAsistenciaMutation = useMutation({
    mutationFn: async (alumnoId) => {
      const alumnoNombre = clase.alumnos_nombres?.find((_, i) => clase.alumnos_ids[i] === alumnoId) || '';
      await base44.entities.Asistencia.create({
        clase_id: clase.id,
        alumno_id: alumnoId,
        alumno_nombre: alumnoNombre,
        fecha: clase.fecha,
        estado: 'presente'
      });
    },
    onSuccess: () => {
      toast.success('Asistencia registrada');
      queryClient.invalidateQueries({ queryKey: ['asistencia'] });
      setExpandedAlumno(null);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const liberarCanchaMutation = useMutation({
    mutationFn: async () => {
      // Crear recupero para cada alumno
      for (let i = 0; i < clase.alumnos_ids.length; i++) {
        const alumnoId = clase.alumnos_ids[i];
        const alumnoNombre = clase.alumnos_nombres[i];
        
        // Crear Recupero
        await base44.entities.Recupero.create({
          alumno_id: alumnoId,
          alumno_nombre: alumnoNombre,
          clase_original_id: clase.id,
          fecha_original: clase.fecha,
          motivo: 'otro',
          estado: 'pendiente'
        });

        // Crear Asistencia con aviso
        await base44.entities.Asistencia.create({
          clase_id: clase.id,
          alumno_id: alumnoId,
          alumno_nombre: alumnoNombre,
          fecha: clase.fecha,
          estado: 'ausente_con_aviso',
          genera_recupero: true
        });
      }

      // Eliminar turno de cancha si existe
      if (clase.turno_cancha_id) {
        await base44.entities.TurnoCancha.delete(clase.turno_cancha_id);
      }

      // Cancelar la clase
      await base44.entities.Clase.update(clase.id, {
        estado: 'cancelada_anticipada',
        cancelado_por: 'otro'
      });
    },
    onSuccess: () => {
      toast.success('Cancha liberada y recuperos creados para todos los alumnos');
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      queryClient.invalidateQueries({ queryKey: ['turnos'] });
      queryClient.invalidateQueries({ queryKey: ['recuperos'] });
      queryClient.invalidateQueries({ queryKey: ['asistencia'] });
      onClose();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  if (!clase) return null;

  const motivos = [
    { value: 'cancelacion_alumno', label: 'Cancelación alumno' },
    { value: 'cancelacion_profesor', label: 'Cancelación profesor' },
    { value: 'clima', label: 'Clima' },
    { value: 'otro', label: 'Otro' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestionar Clase - {format(new Date(clase.fecha), 'dd/MM/yyyy HH:mm')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Eliminar Serie */}
          {clase.serie_recurrente_id && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-sm font-medium text-rose-700 mb-3">⚠️ Esta es una clase recurrente</p>
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm('Eliminar todas las clases futuras de esta serie?')) {
                    eliminarSerieMutation.mutate();
                  }
                }}
                disabled={eliminarSerieMutation.isPending}
              >
                {eliminarSerieMutation.isPending ? 'Eliminando...' : 'Eliminar toda la serie'}
              </Button>
            </div>
          )}

          {/* Gestionar Alumnos */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-3">Gestionar Alumnos ({clase.alumnos_nombres?.length || 0})</h3>
            <div className="space-y-2">
              {clase.alumnos_nombres?.map((nombre, idx) => {
                const alumnoId = clase.alumnos_ids[idx];
                const isExpanded = expandedAlumno === alumnoId;

                return (
                  <div key={alumnoId} className="border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedAlumno(isExpanded ? null : alumnoId)}
                      className="w-full p-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between font-medium text-sm text-slate-700"
                    >
                      <span>{nombre}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {isExpanded && (
                      <div className="p-4 bg-white space-y-3 border-t border-slate-200">
                        {/* Pierde Clase */}
                        <Button
                          variant="outline"
                          className="w-full text-sm justify-start"
                          onClick={() => pierdeClaseMutation.mutate(alumnoId)}
                          disabled={pierdeClaseMutation.isPending}
                        >
                          {pierdeClaseMutation.isPending ? 'Registrando...' : '❌ Pierde clase (<24hs)'}
                        </Button>

                        {/* Recupera Clase */}
                        {mostrarMotivoAlumno === alumnoId ? (
                          <div className="space-y-2">
                            <Select value={motivo} onValueChange={setMotivo}>
                              <SelectTrigger className="text-sm">
                                <SelectValue placeholder="Selecciona motivo..." />
                              </SelectTrigger>
                              <SelectContent>
                                {motivos.map(m => (
                                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                onClick={() => recuperaClaseMutation.mutate({ alumnoId, motivo })}
                                disabled={recuperaClaseMutation.isPending || !motivo}
                              >
                                {recuperaClaseMutation.isPending ? 'Creando...' : 'Confirmar'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  setMostrarMotivoAlumno(null);
                                  setMotivo('');
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            className="w-full text-sm justify-start"
                            onClick={() => setMostrarMotivoAlumno(alumnoId)}
                          >
                            🔄 Recupera clase (>24hs)
                          </Button>
                        )}

                        {/* Registrar Asistencia */}
                        <Button
                          variant="outline"
                          className="w-full text-sm justify-start"
                          onClick={() => registraAsistenciaMutation.mutate(alumnoId)}
                          disabled={registraAsistenciaMutation.isPending}
                        >
                          {registraAsistenciaMutation.isPending ? 'Registrando...' : '✅ Registrar asistencia'}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <Button variant="outline" onClick={onClose} className="w-full mt-4">
          Cerrar
        </Button>
      </DialogContent>
    </Dialog>
  );
}