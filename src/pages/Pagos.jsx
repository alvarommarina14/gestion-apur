import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DollarSign,
  Search,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MetricCard from '@/components/ui/MetricCard';
import RegistrarPagoModal from '@/components/modals/RegistrarPagoModal';
import { cn } from '@/lib/utils';

export default function Pagos() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [search, setSearch] = useState('');
  const [filterMedio, setFilterMedio] = useState('todos');
  const [pagoModal, setPagoModal] = useState({ open: false, alumno: null });
  
  const monthStr = format(currentMonth, 'yyyy-MM');
  
  const { data: pagos = [], isLoading: loadingPagos } = useQuery({
    queryKey: ['pagos'],
    queryFn: () => base44.entities.Pago.list('-fecha'),
  });
  
  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
  });
  
  // Pagos del mes
  const pagosMes = useMemo(() => {
    return pagos.filter(p => p.mes_correspondiente === monthStr);
  }, [pagos, monthStr]);
  
  // Pagos filtrados
  const pagosFiltrados = useMemo(() => {
    return pagosMes.filter(pago => {
      const matchSearch = pago.alumno_nombre?.toLowerCase().includes(search.toLowerCase());
      const matchMedio = filterMedio === 'todos' || pago.medio_pago === filterMedio;
      return matchSearch && matchMedio;
    });
  }, [pagosMes, search, filterMedio]);
  
  // Stats
  const stats = useMemo(() => {
    const alumnosActivos = alumnos.filter(a => a.estado !== 'pausado');
    const ingresoEsperado = alumnosActivos.reduce((sum, a) => sum + (a.precio_mensual || 0), 0);
    const ingresoReal = pagosMes.reduce((sum, p) => sum + (p.monto || 0), 0);
    const fueraDetermino = pagosMes.filter(p => p.fuera_de_termino).length;
    const porcentaje = ingresoEsperado > 0 ? Math.round((ingresoReal / ingresoEsperado) * 100) : 0;
    
    return {
      ingresoEsperado,
      ingresoReal,
      diferencia: ingresoReal - ingresoEsperado,
      porcentaje,
      totalPagos: pagosMes.length,
      fueraDetermino,
    };
  }, [alumnos, pagosMes]);
  
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };
  
  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Pagos</h1>
            <p className="text-slate-500 text-sm">
              Control de cobranza y seguimiento de pagos
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
        
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Ingreso esperado"
            value={formatMoney(stats.ingresoEsperado)}
            icon={TrendingUp}
            variant="default"
          />
          <MetricCard
            title="Ingreso real"
            value={formatMoney(stats.ingresoReal)}
            subtitle={`${stats.porcentaje}% cobrado`}
            icon={DollarSign}
            variant={stats.porcentaje >= 80 ? 'success' : stats.porcentaje >= 50 ? 'warning' : 'danger'}
          />
          <MetricCard
            title="Diferencia"
            value={formatMoney(Math.abs(stats.diferencia))}
            icon={stats.diferencia >= 0 ? TrendingUp : TrendingDown}
            variant={stats.diferencia >= 0 ? 'success' : 'danger'}
            trend={stats.diferencia >= 0 ? 'up' : 'down'}
            trendValue={stats.diferencia >= 0 ? 'Superávit' : 'Faltante'}
          />
          <MetricCard
            title="Fuera de término"
            value={stats.fueraDetermino}
            subtitle={`de ${stats.totalPagos} pagos`}
            icon={AlertTriangle}
            variant={stats.fueraDetermino > 0 ? 'warning' : 'default'}
          />
        </div>
        
        {/* Filters */}
        <Card className="shadow-sm">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por alumno..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterMedio} onValueChange={setFilterMedio}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Medio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="mercadopago">MercadoPago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Table */}
        <Card className="shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Alumno</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Medio</TableHead>
                  <TableHead>Mes</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingPagos ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6} className="h-14">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : pagosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                      <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p>No hay pagos registrados en este mes</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  pagosFiltrados.map((pago) => (
                    <TableRow key={pago.id} className="hover:bg-slate-50">
                      <TableCell>
                        <span className="font-medium text-slate-800">{pago.alumno_nombre}</span>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {pago.fecha && format(parseISO(pago.fecha), "d MMM yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">
                        {formatMoney(pago.monto)}
                      </TableCell>
                      <TableCell className="text-slate-600 capitalize">
                        {pago.medio_pago}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {pago.mes_correspondiente}
                      </TableCell>
                      <TableCell>
                        {pago.fuera_de_termino ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                            <AlertTriangle className="w-3 h-3" />
                            Fuera de término
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                            En término
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Footer total */}
          {pagosFiltrados.length > 0 && (
            <div className="p-4 bg-slate-50 border-t flex justify-between items-center">
              <span className="text-sm text-slate-600">
                {pagosFiltrados.length} pagos
              </span>
              <div className="text-right">
                <span className="text-sm text-slate-600 mr-3">Total:</span>
                <span className="font-bold text-lg text-slate-900">
                  {formatMoney(pagosFiltrados.reduce((sum, p) => sum + (p.monto || 0), 0))}
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>
      
      {/* Modal */}
      <RegistrarPagoModal 
        open={pagoModal.open}
        onOpenChange={(open) => setPagoModal({ ...pagoModal, open })}
        alumno={pagoModal.alumno}
      />
    </div>
  );
}