import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Clock, Calendar, Activity, DollarSign, 
  CheckCircle, AlertCircle, Lightbulb, Target, MessageCircle, Mail, 
  ChevronDown, ChevronUp, CreditCard
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import RegistrarCobroModal from '@/components/dashboard-admin/RegistrarCobroModal';
import ReporteOcupacion from '@/components/reportes/ReporteOcupacion';

const HORARIOS = [];
for (let h = 8; h <= 21; h++) {
  HORARIOS.push(`${h.toString().padStart(2, '0')}:00`);
  if (h < 21) HORARIOS.push(`${h.toString().padStart(2, '0')}:30`);
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function DashboardAdmin() {
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date());
  const mesStr = format(mesSeleccionado, 'yyyy-MM');

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  // Datos para Ocupación
  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos-cancha'],
    queryFn: () => base44.entities.TurnoCancha.list('-fecha', 500),
  });

  // Datos para Cobros
  const { data: cobrosClientes = [] } = useQuery({
    queryKey: ['cobros-clientes'],
    queryFn: () => base44.entities.CobroCliente.list('-fecha_vencimiento', 500),
  });

  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list('nombre', 500),
  });

  const { data: pagos = [] } = useQuery({
    queryKey: ['pagos'],
    queryFn: () => base44.entities.Pago.list('-fecha', 500),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nombre', 500),
  });

  const { data: clases = [] } = useQuery({
    queryKey: ['clases'],
    queryFn: () => base44.entities.Clase.list('-fecha', 1000),
  });

  const { data: profesores = [] } = useQuery({
    queryKey: ['profesores'],
    queryFn: () => base44.entities.Profesor.list('nombre'),
  });

  // Filtrar turnos según período
  const turnosFiltrados = useMemo(() => {
    const inicio = startOfMonth(mesSeleccionado);
    const fin = endOfMonth(mesSeleccionado);
    
    return turnos.filter(t => {
      const fecha = parseISO(t.fecha);
      return fecha >= inicio && fecha <= fin;
    });
  }, [turnos, mesSeleccionado]);

  // Métricas de Ocupación
  const ocupacionPorHorario = useMemo(() => {
    const conteo = {};
    HORARIOS.forEach(h => conteo[h] = 0);
    
    turnosFiltrados.forEach(turno => {
      if (conteo[turno.hora_inicio] !== undefined) {
        conteo[turno.hora_inicio]++;
      }
    });
    
    return HORARIOS.map(hora => ({
      hora,
      cantidad: conteo[hora],
      porcentaje: turnosFiltrados.length > 0 ? ((conteo[hora] / turnosFiltrados.length) * 100).toFixed(1) : 0,
    }));
  }, [turnosFiltrados]);

  const ocupacionPorDia = useMemo(() => {
    const conteo = {};
    DIAS_SEMANA.forEach(d => conteo[d] = 0);
    
    turnosFiltrados.forEach(turno => {
      const fecha = parseISO(turno.fecha);
      const diaSemana = format(fecha, 'EEEE', { locale: es });
      const diaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
      if (conteo[diaCapitalizado] !== undefined) {
        conteo[diaCapitalizado]++;
      }
    });
    
    return DIAS_SEMANA.map(dia => ({
      dia,
      cantidad: conteo[dia],
    }));
  }, [turnosFiltrados]);

  const metricasOcupacion = useMemo(() => {
    const totalTurnos = turnosFiltrados.length;
    const diasDelMes = eachDayOfInterval({
      start: startOfMonth(mesSeleccionado),
      end: endOfMonth(mesSeleccionado),
    }).length;

    // Calcular slots disponibles: 4 canchas × 27 franjas de 30 min (08:00-21:30) × dias del mes
    const franjasHorarias = 27; // 13.5 horas × 2 franjas de 30 min
    const slotsDisponiblesPorDia = 4 * franjasHorarias;
    const totalSlotsDisponibles = slotsDisponiblesPorDia * diasDelMes;

    // Calcular slots ocupados: contar franjas de 30 min que ocupa cada turno
    const slotsOcupados = turnosFiltrados.reduce((sum, t) => {
      const franjasOcupadas = Math.ceil(t.duracion / 30);
      return sum + franjasOcupadas;
    }, 0);

    const ocupacionPorcentaje = totalSlotsDisponibles > 0 
      ? ((slotsOcupados / totalSlotsDisponibles) * 100).toFixed(1)
      : 0;
    
    const ordenados = [...ocupacionPorHorario].sort((a, b) => b.cantidad - a.cantidad);
    const masUsados = ordenados.slice(0, 3);
    const menosUsados = ordenados.slice(-3).reverse();
    
    const diaMaximo = ocupacionPorDia.reduce((max, d) => d.cantidad > max.cantidad ? d : max, ocupacionPorDia[0]);
    const diaMinimo = ocupacionPorDia.reduce((min, d) => d.cantidad < min.cantidad ? d : min, ocupacionPorDia[0]);
    
    const ingresoTotal = turnosFiltrados.reduce((sum, t) => sum + (t.monto || 0), 0);
    const ingresoCobrado = turnosFiltrados.filter(t => t.pagado).reduce((sum, t) => sum + (t.monto || 0), 0);
    const ingresoPendiente = ingresoTotal - ingresoCobrado;
    const turnosPagados = turnosFiltrados.filter(t => t.pagado).length;
    const turnosPendientes = totalTurnos - turnosPagados;
    const tasaCobro = totalTurnos > 0 ? ((turnosPagados / totalTurnos) * 100).toFixed(1) : 0;
    
    const ingresoClases = turnosFiltrados.filter(t => t.tipo_turno === 'clase').reduce((sum, t) => sum + (t.monto || 0), 0);
    const ingresoAlquileres = turnosFiltrados.filter(t => t.tipo_turno === 'alquiler').reduce((sum, t) => sum + (t.monto || 0), 0);
    
    const promedioTurno = totalTurnos > 0 ? (ingresoTotal / totalTurnos).toFixed(0) : 0;
    
    return {
      totalTurnos,
      ocupacionPorcentaje,
      slotsOcupados,
      totalSlotsDisponibles,
      masUsados,
      menosUsados,
      diaMaximo,
      diaMinimo,
      ingresoTotal,
      ingresoCobrado,
      ingresoPendiente,
      turnosPagados,
      turnosPendientes,
      tasaCobro,
      ingresoClases,
      ingresoAlquileres,
      promedioTurno,
    };
  }, [turnosFiltrados, ocupacionPorHorario, ocupacionPorDia, mesSeleccionado]);

  // Métricas de Cobros
  const metricasCobros = useMemo(() => {
    const hoy = format(new Date(), 'yyyy-MM-dd');
    const proximosDias = format(addDays(new Date(), 7), 'yyyy-MM-dd');

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

    const alumnosMorosos = alumnos.filter(a => a.estado === 'moroso' || a.estado_mes_actual === 'moroso');
    const alumnosDeben = alumnos.filter(a => a.estado_mes_actual === 'debe' || a.deuda_total > 0);
    const alumnosAlDia = alumnos.filter(a => a.estado_mes_actual === 'pagado');

    const totalDeudaAlumnos = alumnos.reduce((sum, a) => sum + (a.deuda_total || 0), 0);
    const ingresoEsperadoAlumnos = alumnos
      .filter(a => a.estado === 'activo')
      .reduce((sum, a) => sum + (a.precio_mensual || 0), 0);

    const turnosPendientesPago = turnos.filter(t => 
      !t.pagado && 
      t.estado === 'activo' &&
      t.tipo_turno === 'alquiler'
    );
    const totalTurnosPendientes = turnosPendientesPago.reduce((sum, t) => sum + (t.monto || 0), 0);

    const inicioMes = format(startOfMonth(parseISO(mesStr + '-01')), 'yyyy-MM-dd');
    const finMes = format(endOfMonth(parseISO(mesStr + '-01')), 'yyyy-MM-dd');
    
    const turnosMes = turnos.filter(t => 
      t.fecha >= inicioMes && 
      t.fecha <= finMes &&
      t.tipo_turno === 'alquiler' &&
      t.estado === 'activo'
    );
    const turnosPagadosMes = turnosMes.filter(t => t.pagado);
    const ingresoRealTurnos = turnosPagadosMes.reduce((sum, t) => sum + (t.monto || 0), 0);
    const ingresoEsperadoTurnos = turnosMes.reduce((sum, t) => sum + (t.monto || 0), 0);

    const pagosMes = pagos.filter(p => p.mes_correspondiente === mesStr);
    const ingresoRealPagos = pagosMes.reduce((sum, p) => sum + (p.monto || 0), 0);

    return {
      cobrosPendientes: cobrosPendientes.length,
      cobrosMorosos: cobrosMorosos.length,
      cobrosHoy: cobrosHoy.length,
      cobrosProximos: cobrosProximos.length,
      totalCobrosPendientes,
      totalCobrosMorosos,
      totalCobrosHoy,
      alumnosMorosos: alumnosMorosos.length,
      alumnosDeben: alumnosDeben.length,
      alumnosAlDia: alumnosAlDia.length,
      totalDeudaAlumnos,
      ingresoEsperadoAlumnos,
      turnosPendientesPago: turnosPendientesPago.length,
      totalTurnosPendientes,
      ingresoRealTurnos,
      ingresoEsperadoTurnos,
      ingresoRealPagos,
      ingresoTotalEsperado: ingresoEsperadoAlumnos + ingresoEsperadoTurnos,
      ingresoTotalReal: ingresoRealPagos + ingresoRealTurnos,
      deudaTotal: totalCobrosPendientes + totalCobrosMorosos + totalDeudaAlumnos + totalTurnosPendientes,
      listaMorosos: [...alumnosMorosos, ...cobrosClientes.filter(c => c.estado === 'moroso')],
      listaCobrosHoy: cobrosHoy,
      listaCobrosProximos: cobrosProximos,
      listaTurnosPendientes: turnosPendientesPago,
    };
  }, [cobrosClientes, alumnos, turnos, pagos, mesStr]);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const enviarWhatsApp = (cobro) => {
    const cliente = clientes.find(c => c.id === cobro.cliente_id) || 
                    alumnos.find(a => a.id === cobro.cliente_id);
    
    if (!cliente) return;

    const telefono = cliente.telefono || cliente.whatsapp || '';
    const mensaje = `Hola ${cobro.cliente_nombre}, te recordamos que tenés un pago pendiente de ${formatMoney(cobro.monto)} con vencimiento el ${format(parseISO(cobro.fecha_vencimiento), "d 'de' MMMM", { locale: es })}. ¡Gracias!`;
    
    const url = `https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const enviarEmail = (cobro) => {
    const cliente = clientes.find(c => c.id === cobro.cliente_id) || 
                    alumnos.find(a => a.id === cobro.cliente_id);
    
    if (!cliente) return;

    const email = cliente.email || '';
    const asunto = `Recordatorio de pago - ${cobro.tipo_cobro === 'abono_mensual' ? 'Abono mensual' : 'Cancha suelta'}`;
    const cuerpo = `Hola ${cobro.cliente_nombre},\n\nTe recordamos que tenés un pago pendiente:\n\nMonto: ${formatMoney(cobro.monto)}\nVencimiento: ${format(parseISO(cobro.fecha_vencimiento), "d 'de' MMMM 'de' yyyy", { locale: es })}\n\n¡Gracias!`;
    
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard Administrativo</h1>
            <p className="text-slate-500 text-sm">Control de ocupación y finanzas</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMesSeleccionado(new Date(mesSeleccionado.getFullYear(), mesSeleccionado.getMonth() - 1))}
              className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setMesSeleccionado(new Date())}
              className="px-3 py-2 text-sm bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors"
            >
              Mes actual
            </button>
            <button
              onClick={() => setMesSeleccionado(new Date(mesSeleccionado.getFullYear(), mesSeleccionado.getMonth() + 1))}
              className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Siguiente →
            </button>
          </div>
        </header>

        {/* Selector de mes */}
        <Card className="shadow-sm">
          <CardContent className="py-4">
            <div className="flex items-center justify-center">
              <p className="font-semibold text-slate-900 text-lg">
                {format(mesSeleccionado, "MMMM yyyy", { locale: es })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="resumen" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="resumen" className="text-xs lg:text-sm">Resumen</TabsTrigger>
            <TabsTrigger value="ocupacion" className="text-xs lg:text-sm">Ocupación</TabsTrigger>
          </TabsList>

          {/* TAB RESUMEN (Dashboard actual simplificado) */}
          <TabsContent value="resumen" className="space-y-6">
            {/* KPIs principales */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Ocupación</p>
                      <p className="text-3xl font-bold text-emerald-600">{metricasOcupacion.ocupacionPorcentaje}%</p>
                    </div>
                    <Activity className="w-10 h-10 text-emerald-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Turnos</p>
                      <p className="text-3xl font-bold text-blue-600">{metricasOcupacion.totalTurnos}</p>
                    </div>
                    <Calendar className="w-10 h-10 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Cobrado</p>
                      <p className="text-2xl font-bold text-emerald-700">
                        {formatMoney(metricasOcupacion.ingresoCobrado)}
                      </p>
                    </div>
                    <CheckCircle className="w-10 h-10 text-emerald-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-rose-200 bg-rose-50/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Morosos</p>
                      <p className="text-2xl font-bold text-rose-600">{metricasCobros.cobrosMorosos}</p>
                    </div>
                    <AlertCircle className="w-10 h-10 text-rose-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Resumen Financiero */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Resumen Financiero del Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">Ingreso Esperado</p>
                    <p className="text-2xl font-bold text-slate-900">{formatMoney(metricasCobros.ingresoTotalEsperado)}</p>
                  </div>
                  <div className="text-center p-4 bg-emerald-50 rounded-lg">
                    <p className="text-sm text-emerald-700 mb-1">Ingreso Real</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatMoney(metricasCobros.ingresoTotalReal)}</p>
                  </div>
                  <div className="text-center p-4 bg-rose-50 rounded-lg">
                    <p className="text-sm text-rose-700 mb-1">Pendiente</p>
                    <p className="text-2xl font-bold text-rose-600">
                      {formatMoney(metricasCobros.ingresoTotalEsperado - metricasCobros.ingresoTotalReal)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB OCUPACIÓN */}
          <TabsContent value="ocupacion">
            <ReporteOcupacion turnos={turnosFiltrados} />
          </TabsContent>

          {/* TAB OCUPACIÓN ORIGINAL (eliminado, ahora está en ReporteOcupacion) */}
          <TabsContent value="ocupacion-old" className="space-y-6 hidden">
            {/* KPIs principales */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Ocupación Total</p>
                      <p className="text-3xl font-bold text-emerald-600">{metricasOcupacion.ocupacionPorcentaje}%</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {metricasOcupacion.slotsOcupados} de {metricasOcupacion.totalSlotsDisponibles} slots
                      </p>
                    </div>
                    <Activity className="w-10 h-10 text-emerald-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Total Turnos</p>
                      <p className="text-3xl font-bold text-blue-600">{metricasOcupacion.totalTurnos}</p>
                      <p className="text-xs text-slate-400 mt-1">En el período</p>
                    </div>
                    <Calendar className="w-10 h-10 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm text-slate-500 mb-2">Día más ocupado</p>
                    <p className="text-xl font-bold text-slate-900">{metricasOcupacion.diaMaximo?.dia}</p>
                    <p className="text-sm text-slate-600">{metricasOcupacion.diaMaximo?.cantidad} turnos</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm text-slate-500 mb-2">Día menos ocupado</p>
                    <p className="text-xl font-bold text-slate-900">{metricasOcupacion.diaMinimo?.dia}</p>
                    <p className="text-sm text-slate-600">{metricasOcupacion.diaMinimo?.cantidad} turnos</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de ocupación por horario */}
            <Card className="shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Ocupación por Franja Horaria
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={ocupacionPorHorario}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="hora" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      formatter={(value) => [value, 'Turnos']}
                    />
                    <Bar dataKey="cantidad" radius={[8, 8, 0, 0]}>
                      {ocupacionPorHorario.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.cantidad > 10 ? '#10b981' : entry.cantidad > 5 ? '#f59e0b' : '#ef4444'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Métricas Financieras de Turnos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Ingreso Total</p>
                      <p className="text-2xl font-bold text-emerald-700">
                        {formatMoney(metricasOcupacion.ingresoTotal)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Promedio: {formatMoney(metricasOcupacion.promedioTurno)}/turno
                      </p>
                    </div>
                    <DollarSign className="w-10 h-10 text-emerald-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-blue-200 bg-blue-50/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Cobrado</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {formatMoney(metricasOcupacion.ingresoCobrado)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {metricasOcupacion.turnosPagados} turnos ({metricasOcupacion.tasaCobro}%)
                      </p>
                    </div>
                    <CheckCircle className="w-10 h-10 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-amber-200 bg-amber-50/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Pendiente</p>
                      <p className="text-2xl font-bold text-amber-700">
                        {formatMoney(metricasOcupacion.ingresoPendiente)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {metricasOcupacion.turnosPendientes} turnos por cobrar
                      </p>
                    </div>
                    <AlertCircle className="w-10 h-10 text-amber-200" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB COBROS OPERACIONES (anterior) */}
          <TabsContent value="cobros-old" className="space-y-6 hidden">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="shadow-sm border-rose-200 bg-rose-50/30">
                <CardContent className="pt-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-rose-600">{metricasCobros.cobrosMorosos}</p>
                      <p className="text-xs text-slate-600">Morosos</p>
                      <p className="text-xs font-semibold text-rose-700">{formatMoney(metricasCobros.totalCobrosMorosos)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-amber-200 bg-amber-50/30">
                <CardContent className="pt-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">{metricasCobros.cobrosHoy}</p>
                      <p className="text-xs text-slate-600">Vencen hoy</p>
                      <p className="text-xs font-semibold text-amber-700">{formatMoney(metricasCobros.totalCobrosHoy)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
                <CardContent className="pt-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-600">{metricasCobros.alumnosAlDia}</p>
                      <p className="text-xs text-slate-600">Al día</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-blue-200 bg-blue-50/30">
                <CardContent className="pt-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-600">{formatMoney(metricasCobros.deudaTotal)}</p>
                      <p className="text-xs text-slate-600">Total a cobrar</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Resumen Mensual */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Resumen Financiero del Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">Ingreso Esperado</p>
                    <p className="text-2xl font-bold text-slate-900">{formatMoney(metricasCobros.ingresoTotalEsperado)}</p>
                  </div>
                  <div className="text-center p-4 bg-emerald-50 rounded-lg">
                    <p className="text-sm text-emerald-700 mb-1">Ingreso Real</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatMoney(metricasCobros.ingresoTotalReal)}</p>
                  </div>
                  <div className="text-center p-4 bg-rose-50 rounded-lg">
                    <p className="text-sm text-rose-700 mb-1">Pendiente</p>
                    <p className="text-2xl font-bold text-rose-600">
                      {formatMoney(metricasCobros.ingresoTotalEsperado - metricasCobros.ingresoTotalReal)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pendientes de Pago */}
            <Card className="shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  Pendientes de Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {metricasCobros.listaCobrosHoy.length === 0 && metricasCobros.listaCobrosProximos.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">No hay cobros pendientes próximos</p>
                    </div>
                  ) : (
                    <>
                      {[...metricasCobros.listaCobrosHoy, ...metricasCobros.listaCobrosProximos].map(cobro => {
                        const cliente = clientes.find(c => c.id === cobro.cliente_id) || 
                                       alumnos.find(a => a.id === cobro.cliente_id);
                        
                        return (
                          <div 
                            key={cobro.id} 
                            className="p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <p className="font-semibold text-slate-900">{cobro.cliente_nombre}</p>
                                <p className="text-sm text-slate-600">
                                  {cobro.tipo_cobro === 'abono_mensual' ? 'Abono mensual' : 'Cancha suelta'}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  Vence: {format(parseISO(cobro.fecha_vencimiento), "d 'de' MMM", { locale: es })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold text-blue-600">
                                  {formatMoney(cobro.monto)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => enviarWhatsApp(cobro)}
                                className="flex-1 gap-2"
                              >
                                <MessageCircle className="w-4 h-4" />
                                WhatsApp
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setCobroModal({ open: true, cobro, cliente });
                                }}
                                className="flex-1 gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                              >
                                <CreditCard className="w-4 h-4" />
                                Cobrar
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Morosos (Desplegable) */}
            {metricasCobros.cobrosMorosos > 0 && (
              <Collapsible
                open={morososExpanded}
                onOpenChange={setMorososExpanded}
              >
                <Card className="shadow-sm border-rose-200">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="border-b cursor-pointer hover:bg-rose-50/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-rose-600" />
                          Morosos - No pagaron del 5 al 15 ({metricasCobros.cobrosMorosos})
                        </CardTitle>
                        {morososExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-4">
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {cobrosClientes.filter(c => c.estado === 'moroso').map(cobro => {
                          const cliente = clientes.find(c => c.id === cobro.cliente_id) || 
                                         alumnos.find(a => a.id === cobro.cliente_id);
                          
                          return (
                            <div 
                              key={cobro.id} 
                              className="p-4 bg-rose-50 rounded-lg border border-rose-200"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <p className="font-semibold text-slate-900">{cobro.cliente_nombre}</p>
                                  <p className="text-sm text-slate-600">
                                    {cobro.tipo_cobro === 'abono_mensual' ? 'Abono mensual' : 'Cancha suelta'}
                                  </p>
                                  <p className="text-xs text-rose-600 mt-1 font-medium">
                                    Venció: {format(parseISO(cobro.fecha_vencimiento), "d 'de' MMM", { locale: es })}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xl font-bold text-rose-600">
                                    {formatMoney(cobro.monto)}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => enviarWhatsApp(cobro)}
                                  className="flex-1 gap-2"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  WhatsApp
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => enviarEmail(cobro)}
                                  className="flex-1 gap-2"
                                >
                                  <Mail className="w-4 h-4" />
                                  Email
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setCobroModal({ open: true, cobro, cliente });
                                  }}
                                  className="flex-1 gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                                >
                                  <CreditCard className="w-4 h-4" />
                                  Cobrar
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Registro de Cobro */}
      <RegistrarCobroModal
        open={cobroModal.open}
        onOpenChange={(open) => setCobroModal({ ...cobroModal, open })}
        cobro={cobroModal.cobro}
        cliente={cobroModal.cliente}
      />
    </div>
  );
}