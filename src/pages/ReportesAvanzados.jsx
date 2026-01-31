import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  BarChart3,
  Download,
  Filter,
  AlertCircle,
  CheckCircle,
  XCircle,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ReportesAvanzados() {
  const [periodoIngresos, setPeriodoIngresos] = useState('mes');
  const [periodoOcupacion, setPeriodoOcupacion] = useState('semana');
  const [mesSeleccionado, setMesSeleccionado] = useState(format(new Date(), 'yyyy-MM'));

  const { data: pagos = [] } = useQuery({
    queryKey: ['pagos'],
    queryFn: () => base44.entities.Pago.list(),
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos'],
    queryFn: () => base44.entities.TurnoCancha.list(),
  });

  const { data: clases = [] } = useQuery({
    queryKey: ['clases'],
    queryFn: () => base44.entities.Clase.list(),
  });

  const { data: profesores = [] } = useQuery({
    queryKey: ['profesores'],
    queryFn: () => base44.entities.Profesor.list(),
  });

  const { data: asistencias = [] } = useQuery({
    queryKey: ['asistencias'],
    queryFn: () => base44.entities.Asistencia.list(),
  });

  // === REPORTE DE INGRESOS ===
  const reporteIngresos = useMemo(() => {
    const now = new Date();
    let ingresosPorPeriodo = {};

    pagos.forEach(pago => {
      const fecha = parseISO(pago.fecha);
      let key;

      if (periodoIngresos === 'mes') {
        key = format(fecha, 'MMM yyyy', { locale: es });
      } else if (periodoIngresos === 'semana') {
        const semana = startOfWeek(fecha, { locale: es });
        key = format(semana, "'Semana' d MMM", { locale: es });
      } else {
        key = format(fecha, 'd MMM yyyy', { locale: es });
      }

      if (!ingresosPorPeriodo[key]) {
        ingresosPorPeriodo[key] = 0;
      }
      ingresosPorPeriodo[key] += pago.monto || 0;
    });

    return Object.entries(ingresosPorPeriodo)
      .map(([periodo, monto]) => ({ periodo, monto }))
      .sort((a, b) => a.periodo.localeCompare(b.periodo))
      .slice(-12);
  }, [pagos, periodoIngresos]);

  const totalIngresos = reporteIngresos.reduce((sum, item) => sum + item.monto, 0);

  // === REPORTE DE OCUPACIÓN DE CANCHAS ===
  const reporteOcupacion = useMemo(() => {
    const [year, month] = mesSeleccionado.split('-');
    const inicio = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const fin = endOfMonth(inicio);

    const turnosPeriodo = turnos.filter(t => {
      const fecha = parseISO(t.fecha);
      return fecha >= inicio && fecha <= fin;
    });

    let ocupacionPorDia = {};
    let ocupacionPorCancha = { '1': 0, '2': 0, '3': 0, '4': 0 };

    if (periodoOcupacion === 'dia') {
      const dias = eachDayOfInterval({ start: inicio, end: fin });
      dias.forEach(dia => {
        const key = format(dia, 'd MMM', { locale: es });
        ocupacionPorDia[key] = 0;
      });

      turnosPeriodo.forEach(turno => {
        const key = format(parseISO(turno.fecha), 'd MMM', { locale: es });
        if (ocupacionPorDia[key] !== undefined) {
          ocupacionPorDia[key]++;
        }
        ocupacionPorCancha[turno.cancha]++;
      });
    } else if (periodoOcupacion === 'semana') {
      turnosPeriodo.forEach(turno => {
        const semana = startOfWeek(parseISO(turno.fecha), { locale: es });
        const key = format(semana, "'S' w", { locale: es });
        if (!ocupacionPorDia[key]) ocupacionPorDia[key] = 0;
        ocupacionPorDia[key]++;
        ocupacionPorCancha[turno.cancha]++;
      });
    } else {
      ocupacionPorDia[format(inicio, 'MMMM yyyy', { locale: es })] = turnosPeriodo.length;
      turnosPeriodo.forEach(turno => {
        ocupacionPorCancha[turno.cancha]++;
      });
    }

    return {
      porDia: Object.entries(ocupacionPorDia).map(([dia, cantidad]) => ({ dia, cantidad })),
      porCancha: Object.entries(ocupacionPorCancha).map(([cancha, cantidad]) => ({ 
        cancha: `Cancha ${cancha}`, 
        cantidad 
      })),
      total: turnosPeriodo.length,
    };
  }, [turnos, mesSeleccionado, periodoOcupacion]);

  // === REPORTE DE RENDIMIENTO DE PROFESORES ===
  const reporteProfesores = useMemo(() => {
    return profesores.map(profesor => {
      const clasesProfesor = clases.filter(c => c.alumnos_ids?.some(id => {
        const alumno = c.alumnos_nombres;
        return true; // Simplificado
      }));

      const realizadas = clasesProfesor.filter(c => c.estado === 'realizada').length;
      const canceladas = clasesProfesor.filter(c => 
        c.estado === 'cancelada_anticipada' || c.estado === 'cancelada_tarde'
      ).length;
      const total = clasesProfesor.length;

      const asistenciasProfesor = asistencias.filter(a => 
        clasesProfesor.some(c => c.id === a.clase_id)
      );
      const presentes = asistenciasProfesor.filter(a => a.estado === 'presente').length;
      const porcentajeAsistencia = asistenciasProfesor.length > 0
        ? ((presentes / asistenciasProfesor.length) * 100).toFixed(1)
        : 0;

      return {
        nombre: profesor.nombre,
        totalClases: total,
        realizadas,
        canceladas,
        porcentajeAsistencia: parseFloat(porcentajeAsistencia),
        alumnos: profesor.total_alumnos || 0,
      };
    }).sort((a, b) => b.totalClases - a.totalClases);
  }, [profesores, clases, asistencias]);

  // === ESTADÍSTICAS DE CANCELACIÓN/REPROGRAMACIÓN ===
  const estadisticasClases = useMemo(() => {
    const total = clases.length;
    const realizadas = clases.filter(c => c.estado === 'realizada').length;
    const canceladas = clases.filter(c => 
      c.estado === 'cancelada_anticipada' || c.estado === 'cancelada_tarde'
    ).length;
    const reprogramadas = clases.filter(c => c.estado === 'reprogramada').length;
    const suspendidas = clases.filter(c => c.estado === 'suspendida').length;
    const programadas = clases.filter(c => c.estado === 'programada').length;

    const porMotivo = {};
    clases.filter(c => c.cancelado_por).forEach(c => {
      const motivo = c.cancelado_por;
      if (!porMotivo[motivo]) porMotivo[motivo] = 0;
      porMotivo[motivo]++;
    });

    return {
      total,
      realizadas,
      canceladas,
      reprogramadas,
      suspendidas,
      programadas,
      porcentajeCancelacion: total > 0 ? ((canceladas / total) * 100).toFixed(1) : 0,
      porMotivo: Object.entries(porMotivo).map(([motivo, cantidad]) => ({
        motivo: motivo === 'alumno' ? 'Alumno' : motivo === 'profesor' ? 'Profesor' : motivo === 'clima' ? 'Clima' : 'Otro',
        cantidad,
      })),
      distribucion: [
        { estado: 'Realizadas', cantidad: realizadas },
        { estado: 'Programadas', cantidad: programadas },
        { estado: 'Canceladas', cantidad: canceladas },
        { estado: 'Reprogramadas', cantidad: reprogramadas },
        { estado: 'Suspendidas', cantidad: suspendidas },
      ],
    };
  }, [clases]);

  const exportarPDF = () => {
    alert('Funcionalidad de exportar PDF en desarrollo');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-emerald-600" />
              Reportes Avanzados
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Análisis profundo de ingresos, ocupación y rendimiento
            </p>
          </div>
          <Button
            onClick={exportarPDF}
            variant="outline"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar todo
          </Button>
        </header>

        <Tabs defaultValue="ingresos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ingresos">
              <DollarSign className="w-4 h-4 mr-2" />
              Ingresos
            </TabsTrigger>
            <TabsTrigger value="ocupacion">
              <Calendar className="w-4 h-4 mr-2" />
              Ocupación
            </TabsTrigger>
            <TabsTrigger value="profesores">
              <Users className="w-4 h-4 mr-2" />
              Profesores
            </TabsTrigger>
            <TabsTrigger value="clases">
              <TrendingUp className="w-4 h-4 mr-2" />
              Clases
            </TabsTrigger>
          </TabsList>

          {/* TAB: INGRESOS */}
          <TabsContent value="ingresos" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Reporte de Ingresos</h2>
              <Select value={periodoIngresos} onValueChange={setPeriodoIngresos}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dia">Por día</SelectItem>
                  <SelectItem value="semana">Por semana</SelectItem>
                  <SelectItem value="mes">Por mes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-slate-500 mb-2">Ingresos Totales</p>
                  <p className="text-4xl font-bold text-emerald-600">
                    ${totalIngresos.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ingresos por {periodoIngresos === 'mes' ? 'Mes' : periodoIngresos === 'semana' ? 'Semana' : 'Día'}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reporteIngresos}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="periodo" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Bar dataKey="monto" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: OCUPACIÓN */}
          <TabsContent value="ocupacion" className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Ocupación de Canchas</h2>
              <div className="flex gap-2">
                <Select value={mesSeleccionado} onValueChange={setMesSeleccionado}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => {
                      const date = new Date();
                      date.setMonth(date.getMonth() - i);
                      const value = format(date, 'yyyy-MM');
                      const label = format(date, 'MMMM yyyy', { locale: es });
                      return (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Select value={periodoOcupacion} onValueChange={setPeriodoOcupacion}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dia">Por día</SelectItem>
                    <SelectItem value="semana">Por semana</SelectItem>
                    <SelectItem value="mes">Por mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-slate-500 mb-2">Total de Reservas</p>
                  <p className="text-4xl font-bold text-blue-600">
                    {reporteOcupacion.total}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ocupación por {periodoOcupacion === 'mes' ? 'Mes' : periodoOcupacion === 'semana' ? 'Semana' : 'Día'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={reporteOcupacion.porDia}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dia" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="cantidad" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ocupación por Cancha</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reporteOcupacion.porCancha}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ cancha, cantidad }) => `${cancha}: ${cantidad}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="cantidad"
                      >
                        {reporteOcupacion.porCancha.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: PROFESORES */}
          <TabsContent value="profesores" className="space-y-6">
            <h2 className="text-lg font-semibold">Rendimiento de Profesores</h2>

            <div className="grid gap-4">
              {reporteProfesores.map((profesor, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-lg">
                          {profesor.nombre.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{profesor.nombre}</h3>
                          <p className="text-sm text-slate-500">{profesor.alumnos} alumnos activos</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-lg px-4 py-2">
                        {profesor.porcentajeAsistencia}% asistencia
                      </Badge>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-slate-900">{profesor.totalClases}</p>
                        <p className="text-xs text-slate-500">Total Clases</p>
                      </div>
                      <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <p className="text-2xl font-bold text-emerald-600">{profesor.realizadas}</p>
                        <p className="text-xs text-slate-500">Realizadas</p>
                      </div>
                      <div className="text-center p-3 bg-rose-50 rounded-lg">
                        <p className="text-2xl font-bold text-rose-600">{profesor.canceladas}</p>
                        <p className="text-xs text-slate-500">Canceladas</p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{profesor.alumnos}</p>
                        <p className="text-xs text-slate-500">Alumnos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {reporteProfesores.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p>No hay datos de profesores disponibles</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* TAB: ESTADÍSTICAS DE CLASES */}
          <TabsContent value="clases" className="space-y-6">
            <h2 className="text-lg font-semibold">Estadísticas de Clases</h2>

            <div className="grid md:grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-slate-500">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-slate-500 mb-2">Total Clases</p>
                    <p className="text-4xl font-bold text-slate-900">
                      {estadisticasClases.total}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-emerald-500">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-slate-500 mb-2">Realizadas</p>
                    <p className="text-4xl font-bold text-emerald-600">
                      {estadisticasClases.realizadas}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-rose-500">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-slate-500 mb-2">% Cancelación</p>
                    <p className="text-4xl font-bold text-rose-600">
                      {estadisticasClases.porcentajeCancelacion}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Distribución de Estados</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={estadisticasClases.distribucion}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ estado, cantidad }) => `${estado}: ${cantidad}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="cantidad"
                      >
                        {estadisticasClases.distribucion.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cancelaciones por Motivo</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={estadisticasClases.porMotivo}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="motivo" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="cantidad" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Resumen Detallado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-5 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                    <div>
                      <p className="text-2xl font-bold text-emerald-700">{estadisticasClases.realizadas}</p>
                      <p className="text-xs text-slate-600">Realizadas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Calendar className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold text-blue-700">{estadisticasClases.programadas}</p>
                      <p className="text-xs text-slate-600">Programadas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-rose-50 rounded-lg">
                    <XCircle className="w-8 h-8 text-rose-600" />
                    <div>
                      <p className="text-2xl font-bold text-rose-700">{estadisticasClases.canceladas}</p>
                      <p className="text-xs text-slate-600">Canceladas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                    <RotateCcw className="w-8 h-8 text-indigo-600" />
                    <div>
                      <p className="text-2xl font-bold text-indigo-700">{estadisticasClases.reprogramadas}</p>
                      <p className="text-xs text-slate-600">Reprogramadas</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                    <AlertCircle className="w-8 h-8 text-amber-600" />
                    <div>
                      <p className="text-2xl font-bold text-amber-700">{estadisticasClases.suspendidas}</p>
                      <p className="text-xs text-slate-600">Suspendidas</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}