import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Trash2, CheckCircle, Clock, AlertCircle, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import NuevaClaseModal from '@/components/modals/NuevaClaseModal';

export default function RecuperoCanchas() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('canchas');
  const [filterEstado, setFilterEstado] = useState('pendiente');
  const [filterEstadoClases, setFilterEstadoClases] = useState('pendiente');
   const [selectedCancelacion, setSelectedCancelacion] = useState(null);
  const [selectedRecupero, setSelectedRecupero] = useState(null);
  const [accion, setAccion] = useState(null);
  const [nuevaClaseModal, setNuevaClaseModal] = useState({ open: false, recupero: null });
  const [formData, setFormData] = useState({
    fecha_recupero: format(new Date(), 'yyyy-MM-dd'),
    turno_recupero_id: '',
    notas_recupero: '',
  });

  const { data: cancelaciones = [] } = useQuery({
    queryKey: ['cancelaciones-cancha'],
    queryFn: () => base44.entities.CancelacionCancha.list('-updated_date', 100),
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos-cancha-lista'],
    queryFn: () => base44.entities.TurnoCancha.list('-fecha', 200),
  });

  const { data: recuperos = [] } = useQuery({
    queryKey: ['recuperos'],
    queryFn: () => base44.entities.Recupero.list('-created_date'),
  });

  const { data: clases = [] } = useQuery({
    queryKey: ['clases-lista'],
    queryFn: () => base44.entities.Clase.list('-fecha', 500),
  });

  const cancelacionesFiltradas = useMemo(() => {
    return cancelaciones.filter(c => c.estado_recupero === filterEstado);
  }, [cancelaciones, filterEstado]);

  const motivoConfig = {
    cliente_solicita: { label: 'Cliente solicita', color: 'bg-blue-100 text-blue-700' },
    clima: { label: 'Clima', color: 'bg-slate-100 text-slate-700' },
    mantenimiento: { label: 'Mantenimiento', color: 'bg-orange-100 text-orange-700' },
    falta_clientes: { label: 'Falta de clientes', color: 'bg-yellow-100 text-yellow-700' },
    otro: { label: 'Otro', color: 'bg-gray-100 text-gray-700' },
  };

  const estadoConfig = {
    pendiente: { label: 'Pendiente', icon: Clock, color: 'text-amber-600' },
    recuperado: { label: 'Recuperado', icon: CheckCircle, color: 'text-emerald-600' },
    descontado: { label: 'Descontado', icon: CheckCircle, color: 'text-blue-600' },
    rechazado: { label: 'Rechazado', icon: Trash2, color: 'text-rose-600' },
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, nuevoEstado, datos }) => {
      await base44.entities.CancelacionCancha.update(id, {
        estado_recupero: nuevoEstado,
        fecha_recupero: datos.fecha_recupero || null,
        turno_recupero_id: datos.turno_recupero_id || null,
        notas_recupero: datos.notas_recupero || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cancelaciones-cancha'] });
      setSelectedCancelacion(null);
      setAccion(null);
      setFormData({
        fecha_recupero: format(new Date(), 'yyyy-MM-dd'),
        turno_recupero_id: '',
        notas_recupero: '',
      });
    },
  });

  const handleRecuperar = async () => {
    if (!selectedCancelacion) return;
    await updateMutation.mutateAsync({
      id: selectedCancelacion.id,
      nuevoEstado: 'recuperado',
      datos: formData,
    });
  };

  const handleDescontar = async () => {
    if (!selectedCancelacion) return;
    
    // Crear registro en Cobros cuando se descuenta
    await base44.entities.CobroCliente.create({
      cliente_id: selectedCancelacion.turno_cancha_id,
      cliente_nombre: selectedCancelacion.cliente,
      tipo_cobro: 'cancha_suelta',
      mes: format(parseISO(formData.fecha_recupero), 'yyyy-MM'),
      monto: selectedCancelacion.monto || 0,
      estado: 'descontado',
      fecha_vencimiento: formData.fecha_recupero,
      notas: `Descuento por cancelación de cancha - ${selectedCancelacion.detalles || 'Sin detalles'}`,
    });

    await updateMutation.mutateAsync({
      id: selectedCancelacion.id,
      nuevoEstado: 'descontado',
      datos: formData,
    });
  };

  const deleteCancelacionMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.CancelacionCancha.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cancelaciones-cancha'] });
      setSelectedCancelacion(null);
    },
  });

  const deleteRecuperoMutation = useMutation({
    mutationFn: async (id) => {
      const recupero = recuperos.find(r => r.id === id);
      // Revertir clases a recuperar del alumno solo si tiene un ID válido
      if (recupero?.alumno_id && recupero.alumno_id !== recupero.alumno_nombre) {
        try {
          const alumnos = await base44.entities.Alumno.filter({ id: recupero.alumno_id });
          if (alumnos.length > 0) {
            await base44.entities.Alumno.update(recupero.alumno_id, {
              clases_a_recuperar: (alumnos[0].clases_a_recuperar || 0) + 1,
            });
          }
        } catch (e) {
          console.error('Error actualizando alumno:', e);
          // Continuar con la eliminación del recupero aunque falle la actualización
        }
      }
      await base44.entities.Recupero.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recuperos'] });
      queryClient.invalidateQueries({ queryKey: ['alumnos'] });
      setSelectedRecupero(null);
    },
  });

  const handleEliminarCancelacion = async () => {
    if (!selectedCancelacion) return;
    if (confirm('¿Estás seguro de que querés eliminar esta cancelación?')) {
      await deleteCancelacionMutation.mutateAsync(selectedCancelacion.id);
    }
  };

  const handleEliminarRecupero = async (recupero) => {
    if (confirm(`¿Eliminar el recupero de ${recupero.alumno_nombre}?`)) {
      await deleteRecuperoMutation.mutateAsync(recupero.id);
    }
  };

  // Filtrar recuperos por tipo de clase (basándose en la clase original)
  const recuperosFiltrados = useMemo(() => {
    let filtered = recuperos.filter(r => r.estado === filterEstadoClases);
    
    if (tipoClaseFilter === 'individuales' || tipoClaseFilter === 'grupales') {
      filtered = filtered.filter(recupero => {
        const claseOriginal = clases.find(c => c.id === recupero.clase_original_id);
        if (!claseOriginal) return false;
        
        if (tipoClaseFilter === 'individuales') {
          return claseOriginal.tipo === 'individual';
        } else {
          return claseOriginal.tipo === 'grupal';
        }
      });
    }
    
    return filtered;
  }, [recuperos, filterEstadoClases, tipoClaseFilter, clases]);

  const estadoActual = selectedCancelacion ? estadoConfig[selectedCancelacion.estado_recupero] : null;
  const IconoEstado = estadoActual?.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Recuperos</h1>
          <p className="text-slate-600">Gestiona los recuperos de canchas y clases</p>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="canchas">Canchas</TabsTrigger>
            <TabsTrigger value="clases">Clases</TabsTrigger>
          </TabsList>

          {/* TAB CANCHAS */}
          <TabsContent value="canchas" className="space-y-6">
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="space-y-2 sm:w-48">
                <Label>Estado</Label>
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente de resolución</SelectItem>
                    <SelectItem value="recuperado">Recuperado</SelectItem>
                    <SelectItem value="descontado">Descontado</SelectItem>
                    <SelectItem value="rechazado">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {['pendiente', 'recuperado', 'descontado', 'rechazado'].map((estado) => {
            const count = cancelaciones.filter(c => c.estado_recupero === estado).length;
            const total = cancelaciones.filter(c => c.estado_recupero === estado)
              .reduce((sum, c) => sum + (c.monto || 0), 0);

            return (
              <Card key={estado} className="shadow-sm">
                <CardContent className="pt-4 sm:pt-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{count}</p>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 capitalize">
                      {estadoConfig[estado].label}
                    </p>
                    {total > 0 && (
                      <p className="text-xs text-slate-400 mt-1">
                        ${total.toLocaleString('es-AR')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Lista de cancelaciones */}
        <div className="space-y-3 pb-6">
          {cancelacionesFiltradas.length === 0 ? (
            <Card className="shadow-sm border-dashed">
              <CardContent className="py-12 text-center">
                <p className="text-slate-500">No hay cancelaciones con estado "{estadoConfig[filterEstado].label}"</p>
              </CardContent>
            </Card>
          ) : (
            cancelacionesFiltradas.map((cancelacion) => {
              const config = motivoConfig[cancelacion.motivo_cancelacion] || motivoConfig.otro;
              const estConfig = estadoConfig[cancelacion.estado_recupero];

              return (
                <Card
                  key={cancelacion.id}
                  className="shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedCancelacion(cancelacion);
                    setAccion(null);
                  }}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">{cancelacion.cliente}</h3>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge className={config.color}>{config.label}</Badge>
                              <Badge variant="outline" className="text-xs">
                                Cancha {cancelacion.cancha}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {cancelacion.fecha ? format(parseISO(cancelacion.fecha), "d 'de' MMM", { locale: es }) : 'Sin fecha'} {cancelacion.hora_inicio}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {cancelacion.detalles && (
                          <p className="text-sm text-slate-600 mt-2">{cancelacion.detalles}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900">
                          ${(cancelacion.monto || 0).toLocaleString('es-AR')}
                        </p>
                        <div className="flex items-center gap-2 mt-2 justify-end">
                          {IconoEstado && (
                            <IconoEstado className={cn('w-4 h-4', estConfig.color)} />
                          )}
                          <span className={cn('text-sm font-medium', estConfig.color)}>
                            {estConfig.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
          </div>
          </TabsContent>

          {/* TAB CLASES */}
          <TabsContent value="clases" className="space-y-6">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
          <div className="space-y-2 sm:w-48">
            <Label>Estado</Label>
            <Select value={filterEstadoClases} onValueChange={setFilterEstadoClases}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="programado">Programados</SelectItem>
                <SelectItem value="realizado">Realizados</SelectItem>
                <SelectItem value="perdido">Perdidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:w-48">
            <Label>Tipo de clase</Label>
            <Select value={tipoClaseFilter} onValueChange={setTipoClaseFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="individuales">Individuales</SelectItem>
                <SelectItem value="grupales">Grupales</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>

          {/* Clases Individuales */}
          {(tipoClaseFilter === 'todas' || tipoClaseFilter === 'individuales') && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900">Clases Individuales</h3>
              {recuperosFiltrados.length === 0 ? (
                <Card className="shadow-sm border-dashed">
                  <CardContent className="py-8 text-center">
                    <p className="text-slate-500">No hay recuperos de clases individuales</p>
                  </CardContent>
                </Card>
                ) : (
                  recuperosFiltrados.map((recupero) => (
                    <Card key={recupero.id} className="shadow-sm">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900">{recupero.alumno_nombre}</h3>
                            <p className="text-sm text-slate-500 mt-1">
                              Clase original: {recupero.fecha_original && format(parseISO(recupero.fecha_original), "d 'de' MMM", { locale: es })}
                            </p>
                            <Badge className="mt-2">{recupero.estado}</Badge>
                          </div>
                          <div className="flex gap-2">
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
                              className="text-rose-600 border-rose-200 hover:bg-rose-50"
                              onClick={() => handleEliminarRecupero(recupero)}
                              disabled={deleteRecuperoMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
                </div>
                )}

          {/* Clases Grupales */}
          {(tipoClaseFilter === 'todas' || tipoClaseFilter === 'grupales') && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900">Clases Grupales (Recuperos por alumno)</h3>
              {recuperosFiltrados.length === 0 ? (
                <Card className="shadow-sm border-dashed">
                  <CardContent className="py-8 text-center">
                    <p className="text-slate-500">No hay recuperos de clases grupales</p>
                  </CardContent>
                </Card>
                ) : (
                recuperosFiltrados.map((recupero) => (
              <Card key={recupero.id} className="shadow-sm">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{recupero.alumno_nombre}</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Clase original: {recupero.fecha_original && format(parseISO(recupero.fecha_original), "d 'de' MMM", { locale: es })}
                      </p>
                      <Badge className="mt-2">{recupero.estado}</Badge>
                    </div>
                    <div className="flex gap-2">
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
                        className="text-rose-600 border-rose-200 hover:bg-rose-50"
                        onClick={() => handleEliminarRecupero(recupero)}
                        disabled={deleteRecuperoMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          </div>
          )}
          </TabsContent>
          </Tabs>
      </div>

      {/* Modal de acción */}
      <Dialog open={!!selectedCancelacion} onOpenChange={(open) => !open && setSelectedCancelacion(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedCancelacion?.cliente} - Cancha {selectedCancelacion?.cancha}
            </DialogTitle>
            <DialogDescription>
              {selectedCancelacion?.fecha 
                ? format(parseISO(selectedCancelacion.fecha), "d 'de' MMMM yyyy", { locale: es })
                : 'Sin fecha registrada'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Monto:</span>
                <span className="font-semibold">
                  ${(selectedCancelacion?.monto || 0).toLocaleString('es-AR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Motivo:</span>
                <Badge className={motivoConfig[selectedCancelacion?.motivo_cancelacion]?.color}>
                  {motivoConfig[selectedCancelacion?.motivo_cancelacion]?.label}
                </Badge>
              </div>
              {selectedCancelacion?.detalles && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-slate-700">{selectedCancelacion.detalles}</p>
                </div>
              )}
            </div>

            {!accion && selectedCancelacion?.estado_recupero === 'pendiente' && (
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => setAccion('recuperar')}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Recuperar
                </Button>
                <Button
                  onClick={() => setAccion('descontar')}
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  Descontar
                </Button>
              </div>
            )}

            {accion && (
              <div className="space-y-3 border-t pt-4">
                <div className="space-y-2">
                  <Label>Fecha de {accion === 'recuperar' ? 'recupero' : 'descuento'}</Label>
                  <Input
                    type="date"
                    value={formData.fecha_recupero}
                    onChange={(e) => setFormData({ ...formData, fecha_recupero: e.target.value })}
                  />
                </div>

                {accion === 'recuperar' && (
                  <div className="space-y-2">
                    <Label>Turno de recupero (opcional)</Label>
                    <Select
                      value={formData.turno_recupero_id}
                      onValueChange={(v) => setFormData({ ...formData, turno_recupero_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar turno" />
                      </SelectTrigger>
                      <SelectContent>
                        {turnos.map((turno) => (
                          <SelectItem key={turno.id} value={turno.id}>
                            {turno.cliente} - {turno.fecha ? format(parseISO(turno.fecha), 'd MMM', { locale: es }) : 'Sin fecha'} {turno.hora_inicio}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={formData.notas_recupero}
                    onChange={(e) => setFormData({ ...formData, notas_recupero: e.target.value })}
                    placeholder="Detalles del proceso..."
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 justify-between">
            <div>
              {!accion && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleEliminarCancelacion}
                  disabled={deleteCancelacionMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Eliminar
                </Button>
              )}
            </div>
           <div className="flex gap-2">
             <Button
               type="button"
               variant="outline"
               onClick={() => {
                 setSelectedCancelacion(null);
                 setAccion(null);
               }}
             >
               Cerrar
             </Button>
             {accion && (
               <Button
                 onClick={accion === 'recuperar' ? handleRecuperar : handleDescontar}
                 disabled={updateMutation.isPending || deleteCancelacionMutation.isPending}
                 className={accion === 'recuperar' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}
               >
                 {updateMutation.isPending ? 'Guardando...' : `${accion === 'recuperar' ? 'Recuperar' : 'Descontar'}`}
               </Button>
             )}
             </div>
             </DialogFooter>
             </DialogContent>
             </Dialog>

             {/* Modal para programar clase */}
             <NuevaClaseModal 
             open={nuevaClaseModal.open}
             onOpenChange={(open) => setNuevaClaseModal({ ...nuevaClaseModal, open })}
             recupero={nuevaClaseModal.recupero}
             />
             </div>
             );
             }