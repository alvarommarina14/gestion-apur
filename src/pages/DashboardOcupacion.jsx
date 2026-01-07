import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Clock, Calendar, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

const HORARIOS = [];
for (let h = 8; h <= 21; h++) {
  HORARIOS.push(`${h.toString().padStart(2, '0')}:00`);
  if (h < 21) HORARIOS.push(`${h.toString().padStart(2, '0')}:30`);
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function DashboardOcupacion() {
  const [periodo, setPeriodo] = useState('mes');
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date());

  const { data: turnos = [], isLoading } = useQuery({
    queryKey: ['turnos-cancha'],
    queryFn: () => base44.entities.TurnoCancha.list(),
  });

  // Filtrar turnos según período
  const turnosFiltrados = useMemo(() => {
    const inicio = startOfMonth(mesSeleccionado);
    const fin = endOfMonth(mesSeleccionado);
    
    return turnos.filter(t => {
      const fecha = parseISO(t.fecha);
      return fecha >= inicio && fecha <= fin;
    });
  }, [turnos, mesSeleccionado]);

  // Calcular ocupación por horario
  const ocupacionPorHorario = useMemo(() => {
    const conteo = {};
    HORARIOS.forEach(h => conteo[h] = 0);
    
    turnosFiltrados.forEach(turno => {
      if (conteo[turno.hora_inicio] !== undefined) {
        conteo[turno.hora_inicio]++;
      }
    });
    
    return HORARIOS.map(hora => ({
      hora,
      cantidad: conteo[hora],
      porcentaje: turnosFiltrados.length > 0 ? ((conteo[hora] / turnosFiltrados.length) * 100).toFixed(1) : 0,
    }));
  }, [turnosFiltrados]);

  // Calcular ocupación por día de la semana
  const ocupacionPorDia = useMemo(() => {
    const conteo = {};
    DIAS_SEMANA.forEach(d => conteo[d] = 0);
    
    turnosFiltrados.forEach(turno => {
      const fecha = parseISO(turno.fecha);
      const diaSemana = format(fecha, 'EEEE', { locale: es });
      const diaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
      if (conteo[diaCapitalizado] !== undefined) {
        conteo[diaCapitalizado]++;
      }
    });
    
    return DIAS_SEMANA.map(dia => ({
      dia,
      cantidad: conteo[dia],
    }));
  }, [turnosFiltrados]);

  // Calcular métricas principales
  const metricas = useMemo(() => {
    const totalTurnos = turnosFiltrados.length;
    const diasDelMes = eachDayOfInterval({
      start: startOfMonth(mesSeleccionado),
      end: endOfMonth(mesSeleccionado),
    }).length;
    
    // 4 canchas * 28 slots por día (8:00 a 21:30, cada 30min)
    const slotsDisponiblesPorDia = 4 * 28;
    const totalSlotsDisponibles = slotsDisponiblesPorDia * diasDelMes;
    
    // Calcular slots ocupados (considerando duración)
    const slotsOcupados = turnosFiltrados.reduce((sum, t) => {
      return sum + (t.duracion === 90 ? 3 : 2); // 90min = 3 slots, 60min = 2 slots
    }, 0);
    
    const ocupacionPorcentaje = ((slotsOcupados / totalSlotsDisponibles) * 100).toFixed(1);
    
    // Horarios más y menos usados
    const ordenados = [...ocupacionPorHorario].sort((a, b) => b.cantidad - a.cantidad);
    const masUsados = ordenados.slice(0, 3);
    const menosUsados = ordenados.slice(-3).reverse();
    
    // Día más ocupado
    const diaMaximo = ocupacionPorDia.reduce((max, d) => d.cantidad > max.cantidad ? d : max, ocupacionPorDia[0]);
    const diaMinimo = ocupacionPorDia.reduce((min, d) => d.cantidad < min.cantidad ? d : min, ocupacionPorDia[0]);
    
    return {
      totalTurnos,
      ocupacionPorcentaje,
      slotsOcupados,
      totalSlotsDisponibles,
      masUsados,
      menosUsados,
      diaMaximo,
      diaMinimo,
    };
  }, [turnosFiltrados, ocupacionPorHorario, ocupacionPorDia, mesSeleccionado]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard de Ocupación</h1>
          <p className="text-slate-500 text-sm">Análisis y optimización de uso de canchas</p>
        </header>

        {/* Selector de mes */}
        <Card className="shadow-sm">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Período analizado</p>
                <p className="font-semibold text-slate-900">
                  {format(mesSeleccionado, "MMMM yyyy", { locale: es })}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setMesSeleccionado(new Date(mesSeleccionado.getFullYear(), mesSeleccionado.getMonth() - 1))}
                  className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setMesSeleccionado(new Date())}
                  className="px-3 py-2 text-sm bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors"
                >
                  Mes actual
                </button>
                <button
                  onClick={() => setMesSeleccionado(new Date(mesSeleccionado.getFullYear(), mesSeleccionado.getMonth() + 1))}
                  className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Ocupación Total</p>
                  <p className="text-3xl font-bold text-emerald-600">{metricas.ocupacionPorcentaje}%</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {metricas.slotsOcupados} de {metricas.totalSlotsDisponibles} slots
                  </p>
                </div>
                <Activity className="w-10 h-10 text-emerald-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Turnos</p>
                  <p className="text-3xl font-bold text-blue-600">{metricas.totalTurnos}</p>
                  <p className="text-xs text-slate-400 mt-1">En el período</p>
                </div>
                <Calendar className="w-10 h-10 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-slate-500 mb-2">Día más ocupado</p>
                <p className="text-xl font-bold text-slate-900">{metricas.diaMaximo?.dia}</p>
                <p className="text-sm text-slate-600">{metricas.diaMaximo?.cantidad} turnos</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-slate-500 mb-2">Día menos ocupado</p>
                <p className="text-xl font-bold text-slate-900">{metricas.diaMinimo?.dia}</p>
                <p className="text-sm text-slate-600">{metricas.diaMinimo?.cantidad} turnos</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Horarios más y menos usados */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Horarios Más Usados
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {metricas.masUsados.map((horario, idx) => (
                  <div key={horario.hora} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{horario.hora}</p>
                        <p className="text-xs text-slate-500">{horario.cantidad} turnos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-600">{horario.porcentaje}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-600" />
                Horarios Menos Usados
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {metricas.menosUsados.map((horario, idx) => (
                  <div key={horario.hora} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{horario.hora}</p>
                        <p className="text-xs text-slate-500">{horario.cantidad} turnos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-rose-600">{horario.porcentaje}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de ocupación por horario */}
        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Ocupación por Franja Horaria
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={ocupacionPorHorario}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="hora" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 11 }}
                />
                <YAxis />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  formatter={(value, name) => [value, 'Turnos']}
                />
                <Bar dataKey="cantidad" radius={[8, 8, 0, 0]}>
                  {ocupacionPorHorario.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.cantidad > 10 ? '#10b981' : entry.cantidad > 5 ? '#f59e0b' : '#ef4444'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de ocupación por día de semana */}
        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Ocupación por Día de la Semana
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ocupacionPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  formatter={(value, name) => [value, 'Turnos']}
                />
                <Bar dataKey="cantidad" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recomendaciones */}
        <Card className="shadow-sm border-blue-200 bg-blue-50">
          <CardHeader className="border-b border-blue-200">
            <CardTitle className="text-lg text-blue-900">💡 Recomendaciones</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className="space-y-2 text-sm text-blue-800">
              {metricas.ocupacionPorcentaje < 50 && (
                <li>• La ocupación general está por debajo del 50%. Considera promociones en horarios de baja demanda.</li>
              )}
              {metricas.menosUsados[0]?.cantidad < 3 && (
                <li>• El horario {metricas.menosUsados[0]?.hora} tiene muy baja demanda. Podrías ofrecer descuentos especiales.</li>
              )}
              {metricas.masUsados[0]?.cantidad > 15 && (
                <li>• El horario {metricas.masUsados[0]?.hora} está en alta demanda. Considera ajustar precios o agregar capacidad.</li>
              )}
              {metricas.diaMinimo?.cantidad < 5 && (
                <li>• Los {metricas.diaMinimo?.dia}s tienen baja ocupación. Podrías lanzar promociones para ese día.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}