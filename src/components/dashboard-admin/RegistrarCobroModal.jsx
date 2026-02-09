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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function RegistrarCobroModal({ open, onOpenChange, cobro, cliente }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    fecha_pago: format(new Date(), 'yyyy-MM-dd'),
    medio_pago: 'Efectivo',
    notas: '',
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const registrarCobroMutation = useMutation({
    mutationFn: async (data) => {
      // Actualizar el cobro existente
      await base44.entities.CobroCliente.update(cobro.id, {
        estado: 'pagado',
        fecha_pago: data.fecha_pago,
        medio_pago: data.medio_pago,
        notas: data.notas,
      });

      // Si es un alumno, actualizar también su estado
      if (cliente?.tipo_cliente === 'clase') {
        const alumno = await base44.entities.Alumno.filter({ 
          nombre: cliente.nombre 
        });
        
        if (alumno.length > 0) {
          await base44.entities.Alumno.update(alumno[0].id, {
            estado_mes_actual: 'pagado',
            ultimo_pago_fecha: data.fecha_pago,
            ultimo_pago_nota: data.notas,
          });

          // Crear registro de pago
          await base44.entities.Pago.create({
            alumno_id: alumno[0].id,
            alumno_nombre: alumno[0].nombre,
            fecha: data.fecha_pago,
            monto: cobro.monto,
            medio_pago: data.medio_pago,
            mes_correspondiente: cobro.mes,
            notas: data.notas,
          });
        }
      }
    },
    onSuccess: () => {
      setShowSuccess(true);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['cobros-clientes'] });
        queryClient.invalidateQueries({ queryKey: ['clientes'] });
        queryClient.invalidateQueries({ queryKey: ['alumnos'] });
        queryClient.invalidateQueries({ queryKey: ['pagos'] });
        setShowSuccess(false);
        onOpenChange(false);
        setFormData({
          fecha_pago: format(new Date(), 'yyyy-MM-dd'),
          medio_pago: 'Efectivo',
          notas: '',
        });
      }, 1500);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    registrarCobroMutation.mutate(formData);
  };

  if (!cobro || !cliente) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Cobro</DialogTitle>
        </DialogHeader>

        {showSuccess ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900">¡Cobro registrado!</h3>
            <p className="text-sm text-slate-600 mt-2">
              El pago de {cliente.nombre} ha sido registrado correctamente
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-sm text-slate-600">Cliente</p>
              <p className="font-semibold text-slate-900">{cliente.nombre}</p>
            </div>

            <div>
              <p className="text-sm text-slate-600">Monto</p>
              <p className="text-2xl font-bold text-emerald-600">
                ${cobro.monto?.toLocaleString('es-AR')}
              </p>
            </div>

            <div>
              <Label htmlFor="fecha_pago">Fecha de pago</Label>
              <Input
                id="fecha_pago"
                type="date"
                value={formData.fecha_pago}
                onChange={(e) => setFormData({ ...formData, fecha_pago: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="medio_pago">Medio de pago</Label>
              <Select
                value={formData.medio_pago}
                onValueChange={(value) => setFormData({ ...formData, medio_pago: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                  <SelectItem value="Débito">Débito</SelectItem>
                  <SelectItem value="Crédito">Crédito</SelectItem>
                  <SelectItem value="MercadoPago">MercadoPago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notas">Notas (opcional)</Label>
              <Textarea
                id="notas"
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Observaciones..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={registrarCobroMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={registrarCobroMutation.isPending}
              >
                {registrarCobroMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  'Registrar pago'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}