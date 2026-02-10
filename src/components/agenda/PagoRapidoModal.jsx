import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

export default function PagoRapidoModal({ open, onOpenChange, turno }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    medio_pago: '',
    notas_pago: '',
    cobrado_por: '',
  });

  const { data: user } = base44.auth.me();

  const registrarPagoMutation = useMutation({
    mutationFn: async (data) => {
      // 1. Actualizar el turno como pagado
      await base44.entities.TurnoCancha.update(turno.id, {
        pagado: true,
        notas_pago: data.notas_pago,
        cobrado_por: data.cobrado_por || user?.full_name || 'Desconocido',
        hora_cobro: new Date().toISOString(),
      });

      // 2. Si es cancha suelta, crear un cobro individual
      if (turno.modalidad_alquiler === 'suelto') {
        // Buscar o crear cliente
        const clientesExistentes = await base44.entities.Cliente.filter({
          nombre: turno.cliente
        });
        
        let clienteId;
        if (clientesExistentes.length > 0) {
          clienteId = clientesExistentes[0].id;
        } else {
          const nuevoCliente = await base44.entities.Cliente.create({
            nombre: turno.cliente,
            telefono: '',
            tipo_cliente: 'clase',
            clasificacion: 'ocasional',
            notas: 'Cliente creado automáticamente desde pago de cancha suelta'
          });
          clienteId = nuevoCliente.id;
        }

        // Crear registro de cobro individual
        await base44.entities.CobroCliente.create({
          cliente_id: clienteId,
          cliente_nombre: turno.cliente,
          tipo_cobro: 'cancha_suelta',
          monto: turno.monto,
          estado: 'pagado',
          fecha_pago: format(new Date(), 'yyyy-MM-dd'),
          medio_pago: data.medio_pago,
          notas: `Pago de cancha ${turno.cancha} - ${turno.fecha} ${turno.hora_inicio}`,
        });
      }

      // 3. Si tiene recordatorio asociado, marcarlo como pagado
      const recordatorios = await base44.entities.RecordatorioCancha.filter({
        turno_cancha_id: turno.id
      });
      
      if (recordatorios.length > 0) {
        await base44.entities.RecordatorioCancha.update(recordatorios[0].id, {
          pagado: true
        });
      }
    },
    onSuccess: () => {
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['cobros-clientes'] });
      queryClient.invalidateQueries({ queryKey: ['clientes-list'] });
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
      
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
      }, 1500);
    },
    onError: (error) => {
      console.error('Error registrando pago:', error);
      alert('Error al registrar el pago');
    },
    onSettled: () => {
      setLoading(false);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.medio_pago) {
      alert('Debes seleccionar un medio de pago');
      return;
    }
    
    setLoading(true);
    registrarPagoMutation.mutate(formData);
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">¡Pago registrado!</h3>
            <p className="text-slate-500 mt-1">El cobro se registró correctamente</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Registrar Pago
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="bg-slate-50 rounded-lg p-3 space-y-1">
            <p className="text-sm text-slate-600">Cliente</p>
            <p className="font-semibold text-slate-900">{turno.cliente}</p>
            <p className="text-sm text-slate-600 mt-2">Monto</p>
            <p className="text-2xl font-bold text-emerald-600">
              {new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: 'ARS',
                minimumFractionDigits: 0,
              }).format(turno.monto || 0)}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {turno.fecha} - {turno.hora_inicio} | Cancha {turno.cancha}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Medio de pago *</Label>
            <Select
              value={formData.medio_pago}
              onValueChange={(v) => setFormData({ ...formData, medio_pago: v })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar medio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Efectivo">Efectivo</SelectItem>
                <SelectItem value="Transferencia">Transferencia</SelectItem>
                <SelectItem value="Mercado Pago">Mercado Pago</SelectItem>
                <SelectItem value="Débito">Débito</SelectItem>
                <SelectItem value="Crédito">Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cobrado por (opcional)</Label>
            <Input
              value={formData.cobrado_por}
              onChange={(e) => setFormData({ ...formData, cobrado_por: e.target.value })}
              placeholder={user?.full_name || "Nombre de quien cobró"}
            />
          </div>

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={formData.notas_pago}
              onChange={(e) => setFormData({ ...formData, notas_pago: e.target.value })}
              placeholder="Observaciones sobre el pago..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.medio_pago}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? 'Guardando...' : 'Registrar pago'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}