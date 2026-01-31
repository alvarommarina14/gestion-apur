import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  AlertCircle,
  CalendarClock,
  RotateCcw
} from 'lucide-react';

export default function ReporteAlumnoModal({ open, onOpenChange, alumno }) {
  const { data: clases = [] } = useQuery({
    queryKey: ['clases'],
    queryFn: () => base44.entities.Clase.list(),
    enabled: !!alumno,
  });

  const { data: pagos = [] } = useQuery({
    queryKey: ['pagos'],
    queryFn: () => base44.entities.Pago.list(),
    enabled: !!alumno,
  });

  const { data: asistencias = [] } = useQuery({
    queryKey: ['asistencias'],
    queryFn: () => base44.entities.Asistencia.list(),
    enabled: !!alumno,
  });

  const clasesAlumno = useMemo(() => {
    if (!alumno) return [];
    return clases
      .filter(c => c.alumnos_ids?.includes(alumno.id))
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [clases, alumno]);

  const pagosAlumno = useMemo(() => {
    if (!alumno) return [];
    return pagos
      .filter(p => p.alumno_id === alumno.id)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [pagos, alumno]);

  const asistenciasAlumno = useMemo(() => {
    if (!alumno) return [];
    return asistencias.filter(a => a.alumno_id === alumno.id);
  }, [asistencias, alumno]);

  const estadisticas = useMemo(() => {
    if (!alumno) return {};

    const realizadas = clasesAlumno.filter(c => c.estado === 'realizada').length;
    const canceladas = clasesAlumno.filter(c => 
      c.estado === 'cancelada_anticipada' || c.estado === 'cancelada_tarde'
    ).length;
    const reprogramadas = clasesAlumno.filter(c => c.estado === 'reprogramada').length;
    const suspendidas = clasesAlumno.filter(c => c.estado === 'suspendida').length;
    const programadas = clasesAlumno.filter(c => c.estado === 'programada').length;
    const recuperadas = clasesAlumno.filter(c => c.estado === 'recuperada').length;

    const totalPagado = pagosAlumno.reduce((sum, p) => sum + (p.monto || 0), 0);
    
    const presentes = asistenciasAlumno.filter(a => a.estado === 'presente').length;
    const ausentes = asistenciasAlumno.filter(a => 
      a.estado === 'ausente_con_aviso' || a.estado === 'ausente_sin_aviso'
    ).length;
    const porcentajeAsistencia = presentes + ausentes > 0 
      ? ((presentes / (presentes + ausentes)) * 100).toFixed(1) 
      : 0;

    return {
      realizadas,
      canceladas,
      reprogramadas,
      suspendidas,
      programadas,
      recuperadas,
      totalClases: clasesAlumno.length,
      totalPagado,
      deudaPendiente: alumno.deuda_total || 0,
      porcentajeAsistencia,
      presentes,
      ausentes,
      totalAsistencias: presentes + ausentes,
    };
  }, [clasesAlumno, pagosAlumno, asistenciasAlumno, alumno]);

  const exportarPDF = () => {
    alert('Funcionalidad de exportar PDF en desarrollo');
  };

  if (!alumno) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <FileText className="w-6 h-6 text-emerald-600" />
              Reporte Detallado - {alumno.nombre}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={exportarPDF}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar PDF
            </Button>
          </div>
          <p className="text-sm text-slate-500">
            Profesor: {alumno.profesor_nombre}
          </p>
        </DialogHeader>

        {/* Resumen General */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500">Total Clases</p>
              <p className="text-2xl font-bold text-slate-900">{estadisticas.totalClases}</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500">Asistencia</p>
              <p className="text-2xl font-bold text-blue-600">{estadisticas.porcentajeAsistencia}%</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500">Total Pagado</p>
              <p className="text-2xl font-bold text-amber-600">
                ${estadisticas.totalPagado.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-rose-500">
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500">Deuda</p>
              <p className="text-2xl font-bold text-rose-600">
                ${estadisticas.deudaPendiente.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="clases" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="clases">
              <Calendar className="w-4 h-4 mr-2" />
              Historial de Clases
            </TabsTrigger>
            <TabsTrigger value="pagos">
              <DollarSign className="w-4 h-4 mr-2" />
              Pagos
            </TabsTrigger>
            <TabsTrigger value="estadisticas">
              <TrendingUp className="w-4 h-4 mr-2" />
              Estadísticas
            </TabsTrigger>
          </TabsList>

          {/* Tab: Historial de Clases */}
          <TabsContent value="clases" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Historial Completo de Clases</CardTitle>
              </CardHeader>
              <CardContent>
                {clasesAlumno.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No hay clases registradas</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {clasesAlumno.map((clase) => {
                      const iconos = {
                        realizada: <CheckCircle className="w-5 h-5 text-emerald-600" />,
                        cancelada_anticipada: <XCircle className="w-5 h-5 text-amber-500" />,
                        cancelada_tarde: <XCircle className="w-5 h-5 text-rose-500" />,
                        programada: <Clock className="w-5 h-5 text-blue-500" />,
                        reprogramada: <CalendarClock className="w-5 h-5 text-indigo-500" />,
                        suspendida: <AlertCircle className="w-5 h-5 text-orange-500" />,
                        recuperada: <RotateCcw className="w-5 h-5 text-purple-500" />,
                      };

                      const labels = {
                        realizada: 'Realizada',
                        cancelada_anticipada: 'Cancelada (anticipada)',
                        cancelada_tarde: 'Cancelada (tarde)',
                        programada: 'Programada',
                        reprogramada: 'Reprogramada',
                        suspendida: 'Suspendida',
                        recuperada: 'Recuperada',
                      };

                      const colors = {
                        realizada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        cancelada_anticipada: 'bg-amber-50 text-amber-700 border-amber-200',
                        cancelada_tarde: 'bg-rose-50 text-rose-700 border-rose-200',
                        programada: 'bg-blue-50 text-blue-700 border-blue-200',
                        reprogramada: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                        suspendida: 'bg-orange-50 text-orange-700 border-orange-200',
                        recuperada: 'bg-purple-50 text-purple-700 border-purple-200',
                      };

                      return (
                        <div
                          key={clase.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${colors[clase.estado] || 'bg-slate-50 border-slate-200'}`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {iconos[clase.estado]}
                            <div>
                              <p className="font-medium">
                                {format(parseISO(clase.fecha), "EEEE d 'de' MMMM", { locale: es })}
                              </p>
                              <p className="text-sm opacity-75">
                                {clase.hora_inicio} • {clase.sede} {clase.cancha && `• Cancha ${clase.cancha}`}
                              </p>
                              {clase.notas && (
                                <p className="text-xs opacity-60 mt-1">{clase.notas}</p>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="ml-2">
                            {labels[clase.estado] || clase.estado}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Pagos */}
          <TabsContent value="pagos" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Historial de Pagos</CardTitle>
              </CardHeader>
              <CardContent>
                {pagosAlumno.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No hay pagos registrados</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {pagosAlumno.map((pago) => (
                      <div
                        key={pago.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <DollarSign className="w-5 h-5 text-emerald-600" />
                          <div>
                            <p className="font-medium">
                              ${pago.monto.toLocaleString()}
                            </p>
                            <p className="text-sm text-slate-500">
                              {format(parseISO(pago.fecha), "d 'de' MMMM yyyy", { locale: es })}
                            </p>
                            {pago.notas && (
                              <p className="text-xs text-slate-400 mt-1">{pago.notas}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">
                            {pago.medio_pago || 'No especificado'}
                          </Badge>
                          <p className="text-xs text-slate-500 mt-1">
                            {pago.mes_correspondiente}
                          </p>
                          {pago.fuera_de_termino && (
                            <Badge variant="destructive" className="mt-1 text-xs">
                              Fuera de término
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resumen de deuda */}
            <Card className="bg-gradient-to-br from-slate-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Precio Mensual</p>
                    <p className="text-2xl font-bold text-slate-900">
                      ${alumno.precio_mensual?.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Deuda Actual</p>
                    <p className="text-2xl font-bold text-rose-600">
                      ${estadisticas.deudaPendiente.toLocaleString()}
                    </p>
                  </div>
                </div>
                {alumno.ultimo_pago_fecha && (
                  <p className="text-xs text-slate-500 mt-3">
                    Último pago: {format(parseISO(alumno.ultimo_pago_fecha), "d 'de' MMMM yyyy", { locale: es })}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Estadísticas */}
          <TabsContent value="estadisticas" className="space-y-3">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Estados de Clases</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded bg-emerald-50">
                    <span className="text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Realizadas
                    </span>
                    <span className="font-bold text-emerald-700">{estadisticas.realizadas}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-blue-50">
                    <span className="text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      Programadas
                    </span>
                    <span className="font-bold text-blue-700">{estadisticas.programadas}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-amber-50">
                    <span className="text-sm flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-amber-600" />
                      Canceladas
                    </span>
                    <span className="font-bold text-amber-700">{estadisticas.canceladas}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-indigo-50">
                    <span className="text-sm flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 text-indigo-600" />
                      Reprogramadas
                    </span>
                    <span className="font-bold text-indigo-700">{estadisticas.reprogramadas}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-purple-50">
                    <span className="text-sm flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-purple-600" />
                      Recuperadas
                    </span>
                    <span className="font-bold text-purple-700">{estadisticas.recuperadas}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-orange-50">
                    <span className="text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      Suspendidas
                    </span>
                    <span className="font-bold text-orange-700">{estadisticas.suspendidas}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Asistencia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-emerald-600 mb-2">
                      {estadisticas.porcentajeAsistencia}%
                    </div>
                    <p className="text-sm text-slate-500">Porcentaje de Asistencia</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded bg-emerald-50">
                      <span className="text-sm">Presentes</span>
                      <span className="font-bold text-emerald-700">{estadisticas.presentes}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-rose-50">
                      <span className="text-sm">Ausentes</span>
                      <span className="font-bold text-rose-700">{estadisticas.ausentes}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-slate-100">
                      <span className="text-sm font-medium">Total Registros</span>
                      <span className="font-bold">{estadisticas.totalAsistencias}</span>
                    </div>
                  </div>

                  {alumno.clases_a_recuperar > 0 && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800">
                        <strong>{alumno.clases_a_recuperar}</strong> {alumno.clases_a_recuperar === 1 ? 'clase' : 'clases'} pendientes de recuperar
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Información adicional */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información del Alumno</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">WhatsApp</p>
                  <p className="font-medium">{alumno.whatsapp}</p>
                </div>
                <div>
                  <p className="text-slate-500">Estado</p>
                  <Badge className="mt-1">
                    {alumno.estado === 'activo' ? 'Activo' : alumno.estado === 'moroso' ? 'Moroso' : 'Pausado'}
                  </Badge>
                </div>
                {alumno.fecha_inicio && (
                  <div>
                    <p className="text-slate-500">Fecha de Inicio</p>
                    <p className="font-medium">
                      {format(parseISO(alumno.fecha_inicio), "d 'de' MMMM yyyy", { locale: es })}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-slate-500">Clases por Mes</p>
                  <p className="font-medium">{alumno.clases_por_mes} clases</p>
                </div>
                {alumno.sede_preferida && (
                  <div>
                    <p className="text-slate-500">Sede Preferida</p>
                    <p className="font-medium">{alumno.sede_preferida}</p>
                  </div>
                )}
                {alumno.horario_preferido && (
                  <div>
                    <p className="text-slate-500">Horario Preferido</p>
                    <p className="font-medium">{alumno.horario_preferido}</p>
                  </div>
                )}
                {alumno.observaciones && (
                  <div className="md:col-span-2">
                    <p className="text-slate-500">Observaciones</p>
                    <p className="font-medium">{alumno.observaciones}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}