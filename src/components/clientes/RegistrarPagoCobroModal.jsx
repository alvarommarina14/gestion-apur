import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Calendar } from 'lucide-react';

export default function RegistrarPagoCobroModal({ open, onOpenChange, cobro, cliente }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    fecha_pago: format(new Date(), 'yyyy-MM-dd'),
    medio_pago: 'efectivo',
    monto: cobro?.monto || '',
    notas: '',
  });

  const registrarPagoMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.functions.invoke('registrarPagoClienteCompleto', {
        cobro_id: cobro.id,
        cliente_id: cobro.cliente_id,
        cliente_nombre: cobro.cliente_nombre,
        fecha_pago: data.fecha_pago,
        medio_pago: data.medio_pago,
        monto: parseFloat(data.monto),
        notas: data.notas,
        mes: cobro.mes,
        tipo_cobro: cobro.tipo_cobro,
      });
      return result;
    },
    onSuccess: () => {
      // Invalidar queries - el refetch automático actualizará los estados
      queryClient.invalidateQueries({ queryKey: ['cobros-clientes', cliente?.id] });
      queryClient.invalidateQueries({ queryKey: ['cobros-clientes'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['alumnos'] });
      queryClient.invalidateQueries({ queryKey: ['pagos-alumnos'] });
      // Invalidar cobros de AgendaCanchas específicamente para el mes del cobro
      queryClient.invalidateQueries({ queryKey: ['cobros', cobro?.mes] });
      // Refetch inmediato para Recordatorios Hoy (actualiza estados dinámicamente)
      queryClient.refetchQueries({ queryKey: ['recordatorios-turnos-hoy'] });
      queryClient.refetchQueries({ queryKey: ['turnos-cancha'] });
      
      setTimeout(() => {
        onOpenChange(false);
      }, 100);
      setFormData({
        fecha_pago: format(new Date(), 'yyyy-MM-dd'),
        medio_pago: 'efectivo',
        monto: cobro?.monto || '',
        notas: '',
      });
    },
    onError: (error) => {
      console.error('Error al registrar pago:', error);
      alert('Error: ' + (error?.response?.data?.error || error.message));
    },
  });

  const handleRegistrar = () => {
    registrarPagoMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-slate-50 p-3 rounded border border-slate-200">
            <p className="text-sm text-slate-600">
              <span className="font-semibold">{cobro?.cliente_nombre}</span>
            </p>
            <p className="text-xs text-slate-500">
              {cobro?.tipo_cobro === 'abono_mensual' ? 'Abono' : 'Cancha suelta'} - {cobro?.mes}
            </p>
            <p className="text-lg font-bold text-emerald-600 mt-2">
              ${(cobro?.monto || 0).toLocaleString('es-AR')}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Fecha de pago</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="date"
                value={formData.fecha_pago}
                onChange={(e) => setFormData({ ...formData, fecha_pago: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Monto pagado</Label>
            <Input
              type="number"
              value={formData.monto}
              onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
              placeholder="Monto"
            />
          </div>

          <div className="space-y-2">
            <Label>Medio de pago</Label>
            <Select
              value={formData.medio_pago}
              onValueChange={(value) => setFormData({ ...formData, medio_pago: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="tarjeta">Tarjeta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Detalles del pago..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleRegistrar}
            disabled={registrarPagoMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {registrarPagoMutation.isPending ? 'Registrando...' : 'Registrar Pago'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}