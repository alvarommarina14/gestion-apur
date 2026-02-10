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
import { DollarSign, TrendingUp, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export default function FinanzasClientes() {
   const [mesSeleccionado, setMesSeleccionado] = useState(new Date());
   const [sincronizando, setSincronizando] = useState(false);
   const [filtroEstado, setFiltroEstado] = useState('todos');
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
  const metricasClientes = useMemo(() => {
    const clientesConCobros = clientes.map(cliente => {
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
    }, [clientes, cobrosClientes, mesStr]);

  const clientesFiltradosPorEstado = useMemo(() => {
    if (filtroEstado === 'todos') return metricasClientes.clientesConCobros;
    return metricasClientes.clientesConCobros.filter(c => c.estado === filtroEstado);
  }, [metricasClientes, filtroEstado]);

  const getEstadoBadgeClientes = (estado) => {
    const config = {
      pagado: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Pagado', icon: CheckCircle },
      moroso: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Moroso', icon: AlertCircle },
      pendiente: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pendiente', icon: AlertCircle },
    };
    return config[estado] || config.pendiente;
  };

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


    </div>
  );
}