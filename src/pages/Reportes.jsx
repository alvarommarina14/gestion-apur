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
  BarChart3,
  FileDown
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
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

export default function Reportes() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [profesorSeleccionado, setProfesorSeleccionado] = useState(null);
  const monthStr = format(currentMonth, 'yyyy-MM');
  
  // Cargar profesor seleccionado
  React.useEffect(() => {
    const profesorGuardado = localStorage.getItem('profesor_seleccionado');
    if (profesorGuardado) {
      try {
        setProfesorSeleccionado(JSON.parse(profesorGuardado));
      } catch (e) {
        console.error('Error parsing profesor seleccionado', e);
      }
    }
  }, []);
  
  const { data: profesores = [] } = useQuery({
    queryKey: ['profesores'],
    queryFn: () => base44.entities.Profesor.list(),
  });
  
  const { data: alumnosTodos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
  });
  
  // Filtrar alumnos por profesor
  const alumnos = useMemo(() => {
    if (!profesorSeleccionado) return alumnosTodos;
    return alumnosTodos.filter(a => a.profesor_id === profesorSeleccionado.id);
  }, [alumnosTodos, profesorSeleccionado]);
  
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
  
  const { data: recuperos = [] } = useQuery({
    queryKey: ['recuperos'],
    queryFn: () => base44.entities.Recupero.list(),
  });
  
  // Clases del mes filtradas por profesor
  const clasesMes = useMemo(() => {
    const clasesFiltradas = clases.filter(c => c.fecha?.startsWith(monthStr));
    if (!profesorSeleccionado) return clasesFiltradas;
    return clasesFiltradas.filter(c => c.profesor_id === profesorSeleccionado.id);
  }, [clases, monthStr, profesorSeleccionado]);
  
  // Pagos del mes filtrados por profesor
  const pagosMes = useMemo(() => {
    const pagosFiltrados = pagos.filter(p => p.mes_correspondiente === monthStr);
    if (!profesorSeleccionado) return pagosFiltrados;
    const alumnosIds = alumnos.map(a => a.id);
    return pagosFiltrados.filter(p => alumnosIds.includes(p.alumno_id));
  }, [pagos, monthStr, alumnos, profesorSeleccionado]);
  
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
  
  // Ingresos últimos 6 meses filtrados por profesor
  const ingresosHistoricos = useMemo(() => {
    const data = [];
    const alumnosIds = alumnos.map(a => a.id);
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(currentMonth, i);
      const monthKey = format(month, 'yyyy-MM');
      let monthPagos = pagos.filter(p => p.mes_correspondiente === monthKey);
      if (profesorSeleccionado) {
        monthPagos = monthPagos.filter(p => alumnosIds.includes(p.alumno_id));
      }
      const total = monthPagos.reduce((sum, p) => sum + (p.monto || 0), 0);
      data.push({
        mes: format(month, 'MMM', { locale: es }),
        ingreso: total,
      });
    }
    return data;
  }, [pagos, currentMonth, alumnos, profesorSeleccionado]);
  
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
  
  // Reportes por profesor - solo mostrar el profesor seleccionado si existe
  const reportePorProfesor = useMemo(() => {
    const profesoresToShow = profesorSeleccionado 
      ? profesores.filter(p => p.id === profesorSeleccionado.id)
      : profesores;
    
    return profesoresToShow.map(profesor => {
      const alumnosProf = alumnosTodos.filter(a => a.profesor_id === profesor.id);
      const clasesProf = clases.filter(c => 
        alumnosProf.some(a => c.alumnos_ids?.includes(a.id))
      );
      const clasesMesProf = clasesProf.filter(c => c.fecha?.startsWith(monthStr));
      const pagosProf = pagos.filter(p => 
        alumnosProf.some(a => a.id === p.alumno_id)
      );
      const pagosMesProf = pagosProf.filter(p => p.mes_correspondiente === monthStr);
      const recuperosProf = recuperos.filter(r => 
        alumnosProf.some(a => a.id === r.alumno_id)
      );
      
      const realizadas = clasesMesProf.filter(c => c.estado === 'realizada').length;
      const canceladas = clasesMesProf.filter(c => 
        ['cancelada_anticipada', 'cancelada_tarde', 'no_show', 'suspendida'].includes(c.estado)
      ).length;
      const recuperosPendientes = recuperosProf.filter(r => r.estado === 'pendiente').length;
      const recuperosRealizados = recuperosProf.filter(r => r.estado === 'realizado').length;
      
      const ingresoTotal = pagosMesProf.reduce((sum, p) => sum + (p.monto || 0), 0);
      const alumnosActivos = alumnosProf.filter(a => a.estado === 'activo').length;
      
      return {
        id: profesor.id,
        nombre: profesor.nombre,
        alumnosTotal: alumnosProf.length,
        alumnosActivos,
        clasesRealizadas: realizadas,
        clasesCanceladas: canceladas,
        recuperosPendientes,
        recuperosRealizados,
        ingresoMes: ingresoTotal,
        tasaRealizacion: clasesMesProf.length > 0 ? Math.round((realizadas / clasesMesProf.length) * 100) : 0,
      };
    });
  }, [profesores, alumnosTodos, clases, pagos, recuperos, monthStr, profesorSeleccionado]);
  
  // Reporte financiero detallado filtrado por profesor
  const reporteFinanciero = useMemo(() => {
    let pagosMesDetalle = pagos.filter(p => p.mes_correspondiente === monthStr);
    if (profesorSeleccionado) {
      const alumnosIds = alumnos.map(a => a.id);
      pagosMesDetalle = pagosMesDetalle.filter(p => alumnosIds.includes(p.alumno_id));
    }
    
    // Por medio de pago
    const porMedioPago = pagosMesDetalle.reduce((acc, p) => {
      const medio = p.medio_pago || 'Sin especificar';
      acc[medio] = (acc[medio] || 0) + (p.monto || 0);
      return acc;
    }, {});
    
    // Por tipo de alumno
    const porTipoAlumno = alumnosTodos.reduce((acc, alumno) => {
      const pagosAlumno = pagosMesDetalle.filter(p => p.alumno_id === alumno.id);
      const tipo = alumno.tipo_cliente || 'clase';
      const monto = pagosAlumno.reduce((sum, p) => sum + (p.monto || 0), 0);
      acc[tipo] = (acc[tipo] || 0) + monto;
      return acc;
    }, {});
    
    // Pagos fuera de término
    const fueraTermino = pagosMesDetalle.filter(p => p.fuera_de_termino).length;
    const montoFueraTermino = pagosMesDetalle
      .filter(p => p.fuera_de_termino)
      .reduce((sum, p) => sum + (p.monto || 0), 0);
    
    return {
      porMedioPago: Object.entries(porMedioPago).map(([medio, monto]) => ({
        medio,
        monto
      })),
      porTipoAlumno: Object.entries(porTipoAlumno).map(([tipo, monto]) => ({
        tipo: tipo === 'clase' ? 'Clases individuales' : 'Abonos mensuales',
        monto
      })),
      fueraTermino,
      montoFueraTermino,
      totalPagos: pagosMesDetalle.length,
      montoTotal: pagosMesDetalle.reduce((sum, p) => sum + (p.monto || 0), 0),
    };
  }, [pagos, alumnosTodos, monthStr, alumnos, profesorSeleccionado]);
  
  // Exportar a CSV
  const exportarCSV = (tipo) => {
    let data = [];
    let filename = '';
    
    if (tipo === 'profesores') {
      data = reportePorProfesor.map(p => ({
        'Profesor': p.nombre,
        'Alumnos Totales': p.alumnosTotal,
        'Alumnos Activos': p.alumnosActivos,
        'Clases Realizadas': p.clasesRealizadas,
        'Clases Canceladas': p.clasesCanceladas,
        'Recuperos Pendientes': p.recuperosPendientes,
        'Recuperos Realizados': p.recuperosRealizados,
        'Ingreso del Mes': p.ingresoMes,
        'Tasa de Realización %': p.tasaRealizacion,
      }));
      filename = `reporte_profesores_${monthStr}.csv`;
    } else if (tipo === 'financiero') {
      data = pagos
        .filter(p => p.mes_correspondiente === monthStr)
        .map(p => ({
          'Fecha': p.fecha,
          'Alumno': p.alumno_nombre,
          'Monto': p.monto,
          'Medio de Pago': p.medio_pago || 'Sin especificar',
          'Mes': p.mes_correspondiente,
          'Fuera de Término': p.fuera_de_termino ? 'Sí' : 'No',
          'Notas': p.notas || '',
        }));
      filename = `reporte_financiero_${monthStr}.csv`;
    }
    
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };
  
  // Exportar a PDF
  const exportarPDF = (tipo) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(18);
    doc.text('Reporte de Gestión de Clases', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(format(currentMonth, 'MMMM yyyy', { locale: es }).toUpperCase(), pageWidth / 2, 28, { align: 'center' });
    
    let y = 40;
    
    if (tipo === 'profesores') {
      doc.setFontSize(14);
      doc.text('Reporte por Profesor', 20, y);
      y += 10;
      
      reportePorProfesor.forEach((profesor, idx) => {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(`${idx + 1}. ${profesor.nombre}`, 20, y);
        y += 7;
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.text(`Alumnos: ${profesor.alumnosActivos} activos / ${profesor.alumnosTotal} total`, 25, y);
        y += 5;
        doc.text(`Clases: ${profesor.clasesRealizadas} realizadas, ${profesor.clasesCanceladas} canceladas`, 25, y);
        y += 5;
        doc.text(`Recuperos: ${profesor.recuperosPendientes} pendientes, ${profesor.recuperosRealizados} realizados`, 25, y);
        y += 5;
        doc.text(`Ingreso: $${profesor.ingresoMes.toLocaleString('es-AR')} - Tasa: ${profesor.tasaRealizacion}%`, 25, y);
        y += 10;
      });
    } else if (tipo === 'financiero') {
      doc.setFontSize(14);
      doc.text('Reporte Financiero', 20, y);
      y += 10;
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Resumen General', 20, y);
      y += 7;
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(`Total de pagos: ${reporteFinanciero.totalPagos}`, 25, y);
      y += 5;
      doc.text(`Monto total: $${reporteFinanciero.montoTotal.toLocaleString('es-AR')}`, 25, y);
      y += 5;
      doc.text(`Pagos fuera de término: ${reporteFinanciero.fueraTermino} ($${reporteFinanciero.montoFueraTermino.toLocaleString('es-AR')})`, 25, y);
      y += 10;
      
      doc.setFont(undefined, 'bold');
      doc.text('Por Medio de Pago', 20, y);
      y += 7;
      
      doc.setFont(undefined, 'normal');
      reporteFinanciero.porMedioPago.forEach(item => {
        doc.text(`${item.medio}: $${item.monto.toLocaleString('es-AR')}`, 25, y);
        y += 5;
      });
      
      y += 5;
      doc.setFont(undefined, 'bold');
      doc.text('Por Tipo de Cliente', 20, y);
      y += 7;
      
      doc.setFont(undefined, 'normal');
      reporteFinanciero.porTipoAlumno.forEach(item => {
        doc.text(`${item.tipo}: $${item.monto.toLocaleString('es-AR')}`, 25, y);
        y += 5;
      });
    }
    
    // Footer
    doc.setFontSize(8);
    doc.text(`Generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm")}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    
    const filename = tipo === 'profesores' 
      ? `reporte_profesores_${monthStr}.pdf`
      : `reporte_financiero_${monthStr}.pdf`;
    
    doc.save(filename);
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
              {profesorSeleccionado && (
                <span className="ml-2 text-emerald-600 font-medium">
                  • {profesorSeleccionado.nombre}
                </span>
              )}
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
        
        {/* Tabs de Reportes */}
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="general">Resumen General</TabsTrigger>
            <TabsTrigger value="profesores">Por Profesor</TabsTrigger>
            <TabsTrigger value="financiero">Financiero</TabsTrigger>
          </TabsList>
          
          {/* Tab: Resumen General */}
          <TabsContent value="general" className="space-y-6">
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
          </TabsContent>
          
          {/* Tab: Por Profesor */}
          <TabsContent value="profesores" className="space-y-6">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => exportarCSV('profesores')}>
                <FileDown className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
              <Button variant="outline" onClick={() => exportarPDF('profesores')}>
                <FileDown className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
            
            <div className="grid gap-4">
              {reportePorProfesor.map(profesor => (
                <Card key={profesor.id} className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{profesor.nombre}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-slate-500">Alumnos</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {profesor.alumnosActivos}
                          <span className="text-sm font-normal text-slate-500">/{profesor.alumnosTotal}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Clases realizadas</p>
                        <p className="text-2xl font-bold text-emerald-600">{profesor.clasesRealizadas}</p>
                        <p className="text-xs text-slate-400">{profesor.clasesCanceladas} canceladas</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Recuperos</p>
                        <p className="text-2xl font-bold text-amber-600">{profesor.recuperosPendientes}</p>
                        <p className="text-xs text-slate-400">{profesor.recuperosRealizados} realizados</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Ingreso mes</p>
                        <p className="text-2xl font-bold text-slate-900">{formatMoney(profesor.ingresoMes)}</p>
                        <p className="text-xs text-slate-400">Tasa: {profesor.tasaRealizacion}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          {/* Tab: Financiero */}
          <TabsContent value="financiero" className="space-y-6">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => exportarCSV('financiero')}>
                <FileDown className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
              <Button variant="outline" onClick={() => exportarPDF('financiero')}>
                <FileDown className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              <MetricCard
                title="Total pagos"
                value={reporteFinanciero.totalPagos}
                subtitle={formatMoney(reporteFinanciero.montoTotal)}
                icon={DollarSign}
                variant="success"
              />
              <MetricCard
                title="Fuera de término"
                value={reporteFinanciero.fueraTermino}
                subtitle={formatMoney(reporteFinanciero.montoFueraTermino)}
                icon={Clock}
                variant={reporteFinanciero.fueraTermino > 0 ? 'warning' : 'success'}
              />
              <MetricCard
                title="Promedio por pago"
                value={formatMoney(reporteFinanciero.totalPagos > 0 ? reporteFinanciero.montoTotal / reporteFinanciero.totalPagos : 0)}
                icon={TrendingUp}
                variant="info"
              />
            </div>
            
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Por Medio de Pago */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Ingresos por Medio de Pago</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reporteFinanciero.porMedioPago}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="medio" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `$${v/1000}k`} />
                      <Tooltip formatter={(value) => formatMoney(value)} />
                      <Bar dataKey="monto" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              {/* Por Tipo de Cliente */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Ingresos por Tipo de Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reporteFinanciero.porTipoAlumno}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="monto"
                        label={({ tipo, monto }) => `${tipo}: ${formatMoney(monto)}`}
                        labelLine={true}
                      >
                        {reporteFinanciero.porTipoAlumno.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatMoney(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}