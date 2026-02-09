import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO, isWithinInterval, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar, 
  Plus, 
  AlertTriangle, 
  Wrench,
  Users,
  CloudRain,
  Ban,
  CheckCircle,
  Edit,
  Trash2,
  CalendarOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MetricCard from '@/components/ui/MetricCard';
import NuevoBloqueoModal from '@/components/disponibilidad/NuevoBloqueoModal';
import EditarBloqueoModal from '@/components/disponibilidad/EditarBloqueoModal';
import { cn } from '@/lib/utils';

export default function GestionDisponibilidadPage() {
  const queryClient = useQueryClient();
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalEditar, setModalEditar] = useState({ open: false, bloqueo: null });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: bloqueos = [], isLoading } = useQuery({
    queryKey: ['disponibilidad-canchas'],
    queryFn: () => base44.entities.DisponibilidadCancha.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DisponibilidadCancha.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disponibilidad-canchas'] });
    },
  });

  const cancelarMutation = useMutation({
    mutationFn: ({ id, bloqueo }) => 
      base44.entities.DisponibilidadCancha.update(id, { ...bloqueo, estado: 'cancelado' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disponibilidad-canchas'] });
    },
  });

  const bloqueosActivos = useMemo(() => {
    return bloqueos.filter(b => b.estado === 'activo');
  }, [bloqueos]);

  const bloqueosVigentes = useMemo(() => {
    const hoy = new Date();
    return bloqueosActivos.filter(b => {
      const fechaFin = parseISO(b.fecha_fin);
      return fechaFin >= hoy;
    });
  }, [bloqueosActivos]);

  const stats = useMemo(() => ({
    total: bloqueosActivos.length,
    vigentes: bloqueosVigentes.length,
    mantenimiento: bloqueosActivos.filter(b => b.motivo === 'mantenimiento').length,
    eventos: bloqueosActivos.filter(b => b.motivo === 'evento_privado').length,
  }), [bloqueosActivos, bloqueosVigentes]);

  const motivoConfig = {
    mantenimiento: { icon: Wrench, color: 'bg-blue-100 text-blue-700', label: 'Mantenimiento' },
    evento_privado: { icon: Users, color: 'bg-purple-100 text-purple-700', label: 'Evento Privado' },
    clima: { icon: CloudRain, color: 'bg-slate-100 text-slate-700', label: 'Clima' },
    reparacion: { icon: AlertTriangle, color: 'bg-amber-100 text-amber-700', label: 'Reparación' },
    otro: { icon: Ban, color: 'bg-rose-100 text-rose-700', label: 'Otro' },
  };

  const handleEliminar = (bloqueo) => {
    if (confirm(`¿Eliminar el bloqueo de la cancha ${bloqueo.cancha}?`)) {
      deleteMutation.mutate(bloqueo.id);
    }
  };

  const handleCancelar = (bloqueo) => {
    if (confirm(`¿Cancelar el bloqueo de la cancha ${bloqueo.cancha}? Esto permitirá nuevas reservas.`)) {
      cancelarMutation.mutate({ id: bloqueo.id, bloqueo });
    }
  };

  if (user?.rol !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <Card className="max-w-md shadow-lg">
          <CardContent className="pt-6 text-center">
            <Ban className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Acceso Restringido</h2>
            <p className="text-slate-600">
              Esta sección está disponible solo para administradores.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestión de Disponibilidad</h1>
            <p className="text-slate-500 text-sm">
              Control de bloqueos y mantenimiento de canchas
            </p>
          </div>
          <Button 
            onClick={() => setModalNuevo(true)}
            className="bg-rose-600 hover:bg-rose-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo bloqueo
          </Button>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Bloqueos Activos"
            value={stats.total}
            icon={CalendarOff}
            variant="default"
          />
          <MetricCard
            title="Vigentes"
            value={stats.vigentes}
            icon={AlertTriangle}
            variant="warning"
          />
          <MetricCard
            title="Mantenimiento"
            value={stats.mantenimiento}
            icon={Wrench}
            variant="info"
          />
          <MetricCard
            title="Eventos"
            value={stats.eventos}
            icon={Users}
            variant="default"
          />
        </div>

        {/* Lista de bloqueos */}
        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarOff className="w-5 h-5 text-rose-600" />
              Bloqueos Registrados
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : bloqueosActivos.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <CalendarOff className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium mb-2">No hay bloqueos activos</p>
                <p className="text-sm mb-4">Las canchas están completamente disponibles</p>
                <Button variant="outline" onClick={() => setModalNuevo(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear bloqueo
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {bloqueosActivos.map((bloqueo) => {
                  const config = motivoConfig[bloqueo.motivo];
                  const Icon = config.icon;
                  const esVigente = bloqueosVigentes.some(b => b.id === bloqueo.id);

                  return (
                    <div 
                      key={bloqueo.id}
                      className={cn(
                        'p-4 rounded-lg border transition-all',
                        esVigente ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-slate-100 text-slate-700">
                              Cancha {bloqueo.cancha === 'todas' ? 'Todas' : bloqueo.cancha}
                            </Badge>
                            <Badge className={config.color}>
                              <Icon className="w-3 h-3 mr-1" />
                              {config.label}
                            </Badge>
                            {esVigente && (
                              <Badge className="bg-rose-500 text-white">
                                Vigente
                              </Badge>
                            )}
                          </div>

                          <p className="font-semibold text-slate-900 mb-1">
                            {bloqueo.descripcion || config.label}
                          </p>

                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(parseISO(bloqueo.fecha_inicio), "d MMM", { locale: es })}
                              {' - '}
                              {format(parseISO(bloqueo.fecha_fin), "d MMM yyyy", { locale: es })}
                            </span>
                            {!bloqueo.todo_el_dia && bloqueo.hora_inicio && (
                              <span>
                                {bloqueo.hora_inicio} - {bloqueo.hora_fin}
                              </span>
                            )}
                            {bloqueo.todo_el_dia && (
                              <Badge variant="outline" className="text-xs">
                                Todo el día
                              </Badge>
                            )}
                          </div>

                          {bloqueo.creado_por && (
                            <p className="text-xs text-slate-400 mt-1">
                              Creado por: {bloqueo.creado_por}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setModalEditar({ open: true, bloqueo })}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelar(bloqueo)}
                            disabled={cancelarMutation.isPending}
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEliminar(bloqueo)}
                            disabled={deleteMutation.isPending}
                            className="text-rose-600 hover:text-rose-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <NuevoBloqueoModal
        open={modalNuevo}
        onOpenChange={setModalNuevo}
      />

      <EditarBloqueoModal
        open={modalEditar.open}
        onOpenChange={(open) => setModalEditar({ ...modalEditar, open })}
        bloqueo={modalEditar.bloqueo}
      />
    </div>
  );
}