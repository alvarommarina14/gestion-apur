import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, addDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Bell, 
  Send, 
  X, 
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function RecordatoriosPendientes({ compact = false }) {
  const queryClient = useQueryClient();
  
  const { data: recordatorios = [] } = useQuery({
    queryKey: ['recordatorios'],
    queryFn: () => base44.entities.Recordatorio.list('-fecha_programada'),
  });
  
  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list(),
  });
  
  const { data: configuraciones = [] } = useQuery({
    queryKey: ['configuraciones'],
    queryFn: () => base44.entities.ConfiguracionRecordatorios.list(),
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Recordatorio.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordatorios'] });
    },
  });
  
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Recordatorio.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordatorios'] });
    },
  });
  
  // Generar recordatorios pendientes automáticamente
  const recordatoriosPendientes = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = format(today, 'yyyy-MM');
    const todayStr = format(today, 'yyyy-MM-dd');
    
    const pendientes = recordatorios.filter(r => r.estado === 'pendiente' && r.fecha_programada <= todayStr);
    
    // Generar nuevos recordatorios si hay configuraciones activas
    const configsActivas = configuraciones.filter(c => c.activo);
    
    configsActivas.forEach(config => {
      if (config.tipo === 'pre_cobro') {
        // Recordatorios pre-cobro (X días antes del día 5)
        const diasHasta5 = 5 - currentDay;
        if (diasHasta5 === config.dias_anticipacion) {
          // Generar recordatorios para alumnos activos sin recordatorio de este mes
          const alumnosActivos = alumnos.filter(a => a.estado !== 'pausado' && a.estado_mes_actual !== 'pagado');
          
          alumnosActivos.forEach(alumno => {
            const yaExiste = recordatorios.some(r => 
              r.alumno_id === alumno.id && 
              r.tipo === 'pre_cobro' && 
              r.mes_correspondiente === currentMonth
            );
            
            if (!yaExiste) {
              pendientes.push({
                _nuevo: true,
                alumno_id: alumno.id,
                alumno_nombre: alumno.nombre,
                tipo: 'pre_cobro',
                fecha_programada: todayStr,
                estado: 'pendiente',
                mensaje: reemplazarVariables(config.mensaje_template, alumno, currentMonth),
                canal: config.canal,
                whatsapp: alumno.whatsapp,
                monto_recordado: alumno.precio_mensual,
                mes_correspondiente: currentMonth,
              });
            }
          });

          // Agregar clientes de abono y cancha suelta
          const clientesActivos = clientes.filter(c => 
            c.activo && 
            (c.tipo_cliente === 'abono' || c.tipo_cliente === 'suelto') &&
            c.precio > 0
          );
          
          clientesActivos.forEach(cliente => {
            const yaExiste = recordatorios.some(r => 
              r.alumno_id === cliente.id && 
              r.tipo === 'pre_cobro' && 
              r.mes_correspondiente === currentMonth
            );
            
            if (!yaExiste && cliente.telefono) {
              pendientes.push({
                _nuevo: true,
                alumno_id: cliente.id,
                alumno_nombre: cliente.nombre,
                tipo: 'pre_cobro',
                fecha_programada: todayStr,
                estado: 'pendiente',
                mensaje: reemplazarVariables(config.mensaje_template, { ...cliente, precio_mensual: cliente.precio }, currentMonth),
                canal: config.canal,
                whatsapp: cliente.telefono,
                monto_recordado: cliente.precio,
                mes_correspondiente: currentMonth,
              });
            }
          });
        }
      } else if (config.tipo === 'moroso') {
        // Recordatorios morosos (X días después del día 15)
        if (currentDay === 15 + config.dias_despues) {
          const morosos = alumnos.filter(a => a.estado === 'moroso' || (a.estado_mes_actual === 'debe' && currentDay > 15));
          
          morosos.forEach(alumno => {
            const yaExiste = recordatorios.some(r => 
              r.alumno_id === alumno.id && 
              r.tipo === 'moroso' && 
              r.mes_correspondiente === currentMonth
            );
            
            if (!yaExiste) {
              pendientes.push({
                _nuevo: true,
                alumno_id: alumno.id,
                alumno_nombre: alumno.nombre,
                tipo: 'moroso',
                fecha_programada: todayStr,
                estado: 'pendiente',
                mensaje: reemplazarVariables(config.mensaje_template, alumno, currentMonth),
                canal: config.canal,
                whatsapp: alumno.whatsapp,
                monto_recordado: alumno.deuda_total || alumno.precio_mensual,
                mes_correspondiente: currentMonth,
              });
            }
          });

          // Agregar clientes de abono y cancha suelta morosos
          const clientesMorosos = clientes.filter(c => 
            c.activo && 
            (c.tipo_cliente === 'abono' || c.tipo_cliente === 'suelto') &&
            c.precio > 0
          );
          
          clientesMorosos.forEach(cliente => {
            const yaExiste = recordatorios.some(r => 
              r.alumno_id === cliente.id && 
              r.tipo === 'moroso' && 
              r.mes_correspondiente === currentMonth
            );
            
            if (!yaExiste && cliente.telefono) {
              pendientes.push({
                _nuevo: true,
                alumno_id: cliente.id,
                alumno_nombre: cliente.nombre,
                tipo: 'moroso',
                fecha_programada: todayStr,
                estado: 'pendiente',
                mensaje: reemplazarVariables(config.mensaje_template, { ...cliente, precio_mensual: cliente.precio }, currentMonth),
                canal: config.canal,
                whatsapp: cliente.telefono,
                monto_recordado: cliente.precio,
                mes_correspondiente: currentMonth,
              });
            }
          });
        }
      }
    });
    
    return pendientes.slice(0, compact ? 5 : 50);
  }, [recordatorios, alumnos, clientes, configuraciones, compact]);
  
  const handleEnviar = async (recordatorio) => {
    // Crear recordatorio si es nuevo
    if (recordatorio._nuevo) {
      const { _nuevo, ...data } = recordatorio;
      const created = await createMutation.mutateAsync(data);
      recordatorio = created;
    }
    
    // Abrir WhatsApp con mensaje
    const mensaje = encodeURIComponent(recordatorio.mensaje);
    const numero = recordatorio.whatsapp?.replace(/\D/g, '');
    window.open(`https://wa.me/${numero}?text=${mensaje}`, '_blank');
    
    // Marcar como enviado
    await updateMutation.mutateAsync({
      id: recordatorio.id,
      data: {
        ...recordatorio,
        estado: 'enviado',
        fecha_enviado: new Date().toISOString(),
      }
    });
  };
  
  const handleCancelar = async (recordatorio) => {
    if (recordatorio._nuevo) return;
    
    await updateMutation.mutateAsync({
      id: recordatorio.id,
      data: { ...recordatorio, estado: 'cancelado' }
    });
  };
  
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };
  
  if (recordatoriosPendientes.length === 0) {
    return compact ? null : (
      <Card className="shadow-sm">
        <CardContent className="py-12 text-center text-slate-500">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No hay recordatorios pendientes</p>
        </CardContent>
      </Card>
    );
  }
  
  const tipoColors = {
    pre_cobro: 'bg-blue-100 text-blue-700',
    moroso: 'bg-rose-100 text-rose-700',
    manual: 'bg-slate-100 text-slate-700',
  };
  
  const tipoLabels = {
    pre_cobro: 'Pre-cobro',
    moroso: 'Moroso',
    manual: 'Manual',
  };
  
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-600" />
            Recordatorios pendientes
          </CardTitle>
          <Badge variant="secondary">{recordatoriosPendientes.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {recordatoriosPendientes.map((rec, idx) => (
            <div 
              key={rec.id || `nuevo-${idx}`}
              className="p-4 rounded-lg border bg-white hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-slate-800">{rec.alumno_nombre}</span>
                    <Badge className={tipoColors[rec.tipo]}>
                      {tipoLabels[rec.tipo]}
                    </Badge>
                    {rec._nuevo && (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                        Nuevo
                      </Badge>
                    )}
                  </div>
                  
                  <div className="bg-slate-50 rounded p-2 mb-2">
                    <p className="text-sm text-slate-700">{rec.mensaje}</p>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {rec.fecha_programada && format(parseISO(rec.fecha_programada), "d MMM", { locale: es })}
                    </span>
                    {rec.monto_recordado > 0 && (
                      <span>{formatMoney(rec.monto_recordado)}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleEnviar(rec)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Send className="w-4 h-4 mr-1" />
                    Enviar
                  </Button>
                  {!rec._nuevo && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancelar(rec)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper para reemplazar variables en el template
function reemplazarVariables(template, alumno, mes) {
  return template
    .replace(/\{nombre\}/g, alumno.nombre?.split(' ')[0] || 'Alumno')
    .replace(/\{monto\}/g, new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(alumno.precio_mensual || 0))
    .replace(/\{mes\}/g, format(parseISO(mes + '-01'), 'MMMM', { locale: es }))
    .replace(/\{dia\}/g, '5');
}