import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO, getDaysInMonth } from 'date-fns';
import { es } from 'date-fns/locale';
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
import { CheckCircle } from 'lucide-react';

export default function NuevoCbroModal({ open, onOpenChange, cliente }) {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    tipo_cobro: 'abono_mensual',
    mes: format(new Date(), 'yyyy-MM'),
    monto: '',
    estado: 'pendiente',
    fecha_pago: '',
    medio_pago: '',
    notas: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Calcular fecha de vencimiento (día 15 del mes)
      const [year, month] = data.mes.split('-');
      const fecha_vencimiento = `${year}-${month}-15`;

      const cobroData = {
        ...data,
        cliente_id: cliente.id,
        cliente_nombre: cliente.nombre,
        fecha_vencimiento,
        estado: data.fecha_pago ? 'pagado' : data.estado,
      };

      return base44.entities.CobroCliente.create(cobroData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cobros-cliente', cliente.id] });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
        setFormData({
          tipo_cobro: 'abono_mensual',
          mes: format(new Date(), 'yyyy-MM'),
          monto: '',
          estado: 'pendiente',
          fecha_pago: '',
          medio_pago: '',
          notas: '',
        });
      }, 1500);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.monto) {
      alert('Ingresa el monto');
      return;
    }
    createMutation.mutate(formData);
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">¡Cobro registrado!</h3>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo cobro - {cliente?.nombre}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de cobro *</Label>
            <Select
              value={formData.tipo_cobro}
              onValueChange={(v) => setFormData({ ...formData, tipo_cobro: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="abono_mensual">Abono Mensual</SelectItem>
                <SelectItem value="cancha_suelta">Cancha Suelta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Mes *</Label>
            <Input
              type="month"
              value={formData.mes}
              onChange={(e) => setFormData({ ...formData, mes: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Monto ($) *</Label>
            <Input
              type="number"
              value={formData.monto}
              onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
              placeholder="0"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Estado</Label>
            <Select
              value={formData.estado}
              onValueChange={(v) => setFormData({ ...formData, estado: v })}
              disabled={!!formData.fecha_pago}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="moroso">Moroso</SelectItem>
                <SelectItem value="pagado">Pagado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fecha de pago (si está pagado)</Label>
            <Input
              type="date"
              value={formData.fecha_pago}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  fecha_pago: e.target.value,
                  estado: e.target.value ? 'pagado' : 'pendiente',
                });
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Medio de pago</Label>
            <Select
              value={formData.medio_pago}
              onValueChange={(v) => setFormData({ ...formData, medio_pago: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="tarjeta">Tarjeta</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Observaciones..."
              rows={2}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {createMutation.isPending ? 'Guardando...' : 'Registrar cobro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}