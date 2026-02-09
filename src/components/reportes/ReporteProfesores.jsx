import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ReporteProfesores({ clases = [], profesores = [], pagos = [] }) {
  const rendimientoProfesores = useMemo(() => {
    return profesores.map(profesor => {
      const clasesProfesor = clases.filter(c => c.profesor_id === profesor.id);
      const clasesRealizadas = clasesProfesor.filter(c => c.estado === 'realizada').length;
      const clasesCanceladas = clasesProfesor.filter(c => 
        c.estado === 'cancelada_anticipada' || c.estado === 'cancelada_tarde'
      ).length;
      const totalClases = clasesProfesor.length;
      const tasaRealizacion = totalClases > 0 ? (clasesRealizadas / totalClases) * 100 : 0;

      // Ingresos generados (suma de pagos de sus alumnos)
      const ingresosGenerados = pagos
        .filter(p => {
          const alumnoClases = clases.filter(c => 
            c.alumnos_ids?.includes(p.alumno_id) && c.profesor_id === profesor.id
          );
          return alumnoClases.length > 0;
        })
        .reduce((sum, p) => sum + (p.monto || 0), 0);

      const alumnosUnicos = new Set(
        clasesProfesor.flatMap(c => c.alumnos_ids || [])
      ).size;

      return {
        id: profesor.id,
        nombre: profesor.nombre,
        totalClases,
        clasesRealizadas,
        clasesCanceladas,
        tasaRealizacion,
        ingresosGenerados,
        alumnosUnicos,
      };
    }).sort((a, b) => b.ingresosGenerados - a.ingresosGenerados);
  }, [profesores, clases, pagos]);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const topProfesores = rendimientoProfesores.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Rendimiento de Profesores</h3>
        <p className="text-sm text-slate-500">Análisis de actividad y generación de ingresos</p>
      </div>

      {/* Top 3 Profesores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {topProfesores.slice(0, 3).map((profesor, idx) => (
          <Card key={profesor.id} className={idx === 0 ? 'border-emerald-200 bg-emerald-50/30' : ''}>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {idx === 0 && <Badge className="bg-emerald-500">🏆 Top 1</Badge>}
                  {idx === 1 && <Badge className="bg-blue-500">🥈 Top 2</Badge>}
                  {idx === 2 && <Badge className="bg-amber-500">🥉 Top 3</Badge>}
                </div>
                <p className="font-semibold text-slate-900 mb-1">{profesor.nombre}</p>
                <p className="text-2xl font-bold text-emerald-600 mb-2">
                  {formatMoney(profesor.ingresosGenerados)}
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-slate-600">
                  <div>
                    <p className="font-medium">{profesor.clasesRealizadas}</p>
                    <p className="text-xs">Clases</p>
                  </div>
                  <div>
                    <p className="font-medium">{profesor.alumnosUnicos}</p>
                    <p className="text-xs">Alumnos</p>
                  </div>
                  <div>
                    <p className="font-medium">{profesor.tasaRealizacion.toFixed(0)}%</p>
                    <p className="text-xs">Tasa</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráfico de comparación */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ingresos por Profesor</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProfesores}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" />
              <YAxis />
              <Tooltip 
                formatter={(value) => formatMoney(value)}
                labelStyle={{ color: '#000' }}
              />
              <Bar dataKey="ingresosGenerados" fill="#10b981" name="Ingresos" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabla detallada */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle Completo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-3 font-medium text-slate-700">Profesor</th>
                  <th className="pb-3 font-medium text-slate-700 text-center">Alumnos</th>
                  <th className="pb-3 font-medium text-slate-700 text-center">Clases</th>
                  <th className="pb-3 font-medium text-slate-700 text-center">Realizadas</th>
                  <th className="pb-3 font-medium text-slate-700 text-center">Tasa</th>
                  <th className="pb-3 font-medium text-slate-700 text-right">Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {rendimientoProfesores.map((profesor) => (
                  <tr key={profesor.id} className="border-b last:border-0">
                    <td className="py-3 text-slate-900 font-medium">{profesor.nombre}</td>
                    <td className="py-3 text-center text-slate-700">{profesor.alumnosUnicos}</td>
                    <td className="py-3 text-center text-slate-700">{profesor.totalClases}</td>
                    <td className="py-3 text-center text-emerald-600">{profesor.clasesRealizadas}</td>
                    <td className="py-3 text-center">
                      <Badge 
                        variant="outline" 
                        className={
                          profesor.tasaRealizacion >= 90 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                            : profesor.tasaRealizacion >= 70
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : 'bg-amber-50 text-amber-700 border-amber-300'
                        }
                      >
                        {profesor.tasaRealizacion.toFixed(0)}%
                      </Badge>
                    </td>
                    <td className="py-3 text-right font-semibold text-emerald-600">
                      {formatMoney(profesor.ingresosGenerados)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}