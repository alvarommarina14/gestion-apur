import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { ChevronDown, ChevronUp, Edit2 } from 'lucide-react';

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
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Clases Grupales</h2>
        <p className="text-slate-500 mt-1">Gestiona tus clases grupales</p>
      </div>

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
                          <CardTitle className="text-lg">{clase.hora_inicio}</CardTitle>
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
                    <h4 className="font-medium text-slate-900 mb-2">Alumnos ({alumnosClase.length})</h4>
                    {alumnosClase.length > 0 ? (
                      <div className="space-y-1">
                        {alumnosClase.map((alumno) => (
                          <div key={alumno.id} className="text-sm text-slate-600">
                            • {alumno.nombre}
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

                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleAbrirEditModal(clase)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar clase
                  </Button>
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
    </div>
  );
}