import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, DollarSign, CreditCard, User, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function ReporteCobros({ turnos = [], pagos = [], cobrosClientes = [] }) {
  const analisisCobros = useMemo(() => {
    // Deudas pendientes
    const turnosPendientes = turnos.filter(t => !t.pagado && t.estado === 'activo');
    const deudaTurnos = turnosPendientes.reduce((sum, t) => sum + (t.monto || 0), 0);
    
    const cobrosPendientes = cobrosClientes.filter(c => c.estado === 'pendiente' || c.estado === 'moroso');
    const deudaCobros = cobrosPendientes.reduce((sum, c) => sum + (c.monto || 0), 0);
    
    const morosos = cobrosClientes.filter(c => c.estado === 'moroso');
    const deudaMorosos = morosos.reduce((sum, c) => sum + (c.monto || 0), 0);

    // Ingresos por medio de pago - EN CERO por ahora (sin datos de pagos integrados)
    const mediosPago = {};

    // Cobros por empleado (de turnos)
    const cobrosPorEmpleado = {};
    turnos.filter(t => t.pagado && t.cobrado_por).forEach(t => {
      const empleado = t.cobrado_por;
      if (!cobrosPorEmpleado[empleado]) {
        cobrosPorEmpleado[empleado] = { cantidad: 0, monto: 0 };
      }
      cobrosPorEmpleado[empleado].cantidad++;
      cobrosPorEmpleado[empleado].monto += t.monto || 0;
    });

    return {
      deudaTurnos,
      deudaCobros,
      deudaMorosos,
      totalDeuda: deudaTurnos + deudaCobros,
      cantidadMorosos: morosos.length,
      mediosPago: Object.entries(mediosPago).map(([medio, monto]) => ({ medio, monto })),
      cobrosPorEmpleado: Object.entries(cobrosPorEmpleado)
        .map(([empleado, data]) => ({ empleado, ...data }))
        .sort((a, b) => b.monto - a.monto),
    };
  }, [turnos, pagos, cobrosClientes]);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const coloresMedios = {
    'Efectivo': '#10b981',
    'Transferencia': '#3b82f6',
    'Débito': '#8b5cf6',
    'Crédito': '#f59e0b',
    'MercadoPago': '#06b6d4',
    'Otro': '#64748b',
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Análisis de Cobros</h3>
        <p className="text-sm text-slate-500">Deudas, medios de pago y rendimiento</p>
      </div>

      {/* Métricas de deuda */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-rose-200 bg-rose-50/30">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
              <p className="text-2xl font-bold text-rose-600">
                {formatMoney(analisisCobros.totalDeuda)}
              </p>
              <p className="text-sm text-slate-500 mt-1">Deuda Total</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="pt-6">
            <div className="text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <p className="text-2xl font-bold text-amber-600">
                {formatMoney(analisisCobros.deudaTurnos)}
              </p>
              <p className="text-sm text-slate-500 mt-1">Turnos Pendientes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/30">
          <CardContent className="pt-6">
            <div className="text-center">
              <User className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold text-purple-600">
                {formatMoney(analisisCobros.deudaCobros)}
              </p>
              <p className="text-sm text-slate-500 mt-1">Cobros Pendientes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-300 bg-rose-100/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-600" />
              <p className="text-2xl font-bold text-rose-700">
                {analisisCobros.cantidadMorosos}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Morosos ({formatMoney(analisisCobros.deudaMorosos)})
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ingresos por medio de pago */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ingresos por Medio de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="py-12 text-center text-slate-500">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">En construcción - Sincronización pendiente con cobros de profesores y admin</p>
              </div>
            </CardContent>
          </Card>

        {/* Cobros por empleado */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rendimiento de Empleados</CardTitle>
          </CardHeader>
          <CardContent>
            {analisisCobros.cobrosPorEmpleado.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <p className="text-sm">No hay datos de cobros por empleado</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analisisCobros.cobrosPorEmpleado}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="empleado" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatMoney(value)} />
                  <Bar dataKey="monto" fill="#10b981" name="Cobrado" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabla de medios de pago */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalle por Medio de Pago</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-slate-500">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Sin datos - Se sincronizará con cobros de profesores y admin</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}