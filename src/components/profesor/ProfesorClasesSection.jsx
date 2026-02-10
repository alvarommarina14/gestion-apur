import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit2, Trash2, ChevronRight } from 'lucide-react';

export default function ProfesorClasesSection({ profesor }) {
  const queryClient = useQueryClient();
  const [claseEditando, setClaseEditando] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [claseEliminar, setClaseEliminar] = useState(null);
  const [formClase, setFormClase] = useState({
    hora_inicio: '',
    sede: '',
    cancha: '',
    duracion: 50,
    notas: '',
  });

  const { data: clases = [] } = useQuery({
    queryKey: ['clases'],
    queryFn: () => base44.entities.Clase.list(),
  });

  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
  });

  // Filtrar clases del profesor (únicas por día + hora)
  const alumnosProfesor = alumnos.filter(a => a.profesor_id === profesor?.id);
  const alumnosIds = alumnosProfesor.map(a => a.id);
  
  // Agrupar por hora_inicio para mostrar solo una por horario
  const clasesMap = new Map();
  clases
    .filter(c => c.alumnos_ids?.some(id => alumnosIds.includes(id)))
    .forEach(c => {
      const key = `${c.hora_inicio}`;
      if (!clasesMap.has(key)) {
        clasesMap.set(key, c);
      }
    });

  const clasesProfesor = Array.from(clasesMap.values()).sort((a, b) => {
    const timeA = a.hora_inicio || '23:59';
    const timeB = b.hora_inicio || '23:59';
    return timeA.localeCompare(timeB);
  });

  const editarClaseMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Clase.update(claseEditando.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      setModalAbierto(false);
      setClaseEditando(null);
    },
  });

  const eliminarClaseMutation = useMutation({
    mutationFn: async (clase) => {
      await base44.entities.Clase.delete(clase.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      setClaseEliminar(null);
    },
  });

  const handleEditarClase = (clase) => {
    setClaseEditando(clase);
    setFormClase({
      hora_inicio: clase.hora_inicio || '',
      sede: clase.sede || '',
      cancha: clase.cancha || '',
      duracion: clase.duracion || 50,
      notas: clase.notas || '',
    });
    setModalAbierto(true);
  };

  const handleGuardarClase = async () => {
    if (!formClase.hora_inicio || !formClase.sede) return;
    await editarClaseMutation.mutateAsync(formClase);
  };

  if (clasesProfesor.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Clases</h2>
        <p className="text-slate-500 mt-1">Gestiona tus clases</p>
      </div>

      <div className="grid gap-3">
        {clasesProfesor.map((clase) => {
          const alumnosClase = alumnos.filter(a => clase.alumnos_ids?.includes(a.id));

          return (
            <Card key={clase.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{clase.tipo}</Badge>
                      <Badge variant="secondary">{alumnosClase.length} alumnos</Badge>
                    </div>
                    <CardTitle className="text-lg mb-2">{clase.hora_inicio} hs • {clase.sede}</CardTitle>
                    <CardDescription className="text-sm">
                      Cancha {clase.cancha} • {clase.duracion}min
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditarClase(clase);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClaseEliminar(clase);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Modal Editar Clase */}
      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar clase</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Hora inicio *</Label>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cancha</Label>
                <Input
                  value={formClase.cancha}
                  onChange={(e) => setFormClase({ ...formClase, cancha: e.target.value })}
                  placeholder="1"
                />
              </div>

              <div className="space-y-2">
                <Label>Duración (min)</Label>
                <Input
                  type="number"
                  value={formClase.duracion}
                  onChange={(e) => setFormClase({ ...formClase, duracion: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={formClase.notas}
                onChange={(e) => setFormClase({ ...formClase, notas: e.target.value })}
                placeholder="Observaciones..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleGuardarClase}
              disabled={editarClaseMutation.isPending}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Eliminar */}
      <AlertDialog open={!!claseEliminar} onOpenChange={() => setClaseEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>¿Eliminar clase?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará la clase en {claseEliminar?.sede}. Esta acción no se puede deshacer.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => eliminarClaseMutation.mutate(claseEliminar)}
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