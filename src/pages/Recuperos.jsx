import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Edit,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MetricCard from '@/components/ui/MetricCard';
import StatusBadge from '@/components/ui/StatusBadge';
import NuevaClaseModal from '@/components/modals/NuevaClaseModal';
import { cn } from '@/lib/utils';

export default function Recuperos() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [nuevaClaseModal, setNuevaClaseModal] = useState({ open: false, recupero: null });
  const [editModal, setEditModal] = useState({ open: false, recupero: null });
  const [editForm, setEditForm] = useState({});
  const [user, setUser] = useState(null);
  
  // Fetch user
  const { data: userData } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const u = await base44.auth.me();
      setUser(u);
      return u;
    },
  });

  const { data: recuperos = [], isLoading } = useQuery({
    queryKey: ['recuperos'],
    queryFn: () => base44.entities.Recupero.list('-created_date'),
  });
  
  // Stats
  const stats = useMemo(() => ({
    pendientes: recuperos.filter(r => r.estado === 'pendiente').length,
    programados: recuperos.filter(r => r.estado === 'programado').length,
    realizados: recuperos.filter(r => r.estado === 'realizado').length,
    perdidos: recuperos.filter(r => r.estado === 'perdido').length,
  }), [recuperos]);
  
  // Filtered
  const recuperosFiltrados = useMemo(() => {
    return recuperos.filter(r => {
      const matchSearch = r.alumno_nombre?.toLowerCase().includes(search.toLowerCase());
      const matchEstado = filterEstado === 'todos' || r.estado === filterEstado;
      return matchSearch && matchEstado;
    });
  }, [recuperos, search, filterEstado]);
  
  // Marcar como perdido
  const handleMarcarPerdido = async (recupero) => {
    if (!confirm(`¿Marcar el recupero de ${recupero.alumno_nombre} como perdido?`)) return;
    
    await base44.entities.Recupero.update(recupero.id, { estado: 'perdido' });
    
    // Actualizar clases a recuperar del alumno
    const alumnos = await base44.entities.Alumno.filter({ id: recupero.alumno_id });
    if (alumnos.length > 0) {
      await base44.entities.Alumno.update(recupero.alumno_id, {
        clases_a_recuperar: Math.max(0, (alumnos[0].clases_a_recuperar || 1) - 1),
      });
    }
    
    // Log
    await base44.entities.LogAuditoria.create({
      entidad: 'Recupero',
      entidad_id: recupero.id,
      entidad_nombre: `Recupero ${recupero.alumno_nombre}`,
      accion: 'cambio_estado',
      campo_modificado: 'estado',
      valor_anterior: recupero.estado,
      valor_nuevo: 'perdido',
      motivo: 'Recupero marcado como perdido',
      fecha: new Date().toISOString(),
    });
    
    queryClient.invalidateQueries({ queryKey: ['recuperos'] });
    queryClient.invalidateQueries({ queryKey: ['alumnos'] });
  };

  const handleEditRecupero = (recupero) => {
    setEditForm({
      motivo: recupero.motivo,
      notas: recupero.notas || '',
    });
    setEditModal({ open: true, recupero });
  };

  const handleSaveEdit = async () => {
    await base44.entities.Recupero.update(editModal.recupero.id, editForm);
    queryClient.invalidateQueries({ queryKey: ['recuperos'] });
    setEditModal({ open: false, recupero: null });
  };

  const handleDeleteRecupero = async (recupero) => {
    if (!recupero?.id) {
      alert('Error: No se puede eliminar este recupero (ID faltante)');
      return;
    }
    
    if (!confirm(`¿Eliminar el recupero de ${recupero.alumno_nombre}?`)) return;
    
    try {
      // Revertir clases a recuperar
      const alumnos = await base44.entities.Alumno.filter({ id: recupero.alumno_id });
      if (alumnos.length > 0) {
        await base44.entities.Alumno.update(recupero.alumno_id, {
          clases_a_recuperar: (alumnos[0].clases_a_recuperar || 0) + 1,
        });
      }
      
      await base44.entities.Recupero.delete(recupero.id);
      queryClient.invalidateQueries({ queryKey: ['recuperos'] });
      queryClient.invalidateQueries({ queryKey: ['alumnos'] });
      alert('Recupero eliminado correctamente');
    } catch (error) {
      console.error('Error eliminando recupero:', error);
      alert(`Error al eliminar: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Recuperos</h1>
            <p className="text-slate-500 text-sm">
              Gestión de clases pendientes de recuperar
            </p>
          </div>
        </header>
        
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Pendientes"
            value={stats.pendientes}
            icon={Clock}
            variant={stats.pendientes > 0 ? 'warning' : 'default'}
          />
          <MetricCard
            title="Programados"
            value={stats.programados}
            icon={Calendar}
            variant="info"
          />
          <MetricCard
            title="Realizados"
            value={stats.realizados}
            icon={CheckCircle}
            variant="success"
          />
          <MetricCard
            title="Perdidos"
            value={stats.perdidos}
            icon={XCircle}
            variant={stats.perdidos > 0 ? 'danger' : 'default'}
          />
        </div>
        
        {/* Filters */}
        <Card className="shadow-sm">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por alumno..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                  <SelectItem value="programado">Programados</SelectItem>
                  <SelectItem value="realizado">Realizados</SelectItem>
                  <SelectItem value="perdido">Perdidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* List */}
        <div className="grid gap-4">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <Card key={i} className="shadow-sm animate-pulse">
                <CardContent className="p-6 h-24" />
              </Card>
            ))
          ) : recuperosFiltrados.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-12 text-center text-slate-500">
                <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No hay recuperos</p>
              </CardContent>
            </Card>
          ) : (
            recuperosFiltrados.map((recupero) => {
              const diasDesdeOriginal = recupero.fecha_original 
                ? differenceInDays(new Date(), parseISO(recupero.fecha_original))
                : 0;
              const esUrgente = recupero.estado === 'pendiente' && diasDesdeOriginal > 14;
              
              return (
                <Card 
                  key={recupero.id}
                  className={cn(
                    'shadow-sm transition-all',
                    recupero.estado === 'pendiente' && 'border-amber-200',
                    esUrgente && 'border-rose-300 bg-rose-50/30'
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={cn(
                          'w-12 h-12 rounded-full flex items-center justify-center',
                          recupero.estado === 'pendiente' && 'bg-amber-100 text-amber-700',
                          recupero.estado === 'programado' && 'bg-blue-100 text-blue-700',
                          recupero.estado === 'realizado' && 'bg-emerald-100 text-emerald-700',
                          recupero.estado === 'perdido' && 'bg-slate-100 text-slate-500'
                        )}>
                          <User className="w-5 h-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-slate-800">{recupero.alumno_nombre}</span>
                            <StatusBadge status={recupero.estado} size="sm" />
                            {esUrgente && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-medium rounded">
                                <AlertTriangle className="w-3 h-3" />
                                Urgente
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span>
                              Clase original: {recupero.fecha_original && format(parseISO(recupero.fecha_original), "d MMM", { locale: es })}
                            </span>
                            <span className="capitalize">{recupero.motivo?.replace(/_/g, ' ')}</span>
                            {recupero.fecha_programada && (
                              <span className="text-blue-600">
                                Programado: {format(parseISO(recupero.fecha_programada), "d MMM", { locale: es })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {(user?.rol === 'admin' || user?.rol === 'profesor') && (
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => setNuevaClaseModal({ open: true, recupero })}
                          >
                            <Calendar className="w-4 h-4 mr-1" />
                            Programar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditRecupero(recupero)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                          {recupero.estado === 'pendiente' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-rose-600 border-rose-200 hover:bg-rose-50"
                              onClick={() => handleMarcarPerdido(recupero)}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Perdido
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-rose-600 border-rose-200 hover:bg-rose-50"
                            onClick={() => handleDeleteRecupero(recupero)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {recupero.notas && (
                      <div className="mt-3 pt-3 border-t text-sm text-slate-600">
                        {recupero.notas}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
      
      {/* Modal editar recupero */}
      {editModal.recupero && (
        <div className={cn(
          'fixed inset-0 z-50 flex items-center justify-center',
          editModal.open ? 'visible' : 'invisible'
        )}>
          <div 
            className={cn(
              'absolute inset-0 bg-black/50 transition-opacity duration-200',
              editModal.open ? 'opacity-100' : 'opacity-0'
            )}
            onClick={() => setEditModal({ open: false, recupero: null })}
          />
          <Card className={cn(
            'relative w-full max-w-md mx-4 transition-all duration-200',
            editModal.open ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          )}>
            <CardHeader>
              <CardTitle>Editar Recupero</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Motivo</label>
                <Select value={editForm.motivo} onValueChange={(v) => setEditForm({...editForm, motivo: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cancelacion_alumno">Cancelación alumno</SelectItem>
                    <SelectItem value="cancelacion_profesor">Cancelación profesor</SelectItem>
                    <SelectItem value="clima">Clima</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Notas</label>
                <Input
                  value={editForm.notas}
                  onChange={(e) => setEditForm({...editForm, notas: e.target.value})}
                  placeholder="Notas..."
                />
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setEditModal({ open: false, recupero: null })}>
                  Cancelar
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveEdit}>
                  Guardar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal */}
      <NuevaClaseModal 
        open={nuevaClaseModal.open}
        onOpenChange={(open) => setNuevaClaseModal({ ...nuevaClaseModal, open })}
        recupero={nuevaClaseModal.recupero}
      />
    </div>
  );
}