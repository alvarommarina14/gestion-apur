import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  GraduationCap, 
  Plus, 
  Edit, 
  Trash2, 
  ChevronRight,
  Users,
  Calendar,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export default function ProfesoresPage() {
  const queryClient = useQueryClient();
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalEditar, setModalEditar] = useState({ open: false, profesor: null });

  const { data: profesores = [], isLoading } = useQuery({
    queryKey: ['profesores'],
    queryFn: () => base44.entities.Profesor.list(),
  });

  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
  });

  const { data: clases = [] } = useQuery({
    queryKey: ['clases'],
    queryFn: () => base44.entities.Clase.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Profesor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profesores'] });
    },
  });

  const handleDelete = (profesor) => {
    const alumnosDelProfesor = alumnos.filter(a => a.profesor_id === profesor.id).length;
    if (alumnosDelProfesor > 0) {
      alert(`No se puede eliminar. Este profesor tiene ${alumnosDelProfesor} alumno(s) asignado(s).`);
      return;
    }
    if (confirm(`¿Eliminar al profesor ${profesor.nombre}?`)) {
      deleteMutation.mutate(profesor.id);
    }
  };

  const colores = [
    '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#a855f7'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Profesores</h1>
            <p className="text-slate-500 text-sm">Selecciona un profesor para ver sus alumnos y clases</p>
          </div>
          <Button 
            onClick={() => setModalNuevo(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo profesor
          </Button>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="shadow-sm animate-pulse">
                <CardContent className="p-6 h-48" />
              </Card>
            ))}
          </div>
        ) : profesores.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center text-slate-500">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium mb-2">No hay profesores</p>
              <p className="text-sm mb-4">Comienza agregando tu primer profesor</p>
              <Button variant="outline" onClick={() => setModalNuevo(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar profesor
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profesores.map((profesor) => {
              const alumnosDelProfesor = alumnos.filter(a => a.profesor_id === profesor.id).length;
              const clasesDelProfesor = clases.filter(c => c.profesor_id === profesor.id).length;

              return (
                <Card 
                  key={profesor.id} 
                  className="shadow-sm hover:shadow-lg transition-all group"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: profesor.color }}
                      >
                        {profesor.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setModalEditar({ open: true, profesor })}
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(profesor)}
                          className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <h3 className="font-semibold text-lg text-slate-900 mb-1">{profesor.nombre}</h3>
                    {profesor.especialidad && (
                      <p className="text-sm text-slate-500 mb-3">{profesor.especialidad}</p>
                    )}

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Users className="w-4 h-4" />
                        <span>{alumnosDelProfesor} alumnos</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <span>{clasesDelProfesor} clases</span>
                      </div>
                    </div>

                    <Link
                      to={createPageUrl(`Dashboard?profesor_id=${profesor.id}`)}
                      className="flex items-center justify-between p-3 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-700 font-medium text-sm transition-colors"
                    >
                      <span>Ver gestión</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <NuevoProfesorModal 
        open={modalNuevo} 
        onOpenChange={setModalNuevo} 
        colores={colores}
      />
      
      <EditarProfesorModal
        open={modalEditar.open}
        onOpenChange={(open) => setModalEditar({ ...modalEditar, open })}
        profesor={modalEditar.profesor}
        colores={colores}
      />
    </div>
  );
}

function NuevoProfesorModal({ open, onOpenChange, colores }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    especialidad: '',
    color: colores[0],
    notas: '',
  });

  React.useEffect(() => {
    if (open) {
      setFormData({
        nombre: '',
        email: '',
        telefono: '',
        especialidad: '',
        color: colores[Math.floor(Math.random() * colores.length)],
        notas: '',
      });
    }
  }, [open, colores]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Profesor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profesores'] });
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-600" />
            Nuevo Profesor
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Nombre completo"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="profesor@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="+54 9 ..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Especialidad</Label>
            <Input
              value={formData.especialidad}
              onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
              placeholder="Ej: Tenis, Pádel, etc."
            />
          </div>

          <div className="space-y-2">
            <Label>Color identificador</Label>
            <div className="flex gap-2">
              {colores.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={cn(
                    'w-8 h-8 rounded-full border-2 transition-all',
                    formData.color === color ? 'border-slate-900 scale-110' : 'border-slate-200'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Observaciones adicionales..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              Crear profesor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditarProfesorModal({ open, onOpenChange, profesor, colores }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    especialidad: '',
    color: '',
    notas: '',
  });

  React.useEffect(() => {
    if (profesor && open) {
      setFormData({
        nombre: profesor.nombre,
        email: profesor.email || '',
        telefono: profesor.telefono || '',
        especialidad: profesor.especialidad || '',
        color: profesor.color,
        notas: profesor.notas || '',
      });
    }
  }, [profesor, open]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Profesor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profesores'] });
      onOpenChange(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({ id: profesor.id, data: formData });
  };

  if (!profesor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-emerald-600" />
            Editar Profesor
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Especialidad</Label>
            <Input
              value={formData.especialidad}
              onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Color identificador</Label>
            <div className="flex gap-2">
              {colores.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={cn(
                    'w-8 h-8 rounded-full border-2 transition-all',
                    formData.color === color ? 'border-slate-900 scale-110' : 'border-slate-200'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}