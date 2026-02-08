import React, { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Plus, 
  Calendar,
  RefreshCw,
  AlertTriangle,
  Clock,
  DollarSign,
  Users,
  ChevronRight,
  Filter,
  FileDown
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import QuickStats, { ClassStats } from '@/components/dashboard/QuickStats';
import TodayAgenda from '@/components/dashboard/TodayAgenda';
import CobrarHoyList from '@/components/dashboard/CobrarHoyList';
import ClasesConAlumnos from '@/components/dashboard/ClasesConAlumnos';
import AlertCard from '@/components/ui/AlertCard';
import RegistrarPagoModal from '@/components/modals/RegistrarPagoModal';
import RegistrarAsistenciaModal from '@/components/modals/RegistrarAsistenciaModal';
import NuevaClaseModal from '@/components/modals/NuevaClaseModal';
import NuevoAlumnoModal from '@/components/modals/NuevoAlumnoModal';
import CancelarClaseModal from '@/components/modals/CancelarClaseModal';
import EditarClaseModal from '@/components/modals/EditarClaseModal';
import RecordatoriosPendientes from '@/components/recordatorios/RecordatoriosPendientes';
import PullToRefresh from '@/components/PullToRefresh';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [periodoView, setPeriodoView] = useState('semana');
  const [pagoModal, setPagoModal] = useState({ open: false, alumno: null });
  const [asistenciaModal, setAsistenciaModal] = useState({ open: false, clase: null });
  const [nuevaClaseModal, setNuevaClaseModal] = useState({ open: false, recupero: null });
  const [nuevoAlumnoModal, setNuevoAlumnoModal] = useState({ open: false, alumno: null });
  const [cancelarModal, setCancelarModal] = useState({ open: false, clase: null });
  const [morososModal, setMorososModal] = useState(false);
  const [profesorSeleccionado, setProfesorSeleccionado] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = async () => {
    // Forzar recarga de queries
    setRefreshKey(prev => prev + 1);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simular delay
  };
  
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const currentMonth = format(today, 'yyyy-MM');
  const currentDay = today.getDate();
  
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
  
  // Queries
  const { data: alumnosTodos = [], isLoading: loadingAlumnos } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
  });
  
  // Filtrar alumnos por profesor seleccionado
  const alumnos = React.useMemo(() => {
    if (!profesorSeleccionado) return alumnosTodos;
    return alumnosTodos.filter(a => a.profesor_id === profesorSeleccionado.id);
  }, [alumnosTodos, profesorSeleccionado]);
  
  const { data: clases = [], isLoading: loadingClases } = useQuery({
    queryKey: ['clases'],
    queryFn: () => base44.entities.Clase.list('-fecha'),
  });
  
  const { data: pagos = [] } = useQuery({
    queryKey: ['pagos'],
    queryFn: () => base44.entities.Pago.list('-fecha'),
  });
  
  const { data: recuperos = [] } = useQuery({
    queryKey: ['recuperos'],
    queryFn: () => base44.entities.Recupero.list(),
  });
  
  // Calcular estadísticas
  const stats = useMemo(() => {
    const alumnosActivos = alumnos.filter(a => a.estado !== 'pausado');
    const morosos = alumnos.filter(a => a.estado === 'moroso');
    
    // Ingresos
    const ingresoEsperado = alumnosActivos.reduce((sum, a) => sum + (a.precio_mensual || 0), 0);
    const pagosMes = pagos.filter(p => p.mes_correspondiente === currentMonth);
    const ingresoReal = pagosMes.reduce((sum, p) => sum + (p.monto || 0), 0);
    const deudaTotal = alumnos.reduce((sum, a) => sum + (a.deuda_total || 0), 0);
    
    // Clases de hoy
    const clasesHoy = clases.filter(c => c.fecha === todayStr);
    const clasesPendientesHoy = clasesHoy.filter(c => 
      c.estado === 'programada' && !c.asistencia_registrada
    );
    
    // Clases del mes
    const clasesMes = clases.filter(c => c.fecha?.startsWith(currentMonth));
    const realizadas = clasesMes.filter(c => c.estado === 'realizada').length;
    const canceladas = clasesMes.filter(c => 
      ['cancelada_anticipada', 'cancelada_tarde', 'no_show', 'suspendida'].includes(c.estado)
    ).length;
    const recuperadas = clasesMes.filter(c => c.es_recupero && c.estado === 'realizada').length;
    const aRecuperar = recuperos.filter(r => r.estado === 'pendiente').length;
    
    return {
      ingresoEsperado,
      ingresoReal,
      deudaTotal,
      cantidadMorosos: morosos.length,
      clasesHoy: clasesHoy.length,
      clasesPendientesHoy: clasesPendientesHoy.length,
      realizadas,
      canceladas,
      recuperadas,
      aRecuperar,
    };
  }, [alumnos, clases, pagos, recuperos, todayStr, currentMonth]);
  
  // Clases de hoy ordenadas por hora
  const clasesHoy = useMemo(() => {
    return clases
      .filter(c => c.fecha === todayStr)
      .sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || ''));
  }, [clases, todayStr]);
  
  // Alumnos a cobrar (ciclo del 5 al 15)
  const alumnosACobrar = useMemo(() => {
    if (currentDay < 5) return [];
    
    return alumnos.filter(a => {
      if (a.estado === 'pausado') return false;
      if (a.estado_mes_actual === 'pagado') return false;
      return true;
    }).sort((a, b) => {
      // Morosos primero
      if (a.estado === 'moroso' && b.estado !== 'moroso') return -1;
      if (b.estado === 'moroso' && a.estado !== 'moroso') return 1;
      return (b.precio_mensual || 0) - (a.precio_mensual || 0);
    });
  }, [alumnos, currentDay]);
  
  // Alertas activas
  const alertas = useMemo(() => {
    const items = [];
    
    // Morosos fuera del 15
    const morososFuera15 = alumnos.filter(a => a.estado === 'moroso');
    if (morososFuera15.length > 0 && currentDay > 15) {
      items.push({
        id: 'morosos',
        priority: 'high',
        title: 'Alumnos morosos',
        description: `${morososFuera15.length} alumno(s) sin pagar después del día 15`,
        count: morososFuera15.length,
        actions: [
          { label: 'Ver morosos', onClick: () => setMorososModal(true) }
        ]
      });
    }
    
    // Clases sin asistencia registrada (de hoy, ya pasadas)
    const clasesSinAsistencia = clasesHoy.filter(c => {
      if (c.asistencia_registrada) return false;
      if (c.estado !== 'programada') return false;
      const [h, m] = (c.hora_inicio || '00:00').split(':').map(Number);
      const claseTime = h * 60 + m + 50;
      const now = today.getHours() * 60 + today.getMinutes();
      return claseTime < now;
    });
    
    if (clasesSinAsistencia.length > 0) {
      items.push({
        id: 'asistencia',
        priority: 'high',
        title: 'Asistencia sin registrar',
        description: `${clasesSinAsistencia.length} clase(s) de hoy sin asistencia`,
        count: clasesSinAsistencia.length,
        actions: [
          { 
            label: 'Registrar', 
            onClick: () => setAsistenciaModal({ open: true, clase: clasesSinAsistencia[0] })
          }
        ]
      });
    }
    
    // Recuperos sin fecha
    const recuperosSinFecha = recuperos.filter(r => r.estado === 'pendiente' && !r.fecha_programada);
    if (recuperosSinFecha.length > 0) {
      items.push({
        id: 'recuperos',
        priority: 'medium',
        title: 'Recuperos sin programar',
        description: `${recuperosSinFecha.length} clase(s) pendientes de programar`,
        count: recuperosSinFecha.length,
        actions: [
          { 
            label: 'Programar', 
            onClick: () => setNuevaClaseModal({ open: true, recupero: recuperosSinFecha[0] })
          }
        ]
      });
    }
    
    return items;
  }, [alumnos, clasesHoy, recuperos, currentDay, today]);
  
  const isLoading = loadingAlumnos || loadingClases;
  
  // Exportar Dashboard a PDF
  const exportarDashboardPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(20);
    doc.text('Dashboard - Reporte Mensual', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(format(today, "MMMM yyyy", { locale: es }).toUpperCase(), pageWidth / 2, 28, { align: 'center' });
    
    if (profesorSeleccionado) {
      doc.setFontSize(11);
      doc.text(`Profesor: ${profesorSeleccionado.nombre}`, pageWidth / 2, 35, { align: 'center' });
    }
    
    let y = 45;
    
    // Resumen General
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Resumen General', 20, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Alumnos activos: ${alumnos.filter(a => a.estado !== 'pausado').length}`, 25, y);
    y += 5;
    doc.text(`Alumnos morosos: ${stats.cantidadMorosos}`, 25, y);
    y += 5;
    doc.text(`Clases de hoy: ${stats.clasesHoy}`, 25, y);
    y += 5;
    doc.text(`Clases realizadas este mes: ${stats.realizadas}`, 25, y);
    y += 5;
    doc.text(`Clases canceladas: ${stats.canceladas}`, 25, y);
    y += 5;
    doc.text(`Recuperos pendientes: ${stats.aRecuperar}`, 25, y);
    y += 10;
    
    // Ingresos
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Ingresos del Mes', 20, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const porcentajeCobrado = stats.ingresoEsperado > 0 ? Math.round((stats.ingresoReal / stats.ingresoEsperado) * 100) : 0;
    
    doc.text(`Ingreso esperado: $${stats.ingresoEsperado.toLocaleString('es-AR')}`, 25, y);
    y += 5;
    doc.text(`Ingreso real: $${stats.ingresoReal.toLocaleString('es-AR')}`, 25, y);
    y += 5;
    doc.text(`Porcentaje cobrado: ${porcentajeCobrado}%`, 25, y);
    y += 5;
    doc.text(`Deuda total: $${stats.deudaTotal.toLocaleString('es-AR')}`, 25, y);
    y += 10;
    
    // Agenda de Hoy
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`Agenda de Hoy (${format(today, 'd MMM', { locale: es })})`, 20, y);
    y += 8;
    
    if (clasesHoy.length === 0) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text('No hay clases programadas para hoy', 25, y);
      y += 10;
    } else {
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      clasesHoy.slice(0, 10).forEach((clase, idx) => {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }
        
        const alumnosNombres = clase.alumnos_nombres?.join(', ') || 'Sin alumnos';
        doc.text(`${clase.hora_inicio} - ${alumnosNombres} (${clase.tipo})`, 25, y);
        y += 5;
      });
      y += 5;
    }
    
    // Alumnos Morosos
    if (stats.cantidadMorosos > 0) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Alumnos Morosos', 20, y);
      y += 8;
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      alumnos.filter(a => a.estado === 'moroso').slice(0, 10).forEach((alumno, idx) => {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }
        
        doc.text(`${alumno.nombre} - Deuda: $${(alumno.deuda_total || 0).toLocaleString('es-AR')}`, 25, y);
        y += 5;
      });
    }
    
    // Footer
    doc.setFontSize(8);
    doc.text(
      `Generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm")}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    
    const filename = `dashboard_${profesorSeleccionado ? profesorSeleccionado.nombre.replace(/\s+/g, '_') : 'general'}_${format(today, 'yyyy-MM')}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 text-sm">
              {format(today, "EEEE d 'de' MMMM, yyyy", { locale: es })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              onClick={exportarDashboardPDF}
              className="gap-2"
            >
              <FileDown className="w-4 h-4" />
              Exportar PDF
            </Button>
            <Button 
              onClick={() => setNuevaClaseModal({ open: true, recupero: null })}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva clase
            </Button>
          </div>
        </header>
        
        {/* Quick Stats */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : (
          <QuickStats stats={stats} />
        )}
        
        {/* Alertas */}
        {alertas.length > 0 && (
          <div className="space-y-3">
            {alertas.map((alerta) => (
              <AlertCard key={alerta.id} {...alerta} />
            ))}
          </div>
        )}
        
        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Agenda de hoy - 2 columnas */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    Clases de hoy
                  </CardTitle>
                  <Link to={createPageUrl('Agenda')}>
                    <Button variant="ghost" size="sm" className="text-slate-500">
                      Ver agenda completa
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-20 rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <TodayAgenda 
                    clases={clasesHoy}
                    onClaseClick={(clase) => setCancelarModal({ open: true, clase })}
                    onRegistrarAsistencia={(clase) => setAsistenciaModal({ open: true, clase })}
                  />
                )}
              </CardContent>
            </Card>
            
            {/* Estadísticas de clases del mes */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg">Resumen del mes</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ClassStats stats={stats} />
              </CardContent>
            </Card>
          </div>
          
          {/* Sidebar - Cobranza */}
          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    A cobrar
                  </CardTitle>
                  {currentDay >= 5 && currentDay <= 15 && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                      Ciclo abierto
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-16 rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <CobrarHoyList 
                    alumnos={alumnosACobrar}
                    onRegistrarPago={(alumno) => setPagoModal({ open: true, alumno })}
                  />
                )}
              </CardContent>
            </Card>
            
            {/* Recuperos pendientes */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-amber-600" />
                    Recuperos pendientes
                  </CardTitle>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                    {stats.aRecuperar}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {recuperos.filter(r => r.estado === 'pendiente').length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No hay recuperos pendientes</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recuperos
                      .filter(r => r.estado === 'pendiente')
                      .slice(0, 5)
                      .map((recupero) => (
                        <div 
                          key={recupero.id}
                          className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 cursor-pointer hover:bg-amber-50 transition-colors"
                          onClick={() => setNuevaClaseModal({ open: true, recupero })}
                        >
                          <p className="font-medium text-slate-800 text-sm">{recupero.alumno_nombre}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Clase del {recupero.fecha_original && format(parseISO(recupero.fecha_original), "d 'de' MMM", { locale: es })}
                          </p>
                        </div>
                      ))}
                    {recuperos.filter(r => r.estado === 'pendiente').length > 5 && (
                      <Link to={createPageUrl('Recuperos')}>
                        <Button variant="ghost" size="sm" className="w-full text-amber-600">
                          Ver todos ({recuperos.filter(r => r.estado === 'pendiente').length})
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Clases con Alumnos del Profesor */}
        {profesorSeleccionado && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  Clases próximas - Cobros
                </CardTitle>
                <Link to={createPageUrl('Alumnos')}>
                  <Button variant="ghost" size="sm" className="text-slate-500">
                    Gestionar alumnos
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
              ) : (
                <ClasesConAlumnos 
                  profesorSeleccionado={profesorSeleccionado}
                  onRegistrarPago={(alumno) => setPagoModal({ open: true, alumno })}
                />
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Recordatorios Pendientes */}
        <RecordatoriosPendientes compact={false} />
      </div>
      
      {/* Modals */}
      <RegistrarPagoModal 
        open={pagoModal.open}
        onOpenChange={(open) => setPagoModal({ ...pagoModal, open })}
        alumno={pagoModal.alumno}
      />
      
      <RegistrarAsistenciaModal 
        open={asistenciaModal.open}
        onOpenChange={(open) => setAsistenciaModal({ ...asistenciaModal, open })}
        clase={asistenciaModal.clase}
      />
      
      <NuevoAlumnoModal 
        open={nuevoAlumnoModal.open}
        onOpenChange={(open) => setNuevoAlumnoModal({ ...nuevoAlumnoModal, open })}
        alumno={nuevoAlumnoModal.alumno}
        profesorId={profesorSeleccionado?.id}
      />
      
      <NuevaClaseModal 
        open={nuevaClaseModal.open}
        onOpenChange={(open) => setNuevaClaseModal({ ...nuevaClaseModal, open })}
        recupero={nuevaClaseModal.recupero}
      />
      
      {profesorSeleccionado ? (
        <EditarClaseModal 
          open={cancelarModal.open}
          onOpenChange={(open) => setCancelarModal({ ...cancelarModal, open })}
          clase={cancelarModal.clase}
        />
      ) : (
        <CancelarClaseModal 
          open={cancelarModal.open}
          onOpenChange={(open) => setCancelarModal({ ...cancelarModal, open })}
          clase={cancelarModal.clase}
        />
      )}
      
      {/* Modal de Morosos */}
      <Dialog open={morososModal} onOpenChange={setMorososModal}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Alumnos Morosos ({alumnos.filter(a => a.estado === 'moroso').length})
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-2 px-1">
            {alumnos.filter(a => a.estado === 'moroso').length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No hay alumnos morosos</p>
              </div>
            ) : (
              alumnos
                .filter(a => a.estado === 'moroso')
                .sort((a, b) => (b.deuda_total || 0) - (a.deuda_total || 0))
                .map((alumno) => (
                  <div
                    key={alumno.id}
                    className="p-4 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-50 cursor-pointer transition-colors"
                    onClick={() => {
                      setPagoModal({ open: true, alumno });
                      setMorososModal(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">{alumno.nombre}</h4>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {alumno.whatsapp}
                        </p>
                        {alumno.ultimo_pago_fecha && (
                          <p className="text-xs text-slate-400 mt-1">
                            Último pago: {format(new Date(alumno.ultimo_pago_fecha), "d 'de' MMM", { locale: es })}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-rose-600">
                          ${(alumno.deuda_total || 0).toLocaleString('es-AR')}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          ${(alumno.precio_mensual || 0).toLocaleString('es-AR')}/mes
                        </div>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
          
          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setMorososModal(false)}
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}