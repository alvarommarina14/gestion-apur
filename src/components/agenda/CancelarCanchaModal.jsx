import React, { useState } from 'react';
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
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function CancelarCanchaModal({ open, onOpenChange, turno }) {
  const queryClient = useQueryClient();
  const [motivo, setMotivo] = useState('');
  const [detalles, setDetalles] = useState('');
  const [loading, setLoading] = useState(false);

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
        motivo_cancelacion: motivo,
        detalles: detalles || null,
        estado_recupero: 'pendiente',
      });

      // Actualizar estado del turno
      await base44.entities.TurnoCancha.update(turno.id, {
        estado: 'cancelado',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['cancelaciones-cancha'] });
      onOpenChange(false);
      setMotivo('');
      setDetalles('');
    },
  });

  const handleSubmit = async () => {
    if (!motivo) return;
    setLoading(true);
    await cancelarMutation.mutateAsync();
    setLoading(false);
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

          <div className="space-y-2">
            <Label>Detalles (opcional)</Label>
            <Textarea
              value={detalles}
              onChange={(e) => setDetalles(e.target.value)}
              placeholder="Información adicional sobre la cancelación..."
              rows={3}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            ℹ️ La cancelación quedará registrada y podrá ser recuperada o descontada posteriormente.
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!motivo || loading}
            className="bg-rose-600 hover:bg-rose-700"
          >
            {loading ? 'Procesando...' : 'Cancelar cancha'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}