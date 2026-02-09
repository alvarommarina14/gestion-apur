import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { format, parseISO, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CancelarCanchaModal({ open, onOpenChange, turno, onSuccess }) {
   const queryClient = useQueryClient();
   const [motivoMas24h, setMotivoMas24h] = useState('');
   const [mostrarSelectMotivo, setMostrarSelectMotivo] = useState(false);

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
    mutationFn: async (esmenDe24h) => {
      // Crear registro de cancelación
      const cancelacionData = {
        turno_cancha_id: turno.id,
        cliente: turno.cliente,
        cancha: turno.cancha,
        fecha: turno.fecha,
        hora_inicio: turno.hora_inicio,
        monto: turno.monto || 0,
        motivo_cancelacion: esmenDe24h ? 'menos_24h' : motivoMas24h,
        estado: 'cancelado',
      };

      await base44.entities.CancelacionCancha.create(cancelacionData);

      // Si es más de 24h, crear registro en Recupero
      if (!esmenDe24h && motivoMas24h) {
        await base44.entities.Recupero.create({
          alumno_id: '',
          alumno_nombre: turno.cliente,
          clase_original_id: '',
          fecha_original: turno.fecha,
          motivo: motivoMas24h,
          estado: 'pendiente',
          notas: `Cancha ${turno.cancha} - ${turno.hora_inicio}`,
        });
      }

      // Actualizar estado del turno
      await base44.entities.TurnoCancha.update(turno.id, {
        estado: 'cancelado',
      });
    },
    onSuccess: async () => {
        // Esperar a que la BD se actualice
        await new Promise(resolve => setTimeout(resolve, 500));

        // Refetch inmediato y esperar antes de cerrar
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['turnos-cancha'], exact: true }),
          queryClient.refetchQueries({ queryKey: ['recordatorios-cancha'], exact: true })
        ]);

        setMotivoMas24h('');
        setMostrarSelectMotivo(false);
        await new Promise(resolve => setTimeout(resolve, 100));
        onOpenChange(false);
        onSuccess?.();
      },
    onError: (error) => {
      console.error('Error al cancelar cancha:', error);
    }
  });

  const handleCancelarMenos24h = async () => {
    await cancelarMutation.mutateAsync(true);
  };

  const handleCancelarMas24h = async () => {
    if (!motivoMas24h) return;
    await cancelarMutation.mutateAsync(false);
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

           {!mostrarSelectMotivo ? (
             <div className="space-y-3">
               <p className="text-sm font-medium text-slate-700">Selecciona tipo de cancelación:</p>

               <Button
                 onClick={handleCancelarMenos24h}
                 disabled={cancelarMutation.isPending}
                 className="w-full bg-amber-600 hover:bg-amber-700"
               >
                 Canceló con menos de 24h (No se descuenta)
               </Button>

               <Button
                 onClick={() => setMostrarSelectMotivo(true)}
                 disabled={cancelarMutation.isPending}
                 variant="outline"
                 className="w-full text-slate-700"
               >
                 Canceló con más de 24h (Ver motivos)
               </Button>
             </div>
           ) : (
             <div className="space-y-3">
               <div className="space-y-2">
                 <Label>Motivo de cancelación *</Label>
                 <Select value={motivoMas24h} onValueChange={setMotivoMas24h}>
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

               <div className="flex gap-2">
                 <Button
                   onClick={() => {
                     setMostrarSelectMotivo(false);
                     setMotivoMas24h('');
                   }}
                   disabled={cancelarMutation.isPending}
                   variant="outline"
                   className="flex-1"
                 >
                   Volver
                 </Button>
                 <Button
                   onClick={handleCancelarMas24h}
                   disabled={!motivoMas24h || cancelarMutation.isPending}
                   className="flex-1 bg-rose-600 hover:bg-rose-700"
                 >
                   {cancelarMutation.isPending ? 'Procesando...' : 'Confirmar'}
                 </Button>
               </div>
             </div>
           )}

           <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
             ℹ️ La cancha se eliminará de la grilla automáticamente después de confirmar.
           </div>
         </div>
      </DialogContent>
    </Dialog>
  );
  }