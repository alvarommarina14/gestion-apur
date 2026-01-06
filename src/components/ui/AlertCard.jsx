import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Info, CheckCircle, X } from 'lucide-react';

const priorityConfig = {
  high: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    icon: AlertTriangle,
    iconColor: 'text-rose-500',
    title: 'text-rose-800',
  },
  medium: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: AlertCircle,
    iconColor: 'text-amber-500',
    title: 'text-amber-800',
  },
  low: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: Info,
    iconColor: 'text-blue-500',
    title: 'text-blue-800',
  },
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: CheckCircle,
    iconColor: 'text-emerald-500',
    title: 'text-emerald-800',
  },
};

export default function AlertCard({ 
  priority = 'medium', 
  title, 
  description, 
  actions = [], 
  onDismiss,
  count,
  className 
}) {
  const config = priorityConfig[priority];
  const Icon = config.icon;
  
  return (
    <div className={cn(
      'rounded-lg border p-4',
      config.bg, config.border,
      className
    )}>
      <div className="flex gap-3">
        <div className={cn('mt-0.5', config.iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className={cn('font-semibold text-sm', config.title)}>
                {title}
                {count > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-white/60 rounded text-xs">
                    {count}
                  </span>
                )}
              </h4>
              {description && (
                <p className="mt-1 text-sm text-slate-600">{description}</p>
              )}
            </div>
            {onDismiss && (
              <button 
                onClick={onDismiss}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {actions.map((action, idx) => (
                <Button
                  key={idx}
                  size="sm"
                  variant={idx === 0 ? 'default' : 'outline'}
                  onClick={action.onClick}
                  className="h-7 text-xs"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}