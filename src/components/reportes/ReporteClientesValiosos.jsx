import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, TrendingUp, Calendar, DollarSign } from 'lucide-react';

export default function ReporteClientesValiosos({ clientes = [], turnos = [] }) {
  const clientesConValor = useMemo(() => {
    return clientes.map(cliente => {
      const turnosCliente = turnos.filter(t => t.cliente === cliente.nombre);
      const totalTurnos = turnosCliente.length;
      const turnosPagados = turnosCliente.filter(t => t.pagado).length;
      const totalGastado = turnosCliente
        .filter(t => t.pagado)
        .reduce((sum, t) => sum + (t.monto || 0), 0);
      const promedioGasto = totalTurnos > 0 ? totalGastado / totalTurnos : 0;
      const frecuencia = totalTurnos; // Simplificado: total de turnos

      // Score de valor (combinación de gasto y frecuencia)
      const scoreValor = (totalGastado * 0.6) + (frecuencia * 1000 * 0.4);

      return {
        ...cliente,
        totalTurnos,
        turnosPagados,
        totalGastado,
        promedioGasto,
        frecuencia,
        scoreValor,
      };
    })
    .filter(c => c.totalTurnos > 0) // Solo clientes con turnos
    .sort((a, b) => b.scoreValor - a.scoreValor);
  }, [clientes, turnos]);

  const topClientes = clientesConValor.slice(0, 10);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const categoriaCliente = (score) => {
    if (score > 50000) return { label: 'VIP', color: 'bg-purple-500' };
    if (score > 30000) return { label: 'Premium', color: 'bg-emerald-500' };
    if (score > 15000) return { label: 'Frecuente', color: 'bg-blue-500' };
    return { label: 'Regular', color: 'bg-slate-500' };
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Clientes Más Valiosos</h3>
        <p className="text-sm text-slate-500">Top 10 por gasto total y frecuencia</p>
      </div>

      {/* Top 3 destacados */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {topClientes.slice(0, 3).map((cliente, idx) => {
          const categoria = categoriaCliente(cliente.scoreValor);
          return (
            <Card 
              key={cliente.id} 
              className={idx === 0 ? 'border-purple-200 bg-purple-50/30' : 'border-slate-200'}
            >
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {idx === 0 && <span className="text-2xl">👑</span>}
                    {idx === 1 && <span className="text-2xl">🥈</span>}
                    {idx === 2 && <span className="text-2xl">🥉</span>}
                    <Badge className={categoria.color}>{categoria.label}</Badge>
                  </div>
                  <p className="font-semibold text-slate-900 mb-1">{cliente.nombre}</p>
                  <p className="text-2xl font-bold text-purple-600 mb-2">
                    {formatMoney(cliente.totalGastado)}
                  </p>
                  <div className="flex items-center justify-center gap-4 text-sm text-slate-600">
                    <div>
                      <p className="font-medium">{cliente.totalTurnos}</p>
                      <p className="text-xs">Turnos</p>
                    </div>
                    <div>
                      <p className="font-medium">{formatMoney(cliente.promedioGasto)}</p>
                      <p className="text-xs">Promedio</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabla completa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranking Completo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-3 font-medium text-slate-700">Posición</th>
                  <th className="pb-3 font-medium text-slate-700">Cliente</th>
                  <th className="pb-3 font-medium text-slate-700">Categoría</th>
                  <th className="pb-3 font-medium text-slate-700 text-center">Turnos</th>
                  <th className="pb-3 font-medium text-slate-700 text-right">Total Gastado</th>
                  <th className="pb-3 font-medium text-slate-700 text-right">Promedio</th>
                </tr>
              </thead>
              <tbody>
                {topClientes.map((cliente, idx) => {
                  const categoria = categoriaCliente(cliente.scoreValor);
                  return (
                    <tr key={cliente.id} className="border-b last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700">#{idx + 1}</span>
                          {idx < 3 && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                        </div>
                      </td>
                      <td className="py-3 text-slate-900 font-medium">{cliente.nombre}</td>
                      <td className="py-3">
                        <Badge className={categoria.color}>{categoria.label}</Badge>
                      </td>
                      <td className="py-3 text-center text-slate-700">{cliente.totalTurnos}</td>
                      <td className="py-3 text-right font-semibold text-purple-600">
                        {formatMoney(cliente.totalGastado)}
                      </td>
                      <td className="py-3 text-right text-slate-700">
                        {formatMoney(cliente.promedioGasto)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas generales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Star className="w-6 h-6 mx-auto mb-2 text-purple-500" />
              <p className="text-xl font-bold text-slate-900">
                {clientesConValor.filter(c => categoriaCliente(c.scoreValor).label === 'VIP').length}
              </p>
              <p className="text-xs text-slate-500 mt-1">Clientes VIP</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
              <p className="text-xl font-bold text-slate-900">
                {clientesConValor.filter(c => categoriaCliente(c.scoreValor).label === 'Premium').length}
              </p>
              <p className="text-xs text-slate-500 mt-1">Premium</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Calendar className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="text-xl font-bold text-slate-900">
                {clientesConValor.filter(c => categoriaCliente(c.scoreValor).label === 'Frecuente').length}
              </p>
              <p className="text-xs text-slate-500 mt-1">Frecuentes</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <DollarSign className="w-6 h-6 mx-auto mb-2 text-slate-500" />
              <p className="text-xl font-bold text-slate-900">
                {formatMoney(
                  topClientes.reduce((sum, c) => sum + c.totalGastado, 0)
                )}
              </p>
              <p className="text-xs text-slate-500 mt-1">Total Top 10</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}