import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ChevronDown, ChevronUp, Edit2, Plus, Trash2, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ClasesAlumnosSection({ profesor }) {
  const queryClient = useQueryClient();
  const [expandedClase, setExpandedClase] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [claseEditando, setClaseEditando] = useState(null);
  const [formClase, setFormClase] = useState({
    hora_inicio: '',
    sede: '',
    cancha: '',
    notas: '',
  });
  const [agregarAlumnoModal, setAgregarAlumnoModal] = useState(false);
  const [alumnoSeleccionadoAgregar, setAlumnoSeleccionadoAgregar] = useState('');
  const [alumnoEliminar, setAlumnoEliminar] = useState(null);
  const [claseEliminar, setClaseEliminar] = useState(null);

  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
  });

  const { data: clases = [] } = useQuery({
    queryKey: ['clases'],
    queryFn: () => base44.entities.Clase.list(),
  });

  const alumnosProfesor = alumnos.filter(a => a.profesor_id === profesor?.id);
  const alumnosIds = alumnosProfesor.map(a => a.id);
  
  // Obtener clases grupales únicas (sin duplicar por recurrencia)
  const clasesGrupalesUnicas = clases
    .filter(c => c.tipo === 'grupal' && c.alumnos_ids?.some(id => alumnosIds.includes(id)))
    .reduce((acc, clase) => {
      const existente = acc.find(c => 
        c.hora_inicio === clase.hora_inicio && 
        c.sede === clase.sede && 
        c.cancha === clase.cancha
      );
      if (!existente) {
        acc.push(clase);
      }
      return acc;
    }, [])
    .sort((a, b) => {
      const timeA = a.hora_inicio.split(':');
      const timeB = b.hora_inicio.split(':');
      return parseInt(timeA[0]) - parseInt(timeB[0]) || parseInt(timeA[1]) - parseInt(timeB[1]);
    });

  const editarClaseMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Clase.update(claseEditando.id, {
        hora_inicio: data.hora_inicio,
        sede: data.sede,
        cancha: data.cancha,
        notas: data.notas,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      setEditModal(false);
      setClaseEditando(null);
    },
  });

  const agregarAlumnoMutation = useMutation({
    mutationFn: async (alumnoId) => {
      const alumnosActuales = claseEditando.alumnos_ids || [];
      const nombresActuales = claseEditando.alumnos_nombres || [];
      const alumno = alumnos.find(a => a.id === alumnoId);
      
      await base44.entities.Clase.update(claseEditando.id, {
        alumnos_ids: [...alumnosActuales, alumnoId],
        alumnos_nombres: [...nombresActuales, alumno.nombre],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      setAlumnoSeleccionadoAgregar('');
      setAgregarAlumnoModal(false);
      setClaseEditando(null);
    },
  });

  const eliminarAlumnoMutation = useMutation({
    mutationFn: async (alumnoId) => {
      const alumnosActuales = claseEditando.alumnos_ids.filter(id => id !== alumnoId);
      const nombresActuales = claseEditando.alumnos_nombres.filter((_, i) => claseEditando.alumnos_ids[i] !== alumnoId);
      
      await base44.entities.Clase.update(claseEditando.id, {
        alumnos_ids: alumnosActuales,
        alumnos_nombres: nombresActuales,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      setAlumnoEliminar(null);
      setClaseEditando(null);
    },
  });

  const eliminarClaseMutation = useMutation({
    mutationFn: async (claseId) => {
      try {
        const claseAEliminar = clases.find(c => c.id === claseId);
        
        if (!claseAEliminar) {
          throw new Error('Clase no encontrada');
        }

        // Si la clase es parte de una serie recurrente, eliminar todas las del grupo
        if (claseAEliminar.serie_recurrente_id) {
          const clasesDelGrupo = clases.filter(c => c.serie_recurrente_id === claseAEliminar.serie_recurrente_id);
          
          // Eliminar todas las clases del grupo en paralelo
          await Promise.all(
            clasesDelGrupo.map(c => base44.entities.Clase.delete(c.id))
          );
        } else {
          // Eliminar clase única
          await base44.entities.Clase.delete(claseId);
        }
      } catch (error) {
        console.error('Error eliminando clase:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      setClaseEliminar(null);
      setEditModal(false);
      setClaseEditando(null);
      setExpandedClase(null);
    },
    onError: (error) => {
      console.error('Fallo al eliminar clase:', error);
      alert('Error al eliminar la clase. Intenta de nuevo o contacta soporte.');
    },
  });

  const handleAbrirEditModal = (clase) => {
    setClaseEditando(clase);
    setFormClase({
      hora_inicio: clase.hora_inicio,
      sede: clase.sede,
      cancha: clase.cancha,
      notas: clase.notas || '',
    });
    setEditModal(true);
  };

  const handleGuardarClase = async () => {
    await editarClaseMutation.mutateAsync(formClase);
  };

  if (clasesGrupalesUnicas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Clases Grupales</CardTitle>
          <CardDescription>No hay clases grupales configuradas</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {clasesGrupalesUnicas.map((clase) => {
          const alumnosClase = alumnos.filter(a => clase.alumnos_ids?.includes(a.id));
          const isExpanded = expandedClase === clase.id;

          return (
            <Card key={clase.id} className="overflow-hidden">
              <button
                onClick={() => setExpandedClase(isExpanded ? null : clase.id)}
                className="w-full text-left"
              >
                <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <CardTitle className="text-lg">
                            {format(new Date(clase.fecha), 'EEEE', { locale: es })} • {clase.hora_inicio}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {clase.sede} • Cancha {clase.cancha}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{alumnosClase.length} alumnos</Badge>
                      {isExpanded ? <ChevronUp /> : <ChevronDown />}
                    </div>
                  </div>
                </CardHeader>
              </button>

              {isExpanded && (
                <CardContent className="border-t pt-4 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-slate-900">Alumnos ({alumnosClase.length})</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setClaseEditando(clase);
                          setAgregarAlumnoModal(true);
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Agregar
                      </Button>
                    </div>
                    {alumnosClase.length > 0 ? (
                      <div className="space-y-2">
                        {alumnosClase.map((alumno) => (
                          <div key={alumno.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                            <span className="text-sm text-slate-600">{alumno.nombre}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setClaseEditando(clase);
                                setAlumnoEliminar(alumno);
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Sin alumnos asignados</p>
                    )}
                  </div>

                  {clase.notas && (
                    <div>
                      <h4 className="font-medium text-slate-900 mb-1">Notas</h4>
                      <p className="text-sm text-slate-600">{clase.notas}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleAbrirEditModal(clase)}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Editar clase
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setClaseEliminar(clase)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Modal Editar Clase */}
      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar clase grupal</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Hora de inicio *</Label>
              <Input
                type="time"
                value={formClase.hora_inicio}
                onChange={(e) => setFormClase({ ...formClase, hora_inicio: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Sede *</Label>
              <Input
                value={formClase.sede}
                onChange={(e) => setFormClase({ ...formClase, sede: e.target.value })}
                placeholder="Club Norte"
              />
            </div>

            <div className="space-y-2">
              <Label>Cancha *</Label>
              <Input
                value={formClase.cancha}
                onChange={(e) => setFormClase({ ...formClase, cancha: e.target.value })}
                placeholder="1"
              />
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={formClase.notas}
                onChange={(e) => setFormClase({ ...formClase, notas: e.target.value })}
                placeholder="Observaciones adicionales..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleGuardarClase}
              disabled={editarClaseMutation.isPending}
            >
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Agregar Alumno */}
      <Dialog open={agregarAlumnoModal} onOpenChange={setAgregarAlumnoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar alumno a la clase</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Seleccionar alumno *</Label>
              <Select value={alumnoSeleccionadoAgregar} onValueChange={setAlumnoSeleccionadoAgregar}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige un alumno" />
                </SelectTrigger>
                <SelectContent>
                  {alumnosProfesor
                    .filter(a => !claseEditando?.alumnos_ids?.includes(a.id))
                    .map((alumno) => (
                      <SelectItem key={alumno.id} value={alumno.id}>
                        {alumno.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAgregarAlumnoModal(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => agregarAlumnoMutation.mutate(alumnoSeleccionadoAgregar)}
              disabled={!alumnoSeleccionadoAgregar || agregarAlumnoMutation.isPending}
            >
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Eliminar Alumno */}
      <AlertDialog open={!!alumnoEliminar} onOpenChange={() => setAlumnoEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>¿Eliminar alumno de la clase?</AlertDialogTitle>
          <AlertDialogDescription>
            Se quitará a {alumnoEliminar?.nombre} de esta clase.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => eliminarAlumnoMutation.mutate(alumnoEliminar.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Eliminar Clase */}
      <AlertDialog open={!!claseEliminar} onOpenChange={() => !eliminarClaseMutation.isPending && setClaseEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>¿Eliminar clase grupal?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará la clase a las {claseEliminar?.hora_inicio} en {claseEliminar?.sede}. Esta acción no se puede deshacer.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel disabled={eliminarClaseMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => eliminarClaseMutation.mutate(claseEliminar.id)}
              className="bg-destructive hover:bg-destructive/90 disabled:opacity-50"
              disabled={eliminarClaseMutation.isPending}
            >
              {eliminarClaseMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}