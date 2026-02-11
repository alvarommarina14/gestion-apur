import React, { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function RegistrarCobroModal({ open, onOpenChange, recordatorio, cliente }) {
  const queryClient = useQueryClient();
  const [tipo, setTipo] = useState('pago'); // 'pago' o 'no_pago'
  const [medioPago, setMedioPago] = useState('');
  const [montoPago, setMontoPago] = useState('');
  const [motivo, setMotivo] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
     if (open && cliente) {
       // Usar el precio del cliente, no el monto del recordatorio
       setMontoPago(cliente.precio?.toString() || '');
       setTipo('pago');
       setMedioPago('');
       setMotivo('');
       setNotas('');
       setError(null);
     }
   }, [cliente, open]);

  const registrarCobroMutation = useMutation({
     mutationFn: async (data) => {
       // Siempre actualizar el turno con el nuevo estado
       if (recordatorio.turno) {
         if (data.tipo === 'pago') {
           // Marcar como pagado
           await base44.entities.TurnoCancha.update(recordatorio.turno.id, {
             pagado: true,
             notas_pago: data.medioPago,
             cobrado_por: 'Admin',
             hora_cobro: new Date().toISOString(),
           });
         } else {
           // Marcar como no pagado
           await base44.entities.TurnoCancha.update(recordatorio.turno.id, {
             pagado: false,
             notas_pago: `No pago - Motivo: ${data.motivo}`,
           });
         }
       }

       // Crear o actualizar registro en CobroCliente
       const cobroData = {
         cliente_id: cliente.id,
         cliente_nombre: cliente.nombre,
         tipo_cobro: recordatorio.turno?.modalidad_alquiler || recordatorio.turno?.tipo_turno,
         mes: recordatorio.fecha.substring(0, 7),
         monto: Number(data.tipo === 'pago' ? data.montoPago : cliente.precio),
         estado: data.tipo === 'pago' ? 'pagado' : 'pendiente',
         fecha_pago: data.tipo === 'pago' ? new Date().toISOString().split('T')[0] : null,
         medio_pago: data.tipo === 'pago' ? data.medioPago : null,
         notas: data.tipo === 'pago' 
           ? data.notas
           : `No pago - Motivo: ${data.motivo}. ${data.notas}`,
       };

       await base44.entities.CobroCliente.create(cobroData);
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
       queryClient.invalidateQueries({ queryKey: ['turnos-cancha-all'] });
       queryClient.invalidateQueries({ queryKey: ['cobros-clientes'] });
       queryClient.invalidateQueries({ queryKey: ['clientes'] });
       queryClient.invalidateQueries({ queryKey: ['alumnos'] });
       queryClient.invalidateQueries({ queryKey: ['pagos'] });
       queryClient.invalidateQueries({ queryKey: ['pagos-alumnos'] });
       onOpenChange(false);
     },
     onError: (err) => {
       setError(err.message || 'Error al registrar');
     },
   });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (tipo === 'pago') {
      if (!medioPago || medioPago.trim() === '') {
        setError('Selecciona un medio de pago');
        return;
      }
      if (!montoPago || Number(montoPago) <= 0) {
        setError('Ingresa un monto válido');
        return;
      }
    } else if (tipo === 'no_pago') {
      if (!motivo || motivo.trim() === '') {
        setError('Selecciona un motivo para el no pago');
        return;
      }
    }

    registrarCobroMutation.mutate({
      tipo,
      medioPago,
      montoPago,
      motivo,
      notas,
    });
  };

  if (!recordatorio || !cliente) return null;

  return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="sm:max-w-md">
         <DialogHeader>
           <DialogTitle>
             {recordatorio?.turno?.pagado ? 'Editar Pago' : 'Registrar Cobro'}
           </DialogTitle>
         </DialogHeader>

        <div className="bg-slate-50 p-3 rounded-lg text-sm space-y-1 mb-4">
          <p>
            <span className="font-semibold">Cliente:</span> {cliente.nombre}
          </p>
          <p>
            <span className="font-semibold">Cancha {recordatorio.cancha}</span> - {recordatorio.hora}
          </p>
          <p>
            <span className="font-semibold">Monto:</span> ${Number(cliente.precio || 0).toLocaleString('es-AR')}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="font-semibold">¿Pagó?</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={tipo === 'pago' ? 'default' : 'outline'}
                className={tipo === 'pago' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                onClick={() => setTipo('pago')}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Sí, pagó
              </Button>
              <Button
                type="button"
                variant={tipo === 'no_pago' ? 'default' : 'outline'}
                className={tipo === 'no_pago' ? 'bg-rose-600 hover:bg-rose-700' : ''}
                onClick={() => setTipo('no_pago')}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                No pagó
              </Button>
            </div>
          </div>

          {tipo === 'pago' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="medio">Medio de Pago *</Label>
                <Select value={medioPago} onValueChange={setMedioPago}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona forma de pago" />
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

              <div className="space-y-2">
                <Label htmlFor="monto">Monto Pagado *</Label>
                <Input
                  id="monto"
                  type="number"
                  value={montoPago}
                  onChange={(e) => setMontoPago(e.target.value)}
                  placeholder="0"
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Notas (opcional)</Label>
                <Textarea
                  id="notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Comprobante, referencia de transferencia, etc."
                  rows={2}
                />
              </div>
            </>
          )}

          {tipo === 'no_pago' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo *</Label>
                <Select value={motivo} onValueChange={setMotivo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin_fondos">Sin fondos</SelectItem>
                    <SelectItem value="ausencia">Ausencia del cliente</SelectItem>
                    <SelectItem value="problema_pago">Problema técnico de pago</SelectItem>
                    <SelectItem value="aplazado">Aplazado</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Notas (opcional)</Label>
                <Textarea
                  id="notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Detalles adicionales..."
                  rows={2}
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={registrarCobroMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {registrarCobroMutation.isPending ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}