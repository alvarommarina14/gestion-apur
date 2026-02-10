import React from 'react';
import { 
  CalendarCheck, 
  DollarSign, 
  AlertTriangle, 
  Clock,
  TrendingUp,
  Users,
  XCircle,
  RotateCcw
} from 'lucide-react';
import MetricCard from '@/components/ui/MetricCard';

export default function QuickStats({ stats }) {
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const diferencia = (stats.ingresoReal || 0) - (stats.ingresoEsperado || 0);
  const porcentajeCobrado = stats.ingresoEsperado > 0 
    ? Math.round((stats.ingresoReal / stats.ingresoEsperado) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Clases hoy"
        value={stats.clasesHoy || 0}
        subtitle={`${stats.clasesPendientesHoy || 0} pendientes`}
        icon={CalendarCheck}
        variant="info"
      />
      
      <MetricCard
        title="Ingreso esperado"
        value={formatMoney(stats.ingresoEsperado)}
        subtitle="Este mes"
        icon={TrendingUp}
        variant="default"
      />
      
      <MetricCard
        title="Ingreso real"
        value={formatMoney(stats.ingresoReal)}
        subtitle={`${porcentajeCobrado}% cobrado`}
        icon={DollarSign}
        variant={porcentajeCobrado >= 80 ? 'success' : porcentajeCobrado >= 50 ? 'warning' : 'danger'}
        trend={diferencia >= 0 ? 'up' : 'down'}
        trendValue={formatMoney(Math.abs(diferencia))}
      />
      
      <MetricCard
        title="Deuda total"
        value={formatMoney(stats.deudaTotal)}
        subtitle={`${stats.cantidadMorosos || 0} morosos`}
        icon={AlertTriangle}
        variant={stats.deudaTotal > 0 ? 'danger' : 'success'}
      />
    </div>
  );
}

export function ClassStats({ stats, isProfesor = false }) {
  // Para profesores mostrar Programadas, Realizadas y Canceladas
  if (isProfesor) {
    return (
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          title="Programadas"
          value={stats.programadas || 0}
          icon={CalendarCheck}
          variant="info"
        />
        
        <MetricCard
          title="Realizadas"
          value={stats.realizadas || 0}
          icon={CalendarCheck}
          variant="success"
        />
        
        <MetricCard
          title="Canceladas"
          value={stats.canceladas || 0}
          icon={XCircle}
          variant="warning"
        />
      </div>
    );
  }

  // Para admin mostrar todas las métricas
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Realizadas"
        value={stats.realizadas || 0}
        icon={CalendarCheck}
        variant="success"
      />
      
      <MetricCard
        title="Canceladas"
        value={stats.canceladas || 0}
        icon={XCircle}
        variant="warning"
      />
      
      <MetricCard
        title="Recuperadas"
        value={stats.recuperadas || 0}
        icon={RotateCcw}
        variant="info"
      />
      
      <MetricCard
        title="A recuperar"
        value={stats.aRecuperar || 0}
        icon={Clock}
        variant={stats.aRecuperar > 0 ? 'warning' : 'default'}
      />
    </div>
  );
}