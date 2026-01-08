import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, User, Edit, Trash, Plus, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap = {
  crear: Plus,
  editar: Edit,
  eliminar: Trash,
  cambio_estado: AlertCircle,
};

const colorMap = {
  crear: 'text-emerald-600 bg-emerald-50',
  editar: 'text-blue-600 bg-blue-50',
  eliminar: 'text-rose-600 bg-rose-50',
  cambio_estado: 'text-amber-600 bg-amber-50',
};

const labelMap = {
  crear: 'Creado',
  editar: 'Editado',
  eliminar: 'Eliminado',
  cambio_estado: 'Cambio de estado',
};

export default function HistorialAuditoria({ entidadId, entidad }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditoria', entidad, entidadId],
    queryFn: () => base44.entities.LogAuditoria.filter({ 
      entidad_id: entidadId,
      entidad: entidad 
    }),
    enabled: !!entidadId && !!entidad,
  });

  const logsSorted = [...logs].sort((a, b) => 
    new Date(b.fecha) - new Date(a.fecha)
  );

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-8 text-center text-slate-500">
          <Clock className="w-6 h-6 animate-spin mx-auto mb-2 opacity-40" />
          <p className="text-sm">Cargando historial...</p>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Historial
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-slate-500">
          <p className="text-sm">No hay cambios registrados</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Historial ({logs.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y max-h-96 overflow-y-auto">
          {logsSorted.map((log) => {
            const Icon = iconMap[log.accion] || AlertCircle;
            const colorClass = colorMap[log.accion] || 'text-slate-600 bg-slate-50';
            
            return (
              <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex gap-3">
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', colorClass)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-slate-900 text-sm">
                        {labelMap[log.accion] || log.accion}
                      </p>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {format(parseISO(log.fecha), "d MMM 'a las' HH:mm", { locale: es })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2">
                      <User className="w-3 h-3" />
                      <span>{log.created_by}</span>
                    </div>

                    {log.campo_modificado && (
                      <div className="text-xs space-y-1 bg-slate-50 rounded p-2 mb-2">
                        <p className="font-medium text-slate-700">Campo: {log.campo_modificado}</p>
                        {log.valor_anterior && (
                          <p className="text-slate-600">
                            <span className="text-rose-600 line-through">{log.valor_anterior}</span>
                            {' → '}
                            <span className="text-emerald-600 font-medium">{log.valor_nuevo}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {log.motivo && (
                      <p className="text-xs text-slate-600 italic border-l-2 border-slate-300 pl-2">
                        {log.motivo}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}