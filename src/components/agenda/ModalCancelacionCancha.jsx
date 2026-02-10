import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';

const MOTIVOS = {
  'cliente_solicita': 'Cliente solicita',
  'clima': 'Clima',
  'mantenimiento': 'Mantenimiento',
  'falta_clientes': 'Falta de clientes',
  'otro': 'Otro'
};

export default function ModalCancelacionCancha({ isOpen, onClose, turno }) {
  const [step, setStep] = useState(1); // 1: Opción principal, 2: Cancelar hoy, 3: Aviso 24h
  const [motivo, setMotivo] = useState('');
  const [detalles, setDetalles] = useState('');
  const [tipoRecupero, setTipoRecupero] = useState('sin_recupero'); // sin_recupero, con_recupero
  const queryClient = useQueryClient();

  const createCancelacionMutation = useMutation({
    mutationFn: async (data) => {
      const cancelacion = await base44.entities.CancelacionCancha.create(data);
      return cancelacion;
    },
    onSuccess: () => {
      toast.success('Cancelación registrada correctamente');
      queryClient.invalidateQueries({ queryKey: ['cancelaciones-cancha'] });
      handleClose();
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    }
  });

  const handleCancelarHoy = async () => {
    if (!motivo) {
      toast.error('Selecciona un motivo');
      return;
    }

    await createCancelacionMutation.mutateAsync({
      turno_cancha_id: turno.id,
      cancha: turno.cancha,
      cliente: turno.cliente,
      fecha: turno.fecha,
      hora_inicio: turno.hora_inicio,
      hora_fin: turno.hora_fin,
      motivo_cancelacion: motivo,
      detalles,
      tipo_cancelacion: 'hoy',
      monto: turno.monto || 0,
      es_recuperable: false,
      estado_recupero: 'pendiente',
    });
  };

  const handleAviso24h = async () => {
    if (!motivo) {
      toast.error('Selecciona un motivo');
      return;
    }

    await createCancelacionMutation.mutateAsync({
      turno_cancha_id: turno.id,
      cancha: turno.cancha,
      cliente: turno.cliente,
      fecha: turno.fecha,
      hora_inicio: turno.hora_inicio,
      hora_fin: turno.hora_fin,
      motivo_cancelacion: motivo,
      detalles,
      tipo_cancelacion: 'aviso_24h',
      tipo_recupero: tipoRecupero, // sin_recupero o con_recupero
      monto: turno.monto || 0,
      es_recuperable: tipoRecupero === 'con_recupero',
      estado_recupero: 'pendiente',
    });
  };

  const handleClose = () => {
    setStep(1);
    setMotivo('');
    setDetalles('');
    setTipoRecupero('sin_recupero');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar Cancha</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* STEP 1: Opciones principales */}
          {step === 1 && (
            <>
              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium text-slate-700">Cancha {turno?.cancha}</p>
                <p className="text-sm text-slate-600">{turno?.cliente}</p>
                <p className="text-sm text-slate-600">{turno?.fecha} {turno?.hora_inicio}</p>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => setStep(2)}
                  className="w-full justify-start h-auto py-3 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                >
                  <div className="text-left">
                    <p className="font-medium">Por menos de 24 horas</p>
                    <p className="text-xs mt-1">No se recupera y no se descuenta</p>
                  </div>
                </Button>

                <Button
                  onClick={() => setStep(3)}
                  className="w-full justify-start h-auto py-3 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                >
                  <div className="text-left">
                    <p className="font-medium">Aviso más de 24 horas antes</p>
                    <p className="text-xs mt-1">Elegir opción de recupero o descuento</p>
                  </div>
                </Button>
              </div>
            </>
          )}

          {/* STEP 2: Cancelar hoy (menos de 24h) */}
          {step === 2 && (
            <>
              <div className="space-y-3">
                <div className="flex gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>Esta cancelación no genera recupero ni descuento</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Motivo de cancelación</Label>
                  <Select value={motivo} onValueChange={setMotivo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MOTIVOS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Detalles (opcional)</Label>
                  <Textarea
                    value={detalles}
                    onChange={(e) => setDetalles(e.target.value)}
                    placeholder="Notas adicionales..."
                    className="resize-none h-20"
                  />
                </div>
              </div>
            </>
          )}

          {/* STEP 3: Aviso 24h o más */}
          {step === 3 && (
            <>
              <div className="flex gap-2 text-sm text-blue-700 bg-blue-50 p-3 rounded">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>Se cancela con aviso previo de 24h o más</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Motivo de cancelación</Label>
                <Select value={motivo} onValueChange={setMotivo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MOTIVOS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">¿Cómo resolver?</Label>
                <Select value={tipoRecupero} onValueChange={setTipoRecupero}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin_recupero">Sin recupero ni descuento</SelectItem>
                    <SelectItem value="con_recupero">Crear recupero para cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Detalles (opcional)</Label>
                <Textarea
                  value={detalles}
                  onChange={(e) => setDetalles(e.target.value)}
                  placeholder="Notas adicionales..."
                  className="resize-none h-20"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {step > 1 && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(step - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Atrás
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
          >
            Cancelar
          </Button>

          {step === 2 && (
            <Button
              onClick={handleCancelarHoy}
              disabled={!motivo || createCancelacionMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {createCancelacionMutation.isPending ? 'Guardando...' : 'Confirmar'}
            </Button>
          )}

          {step === 3 && (
            <Button
              onClick={handleAviso24h}
              disabled={!motivo || createCancelacionMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createCancelacionMutation.isPending ? 'Guardando...' : 'Confirmar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}