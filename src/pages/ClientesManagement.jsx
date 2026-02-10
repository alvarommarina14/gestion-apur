import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DollarSign, AlertCircle, CheckCircle, Search, Plus, Edit, Check, Trash2, Eye } from 'lucide-react';
import EditarClienteForm from '@/components/finanzas/EditarClienteForm';
import DetalleClienteModal from '@/components/clientes/DetalleClienteModal';
import SeleccionTipoClienteModal from '@/components/clientes/SeleccionTipoClienteModal';
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal';
import { cn } from '@/lib/utils';

export default function ClientesManagement() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [editandoCliente, setEditandoCliente] = useState(null);
  const [eliminandoCliente, setEliminandoCliente] = useState(null);
  const [modalDetalle, setModalDetalle] = useState({ open: false, cliente: null });
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false);
  const [editandoCobro, setEditandoCobro] = useState(null);
  const [montoPago, setMontoPago] = useState('');
  const queryClient = useQueryClient();

  // Datos
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('-total_gastado'),
  });

  const { data: cobrosClientes = [] } = useQuery({
    queryKey: ['cobros-clientes'],
    queryFn: () => base44.entities.CobroCliente.list(),
  });

  // Pagar cobro
  const pagarCobroMutation = useMutation({
    mutationFn: async ({ cobroId, monto }) => {
      return await base44.entities.CobroCliente.update(cobroId, {
        estado: 'pagado',
        fecha_pago: new Date().toISOString().split('T')[0],
        monto: parseFloat(monto),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cobros-clientes'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
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

  // Filtrar clientes
  const clientesFiltrados = useMemo(() => {
    return clientes.filter(c => {
      const matchBusqueda = 
        c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.telefono.includes(busqueda) ||
        (c.email && c.email.toLowerCase().includes(busqueda.toLowerCase()));
      
      const matchTipo = filtroTipo === 'todos' || c.tipo_cliente === filtroTipo;
      
      return matchBusqueda && matchTipo;
    });
  }, [clientes, busqueda, filtroTipo]);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getEstadoBadge = (estado) => {
    const config = {
      activo: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Activo' },
      inactivo: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Inactivo' },
    };
    return config[estado] || config.activo;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Clientes</h1>
          <p className="text-slate-500 text-sm">Total: {clientesFiltrados.length} clientes</p>
        </div>
        <SeleccionTipoClienteModal
          onClienteCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            setModalNuevoCliente(false);
          }}
        />
      </header>

      {/* Búsqueda y filtros */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, teléfono o email..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tipo de cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="clase">Clases</SelectItem>
                <SelectItem value="abono">Abonos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes ({clientesFiltrados.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {clientesFiltrados.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-sm">No hay clientes que coincidan con la búsqueda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clientesFiltrados.map(cliente => {
                const cobrosMesActual = cobrosClientes.filter(c => c.cliente_id === cliente.id);
                const statusConfig = getEstadoBadge(cliente.activo ? 'activo' : 'inactivo');

                return (
                  <div
                    key={cliente.id}
                    className="p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-slate-900 truncate">{cliente.nombre}</h3>
                          <Badge className={cn('text-xs', statusConfig.bg, statusConfig.text)}>
                            {statusConfig.label}
                          </Badge>
                          {cliente.tipo_cliente === 'clase' ? (
                            <Badge variant="outline" className="text-xs">Clase</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Abono</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mb-2">
                          {cliente.clasificacion} • {cliente.telefono}
                          {cliente.email && ` • ${cliente.email}`}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div>
                            <p className="text-xs text-slate-500">Precio</p>
                            <p className="font-semibold">{formatMoney(cliente.precio)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Turnos</p>
                            <p className="font-semibold">{cliente.total_turnos || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Gastado</p>
                            <p className="font-semibold text-emerald-600">{formatMoney(cliente.total_gastado)}</p>
                          </div>
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
                          Ver
                        </Button>

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
                            <EditarClienteForm 
                              cliente={cliente} 
                              onSave={(data) => {
                                editarClienteMutation.mutate(data);
                              }} 
                            />
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
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
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
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      <DetalleClienteModal
        open={modalDetalle.open}
        onOpenChange={(open) => {
          if (!open) {
            setModalDetalle({ open: false, cliente: null });
          }
        }}
        cliente={modalDetalle.cliente}
      />
    </div>
  );
}