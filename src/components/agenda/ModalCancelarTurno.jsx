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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Trash2, CalendarX } from 'lucide-react';

export default function ModalCancelarTurno({ open, onOpenChange, turno }) {
  const queryClient = useQueryClient();
  const [anticipacion, setAnticipacion] = useState('mas_24h');
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCancelarSoloEste = async () => {
    if (!motivo.trim()) {
      alert('Por favor, ingresá un motivo para la cancelación');
      return;
    }

    setLoading(true);
    try {
      // Cambiar estado del turno a cancelado
      await base44.entities.TurnoCancha.update(turno.id, {
        estado: 'cancelado',
        notas: `${turno.notas || ''}\n\nCANCELADO: ${motivo} (${anticipacion === 'mas_24h' ? 'Más de 24hs' : 'Menos de 24hs'})`.trim()
      });

      // Actualizar recordatorio si existe
      const recordatorios = await base44.entities.RecordatorioCancha.filter({ 
        turno_cancha_id: turno.id 
      });
      
      if (recordatorios.length > 0) {
        await base44.entities.RecordatorioCancha.update(recordatorios[0].id, {
          estado: 'cancelado'
        });
      }

      // Eliminar de Google Calendar si existe
      if (turno.gcal_event_id) {
        try {
          await base44.functions.invoke('eliminarEventoGoogleCalendar', {
            eventId: turno.gcal_event_id
          });
        } catch (err) {
          console.error('Error eliminando de Google Calendar:', err);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
      
      alert(
        anticipacion === 'mas_24h' 
          ? '✅ Turno cancelado. Se descontará/recuperará según corresponda.'
          : '✅ Turno cancelado. No se descuenta ni recupera.'
      );
      
      onOpenChange(false);
    } catch (error) {
      alert('❌ Error al cancelar el turno: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarRecurrencia = async () => {
    if (!confirm('⚠️ Esto eliminará TODOS los turnos de la recurrencia semanal. ¿Estás seguro?')) {
      return;
    }

    if (!motivo.trim()) {
      alert('Por favor, ingresá un motivo para la cancelación');
      return;
    }

    setLoading(true);
    try {
      // Buscar recordatorio base para obtener la serie
      const recordatorios = await base44.entities.RecordatorioCancha.filter({ 
        turno_cancha_id: turno.id 
      });

      if (recordatorios.length === 0 || !recordatorios[0].repeticion_semanal) {
        alert('Este turno no tiene recurrencia semanal');
        setLoading(false);
        return;
      }

      const recordatorioBase = recordatorios[0];
      
      // Buscar todos los recordatorios de la serie (mismo día de semana, hora y cancha)
      const todosRecordatorios = await base44.entities.RecordatorioCancha.filter({
        dia_semana: recordatorioBase.dia_semana,
        hora: recordatorioBase.hora,
        cancha: recordatorioBase.cancha,
        repeticion_semanal: true
      });

      // Obtener todos los turnos asociados
      const turnosIds = todosRecordatorios
        .map(r => r.turno_cancha_id)
        .filter(id => id);

      // Cancelar todos los turnos
      for (const turnoId of turnosIds) {
        await base44.entities.TurnoCancha.update(turnoId, {
          estado: 'cancelado',
          notas: `CANCELACIÓN RECURRENCIA: ${motivo}`
        });
      }

      // Actualizar todos los recordatorios
      for (const rec of todosRecordatorios) {
        await base44.entities.RecordatorioCancha.update(rec.id, {
          estado: 'cancelado'
        });
      }

      // Eliminar serie de Google Calendar
      if (turno.gcal_event_id) {
        try {
          await base44.functions.invoke('eliminarClasesRecurrentesGoogleCalendar', {
            baseEventId: turno.gcal_event_id
          });
        } catch (err) {
          console.error('Error eliminando serie de Google Calendar:', err);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
      
      alert(`✅ Se cancelaron ${turnosIds.length} turnos de la recurrencia semanal`);
      onOpenChange(false);
    } catch (error) {
      alert('❌ Error al eliminar la recurrencia: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!turno) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cancelar Turno</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info del turno */}
          <div className="p-3 bg-slate-50 rounded-lg space-y-1 text-sm">
            <p><strong>Cliente:</strong> {turno.cliente}</p>
            <p><strong>Cancha:</strong> {turno.cancha}</p>
            <p><strong>Fecha:</strong> {turno.fecha}</p>
            <p><strong>Hora:</strong> {turno.hora_inicio}</p>
          </div>

          {/* Anticipación */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              ¿Con cuánta anticipación se cancela?
            </label>
            <Select value={anticipacion} onValueChange={setAnticipacion}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mas_24h">
                  Más de 24 horas - Se descuenta o recupera
                </SelectItem>
                <SelectItem value="menos_24h">
                  Menos de 24 horas - No se descuenta ni recupera
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Motivo */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Motivo de la cancelación
            </label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Lluvia, enfermedad, imprevisto, etc."
              rows={3}
            />
          </div>

          {/* Botones */}
          <div className="space-y-2">
            <Button
              onClick={handleCancelarSoloEste}
              disabled={loading || !motivo.trim()}
              className="w-full bg-rose-600 hover:bg-rose-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Cancelar solo este turno
            </Button>

            <Button
              onClick={handleEliminarRecurrencia}
              disabled={loading || !motivo.trim()}
              variant="outline"
              className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <CalendarX className="w-4 h-4 mr-2" />
              Borrar recurrencia semanal completa
            </Button>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-900">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              {anticipacion === 'mas_24h' 
                ? 'Al cancelar con más de 24hs, el turno se descuenta o recupera según el tipo de cliente.'
                : 'Al cancelar con menos de 24hs, no se aplica descuento ni recupero.'}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}