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
      </div>
    </div>
  );
}