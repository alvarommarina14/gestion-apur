import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';

export default function ClasesAlumnosSection({ profesor }) {
  const queryClient = useQueryClient();
  const [expandedClase, setExpandedClase] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [claseSeleccionada, setClaseSeleccionada] = useState(null);
  const [alumnoModal, setAlumnoModal] = useState(false);
  const [alumnoEditando, setAlumnoEditando] = useState(null);
  const [alumnoEliminar, setAlumnoEliminar] = useState(null);
  const [formAlumno, setFormAlumno] = useState({
    nombre: '',
    whatsapp: '',
    observaciones: '',
  });

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
  const clasesProfesor = clases.filter(c => 
    c.alumnos_ids?.some(id => alumnosIds.includes(id))
  ).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const crearAlumnoMutation = useMutation({
    mutationFn: async (data) => {
      const nuevoAlumno = await base44.entities.Alumno.create({
        ...data,
        profesor_id: profesor.id,
        profesor_nombre: profesor.nombre,
        estado: 'activo',
        precio_mensual: 0,
        clases_por_mes: 0,
        clases_a_recuperar: 0,
        deuda_total: 0,
        total_clases_asistidas: 0,
        fecha_inicio: new Date().toISOString().split('T')[0],
      });
      
      // Agregar alumno a la clase
      if (claseSeleccionada) {
        const alumnosActuales = claseSeleccionada.alumnos_ids || [];
        const nombresActuales = claseSeleccionada.alumnos_nombres || [];
        
        await base44.entities.Clase.update(claseSeleccionada.id, {
          alumnos_ids: [...alumnosActuales, nuevoAlumno.id],
          alumnos_nombres: [...nombresActuales, nuevoAlumno.nombre],
        });
      }
      
      return nuevoAlumno;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alumnos'] });
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      setFormAlumno({ nombre: '', whatsapp: '', observaciones: '' });
      setAlumnoModal(false);
    },
  });

  const editarAlumnoMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Alumno.update(alumnoEditando.id, {
        nombre: data.nombre,
        whatsapp: data.whatsapp,
        observaciones: data.observaciones,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alumnos'] });
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      setFormAlumno({ nombre: '', whatsapp: '', observaciones: '' });
      setAlumnoModal(false);
      setAlumnoEditando(null);
    },
  });

  const eliminarAlumnoMutation = useMutation({
    mutationFn: async (alumno) => {
      // Eliminar de la clase
      if (claseSeleccionada) {
        const alumnosActuales = claseSeleccionada.alumnos_ids.filter(id => id !== alumno.id);
        const nombresActuales = claseSeleccionada.alumnos_nombres.filter((_, i) => claseSeleccionada.alumnos_ids[i] !== alumno.id);
        
        await base44.entities.Clase.update(claseSeleccionada.id, {
          alumnos_ids: alumnosActuales,
          alumnos_nombres: nombresActuales,
        });
      }
      
      // Eliminar alumno
      await base44.entities.Alumno.delete(alumno.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alumnos'] });
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      setAlumnoEliminar(null);
    },
  });

  const handleAbrirAlumnoModal = (clase, alumno = null) => {
    setClaseSeleccionada(clase);
    if (alumno) {
      setAlumnoEditando(alumno);
      setFormAlumno({
        nombre: alumno.nombre,
        whatsapp: alumno.whatsapp,
        observaciones: alumno.observaciones,
      });
    } else {
      setAlumnoEditando(null);
      setFormAlumno({ nombre: '', whatsapp: '', observaciones: '' });
    }
    setAlumnoModal(true);
  };

  const handleGuardarAlumno = async () => {
    if (!formAlumno.nombre.trim()) return;
    
    if (alumnoEditando) {
      await editarAlumnoMutation.mutateAsync(formAlumno);
    } else {
      await crearAlumnoMutation.mutateAsync(formAlumno);
    }
  };

  if (clasesProfesor.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Clases y Alumnos</CardTitle>
          <CardDescription>No hay clases configuradas</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Clases y Alumnos</h2>
        <p className="text-slate-500 mt-1">Gestiona alumnos por clase</p>
      </div>

      <div className="grid gap-4">
        {clasesProfesor.map((clase) => {
          const alumnosClase = alumnos.filter(a => clase.alumnos_ids?.includes(a.id));
          const isExpanded = expandedClase === clase.id;

          return (
            <Card key={clase.id} className="overflow-hidden">
              <button
                onClick={() => setExpandedClase(isExpanded ? null : clase.id)}
                className="w-full"
              >
                <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div>
                        <CardTitle className="text-lg">{clase.sede}</CardTitle>
                        <CardDescription>
                          {clase.fecha} • {clase.hora_inicio} • {clase.tipo}
                        </CardDescription>
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
                  {alumnosClase.length > 0 ? (
                    <div className="space-y-2">
                      {alumnosClase.map((alumno) => (
                        <div
                          key={alumno.id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{alumno.nombre}</p>
                            <p className="text-sm text-slate-500">{alumno.whatsapp}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAbrirAlumnoModal(clase, alumno)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setClaseSeleccionada(clase);
                                setAlumnoEliminar(alumno);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-4">Sin alumnos asignados</p>
                  )}

                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleAbrirAlumnoModal(clase)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar alumno
                  </Button>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Modal Alumno */}
      <Dialog open={alumnoModal} onOpenChange={setAlumnoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {alumnoEditando ? 'Editar alumno' : 'Nuevo alumno'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formAlumno.nombre}
                onChange={(e) => setFormAlumno({ ...formAlumno, nombre: e.target.value })}
                placeholder="Nombre completo"
              />
            </div>

            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input
                value={formAlumno.whatsapp}
                onChange={(e) => setFormAlumno({ ...formAlumno, whatsapp: e.target.value })}
                placeholder="+54 9 ..."
              />
            </div>

            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Input
                value={formAlumno.observaciones}
                onChange={(e) => setFormAlumno({ ...formAlumno, observaciones: e.target.value })}
                placeholder="Notas adicionales"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAlumnoModal(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleGuardarAlumno}
              disabled={crearAlumnoMutation.isPending || editarAlumnoMutation.isPending}
            >
              {alumnoEditando ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Eliminar */}
      <AlertDialog open={!!alumnoEliminar} onOpenChange={() => setAlumnoEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>¿Eliminar alumno?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará a {alumnoEliminar?.nombre} de la clase. Esta acción no se puede deshacer.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => eliminarAlumnoMutation.mutate(alumnoEliminar)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}