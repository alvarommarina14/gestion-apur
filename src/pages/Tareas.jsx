import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Circle, Plus, Edit, Trash2, Filter, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import PullToRefresh from '@/components/PullToRefresh';

export default function Tareas() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState({ open: false, tarea: null });
  const [filtroEstado, setFiltroEstado] = useState('pendiente');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = async () => {
    queryClient.invalidateQueries({ queryKey: ['tareas'] });
    await new Promise(resolve => setTimeout(resolve, 1000));
  };
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    asignado_a_ids: [],
    prioridad: 'media',
    fecha_vencimiento: '',
    notas: '',
  });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: empleados = [] } = useQuery({
    queryKey: ['empleados'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.rol === 'empleado');
    },
  });

  const { data: tareas = [], isLoading } = useQuery({
    queryKey: ['tareas'],
    queryFn: () => base44.entities.Tarea.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Tarea.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
      setModal({ open: false, tarea: null });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Tarea.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
      setModal({ open: false, tarea: null });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Tarea.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
    },
  });

  const resetForm = () => {
    setFormData({
      titulo: '',
      descripcion: '',
      asignado_a_ids: [],
      prioridad: 'media',
      fecha_vencimiento: '',
      notas: '',
    });
  };

  const handleOpenModal = (tarea = null) => {
    if (tarea) {
      setFormData({
        titulo: tarea.titulo,
        descripcion: tarea.descripcion || '',
        asignado_a_ids: tarea.asignado_a_ids || [],
        prioridad: tarea.prioridad || 'media',
        fecha_vencimiento: tarea.fecha_vencimiento || '',
        notas: tarea.notas || '',
      });
    } else {
      resetForm();
    }
    setModal({ open: true, tarea });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      asignado_a_nombres: formData.asignado_a_ids
        .map(id => empleados.find(e => e.id === id)?.full_name)
        .filter(Boolean),
    };

    if (modal.tarea) {
      updateMutation.mutate({ id: modal.tarea.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCompletarTarea = (tarea) => {
    if (user?.role === 'admin') {
      alert('Solo empleados pueden completar tareas');
      return;
    }
    
    const tareasActualizadas = tareas.filter(t => t.asignado_a_ids?.includes(user.id));
    if (!tareasActualizadas.find(t => t.id === tarea.id)) {
      alert('Esta tarea no está asignada para ti');
      return;
    }

    updateMutation.mutate({
      id: tarea.id,
      data: {
        estado: 'completada',
        completada_por_id: user.id,
        completada_por_nombre: user.full_name,
        completada_en: new Date().toISOString(),
      },
    });
  };

  const tareasAgrupadas = {
    pendiente: tareas.filter(t => t.estado === 'pendiente'),
    en_progreso: tareas.filter(t => t.estado === 'en_progreso'),
    completada: tareas.filter(t => t.estado === 'completada'),
  };

  const tareasFiltradas = user?.role === 'admin' 
    ? tareasAgrupadas[filtroEstado] || []
    : tareas.filter(t => t.asignado_a_ids?.includes(user?.id) && t.estado === filtroEstado);

  const prioridadColor = {
    baja: 'bg-blue-100 text-blue-700',
    media: 'bg-yellow-100 text-yellow-700',
    alta: 'bg-rose-100 text-rose-700',
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div key={refreshKey} className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
         <div>
           <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Tareas</h1>
           <p className="text-slate-500 dark:text-slate-400 text-sm">
              {user?.role === 'admin' ? 'Crear y administrar tareas de los empleados' : 'Tus tareas asignadas'}
            </p>
          </div>
          {user?.role === 'admin' && (
            <Button onClick={() => handleOpenModal()} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Nueva tarea
            </Button>
          )}
        </header>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          {['pendiente', 'en_progreso', 'completada'].map((estado) => (
            <Button
              key={estado}
              variant={filtroEstado === estado ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstado(estado)}
              className={filtroEstado === estado ? 'bg-emerald-600' : ''}
            >
              <Filter className="w-3 h-3 mr-2" />
              {estado === 'pendiente' ? 'Pendientes' : estado === 'en_progreso' ? 'En progreso' : 'Completadas'}
            </Button>
          ))}
        </div>

        {/* Lista de Tareas */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500">Cargando tareas...</div>
          ) : tareasFiltradas.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-400" />
                <p className="font-medium text-slate-500">No hay tareas en este estado</p>
              </CardContent>
            </Card>
          ) : (
            tareasFiltradas.map((tarea) => (
              <Card key={tarea.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        {user?.role !== 'admin' && tarea.estado !== 'completada' ? (
                          <button
                            onClick={() => handleCompletarTarea(tarea)}
                            className="mt-1 hover:opacity-70 transition-opacity"
                          >
                            <Circle className="w-5 h-5 text-slate-400" />
                          </button>
                        ) : (
                          <div className="mt-1">
                            {tarea.estado === 'completada' ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className={cn(
                            'font-semibold text-lg',
                            tarea.estado === 'completada' && 'line-through text-slate-400'
                          )}>
                            {tarea.titulo}
                          </h3>
                          {tarea.descripcion && (
                            <p className="text-sm text-slate-600 mt-1">{tarea.descripcion}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge className={prioridadColor[tarea.prioridad]}>
                          {tarea.prioridad === 'baja' ? '⬇️ Baja' : tarea.prioridad === 'alta' ? '⬆️ Alta' : '➡️ Media'}
                        </Badge>
                        {tarea.fecha_vencimiento && (
                          <Badge variant="outline" className="text-slate-600">
                            📅 {format(new Date(tarea.fecha_vencimiento), 'd MMM', { locale: es })}
                          </Badge>
                        )}
                      </div>

                      {tarea.estado === 'completada' && tarea.completada_en && (
                        <div className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded">
                          ✅ Completada por {tarea.completada_por_nombre} el {format(new Date(tarea.completada_en), 'd MMM HH:mm', { locale: es })}
                        </div>
                      )}

                      {tarea.asignado_a_nombres?.length > 0 && (
                        <div className="text-xs text-slate-600">
                          <strong>Asignado a:</strong> {tarea.asignado_a_nombres.join(', ')}
                        </div>
                      )}
                    </div>

                    {user?.role === 'admin' && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleOpenModal(tarea)}
                          className="h-9 w-9"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => deleteMutation.mutate(tarea.id)}
                          className="h-9 w-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {user?.role === 'admin' && (
        <Dialog open={modal.open} onOpenChange={(open) => setModal({ ...modal, open })}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{modal.tarea ? 'Editar tarea' : 'Nueva tarea'}</DialogTitle>
              <DialogDescription>
                Crear o modificar una tarea para los empleados
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ej: Limpiar canchas"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Detalles de la tarea..."
                  className="h-20"
                />
              </div>

              <div className="space-y-2">
                <Label>Asignar a empleados *</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {empleados.map((emp) => (
                    <div key={emp.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded">
                      <Checkbox
                        checked={formData.asignado_a_ids.includes(emp.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              asignado_a_ids: [...formData.asignado_a_ids, emp.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              asignado_a_ids: formData.asignado_a_ids.filter(id => id !== emp.id),
                            });
                          }
                        }}
                      />
                      <label className="text-sm cursor-pointer flex-1">{emp.full_name}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Prioridad</Label>
                  <Select value={formData.prioridad} onValueChange={(v) => setFormData({ ...formData, prioridad: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fecha vencimiento</Label>
                  <Input
                    type="date"
                    value={formData.fecha_vencimiento}
                    onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Input
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  placeholder="Notas adicionales..."
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModal({ open: false, tarea: null })}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={createMutation.isPending || updateMutation.isPending}>
                  {modal.tarea ? 'Actualizar' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
       </div>
      </PullToRefresh>
      );
      }