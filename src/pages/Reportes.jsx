import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FileText,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import MetricCard from '@/components/ui/MetricCard';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

export default function Reportes() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStr = format(currentMonth, 'yyyy-MM');
  
  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
  });
  
  const { data: clases = [] } = useQuery({
    queryKey: ['clases'],
    queryFn: () => base44.entities.Clase.list(),
  });
  
  const { data: pagos = [] } = useQuery({
    queryKey: ['pagos'],
    queryFn: () => base44.entities.Pago.list(),
  });
  
  const { data: asistencias = [] } = useQuery({
    queryKey: ['asistencias'],
    queryFn: () => base44.entities.Asistencia.list(),
  });
  
  // Clases del mes
  const clasesMes = useMemo(() => {
    return clases.filter(c => c.fecha?.startsWith(monthStr));
  }, [clases, monthStr]);
  
  // Pagos del mes
  const pagosMes = useMemo(() => {
    return pagos.filter(p => p.mes_correspondiente === monthStr);
  }, [pagos, monthStr]);
  
  // Stats del mes
  const stats = useMemo(() => {
    const alumnosActivos = alumnos.filter(a => a.estado !== 'pausado');
    const ingresoEsperado = alumnosActivos.reduce((sum, a) => sum + (a.precio_mensual || 0), 0);
    const ingresoReal = pagosMes.reduce((sum, p) => sum + (p.monto || 0), 0);
    
    const realizadas = clasesMes.filter(c => c.estado === 'realizada').length;
    const canceladas = clasesMes.filter(c => 
      ['cancelada_anticipada', 'cancelada_tarde', 'no_show', 'suspendida'].includes(c.estado)
    ).length;
    const programadas = clasesMes.filter(c => c.estado === 'programada').length;
    
    return {
      alumnosActivos: alumnosActivos.length,
      morosos: alumnos.filter(a => a.estado === 'moroso').length,
      ingresoEsperado,
      ingresoReal,
      porcentajeCobrado: ingresoEsperado > 0 ? Math.round((ingresoReal / ingresoEsperado) * 100) : 0,
      totalClases: clasesMes.length,
      realizadas,
      canceladas,
      programadas,
      tasaRealizacion: clasesMes.length > 0 ? Math.round((realizadas / clasesMes.length) * 100) : 0,
    };
  }, [alumnos, clasesMes, pagosMes]);
  
  // Datos para gráficos
  const clasesChartData = useMemo(() => [
    { name: 'Realizadas', value: stats.realizadas, color: '#10b981' },
    { name: 'Canceladas', value: stats.canceladas, color: '#f59e0b' },
    { name: 'Programadas', value: stats.programadas, color: '#6366f1' },
  ], [stats]);
  
  const alumnosChartData = useMemo(() => [
    { name: 'Activos', value: stats.alumnosActivos - stats.morosos, color: '#10b981' },
    { name: 'Morosos', value: stats.morosos, color: '#ef4444' },
  ], [stats]);
  
  // Ranking de deudores
  const rankingDeudores = useMemo(() => {
    return alumnos
      .filter(a => a.deuda_total > 0)
      .sort((a, b) => (b.deuda_total || 0) - (a.deuda_total || 0))
      .slice(0, 10);
  }, [alumnos]);
  
  // Ingresos últimos 6 meses
  const ingresosHistoricos = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(currentMonth, i);
      const monthKey = format(month, 'yyyy-MM');
      const monthPagos = pagos.filter(p => p.mes_correspondiente === monthKey);
      const total = monthPagos.reduce((sum, p) => sum + (p.monto || 0), 0);
      data.push({
        mes: format(month, 'MMM', { locale: es }),
        ingreso: total,
      });
    }
    return data;
  }, [pagos, currentMonth]);
  
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };
  
  const handlePrevMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
            <p className="text-slate-500 text-sm">
              Análisis y estadísticas del negocio
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border rounded-lg">
              <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-3 font-medium text-sm capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: es })}
              </span>
              <Button variant="ghost" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Ingreso del mes"
            value={formatMoney(stats.ingresoReal)}
            subtitle={`${stats.porcentajeCobrado}% del esperado`}
            icon={DollarSign}
            variant={stats.porcentajeCobrado >= 80 ? 'success' : 'warning'}
          />
          <MetricCard
            title="Clases realizadas"
            value={stats.realizadas}
            subtitle={`${stats.tasaRealizacion}% de efectividad`}
            icon={Calendar}
            variant="info"
          />
          <MetricCard
            title="Alumnos activos"
            value={stats.alumnosActivos}
            icon={Users}
            variant="default"
          />
          <MetricCard
            title="Morosos"
            value={stats.morosos}
            icon={Clock}
            variant={stats.morosos > 0 ? 'danger' : 'success'}
          />
        </div>
        
        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Ingresos históricos */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Ingresos últimos 6 meses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={ingresosHistoricos}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip 
                    formatter={(value) => formatMoney(value)}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="ingreso" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {/* Distribución de clases */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Estado de clases del mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={clasesChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {clasesChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        
        {/* Rankings */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Ranking deudores */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-rose-600">Ranking de deudores</CardTitle>
            </CardHeader>
            <CardContent>
              {rankingDeudores.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No hay deudores</p>
              ) : (
                <div className="space-y-3">
                  {rankingDeudores.map((alumno, idx) => (
                    <div key={alumno.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-medium text-slate-800">{alumno.nombre}</span>
                      </div>
                      <span className="font-bold text-rose-600">{formatMoney(alumno.deuda_total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Resumen del mes */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Resumen del mes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-slate-600">Total clases programadas</span>
                  <span className="font-semibold">{stats.totalClases}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-slate-600">Clases realizadas</span>
                  <span className="font-semibold text-emerald-600">{stats.realizadas}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-slate-600">Clases canceladas</span>
                  <span className="font-semibold text-amber-600">{stats.canceladas}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-slate-600">Tasa de efectividad</span>
                  <span className="font-semibold">{stats.tasaRealizacion}%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-slate-600">Ingreso esperado</span>
                  <span className="font-semibold">{formatMoney(stats.ingresoEsperado)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-slate-600">Ingreso real</span>
                  <span className="font-semibold text-emerald-600">{formatMoney(stats.ingresoReal)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-600">% Cobrado</span>
                  <span className={`font-bold text-lg ${
                    stats.porcentajeCobrado >= 80 ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {stats.porcentajeCobrado}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}