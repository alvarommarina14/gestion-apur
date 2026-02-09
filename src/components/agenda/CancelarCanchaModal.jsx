import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, X } from 'lucide-react';
import { format, parseISO, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CancelarCanchaModal({ open, onOpenChange, turno, onSuccess }) {
   const queryClient = useQueryClient();
   const [tiempoAviso, setTiempoAviso] = useState('');
   const [motivo, setMotivo] = useState('');
   const [detalles, setDetalles] = useState('');

  // Calcular horas hasta la cancha
  const horasHasta = useMemo(() => {
    if (!turno?.fecha || !turno?.hora_inicio) return null;
    try {
      const now = new Date();
      const [hora, minutos] = turno.hora_inicio.split(':');
      const turnoDate = new Date(`${turno.fecha}T${hora}:${minutos}:00`);
      return differenceInHours(turnoDate, now);
    } catch (e) {
      return null;
    }
  }, [turno]);

  const esMenosDe24Horas = horasHasta !== null && horasHasta < 24;

  const cancelarMutation = useMutation({
    mutationFn: async () => {
      // Crear registro de cancelación
      await base44.entities.CancelacionCancha.create({
        turno_cancha_id: turno.id,
        cliente: turno.cliente,
        cancha: turno.cancha,
        fecha: turno.fecha,
        hora_inicio: turno.hora_inicio,
        monto: turno.monto || 0,
        motivo_cancelacion: tiempoAviso === 'menos_24h' ? 'menos_24h' : motivo,
        detalles: detalles || null,
        estado_recupero: tiempoAviso === 'menos_24h' ? 'descontado' : 'pendiente',
      });

      // Actualizar estado del turno
      await base44.entities.TurnoCancha.update(turno.id, {
        estado: 'cancelado',
      });
    },
    onSuccess: async () => {
       // Esperar un poco para que la BD se actualice completamente
       await new Promise(resolve => setTimeout(resolve, 500));
       queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
       queryClient.invalidateQueries({ queryKey: ['clases'] });
       queryClient.invalidateQueries({ queryKey: ['cancelaciones-cancha'] });
       onOpenChange(false);
       setTiempoAviso('');
       setMotivo('');
       setDetalles('');
       onSuccess?.();
     },
    onError: (error) => {
      console.error('Error al cancelar cancha:', error);
    }
  });

  const handleSubmit = async () => {
    if (!tiempoAviso) return;
    if (!esMenosDe24Horas && !motivo) return;
    await cancelarMutation.mutateAsync();
  };

  if (!turno) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            Cancelar cancha
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
           <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 space-y-2">
             <p className="text-sm font-medium text-slate-900">{turno.cliente}</p>
             <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
               <div>
                 <p className="text-slate-500">Cancha</p>
                 <p className="font-medium">{turno.cancha}</p>
               </div>
               <div>
                 <p className="text-slate-500">Fecha</p>
                 <p className="font-medium">
                   {format(parseISO(turno.fecha), "d 'de' MMM", { locale: es })}
                 </p>
               </div>
               <div>
                 <p className="text-slate-500">Hora</p>
                 <p className="font-medium">{turno.hora_inicio}</p>
               </div>
               <div>
                 <p className="text-slate-500">Monto</p>
                 <p className="font-medium">${(turno.monto || 0).toLocaleString('es-AR')}</p>
               </div>
             </div>
           </div>

           <div className="space-y-2">
             <Label>Tipo de aviso *</Label>
             <Select value={tiempoAviso} onValueChange={setTiempoAviso}>
               <SelectTrigger>
                 <SelectValue placeholder="Seleccionar tipo" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="menos_24h">Menos de 24 horas (No descuenta abono)</SelectItem>
                 <SelectItem value="mas_24h">Más de 24 horas</SelectItem>
               </SelectContent>
             </Select>
           </div>

           {tiempoAviso === 'mas_24h' && (
             <div className="space-y-2">
               <Label>Motivo de cancelación *</Label>
               <Select value={motivo} onValueChange={setMotivo}>
                 <SelectTrigger>
                   <SelectValue placeholder="Seleccionar motivo" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="cliente_solicita">Cliente solicita</SelectItem>
                   <SelectItem value="clima">Clima/Clima adverso</SelectItem>
                   <SelectItem value="mantenimiento">Mantenimiento de cancha</SelectItem>
                   <SelectItem value="falta_clientes">Falta de clientes</SelectItem>
                   <SelectItem value="otro">Otro</SelectItem>
                 </SelectContent>
               </Select>
             </div>
           )}

           <div className="space-y-2">
             <Label>Detalles (opcional)</Label>
             <Textarea
               value={detalles}
               onChange={(e) => setDetalles(e.target.value)}
               placeholder="Información adicional sobre la cancelación..."
               rows={3}
             />
           </div>

           {tiempoAviso === 'menos_24h' && (
             <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
               ⚠️ Cancelación con menos de 24 horas: NO se descuenta del abono del cliente.
             </div>
           )}

           {tiempoAviso === 'mas_24h' && (
             <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
               ℹ️ Cancelación con más de 24 horas: Se registra el motivo para auditoría.
             </div>
           )}
         </div>

        <DialogFooter>
           <Button
             type="button"
             variant="outline"
             onClick={() => onOpenChange(false)}
             disabled={cancelarMutation.isPending}
           >
             <X className="w-4 h-4 mr-2" />
             Volver
           </Button>
           <Button
             onClick={handleSubmit}
             disabled={!tiempoAviso || (tiempoAviso === 'mas_24h' && !motivo) || cancelarMutation.isPending}
             className="bg-rose-600 hover:bg-rose-700"
           >
             {cancelarMutation.isPending ? 'Procesando...' : 'Cancelar cancha'}
           </Button>
         </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}