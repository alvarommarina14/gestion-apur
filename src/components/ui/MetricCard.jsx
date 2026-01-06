import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue,
  variant = 'default',
  className,
  onClick
}) {
  const variants = {
    default: 'bg-white border-slate-200',
    success: 'bg-emerald-50/50 border-emerald-200',
    warning: 'bg-amber-50/50 border-amber-200',
    danger: 'bg-rose-50/50 border-rose-200',
    info: 'bg-blue-50/50 border-blue-200',
  };
  
  const iconVariants = {
    default: 'bg-slate-100 text-slate-600',
    success: 'bg-emerald-100 text-emerald-600',
    warning: 'bg-amber-100 text-amber-600',
    danger: 'bg-rose-100 text-rose-600',
    info: 'bg-blue-100 text-blue-600',
  };

  return (
    <div 
      className={cn(
        'relative overflow-hidden rounded-xl border p-5 transition-all duration-200',
        variants[variant],
        onClick && 'cursor-pointer hover:shadow-md hover:scale-[1.01]',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={cn('p-2.5 rounded-lg', iconVariants[variant])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      
      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          {trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
          {trend === 'down' && <TrendingDown className="w-4 h-4 text-rose-500" />}
          {trend === 'neutral' && <Minus className="w-4 h-4 text-slate-400" />}
          <span className={cn(
            'text-xs font-medium',
            trend === 'up' && 'text-emerald-600',
            trend === 'down' && 'text-rose-600',
            trend === 'neutral' && 'text-slate-500'
          )}>
            {trendValue}
          </span>
        </div>
      )}
    </div>
  );
}