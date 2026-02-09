import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, startOfMonth, endOfMonth, addDays, isBefore, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function DashboardCobros() {
  const [mesSeleccionado, setMesSeleccionado] = useState(format(new Date(), 'yyyy-MM'));
  const [filtroEstado, setFiltroEstado] = useState('todos');

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  // Cargar datos
  const { data: cobrosClientes = [] } = useQuery({
    queryKey: ['cobros-clientes'],
    queryFn: () => base44.entities.CobroCliente.list('-fecha_vencimiento', 500),
  });

  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list('nombre', 500),
  });

  const { data: turnosCancha = [] } = useQuery({
    queryKey: ['turnos-cancha-cobros'],
    queryFn: () => base44.entities.TurnoCancha.list('-fecha', 500),
  });

  const { data: clases = [] } = useQuery({
    queryKey: ['clases-cobros'],
    queryFn: () => base44.entities.Clase.list('-fecha', 500),
  });

  const { data: pagos = [] } = useQuery({
    queryKey: ['pagos'],
    queryFn: () => base44.entities.Pago.list('-fecha', 500),
  });

  // Calcular estadísticas generales
  const estadisticas = useMemo(() => {
    const hoy = format(new Date(), 'yyyy-MM-dd');
    const proximosDias = format(addDays(new Date(), 7), 'yyyy-MM-dd');

    // Cobros clientes
    const cobrosPendientes = cobrosClientes.filter(c => c.estado === 'pendiente');
    const cobrosMorosos = cobrosClientes.filter(c => c.estado === 'moroso');
    const cobrosHoy = cobrosClientes.filter(c => c.fecha_vencimiento === hoy && c.estado === 'pendiente');
    const cobrosProximos = cobrosClientes.filter(c => 
      c.fecha_vencimiento > hoy && 
      c.fecha_vencimiento <= proximosDias && 
      c.estado === 'pendiente'
    );

    const totalCobrosPendientes = cobrosPendientes.reduce((sum, c) => sum + (c.monto || 0), 0);
    const totalCobrosMorosos = cobrosMorosos.reduce((sum, c) => sum + (c.monto || 0), 0);
    const totalCobrosHoy = cobrosHoy.reduce((sum, c) => sum + (c.monto || 0), 0);

    // Alumnos
    const alumnosMorosos = alumnos.filter(a => a.estado === 'moroso' || a.estado_mes_actual === 'moroso');
    const alumnosDeben = alumnos.filter(a => a.estado_mes_actual === 'debe' || a.deuda_total > 0);
    const alumnosAlDia = alumnos.filter(a => a.estado_mes_actual === 'pagado');

    const totalDeudaAlumnos = alumnos.reduce((sum, a) => sum + (a.deuda_total || 0), 0);
    const ingresoEsperadoAlumnos = alumnos
      .filter(a => a.estado === 'activo')
      .reduce((sum, a) => sum + (a.precio_mensual || 0), 0);

    // Turnos de cancha pendientes de pago
    const turnosPendientesPago = turnosCancha.filter(t => 
      !t.pagado && 
      t.estado === 'activo' &&
      t.tipo_turno === 'alquiler'
    );
    const totalTurnosPendientes = turnosPendientesPago.reduce((sum, t) => sum + (t.monto || 0), 0);

    // Turnos de cancha del mes
    const inicioMes = format(startOfMonth(parseISO(mesSeleccionado + '-01')), 'yyyy-MM-dd');
    const finMes = format(endOfMonth(parseISO(mesSeleccionado + '-01')), 'yyyy-MM-dd');
    
    const turnosMes = turnosCancha.filter(t => 
      t.fecha >= inicioMes && 
      t.fecha <= finMes &&
      t.tipo_turno === 'alquiler' &&
      t.estado === 'activo'
    );
    const turnosPagadosMes = turnosMes.filter(t => t.pagado);
    const ingresoRealTurnos = turnosPagadosMes.reduce((sum, t) => sum + (t.monto || 0), 0);
    const ingresoEsperadoTurnos = turnosMes.reduce((sum, t) => sum + (t.monto || 0), 0);

    // Pagos del mes
    const pagosMes = pagos.filter(p => p.mes_correspondiente === mesSeleccionado);
    const ingresoRealPagos = pagosMes.reduce((sum, p) => sum + (p.monto || 0), 0);

    return {
      // Cobros clientes
      cobrosPendientes: cobrosPendientes.length,
      cobrosMorosos: cobrosMorosos.length,
      cobrosHoy: cobrosHoy.length,
      cobrosProximos: cobrosProximos.length,
      totalCobrosPendientes,
      totalCobrosMorosos,
      totalCobrosHoy,

      // Alumnos
      alumnosMorosos: alumnosMorosos.length,
      alumnosDeben: alumnosDeben.length,
      alumnosAlDia: alumnosAlDia.length,
      totalDeudaAlumnos,
      ingresoEsperadoAlumnos,

      // Turnos
      turnosPendientesPago: turnosPendientesPago.length,
      totalTurnosPendientes,
      ingresoRealTurnos,
      ingresoEsperadoTurnos,

      // Pagos
      ingresoRealPagos,

      // Totales
      ingresoTotalEsperado: ingresoEsperadoAlumnos + ingresoEsperadoTurnos,
      ingresoTotalReal: ingresoRealPagos + ingresoRealTurnos,
      deudaTotal: totalCobrosPendientes + totalCobrosMorosos + totalDeudaAlumnos + totalTurnosPendientes,

      // Detalles
      listaMorosos: [...alumnosMorosos, ...cobrosClientes.filter(c => c.estado === 'moroso')],
      listaCobrosHoy: cobrosHoy,
      listaCobrosProximos: cobrosProximos,
      listaTurnosPendientes: turnosPendientesPago,
    };
  }, [cobrosClientes, alumnos, turnosCancha, pagos, mesSeleccionado]);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Filtrar cobros según filtro
  const cobrosFiltrados = useMemo(() => {
    if (filtroEstado === 'todos') return cobrosClientes;
    return cobrosClientes.filter(c => c.estado === filtroEstado);
  }, [cobrosClientes, filtroEstado]);

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-slate-600">Solo administradores pueden acceder a este dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard de Cobros</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Control financiero y gestión de pagos</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={mesSeleccionado} onValueChange={setMesSeleccionado}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 6 }, (_, i) => {
                  const date = addDays(startOfMonth(new Date()), -i * 30);
                  const mes = format(date, 'yyyy-MM');
                  return (
                    <SelectItem key={mes} value={mes}>
                      {format(date, 'MMMM yyyy', { locale: es })}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="shadow-sm border-rose-200 bg-rose-50/30">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-rose-600">{estadisticas.cobrosMorosos}</p>
                  <p className="text-xs text-slate-600">Morosos</p>
                  <p className="text-xs font-semibold text-rose-700">{formatMoney(estadisticas.totalCobrosMorosos)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-amber-200 bg-amber-50/30">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{estadisticas.cobrosHoy}</p>
                  <p className="text-xs text-slate-600">Vencen hoy</p>
                  <p className="text-xs font-semibold text-amber-700">{formatMoney(estadisticas.totalCobrosHoy)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{estadisticas.alumnosAlDia}</p>
                  <p className="text-xs text-slate-600">Al día</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-blue-200 bg-blue-50/30">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-600">{formatMoney(estadisticas.deudaTotal)}</p>
                  <p className="text-xs text-slate-600">Total a cobrar</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumen Mensual */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Resumen del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Ingreso Esperado</p>
                <p className="text-2xl font-bold text-slate-900">{formatMoney(estadisticas.ingresoTotalEsperado)}</p>
              </div>
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <p className="text-sm text-emerald-700 mb-1">Ingreso Real</p>
                <p className="text-2xl font-bold text-emerald-600">{formatMoney(estadisticas.ingresoTotalReal)}</p>
              </div>
              <div className="text-center p-4 bg-rose-50 rounded-lg">
                <p className="text-sm text-rose-700 mb-1">Pendiente</p>
                <p className="text-2xl font-bold text-rose-600">
                  {formatMoney(estadisticas.ingresoTotalEsperado - estadisticas.ingresoTotalReal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="morosos" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="morosos">
              Morosos ({estadisticas.cobrosMorosos + estadisticas.alumnosMorosos})
            </TabsTrigger>
            <TabsTrigger value="hoy">
              Hoy ({estadisticas.cobrosHoy})
            </TabsTrigger>
            <TabsTrigger value="proximos">
              Próximos ({estadisticas.cobrosProximos})
            </TabsTrigger>
            <TabsTrigger value="turnos">
              Turnos ({estadisticas.turnosPendientesPago})
            </TabsTrigger>
          </TabsList>

          {/* Tab Morosos */}
          <TabsContent value="morosos" className="space-y-3">
            {/* Alumnos Morosos */}
            {alumnos.filter(a => a.estado === 'moroso' || a.estado_mes_actual === 'moroso').length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Alumnos Morosos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {alumnos
                      .filter(a => a.estado === 'moroso' || a.estado_mes_actual === 'moroso')
                      .map(alumno => (
                        <div key={alumno.id} className="flex items-center justify-between p-3 bg-rose-50 rounded-lg border border-rose-200">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">{alumno.nombre}</p>
                            <p className="text-sm text-slate-600">Profesor: {alumno.profesor_nombre}</p>
                            <p className="text-xs text-slate-500">
                              Deuda: {formatMoney(alumno.deuda_total)} | Mensual: {formatMoney(alumno.precio_mensual)}
                            </p>
                          </div>
                          <Badge variant="destructive">Moroso</Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cobros Clientes Morosos */}
            {cobrosClientes.filter(c => c.estado === 'moroso').length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Clientes Morosos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {cobrosClientes
                      .filter(c => c.estado === 'moroso')
                      .map(cobro => (
                        <div key={cobro.id} className="flex items-center justify-between p-3 bg-rose-50 rounded-lg border border-rose-200">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">{cobro.cliente_nombre}</p>
                            <p className="text-sm text-slate-600">
                              {cobro.tipo_cobro === 'abono_mensual' ? 'Abono Mensual' : 'Cancha Suelta'}
                            </p>
                            <p className="text-xs text-slate-500">
                              Vencimiento: {cobro.fecha_vencimiento ? format(parseISO(cobro.fecha_vencimiento), "d 'de' MMMM", { locale: es }) : 'N/A'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-rose-600">{formatMoney(cobro.monto)}</p>
                            <Badge variant="destructive">Moroso</Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab Cobros Hoy */}
          <TabsContent value="hoy" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cobros que vencen hoy</CardTitle>
              </CardHeader>
              <CardContent>
                {estadisticas.listaCobrosHoy.length > 0 ? (
                  <div className="space-y-2">
                    {estadisticas.listaCobrosHoy.map(cobro => (
                      <div key={cobro.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{cobro.cliente_nombre}</p>
                          <p className="text-sm text-slate-600">
                            {cobro.tipo_cobro === 'abono_mensual' ? 'Abono Mensual' : 'Cancha Suelta'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-amber-600">{formatMoney(cobro.monto)}</p>
                          <Badge className="bg-amber-100 text-amber-800">Vence hoy</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-8">No hay cobros que venzan hoy</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Próximos */}
          <TabsContent value="proximos" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cobros próximos (7 días)</CardTitle>
              </CardHeader>
              <CardContent>
                {estadisticas.listaCobrosProximos.length > 0 ? (
                  <div className="space-y-2">
                    {estadisticas.listaCobrosProximos.map(cobro => (
                      <div key={cobro.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{cobro.cliente_nombre}</p>
                          <p className="text-sm text-slate-600">
                            {cobro.tipo_cobro === 'abono_mensual' ? 'Abono Mensual' : 'Cancha Suelta'}
                          </p>
                          <p className="text-xs text-slate-500">
                            Vence: {cobro.fecha_vencimiento ? format(parseISO(cobro.fecha_vencimiento), "d 'de' MMMM", { locale: es }) : 'N/A'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">{formatMoney(cobro.monto)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-8">No hay cobros próximos</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Turnos */}
          <TabsContent value="turnos" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Turnos pendientes de pago</CardTitle>
              </CardHeader>
              <CardContent>
                {estadisticas.listaTurnosPendientes.length > 0 ? (
                  <div className="space-y-2">
                    {estadisticas.listaTurnosPendientes.slice(0, 20).map(turno => (
                      <div key={turno.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{turno.cliente}</p>
                          <p className="text-sm text-slate-600">
                            Cancha {turno.cancha} - {turno.fecha} {turno.hora_inicio}
                          </p>
                          <p className="text-xs text-slate-500">
                            {turno.modalidad_alquiler === 'abono' ? 'Con abono' : 'Cancha suelta'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900">{formatMoney(turno.monto)}</p>
                          <Badge variant="outline">No pagado</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-8">No hay turnos pendientes de pago</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}