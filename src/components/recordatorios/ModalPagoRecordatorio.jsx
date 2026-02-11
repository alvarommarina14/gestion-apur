import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ModalPagoRecordatorio({ open, onOpenChange, cliente }) {
  const queryClient = useQueryClient();
  const [medioPago, setMedioPago] = useState('');
  const [notas, setNotas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegistrarPago = async () => {
    if (!medioPago) {
      toast.error('Selecciona un medio de pago');
      return;
    }

    setIsSubmitting(true);
    try {
      const hoy = format(new Date(), 'yyyy-MM-dd');
      const mesActual = format(new Date(), 'yyyy-MM');

      // Si es alumno
      if (cliente.type === 'alumno') {
        await base44.entities.Pago.create({
          alumno_id: cliente.id,
          alumno_nombre: cliente.nombre,
          fecha: hoy,
          monto: cliente.monto,
          medio_pago: medioPago,
          mes_correspondiente: mesActual,
          notas: notas
        });
      }
      // Si es alquiler (turno)
      else if (cliente.type === 'turno') {
        await base44.entities.TurnoCancha.update(cliente.id, {
          pagado: true,
          medio_pago: medioPago,
          cobrado_por: 'Sistema',
          hora_cobro: new Date().toISOString(),
          notas_pago: notas
        });
      }
      // Si es cliente con CobroCliente
      else if (cliente.type === 'cliente') {
        const cobros = await base44.entities.CobroCliente.list();
        const mesActual = format(new Date(), 'yyyy-MM');
        const cobro = cobros.find(c => c.cliente_id === cliente.id && c.mes === mesActual);
        
        if (cobro) {
          await base44.entities.CobroCliente.update(cobro.id, {
            pagado: true,
            estado: 'pagado',
            fecha_pago: hoy,
            medio_pago: medioPago,
            notas: notas
          });
        }
      }

      toast.success('Pago registrado correctamente');
      // Sincronizar todas las secciones que se ven afectadas
      queryClient.invalidateQueries({ queryKey: ['clientes-pendientes'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['cobros-clientes'] });
      queryClient.invalidateQueries({ queryKey: ['pagos'] });
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      onOpenChange(false);
      setMedioPago('');
      setNotas('');
    } catch (error) {
      console.error('Error registrando pago:', error);
      toast.error('Error al registrar el pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!cliente) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Cliente</p>
            <p className="text-base font-semibold text-slate-900">{cliente.nombre}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700">Monto</p>
            <p className="text-2xl font-bold text-emerald-600">
              ${cliente.monto?.toLocaleString('es-AR')}
            </p>
          </div>

          <div>
            <Label htmlFor="medioPago" className="text-sm font-medium">Medio de Pago</Label>
            <Select value={medioPago} onValueChange={setMedioPago}>
              <SelectTrigger id="medioPago">
                <SelectValue placeholder="Selecciona medio de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="tarjeta">Tarjeta</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notas" className="text-sm font-medium">Notas (opcional)</Label>
            <Input
              id="notas"
              placeholder="Ej: Comprobante #123"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleRegistrarPago}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}