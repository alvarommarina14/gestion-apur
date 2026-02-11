import React, { useState } from 'react';
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
import { Trash2, AlertTriangle } from 'lucide-react';

export default function ModalCancelarAlquiler({ open, onOpenChange, turno }) {
  const queryClient = useQueryClient();
  const [opcionSeleccionada, setOpcionSeleccionada] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [tieneRepeticionSemanal, setTieneRepeticionSemanal] = React.useState(false);

  React.useEffect(() => {
    const verificarRepeticion = async () => {
      if (turno && open) {
        try {
          const recordatorios = await base44.entities.RecordatorioCancha.filter({ turno_cancha_id: turno.id });
          const tieneRepeticion = recordatorios.length > 0 && recordatorios[0].repeticion_semanal;
          setTieneRepeticionSemanal(tieneRepeticion);
        } catch (error) {
          console.error('Error verificando repetición:', error);
          setTieneRepeticionSemanal(false);
        }
      } else {
        setTieneRepeticionSemanal(false);
      }
    };
    verificarRepeticion();
  }, [turno?.id, open]);

  const cancelarMutation = useMutation({
    mutationFn: async ({ tipo, motivo }) => {
      if (tipo === 'menos_24h') {
        // Cancelar solo este turno sin descuento
        await base44.entities.TurnoCancha.update(turno.id, {
          estado: 'cancelado',
          notas: `${turno.notas || ''}\nCancelado con menos de 24h - No se descuenta`.trim()
        });

        // Actualizar recordatorio asociado
        const recordatorios = await base44.entities.RecordatorioCancha.filter({ turno_cancha_id: turno.id });
        if (recordatorios.length > 0) {
          await base44.entities.RecordatorioCancha.update(recordatorios[0].id, {
            estado: 'hecho',
            notas: 'Cancelado con menos de 24h'
          });
        }

        // Log de auditoría
        await base44.entities.LogAuditoria.create({
          entidad: 'TurnoCancha',
          entidad_id: turno.id,
          entidad_nombre: `${turno.cliente} - Cancha ${turno.cancha}`,
          accion: 'cambio_estado',
          campo_modificado: 'estado',
          valor_anterior: 'activo',
          valor_nuevo: 'cancelado',
          motivo: 'Cancelación con menos de 24h - No se descuenta',
          fecha: new Date().toISOString(),
        });

      } else if (tipo === 'mas_24h') {
        // Cancelar con más de 24h - se descuenta o recupera
        await base44.entities.TurnoCancha.update(turno.id, {
          estado: 'cancelado',
          notas: `${turno.notas || ''}\nCancelado con más de 24h - Motivo: ${motivo}`.trim()
        });

        // Actualizar recordatorio asociado
        const recordatorios = await base44.entities.RecordatorioCancha.filter({ turno_cancha_id: turno.id });
        if (recordatorios.length > 0) {
          await base44.entities.RecordatorioCancha.update(recordatorios[0].id, {
            estado: 'hecho',
            notas: `Cancelado - ${motivo}`
          });
        }

        // Crear registro de cancelación para recuperar (tanto para abono como suelto)
        await base44.entities.CancelacionCancha.create({
          turno_cancha_id: turno.id,
          cliente_id: null,
          cliente_nombre: turno.cliente,
          fecha_original: turno.fecha,
          hora_original: turno.hora_inicio,
          cancha: turno.cancha,
          motivo: motivo,
          estado: 'pendiente_recupero',
          fecha_cancelacion: new Date().toISOString(),
        });

        // Log de auditoría
        await base44.entities.LogAuditoria.create({
          entidad: 'TurnoCancha',
          entidad_id: turno.id,
          entidad_nombre: `${turno.cliente} - Cancha ${turno.cancha}`,
          accion: 'cambio_estado',
          campo_modificado: 'estado',
          valor_anterior: 'activo',
          valor_nuevo: 'cancelado',
          motivo: `Cancelación con más de 24h - ${motivo}`,
          fecha: new Date().toISOString(),
        });

      } else if (tipo === 'eliminar_serie') {
        // Eliminar todos los turnos restantes de la serie
        const response = await base44.functions.invoke('eliminarSerieRecurrenteTurnos', {
          turno_id: turno.id
        });

        if (!response.data?.success) {
          throw new Error(response.data?.error || 'Error al eliminar la serie');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha-push'] });
      queryClient.invalidateQueries({ queryKey: ['cancelaciones-cancha'] });
      onOpenChange(false);
      setOpcionSeleccionada(null);
      setMotivo('');
    },
    onError: (error) => {
      console.error('Error al cancelar:', error);
      alert('Error al cancelar el turno: ' + error.message);
    }
  });

  const handleCancelar = () => {
    if (opcionSeleccionada === 'menos_24h') {
      if (confirm('¿Cancelar este turno sin descuento?')) {
        cancelarMutation.mutate({ tipo: 'menos_24h' });
      }
    } else if (opcionSeleccionada === 'mas_24h') {
      if (!motivo) {
        alert('Debes seleccionar un motivo');
        return;
      }
      if (confirm('¿Cancelar este turno? Se descontará o generará recupero.')) {
        cancelarMutation.mutate({ tipo: 'mas_24h', motivo });
      }
    } else if (opcionSeleccionada === 'eliminar_serie') {
      if (confirm('⚠️ Esto eliminará TODOS los turnos restantes de esta serie recurrente. ¿Estás seguro?')) {
        cancelarMutation.mutate({ tipo: 'eliminar_serie' });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-600" />
            Cancelar turno de alquiler
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm font-medium text-slate-700 mb-2">Turno:</p>
            <p className="text-sm text-slate-600">
              <span className="font-semibold">{turno?.cliente}</span> - Cancha {turno?.cancha}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {turno?.fecha} a las {turno?.hora_inicio}
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Selecciona una opción:</p>

            {/* Opción 1: Menos de 24h */}
            <button
              onClick={() => setOpcionSeleccionada('menos_24h')}
              className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                opcionSeleccionada === 'menos_24h'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                  opcionSeleccionada === 'menos_24h'
                    ? 'border-emerald-500 bg-emerald-500'
                    : 'border-slate-300'
                }`}>
                  {opcionSeleccionada === 'menos_24h' && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">Aviso con menos de 24 horas</p>
                  <p className="text-xs text-slate-600 mt-1">No se descuenta del abono</p>
                </div>
              </div>
            </button>

            {/* Opción 2: Más de 24h */}
            <button
              onClick={() => setOpcionSeleccionada('mas_24h')}
              className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                opcionSeleccionada === 'mas_24h'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                  opcionSeleccionada === 'mas_24h'
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-slate-300'
                }`}>
                  {opcionSeleccionada === 'mas_24h' && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">Aviso con más de 24 horas</p>
                  <p className="text-xs text-slate-600 mt-1">Se descuenta o genera recupero</p>
                </div>
              </div>
            </button>

            {/* Desplegable de motivos si se selecciona más de 24h */}
            {opcionSeleccionada === 'mas_24h' && (
              <div className="ml-7 space-y-2">
                <Label className="text-sm">Motivo de cancelación *</Label>
                <Select value={motivo} onValueChange={setMotivo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cliente">Cancelación por cliente</SelectItem>
                    <SelectItem value="clima">Mal clima</SelectItem>
                    <SelectItem value="mantenimiento">Mantenimiento de cancha</SelectItem>
                    <SelectItem value="otro">Otro motivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Opción 3: Eliminar serie completa - Solo si tiene recurrencia semanal */}
            {tieneRepeticionSemanal && (
              <button
                onClick={() => setOpcionSeleccionada('eliminar_serie')}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  opcionSeleccionada === 'eliminar_serie'
                    ? 'border-rose-500 bg-rose-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                    opcionSeleccionada === 'eliminar_serie'
                      ? 'border-rose-500 bg-rose-500'
                      : 'border-slate-300'
                  }`}>
                    {opcionSeleccionada === 'eliminar_serie' && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Eliminar todos los turnos restantes</p>
                    <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Borra permanentemente toda la serie recurrente
                    </p>
                  </div>
                </div>
              </button>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCancelar}
              disabled={!opcionSeleccionada || cancelarMutation.isPending}
              className={
                opcionSeleccionada === 'eliminar_serie'
                  ? 'bg-rose-600 hover:bg-rose-700 flex-1'
                  : 'bg-emerald-600 hover:bg-emerald-700 flex-1'
              }
            >
              {cancelarMutation.isPending ? 'Procesando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}