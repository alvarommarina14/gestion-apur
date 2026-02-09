import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, BookOpen, Percent } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function ReporteOcupacion({ turnos = [] }) {
  const estadisticas = useMemo(() => {
    const total = turnos.filter(t => t.estado === 'activo').length;
    const clases = turnos.filter(t => t.tipo_turno === 'clase' && t.estado === 'activo').length;
    const alquileres = turnos.filter(t => t.tipo_turno === 'alquiler' && t.estado === 'activo').length;
    const porcentajeClases = total > 0 ? (clases / total) * 100 : 0;
    const porcentajeAlquileres = total > 0 ? (alquileres / total) * 100 : 0;

    // Ocupación por cancha
    const ocupacionCanchas = ['1', '2', '3', '4'].map(cancha => {
      const turnosCancha = turnos.filter(t => t.cancha === cancha && t.estado === 'activo').length;
      return {
        cancha: `Cancha ${cancha}`,
        turnos: turnosCancha,
        porcentaje: total > 0 ? (turnosCancha / total) * 100 : 0,
      };
    });

    // Ocupación por horario
    const franjas = {
      mañana: turnos.filter(t => {
        const hora = parseInt(t.hora_inicio?.split(':')[0] || '0');
        return hora >= 8 && hora < 12 && t.estado === 'activo';
      }).length,
      tarde: turnos.filter(t => {
        const hora = parseInt(t.hora_inicio?.split(':')[0] || '0');
        return hora >= 12 && hora < 18 && t.estado === 'activo';
      }).length,
      noche: turnos.filter(t => {
        const hora = parseInt(t.hora_inicio?.split(':')[0] || '0');
        return hora >= 18 && hora < 23 && t.estado === 'activo';
      }).length,
    };

    return {
      total,
      clases,
      alquileres,
      porcentajeClases,
      porcentajeAlquileres,
      ocupacionCanchas,
      franjas,
    };
  }, [turnos]);

  const dataTipos = [
    { name: 'Clases', value: estadisticas.clases, color: '#10b981' },
    { name: 'Alquileres', value: estadisticas.alquileres, color: '#3b82f6' },
  ];

  const dataFranjas = [
    { name: 'Mañana (8-12h)', value: estadisticas.franjas.mañana, color: '#f59e0b' },
    { name: 'Tarde (12-18h)', value: estadisticas.franjas.tarde, color: '#8b5cf6' },
    { name: 'Noche (18-23h)', value: estadisticas.franjas.noche, color: '#06b6d4' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Análisis de Ocupación</h3>
        <p className="text-sm text-slate-500">Distribución de turnos por tipo y horario</p>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-3xl font-bold text-slate-900">{estadisticas.total}</p>
              <p className="text-sm text-slate-500 mt-1">Turnos Totales</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="pt-6">
            <div className="text-center">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
              <p className="text-3xl font-bold text-emerald-600">{estadisticas.clases}</p>
              <p className="text-sm text-slate-500 mt-1">
                Clases ({estadisticas.porcentajeClases.toFixed(0)}%)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <p className="text-3xl font-bold text-blue-600">{estadisticas.alquileres}</p>
              <p className="text-sm text-slate-500 mt-1">
                Alquileres ({estadisticas.porcentajeAlquileres.toFixed(0)}%)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={dataTipos}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dataTipos.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución por Horario</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={dataFranjas}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dataFranjas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Ocupación por cancha */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ocupación por Cancha</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {estadisticas.ocupacionCanchas.map((cancha, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">{cancha.cancha}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{cancha.turnos} turnos</Badge>
                    <span className="text-sm text-slate-600">{cancha.porcentaje.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-emerald-500 h-3 rounded-full transition-all"
                    style={{ width: `${cancha.porcentaje}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}