import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Users,
  Plus,
  GraduationCap,
  Calendar,
  TrendingUp,
  ChevronRight,
  Edit,
  Mail,
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
    queryFn: () => base44.entities.Profesor.list('-created_date'),
  });

  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
  });

  const stats = {
    total: profesores.length,
    activos: profesores.filter(p => p.activo).length,
    totalAlumnos: alumnos.length,
  };

  const handleSeleccionarProfesor = (profesor) => {
    localStorage.setItem('profesor_seleccionado', JSON.stringify(profesor));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestión de Clases</h1>
            <p className="text-slate-500 text-sm">Selecciona un profesor para gestionar sus clases</p>
          </div>
          <Button
            onClick={() => setModalNuevo(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo profesor
          </Button>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-sm text-slate-500 mt-1">Total Profesores</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-600">{stats.activos}</p>
                <p className="text-sm text-slate-500 mt-1">Activos</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-blue-200 bg-blue-50/30">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{stats.totalAlumnos}</p>
                <p className="text-sm text-slate-500 mt-1">Total Alumnos</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de profesores */}
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
            <CardContent className="py-16 text-center text-slate-500">
              <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-40" />
              <p className="font-medium text-lg mb-2">No hay profesores</p>
              <p className="text-sm mb-6">Comienza agregando tu primer profesor</p>
              <Button onClick={() => setModalNuevo(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar profesor
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profesores.map((profesor) => {
              const alumnosProfesor = alumnos.filter(a => a.profesor_id === profesor.id);
              const alumnosActivos = alumnosProfesor.filter(a => a.estado === 'activo').length;

              return (
                <Link
                  key={profesor.id}
                  to={createPageUrl('Dashboard')}
                  onClick={() => handleSeleccionarProfesor(profesor)}
                >
                  <Card className="shadow-sm hover:shadow-lg transition-all cursor-pointer border-2 hover:border-emerald-200">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <GraduationCap className="w-5 h-5 text-emerald-600" />
                            <h3 className="font-semibold text-lg text-slate-900">
                              {profesor.nombre}
                            </h3>
                          </div>
                          {profesor.especialidad && (
                            <Badge variant="outline" className="text-xs">
                              {profesor.especialidad}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            setModalEditar({ open: true, profesor });
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-2 text-sm">
                        {profesor.email && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Mail className="w-4 h-4" />
                            <span className="truncate">{profesor.email}</span>
                          </div>
                        )}
                        {profesor.telefono && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Phone className="w-4 h-4" />
                            <span>{profesor.telefono}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-emerald-600">{alumnosActivos}</p>
                          <p className="text-xs text-slate-500">Alumnos activos</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{alumnosProfesor.length}</p>
                          <p className="text-xs text-slate-500">Total alumnos</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-center text-emerald-600 font-medium text-sm">
                        Ver gestión
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <NuevoProfesorModal open={modalNuevo} onOpenChange={setModalNuevo} />
      <EditarProfesorModal
        open={modalEditar.open}
        onOpenChange={(open) => setModalEditar({ ...modalEditar, open })}
        profesor={modalEditar.profesor}
      />
    </div>
  );
}

function NuevoProfesorModal({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    especialidad: '',
    notas: '',
  });

  React.useEffect(() => {
    if (open) {
      setFormData({
        nombre: '',
        email: '',
        telefono: '',
        especialidad: '',
        notas: '',
      });
    }
  }, [open]);

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
      <DialogContent className="sm:max-w-xl">
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
                placeholder="email@ejemplo.com"
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
              placeholder="Ej: Tenis avanzado, Iniciación, etc."
            />
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Observaciones sobre el profesor..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {createMutation.isPending ? 'Creando...' : 'Crear profesor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditarProfesorModal({ open, onOpenChange, profesor }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    especialidad: '',
    notas: '',
    activo: true,
  });

  React.useEffect(() => {
    if (profesor) {
      setFormData({
        nombre: profesor.nombre,
        email: profesor.email || '',
        telefono: profesor.telefono || '',
        especialidad: profesor.especialidad || '',
        notas: profesor.notas || '',
        activo: profesor.activo ?? true,
      });
    }
  }, [profesor]);

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
      <DialogContent className="sm:max-w-xl">
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
            <Label>Notas</Label>
            <Textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}