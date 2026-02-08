import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Phone, 
  DollarSign, 
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  FileText,
  TrendingUp,
  Trash2
} from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils';

export default function DetalleAlumnoModal({ open, onOpenChange, alumno }) {
  const queryClient = useQueryClient();
  const [deletingClases, setDeletingClases] = useState(false);

  const { data: pagos = [] } = useQuery({
    queryKey: ['pagos', alumno?.id],
    queryFn: () => base44.entities.Pago.filter({ alumno_id: alumno?.id }, '-fecha'),
    enabled: !!alumno?.id,
  });
  
  const { data: asistencias = [] } = useQuery({
    queryKey: ['asistencias', alumno?.id],
    queryFn: () => base44.entities.Asistencia.filter({ alumno_id: alumno?.id }, '-fecha'),
    enabled: !!alumno?.id,
  });
  
  const { data: recuperos = [] } = useQuery({
    queryKey: ['recuperos', alumno?.id],
    queryFn: () => base44.entities.Recupero.filter({ alumno_id: alumno?.id }),
    enabled: !!alumno?.id,
  });
  
  const { data: logs = [] } = useQuery({
    queryKey: ['logs', alumno?.id],
    queryFn: () => base44.entities.LogAuditoria.filter({ entidad_id: alumno?.id }, '-fecha'),
    enabled: !!alumno?.id,
  });

  const { data: clases = [] } = useQuery({
    queryKey: ['clases-alumno', alumno?.id],
    queryFn: async () => {
      const todas = await base44.entities.Clase.list();
      return todas.filter(c => c.alumnos_ids?.includes(alumno?.id));
    },
    enabled: !!alumno?.id,
  });

  const deleteAllClasesMutation = useMutation({
    mutationFn: async () => {
      setDeletingClases(true);
      try {
        for (const clase of clases) {
          try {
            await base44.functions.invoke('sincronizarClaseGoogleCalendar', { 
              clase_id: clase.id, 
              action: 'delete' 
            });
          } catch (err) {
            console.error('Error eliminando de Google Calendar:', err);
          }

          try {
            const turnosRelacionados = await base44.entities.TurnoCancha.filter({ 
              fecha: clase.fecha,
              hora_inicio: clase.hora_inicio,
              tipo_turno: 'clase'
            });
            
            for (const turno of turnosRelacionados) {
              try {
                await base44.functions.invoke('sincronizarTurnoGoogleCalendar', { 
                  turno_id: turno.id, 
                  action: 'delete' 
                });
              } catch (err) {
                console.error('Error eliminando turno de Google Calendar:', err);
              }
              await base44.entities.TurnoCancha.delete(turno.id);
            }
          } catch (err) {
            console.error('Error eliminando turnos:', err);
          }

          await base44.entities.Clase.delete(clase.id);
          await new Promise(resolve => setTimeout(resolve, 30));
        }
      } finally {
        setDeletingClases(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clases-alumno'] });
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
    },
  });
  
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };
  
  if (!alumno) return null;
  
  // Stats
  const totalPagado = pagos.reduce((sum, p) => sum + (p.monto || 0), 0);
  const presentes = asistencias.filter(a => a.estado === 'presente').length;
  const ausencias = asistencias.filter(a => a.estado !== 'presente').length;
  const tasaAsistencia = asistencias.length > 0 
    ? Math.round((presentes / asistencias.length) * 100) 
    : 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle del alumno</DialogTitle>
        </DialogHeader>
        
        {/* Header info */}
        <div className="flex items-start gap-4 pb-4 border-b">
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold',
            alumno.estado === 'activo' && 'bg-emerald-100 text-emerald-700',
            alumno.estado === 'moroso' && 'bg-rose-100 text-rose-700',
            alumno.estado === 'pausado' && 'bg-slate-100 text-slate-600'
          )}>
            {alumno.nombre?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-bold text-slate-900">{alumno.nombre}</h3>
              <StatusBadge status={alumno.estado} />
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                {alumno.whatsapp}
              </span>
              {alumno.sede_preferida && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {alumno.sede_preferida}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-3 py-4">
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-slate-800">{formatMoney(alumno.precio_mensual)}</p>
            <p className="text-xs text-slate-500">Precio mensual</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <p className="text-2xl font-bold text-slate-800">{alumno.clases_por_mes}</p>
            <p className="text-xs text-slate-500">Clases/mes</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <p className={cn(
              'text-2xl font-bold',
              alumno.deuda_total > 0 ? 'text-rose-600' : 'text-emerald-600'
            )}>
              {alumno.deuda_total > 0 ? formatMoney(alumno.deuda_total) : '-'}
            </p>
            <p className="text-xs text-slate-500">Deuda</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <p className={cn(
              'text-2xl font-bold',
              alumno.clases_a_recuperar > 0 ? 'text-amber-600' : 'text-slate-800'
            )}>
              {alumno.clases_a_recuperar || 0}
            </p>
            <p className="text-xs text-slate-500">A recuperar</p>
          </div>
        </div>
        
        {/* Tabs */}
        <Tabs defaultValue="pagos" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pagos">Pagos</TabsTrigger>
            <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
            <TabsTrigger value="recuperos">Recuperos</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pagos" className="mt-4">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {pagos.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No hay pagos registrados</p>
              ) : (
                pagos.map((pago) => (
                  <div key={pago.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-slate-800">{formatMoney(pago.monto)}</p>
                      <p className="text-xs text-slate-500">
                        {pago.mes_correspondiente} · {pago.medio_pago}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600">
                        {pago.fecha && format(new Date(pago.fecha), "d MMM yyyy", { locale: es })}
                      </p>
                      {pago.fuera_de_termino && (
                        <span className="text-xs text-amber-600">Fuera de término</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-sm text-slate-600">Total pagado</span>
              <span className="font-bold text-lg">{formatMoney(totalPagado)}</span>
            </div>
          </TabsContent>
          
          <TabsContent value="asistencia" className="mt-4">
            <div className="mb-4 p-4 bg-slate-50 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Tasa de asistencia</p>
                <p className="text-2xl font-bold text-slate-800">{tasaAsistencia}%</p>
              </div>
              <div className="text-right text-sm">
                <p className="text-emerald-600">{presentes} presentes</p>
                <p className="text-amber-600">{ausencias} ausencias</p>
              </div>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {asistencias.slice(0, 10).map((asist) => (
                <div key={asist.id} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm text-slate-600">
                    {asist.fecha && format(new Date(asist.fecha), "d MMM", { locale: es })}
                  </span>
                  <StatusBadge status={asist.estado} size="sm" />
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="recuperos" className="mt-4">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {recuperos.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No hay recuperos</p>
              ) : (
                recuperos.map((rec) => (
                  <div key={rec.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        Clase del {rec.fecha_original && format(new Date(rec.fecha_original), "d MMM", { locale: es })}
                      </p>
                      <p className="text-xs text-slate-500">{rec.motivo?.replace(/_/g, ' ')}</p>
                    </div>
                    <StatusBadge status={rec.estado} size="sm" />
                  </div>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="historial" className="mt-4">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No hay historial</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="p-3 border rounded-lg text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-800">{log.accion}</span>
                      <span className="text-xs text-slate-500">
                        {log.fecha && format(new Date(log.fecha), "d MMM HH:mm", { locale: es })}
                      </span>
                    </div>
                    <p className="text-slate-600">{log.campo_modificado}: {log.valor_anterior} → {log.valor_nuevo}</p>
                    <p className="text-xs text-slate-500 mt-1">Motivo: {log.motivo}</p>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Observaciones */}
        {alumno.observaciones && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-1">Observaciones</p>
            <p className="text-sm text-slate-700">{alumno.observaciones}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}