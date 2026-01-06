import React from 'react';
import { cn } from '@/lib/utils';

const statusConfig = {
  // Estados de alumno
  activo: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  moroso: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  pausado: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
  
  // Estados de pago
  pagado: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  pendiente: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  debe: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  
  // Estados de clase
  programada: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  realizada: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  cancelada_anticipada: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  cancelada_tarde: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  no_show: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  suspendida: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  reprogramada: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500' },
  pendiente_decision: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  recuperada: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500' },
  
  // Estados de asistencia
  presente: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  ausente_con_aviso: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  ausente_sin_aviso: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  
  // Estados de recupero
  perdido: { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' },
};

const labels = {
  activo: 'Activo',
  moroso: 'Moroso',
  pausado: 'Pausado',
  pagado: 'Pagado',
  pendiente: 'Pendiente',
  debe: 'Debe',
  programada: 'Programada',
  realizada: 'Realizada',
  cancelada_anticipada: 'Cancelada (+24h)',
  cancelada_tarde: 'Cancelada tarde',
  no_show: 'No show',
  suspendida: 'Suspendida',
  reprogramada: 'Reprogramada',
  pendiente_decision: 'Pendiente decisión',
  recuperada: 'Recuperada',
  presente: 'Presente',
  ausente_con_aviso: 'Ausente (aviso)',
  ausente_sin_aviso: 'Ausente (sin aviso)',
  perdido: 'Perdido',
};

export default function StatusBadge({ status, size = 'default', showDot = true }) {
  const config = statusConfig[status] || statusConfig.pendiente;
  const label = labels[status] || status;
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-medium border rounded-full',
      config.bg, config.text, config.border,
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
    )}>
      {showDot && <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />}
      {label}
    </span>
  );
}