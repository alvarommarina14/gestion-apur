import React, { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Download,
  BarChart3
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ReportesIngresos({ turnos = [], cobrosClientes = [], pagos = [] }) {
  const [periodoMeses, setPeriodoMeses] = useState(6);

  const dataPorMes = useMemo(() => {
    const hoy = new Date();
    const mesesAtras = subMonths(hoy, periodoMeses - 1);
    const meses = eachMonthOfInterval({ start: mesesAtras, end: hoy });

    return meses.map(mes => {
      const mesKey = format(mes, 'yyyy-MM');
      const mesLabel = format(mes, 'MMM yyyy', { locale: es });

      // Ingresos de turnos pagados
      const ingresosTurnos = turnos
        .filter(t => t.pagado && t.fecha?.startsWith(mesKey))
        .reduce((sum, t) => sum + (t.monto || 0), 0);

      // Ingresos de cobros a clientes
      const ingresosCobros = cobrosClientes
        .filter(c => c.estado === 'pagado' && c.fecha_pago?.startsWith(mesKey))
        .reduce((sum, c) => sum + (c.monto || 0), 0);

      // Pagos de alumnos
      const ingresosPagos = pagos
        .filter(p => p.fecha?.startsWith(mesKey))
        .reduce((sum, p) => sum + (p.monto || 0), 0);

      const total = ingresosTurnos + ingresosCobros + ingresosPagos;

      return {
        mes: mesLabel,
        turnos: ingresosTurnos,
        cobros: ingresosCobros,
        clases: ingresosPagos,
        total,
      };
    });
  }, [turnos, cobrosClientes, pagos, periodoMeses]);

  const estadisticas = useMemo(() => {
    const totalGeneral = dataPorMes.reduce((sum, m) => sum + m.total, 0);
    const promedio = totalGeneral / dataPorMes.length;
    const ultimoMes = dataPorMes[dataPorMes.length - 1];
    const penultimoMes = dataPorMes[dataPorMes.length - 2];
    const variacion = penultimoMes ? ((ultimoMes.total - penultimoMes.total) / penultimoMes.total) * 100 : 0;

    return {
      total: totalGeneral,
      promedio,
      ultimoMes: ultimoMes?.total || 0,
      variacion,
    };
  }, [dataPorMes]);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const exportarPDF = () => {
    alert('Función de exportar PDF en desarrollo');
  };

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Ingresos por Periodo</h3>
          <p className="text-sm text-slate-500">Análisis de últimos {periodoMeses} meses</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPeriodoMeses(3)}
            className={periodoMeses === 3 ? 'bg-slate-100' : ''}
          >
            3 meses
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPeriodoMeses(6)}
            className={periodoMeses === 6 ? 'bg-slate-100' : ''}
          >
            6 meses
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPeriodoMeses(12)}
            className={periodoMeses === 12 ? 'bg-slate-100' : ''}
          >
            12 meses
          </Button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-500">Total Periodo</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatMoney(estadisticas.total)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-500">Promedio Mensual</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatMoney(estadisticas.promedio)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-500">Último Mes</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatMoney(estadisticas.ultimoMes)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-500">Variación</p>
              <div className="flex items-center justify-center gap-1">
                {estadisticas.variacion >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-rose-600" />
                )}
                <p className={`text-2xl font-bold ${estadisticas.variacion >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {Math.abs(estadisticas.variacion).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de barras */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolución de Ingresos</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dataPorMes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip 
                formatter={(value) => formatMoney(value)}
                labelStyle={{ color: '#000' }}
              />
              <Legend />
              <Bar dataKey="turnos" fill="#3b82f6" name="Turnos" />
              <Bar dataKey="cobros" fill="#8b5cf6" name="Cobros" />
              <Bar dataKey="clases" fill="#10b981" name="Clases" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabla detallada */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle Mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-3 font-medium text-slate-700">Mes</th>
                  <th className="pb-3 font-medium text-slate-700 text-right">Turnos</th>
                  <th className="pb-3 font-medium text-slate-700 text-right">Cobros</th>
                  <th className="pb-3 font-medium text-slate-700 text-right">Clases</th>
                  <th className="pb-3 font-medium text-slate-700 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {dataPorMes.map((mes, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-3 text-slate-900">{mes.mes}</td>
                    <td className="py-3 text-right text-blue-600">{formatMoney(mes.turnos)}</td>
                    <td className="py-3 text-right text-purple-600">{formatMoney(mes.cobros)}</td>
                    <td className="py-3 text-right text-emerald-600">{formatMoney(mes.clases)}</td>
                    <td className="py-3 text-right font-semibold text-slate-900">{formatMoney(mes.total)}</td>
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