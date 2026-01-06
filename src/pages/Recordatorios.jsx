import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Bell,
  Search,
  Filter,
  MessageCircle,
  CheckCircle,
  Clock,
  XCircle,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import StatusBadge from '@/components/ui/StatusBadge';
import MetricCard from '@/components/ui/MetricCard';
import RecordatoriosPendientes from '@/components/recordatorios/RecordatoriosPendientes';

export default function RecordatoriosPage() {
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterTipo, setFilterTipo] = useState('todos');
  
  const { data: recordatorios = [], isLoading } = useQuery({
    queryKey: ['recordatorios'],
    queryFn: () => base44.entities.Recordatorio.list('-created_date'),
  });
  
  // Stats
  const stats = useMemo(() => ({
    pendientes: recordatorios.filter(r => r.estado === 'pendiente').length,
    enviados: recordatorios.filter(r => r.estado === 'enviado').length,
    cancelados: recordatorios.filter(r => r.estado === 'cancelado').length,
    total: recordatorios.length,
  }), [recordatorios]);
  
  // Filtered
  const recordatoriosFiltrados = useMemo(() => {
    return recordatorios.filter(r => {
      const matchSearch = r.alumno_nombre?.toLowerCase().includes(search.toLowerCase());
      const matchEstado = filterEstado === 'todos' || r.estado === filterEstado;
      const matchTipo = filterTipo === 'todos' || r.tipo === filterTipo;
      return matchSearch && matchEstado && matchTipo;
    });
  }, [recordatorios, search, filterEstado, filterTipo]);
  
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };
  
  const tipoLabels = {
    pre_cobro: 'Pre-cobro',
    moroso: 'Moroso',
    manual: 'Manual',
  };
  
  const estadoLabels = {
    pendiente: 'Pendiente',
    enviado: 'Enviado',
    cancelado: 'Cancelado',
    fallido: 'Fallido',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Recordatorios</h1>
          <p className="text-slate-500 text-sm">
            Gestión de recordatorios de pago enviados
          </p>
        </header>
        
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Pendientes"
            value={stats.pendientes}
            icon={Clock}
            variant={stats.pendientes > 0 ? 'warning' : 'default'}
          />
          <MetricCard
            title="Enviados"
            value={stats.enviados}
            icon={CheckCircle}
            variant="success"
          />
          <MetricCard
            title="Cancelados"
            value={stats.cancelados}
            icon={XCircle}
            variant="default"
          />
          <MetricCard
            title="Total"
            value={stats.total}
            icon={Bell}
            variant="info"
          />
        </div>
        
        {/* Recordatorios pendientes */}
        <RecordatoriosPendientes compact={false} />
        
        {/* Historial - Filters */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg">Historial de recordatorios</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por alumno..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pre_cobro">Pre-cobro</SelectItem>
                  <SelectItem value="moroso">Moroso</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                  <SelectItem value="enviado">Enviados</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Alumno</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha programada</TableHead>
                    <TableHead>Fecha enviado</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6} className="h-14">
                          <div className="h-4 bg-slate-100 rounded animate-pulse" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : recordatoriosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                        <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        <p>No hay recordatorios</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recordatoriosFiltrados.map((rec) => (
                      <TableRow key={rec.id} className="hover:bg-slate-50">
                        <TableCell>
                          <span className="font-medium text-slate-800">{rec.alumno_nombre}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-600 capitalize">
                            {tipoLabels[rec.tipo]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={rec.estado} size="sm" />
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">
                          {rec.fecha_programada && format(parseISO(rec.fecha_programada), "d MMM yyyy", { locale: es })}
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">
                          {rec.fecha_enviado ? format(parseISO(rec.fecha_enviado), "d MMM yyyy HH:mm", { locale: es }) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {rec.monto_recordado > 0 ? formatMoney(rec.monto_recordado) : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}