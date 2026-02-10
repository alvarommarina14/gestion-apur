import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, startOfMonth, endOfMonth, parseISO, addMonths, isBefore, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DollarSign, TrendingUp, AlertCircle, CheckCircle, Search, RefreshCw, Plus, Edit, Check, Trash2, Eye } from 'lucide-react';
import EditarClienteForm from '@/components/finanzas/EditarClienteForm';
import DetalleClienteModal from '@/components/clientes/DetalleClienteModal';
import { cn } from '@/lib/utils';

export default function FinanzasClientes() {
   const [mesSeleccionado, setMesSeleccionado] = useState(new Date());
   const [busqueda, setBusqueda] = useState('');
   const [filtroEstado, setFiltroEstado] = useState('todos');
   const [sincronizando, setSincronizando] = useState(false);
   const [editandoCobro, setEditandoCobro] = useState(null);
   const [montoPago, setMontoPago] = useState('');
   const [editandoCliente, setEditandoCliente] = useState(null);
   const [eliminandoCliente, setEliminandoCliente] = useState(null);
   const [modalDetalle, setModalDetalle] = useState({ open: false, cliente: null });
   const queryClient = useQueryClient();

  const mesStr = format(mesSeleccionado, 'yyyy-MM');
  const hoy = new Date();
  const dia15 = new Date(hoy.getFullYear(), hoy.getMonth(), 15);
  const dia5 = new Date(hoy.getFullYear(), hoy.getMonth(), 5);

  // Datos
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('-clasificacion'),
  });

  const { data: cobrosClientes = [] } = useQuery({
    queryKey: ['cobros-clientes'],
    queryFn: () => base44.entities.CobroCliente.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  // Crear cobroCliente automático cuando se crea un cliente
  const crearCobroClienteMutation = useMutation({
    mutationFn: async (cobroData) => {
      return await base44.entities.CobroCliente.create(cobroData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cobros-clientes'] });
    },
  });

  // Pagar cobro
  const pagarCobroMutation = useMutation({
    mutationFn: async ({ cobroId, monto }) => {
      return await base44.entities.CobroCliente.update(cobroId, {
        estado: 'pagado',
        fecha_pago: format(new Date(), 'yyyy-MM-dd'),
        monto: parseFloat(monto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cobros-clientes'] });
      setEditandoCobro(null);
      setMontoPago('');
    },
  });

  // Editar cliente
  const editarClienteMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Cliente.update(editandoCliente.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setEditandoCliente(null);
    },
  });

  // Eliminar cliente
  const eliminarClienteMutation = useMutation({
    mutationFn: async (clienteId) => {
      return await base44.entities.Cliente.delete(clienteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['cobros-clientes'] });
      setEliminandoCliente(null);
    },
  });

  // Sincronizar estados (cambiar a moroso después del día 15)
  const sincronizarMutation = useMutation({
    mutationFn: async () => {
      const hoyCobros = cobrosClientes.filter(c => {
        const vencimiento = parseISO(c.fecha_vencimiento);
        return c.estado === 'pendiente' && isAfter(hoy, vencimiento);
      });

      for (const cobro of hoyCobros) {
        await base44.entities.CobroCliente.update(cobro.id, { estado: 'moroso' });
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cobros-clientes'] });
      setSincronizando(false);
    },
  });

  // Cálculos
  const clientesFiltrados = useMemo(() => {
    return clientes.filter(c => {
      const matchBusqueda = c.nombre.toLowerCase().includes(busqueda.toLowerCase());
      return matchBusqueda;
    });
  }, [clientes, busqueda]);

  const metricasClientes = useMemo(() => {
    const clientesConCobros = clientesFiltrados.map(cliente => {
      const cobrosDelCliente = cobrosClientes.filter(c => c.cliente_id === cliente.id);
      const cobrosMes = cobrosDelCliente.filter(c => c.mes === mesStr);

      const montoPendiente = cobrosMes.filter(c => c.estado === 'pendiente').reduce((sum, c) => sum + (c.monto || 0), 0);
      const montoMoroso = cobrosMes.filter(c => c.estado === 'moroso').reduce((sum, c) => sum + (c.monto || 0), 0);
      const montoPagado = cobrosMes.filter(c => c.estado === 'pagado').reduce((sum, c) => sum + (c.monto || 0), 0);

      const montoEsperado = cliente.precio || 0;
      const estado = montoMoroso > 0 ? 'moroso' : montoPagado > 0 && montoPagado >= montoEsperado ? 'pagado' : montoPendiente > 0 ? 'pendiente' : 'pendiente';

      return {
        ...cliente,
        cobros: cobrosMes,
        montoPendiente,
        montoMoroso,
        montoPagado,
        montoEsperado,
        estado,
      };
    }).sort((a, b) => {
      const orden = { moroso: 0, pendiente: 1, pagado: 2 };
      return (orden[a.estado] || 3) - (orden[b.estado] || 3);
    });

    const totales = {
      clientes: clientesConCobros.length,
      pagados: clientesConCobros.filter(c => c.estado === 'pagado').length,
      pendientes: clientesConCobros.filter(c => c.estado === 'pendiente').length,
      morosos: clientesConCobros.filter(c => c.estado === 'moroso').length,
      ingresoEsperado: clientesConCobros.reduce((sum, c) => sum + c.montoEsperado, 0),
      ingresoPagado: clientesConCobros.reduce((sum, c) => sum + c.montoPagado, 0),
      ingresoMoroso: clientesConCobros.reduce((sum, c) => sum + c.montoMoroso, 0),
      ingresoPendiente: clientesConCobros.reduce((sum, c) => sum + c.montoPendiente, 0),
    };

    return { clientesConCobros, ...totales };
  }, [clientesFiltrados, cobrosClientes, mesStr]);

  const clientesFiltradosPorEstado = useMemo(() => {
    if (filtroEstado === 'todos') return metricasClientes.clientesConCobros;
    return metricasClientes.clientesConCobros.filter(c => c.estado === filtroEstado);
  }, [metricasClientes, filtroEstado]);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getEstadoBadge = (estado) => {
    const config = {
      pagado: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Pagado', icon: CheckCircle },
      moroso: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Moroso', icon: AlertCircle },
      pendiente: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pendiente', icon: AlertCircle },
    };
    return config[estado] || config.pendiente;
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-slate-600">Solo administradores pueden acceder.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finanzas & Clientes</h1>
          <p className="text-slate-500 text-sm">Gestión unificada de cobros y clientes</p>
        </div>
        <Button
          onClick={() => sincronizarMutation.mutate()}
          disabled={sincronizando}
          className="gap-2 w-full sm:w-auto"
        >
          <RefreshCw className={`w-4 h-4 ${sincronizando ? 'animate-spin' : ''}`} />
          {sincronizando ? 'Sincronizando...' : 'Sincronizar'}
        </Button>
      </header>

      {/* Selector de mes */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setMesSeleccionado(new Date(mesSeleccionado.getFullYear(), mesSeleccionado.getMonth() - 1))}
              className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              ← Anterior
            </button>
            <p className="font-semibold text-lg min-w-48 text-center">
              {format(mesSeleccionado, 'MMMM yyyy', { locale: es })}
            </p>
            <button
              onClick={() => setMesSeleccionado(new Date(mesSeleccionado.getFullYear(), mesSeleccionado.getMonth() + 1))}
              className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Siguiente →
            </button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 mb-2">Total Clientes</p>
            <p className="text-2xl font-bold text-slate-900">{metricasClientes.clientes}</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="pt-6">
            <p className="text-xs text-emerald-700 mb-2">Pagados</p>
            <p className="text-2xl font-bold text-emerald-700">{metricasClientes.pagados}</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-xs text-blue-700 mb-2">Pendientes</p>
            <p className="text-2xl font-bold text-blue-700">{metricasClientes.pendientes}</p>
            <p className="text-xs text-blue-600 mt-1">{formatMoney(metricasClientes.ingresoPendiente)}</p>
          </CardContent>
        </Card>

        <Card className="bg-rose-50 border-rose-200">
          <CardContent className="pt-6">
            <p className="text-xs text-rose-700 mb-2">Morosos</p>
            <p className="text-2xl font-bold text-rose-700">{metricasClientes.morosos}</p>
            <p className="text-xs text-rose-600 mt-1">{formatMoney(metricasClientes.ingresoMoroso)}</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-6">
            <p className="text-xs text-purple-700 mb-2">Cobrado</p>
            <p className="text-2xl font-bold text-purple-700">{formatMoney(metricasClientes.ingresoPagado)}</p>
            <p className="text-xs text-purple-600 mt-1">de {formatMoney(metricasClientes.ingresoEsperado)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de clientes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Clientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar cliente..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pagado">Pagados</SelectItem>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="moroso">Morosos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {clientesFiltradosPorEstado.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p className="text-sm">No hay clientes con los filtros aplicados</p>
              </div>
            ) : (
              clientesFiltradosPorEstado.map(cliente => {
                const config = getEstadoBadge(cliente.estado);
                const Icon = config.icon;

                return (
                  <div
                    key={cliente.id}
                    className="p-4 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900 truncate">{cliente.nombre}</h3>
                        <Badge className={cn('text-xs', config.bg, config.text)}>
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">
                        {cliente.clasificacion} • {cliente.telefono}
                      </p>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-500">Precio</p>
                          <p className="font-semibold text-slate-900">{formatMoney(cliente.montoEsperado)}</p>
                        </div>
                        {cliente.montoPagado > 0 && (
                          <div className="text-emerald-600">
                            <p className="text-xs">Pagado</p>
                            <p className="font-semibold">{formatMoney(cliente.montoPagado)}</p>
                          </div>
                        )}
                        {cliente.montoPendiente > 0 && (
                          <div className="text-blue-600">
                            <p className="text-xs">Pendiente</p>
                            <p className="font-semibold">{formatMoney(cliente.montoPendiente)}</p>
                          </div>
                        )}
                        {cliente.montoMoroso > 0 && (
                          <div className="text-rose-600">
                            <p className="text-xs">Moroso</p>
                            <p className="font-semibold">{formatMoney(cliente.montoMoroso)}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                       <Button
                         size="sm"
                         variant="outline"
                         onClick={() => setModalDetalle({ open: true, cliente })}
                         className="w-full sm:w-auto"
                       >
                         <Eye className="w-4 h-4 mr-2" />
                         Ver ficha
                       </Button>

                       <Dialog open={editandoCobro?.id === cliente.id} onOpenChange={(open) => {
                         if (!open) {
                           setEditandoCobro(null);
                           setMontoPago('');
                         }
                       }}>
                         <DialogTrigger asChild>
                           <Button
                             size="sm"
                             variant={cliente.estado === 'pagado' ? 'outline' : 'default'}
                             onClick={() => {
                               setEditandoCobro(cliente);
                               setMontoPago(String(cliente.montoPendiente || cliente.montoMoroso || cliente.montoEsperado));
                             }}
                             className="w-full sm:w-auto"
                           >
                             {cliente.estado === 'pagado' ? (
                               <>
                                 <Check className="w-4 h-4 mr-2" />
                                 Pagado
                               </>
                             ) : (
                               <>
                                 <DollarSign className="w-4 h-4 mr-2" />
                                 Pagar
                               </>
                             )}
                           </Button>
                         </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Registrar Pago - {cliente.nombre}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-slate-700 mb-2 block">
                                Monto a pagar
                              </label>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  value={montoPago}
                                  onChange={(e) => setMontoPago(e.target.value)}
                                  placeholder="0"
                                  className="flex-1"
                                />
                                <Button
                                  onClick={() => setMontoPago(String(cliente.montoEsperado))}
                                  variant="outline"
                                  size="sm"
                                >
                                  Total
                                </Button>
                              </div>
                              <p className="text-xs text-slate-500 mt-2">
                                Monto esperado: {formatMoney(cliente.montoEsperado)}
                              </p>
                            </div>
                            <Button
                              onClick={() => pagarCobroMutation.mutate({
                                cobroId: cliente.cobros[0]?.id,
                                monto: montoPago,
                              })}
                              disabled={!montoPago || pagarCobroMutation.isPending}
                              className="w-full"
                            >
                              Confirmar Pago
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={editandoCliente?.id === cliente.id} onOpenChange={(open) => {
                        if (!open) setEditandoCliente(null);
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditandoCliente(cliente)}
                            className="w-full sm:w-auto"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar Cliente - {cliente.nombre}</DialogTitle>
                          </DialogHeader>
                          <EditarClienteForm cliente={cliente} onSave={(data) => {
                            editarClienteMutation.mutate(data);
                          }} />
                        </DialogContent>
                      </Dialog>

                      <AlertDialog open={eliminandoCliente?.id === cliente.id} onOpenChange={(open) => {
                        if (!open) setEliminandoCliente(null);
                      }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEliminandoCliente(cliente)}
                          className="w-full sm:w-auto text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </Button>
                        <AlertDialogContent>
                          <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
                          <AlertDialogDescription>
                            ¿Estás seguro de que deseas eliminar a {cliente.nombre}? Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                          <div className="flex gap-2 justify-end">
                            <AlertDialogCancel onClick={() => setEliminandoCliente(null)}>
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => eliminarClienteMutation.mutate(cliente.id)}
                              className="bg-rose-600 hover:bg-rose-700"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}