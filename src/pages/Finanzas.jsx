import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, startOfMonth, endOfMonth, parseISO, addDays, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { DollarSign, TrendingUp, AlertCircle, CheckCircle, Search, RefreshCw, Activity, Calendar, Clock } from 'lucide-react';
import ReporteOcupacion from '@/components/reportes/ReporteOcupacion';

export default function Finanzas() {
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date());
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [sincronizando, setSincronizando] = useState(false);

  const mesStr = format(mesSeleccionado, 'yyyy-MM');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
  });

  const { data: pagos = [] } = useQuery({
    queryKey: ['pagos'],
    queryFn: () => base44.entities.Pago.list('-fecha', 500),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list(),
  });

  const { data: cobrosClientes = [] } = useQuery({
    queryKey: ['cobros-clientes'],
    queryFn: () => base44.entities.CobroCliente.list(),
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos-cancha'],
    queryFn: () => base44.entities.TurnoCancha.list('-fecha', 500),
  });

  const sincronizarMutation = useMutation({
    mutationFn: () => base44.functions.invoke('sincronizarEstadosPago', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alumnos'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['pagos'] });
      queryClient.invalidateQueries({ queryKey: ['cobros-clientes'] });
      setSincronizando(false);
    },
    onError: () => setSincronizando(false),
  });

  const handleSincronizar = async () => {
    setSincronizando(true);
    try {
      await sincronizarMutation.mutateAsync();
    } catch (error) {
      console.error('Error sincronizando:', error);
    }
  };

  // Métricas de Alumnos
  const metricasAlumnos = useMemo(() => {
    const alumnosMes = alumnos.map(a => {
      const pagosAlumno = pagos.filter(p =>
        p.alumno_id === a.id &&
        p.mes_correspondiente === mesStr
      );
      const montoPagado = pagosAlumno.reduce((sum, p) => sum + (p.monto || 0), 0);
      const montoEsperado = a.precio_mensual || 0;
      const deuda = Math.max(0, montoEsperado - montoPagado);

      return {
        ...a,
        montoPagado,
        montoEsperado,
        deuda,
        estado_actual: deuda === 0 ? 'pagado' : montoPagado === 0 ? 'debe' : 'moroso',
      };
    });

    const pagados = alumnosMes.filter(a => a.estado_actual === 'pagado').length;
    const morosos = alumnosMes.filter(a => a.estado_actual === 'moroso').length;
    const deben = alumnosMes.filter(a => a.estado_actual === 'debe').length;

    const ingresoEsperado = alumnosMes.reduce((sum, a) => sum + a.montoEsperado, 0);
    const ingresoReal = alumnosMes.reduce((sum, a) => sum + a.montoPagado, 0);
    const deudaTotal = alumnosMes.reduce((sum, a) => sum + a.deuda, 0);

    return {
      total: alumnosMes.length,
      pagados,
      morosos,
      deben,
      ingresoEsperado,
      ingresoReal,
      deudaTotal,
      porcentajeCobro: alumnosMes.length > 0 ? ((ingresoReal / ingresoEsperado) * 100).toFixed(1) : 0,
      alumnosMes,
    };
  }, [alumnos, pagos, mesStr, mesSeleccionado]);

  // Métricas de Clientes
  const metricasClientes = useMemo(() => {
    const clientesAbono = clientes.filter(c => c.tipo_cliente === 'abono').map(c => {
      const cobros = cobrosClientes.filter(co =>
        co.cliente_id === c.id &&
        co.mes === mesStr
      );
      const montoPagado = cobros.filter(co => co.estado === 'pagado').reduce((sum, co) => sum + (co.monto || 0), 0);
      const montoEsperado = c.precio || 0;
      const deuda = Math.max(0, montoEsperado - montoPagado);

      return {
        ...c,
        montoPagado,
        montoEsperado,
        deuda,
        estado_actual: deuda === 0 ? 'pagado' : montoPagado === 0 ? 'pendiente' : 'moroso',
      };
    });

    const pagados = clientesAbono.filter(c => c.estado_actual === 'pagado').length;
    const morosos = clientesAbono.filter(c => c.estado_actual === 'moroso').length;
    const pendientes = clientesAbono.filter(c => c.estado_actual === 'pendiente').length;

    const ingresoEsperado = clientesAbono.reduce((sum, c) => sum + c.montoEsperado, 0);
    const ingresoReal = clientesAbono.reduce((sum, c) => sum + c.montoPagado, 0);
    const deudaTotal = clientesAbono.reduce((sum, c) => sum + c.deuda, 0);

    return {
      total: clientesAbono.length,
      pagados,
      morosos,
      pendientes,
      ingresoEsperado,
      ingresoReal,
      deudaTotal,
      porcentajeCobro: clientesAbono.length > 0 ? ((ingresoReal / ingresoEsperado) * 100).toFixed(1) : 0,
      clientesMes: clientesAbono,
    };
  }, [clientes, cobrosClientes, mesStr]);

  // Métricas de Ocupación
  const turnosFiltrados = useMemo(() => {
    const inicio = startOfMonth(mesSeleccionado);
    const fin = endOfMonth(mesSeleccionado);
    
    return turnos.filter(t => {
      const fecha = parseISO(t.fecha);
      return fecha >= inicio && fecha <= fin;
    });
  }, [turnos, mesSeleccionado]);

  const metricasOcupacion = useMemo(() => {
    const totalTurnos = turnosFiltrados.length;
    const diasDelMes = eachDayOfInterval({
      start: startOfMonth(mesSeleccionado),
      end: endOfMonth(mesSeleccionado),
    }).length;

    const franjasHorarias = 27;
    const slotsDisponiblesPorDia = 4 * franjasHorarias;
    const totalSlotsDisponibles = slotsDisponiblesPorDia * diasDelMes;

    const slotsOcupados = turnosFiltrados.reduce((sum, t) => {
      const franjasOcupadas = Math.ceil(t.duracion / 30);
      return sum + franjasOcupadas;
    }, 0);

    const ocupacionPorcentaje = totalSlotsDisponibles > 0 
      ? ((slotsOcupados / totalSlotsDisponibles) * 100).toFixed(1)
      : 0;

    const ingresoTotal = turnosFiltrados.reduce((sum, t) => sum + (t.monto || 0), 0);
    const ingresoCobrado = turnosFiltrados.filter(t => t.pagado).reduce((sum, t) => sum + (t.monto || 0), 0);
    const ingresoPendiente = ingresoTotal - ingresoCobrado;
    
    return {
      totalTurnos,
      ocupacionPorcentaje,
      slotsOcupados,
      totalSlotsDisponibles,
      ingresoTotal,
      ingresoCobrado,
      ingresoPendiente,
    };
  }, [turnosFiltrados, mesSeleccionado]);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getEstadoBadge = (estado) => {
    const config = {
      pagado: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Pagado' },
      moroso: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Moroso' },
      debe: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Debe' },
      pendiente: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pendiente' },
    };
    return config[estado] || config.pendiente;
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-slate-600">Solo administradores pueden acceder a Finanzas.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panel Administrativo</h1>
          <p className="text-slate-500 text-sm">Finanzas y ocupación de canchas</p>
        </div>
        <Button
          onClick={handleSincronizar}
          disabled={sincronizando}
          className="gap-2"
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

      <Tabs defaultValue="alumnos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="alumnos">Alumnos</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="ocupacion">Ocupación</TabsTrigger>
        </TabsList>

        {/* TAB ALUMNOS */}
        <TabsContent value="alumnos" className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 mb-2">Alumnos Pagados</p>
                <p className="text-3xl font-bold text-emerald-600">{metricasAlumnos.pagados}</p>
                <p className="text-xs text-slate-400 mt-1">de {metricasAlumnos.total}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 mb-2">Morosos</p>
                <p className="text-3xl font-bold text-rose-600">{metricasAlumnos.morosos}</p>
                <p className="text-xs text-slate-400 mt-1">{formatMoney(metricasAlumnos.deudaTotal)} adeudado</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 mb-2">Cobrado</p>
                <p className="text-2xl font-bold text-blue-600">{formatMoney(metricasAlumnos.ingresoReal)}</p>
                <p className="text-xs text-slate-400 mt-1">{metricasAlumnos.porcentajeCobro}% del esperado</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 mb-2">Esperado</p>
                <p className="text-2xl font-bold text-slate-700">{formatMoney(metricasAlumnos.ingresoEsperado)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Lista de alumnos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alumnos del mes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar alumno..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pagado">Pagados</SelectItem>
                    <SelectItem value="moroso">Morosos</SelectItem>
                    <SelectItem value="debe">Deben</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {metricasAlumnos.alumnosMes
                  .filter(a =>
                    a.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
                    (filtroEstado === 'todos' || a.estado_actual === filtroEstado)
                  )
                  .map(a => {
                    const config = getEstadoBadge(a.estado_actual);
                    return (
                      <div key={a.id} className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{a.nombre}</p>
                          <p className="text-xs text-slate-500">{a.profesor_nombre}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge className={`${config.bg} ${config.text}`}>{config.label}</Badge>
                          <p className="text-sm font-semibold text-slate-900">
                            {a.montoPagado > 0 ? formatMoney(a.montoPagado) : '-'}
                          </p>
                          {a.deuda > 0 && (
                            <p className="text-xs text-rose-600 font-medium">Debe: {formatMoney(a.deuda)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB CLIENTES */}
        <TabsContent value="clientes" className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 mb-2">Clientes Pagados</p>
                <p className="text-3xl font-bold text-emerald-600">{metricasClientes.pagados}</p>
                <p className="text-xs text-slate-400 mt-1">de {metricasClientes.total}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 mb-2">Morosos</p>
                <p className="text-3xl font-bold text-rose-600">{metricasClientes.morosos}</p>
                <p className="text-xs text-slate-400 mt-1">{formatMoney(metricasClientes.deudaTotal)} adeudado</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 mb-2">Cobrado</p>
                <p className="text-2xl font-bold text-blue-600">{formatMoney(metricasClientes.ingresoReal)}</p>
                <p className="text-xs text-slate-400 mt-1">{metricasClientes.porcentajeCobro}% del esperado</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 mb-2">Esperado</p>
                <p className="text-2xl font-bold text-slate-700">{formatMoney(metricasClientes.ingresoEsperado)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Lista de clientes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Clientes con abono mensual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar cliente..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pagado">Pagados</SelectItem>
                    <SelectItem value="moroso">Morosos</SelectItem>
                    <SelectItem value="pendiente">Pendientes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {metricasClientes.clientesMes
                  .filter(c =>
                    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
                    (filtroEstado === 'todos' || c.estado_actual === filtroEstado)
                  )
                  .map(c => {
                    const config = getEstadoBadge(c.estado_actual);
                    return (
                      <div key={c.id} className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{c.nombre}</p>
                          <p className="text-xs text-slate-500">{c.clasificacion}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge className={`${config.bg} ${config.text}`}>{config.label}</Badge>
                          <p className="text-sm font-semibold text-slate-900">
                            {c.montoPagado > 0 ? formatMoney(c.montoPagado) : '-'}
                          </p>
                          {c.deuda > 0 && (
                            <p className="text-xs text-rose-600 font-medium">Debe: {formatMoney(c.deuda)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB OCUPACIÓN */}
        <TabsContent value="ocupacion" className="space-y-6">
          {/* KPIs Ocupación */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 mb-2">Ocupación</p>
                <p className="text-3xl font-bold text-emerald-600">{metricasOcupacion.ocupacionPorcentaje}%</p>
                <p className="text-xs text-slate-400 mt-1">{metricasOcupacion.slotsOcupados} / {metricasOcupacion.totalSlotsDisponibles} slots</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 mb-2">Turnos</p>
                <p className="text-3xl font-bold text-blue-600">{metricasOcupacion.totalTurnos}</p>
                <p className="text-xs text-slate-400 mt-1">en el período</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-600 mb-2">Cobrado</p>
                <p className="text-2xl font-bold text-emerald-700">{formatMoney(metricasOcupacion.ingresoCobrado)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-600 mb-2">Pendiente</p>
                <p className="text-2xl font-bold text-blue-600">{formatMoney(metricasOcupacion.ingresoPendiente)}</p>
              </CardContent>
            </Card>
          </div>

          <ReporteOcupacion turnos={turnosFiltrados} />
        </TabsContent>
      </Tabs>
    </div>
  );
}