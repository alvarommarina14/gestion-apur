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

  const motivosOpciones = [
    'Lluvia',
    'Cliente canceló',
    'Enfermedad',
    'Imprevisto personal',
    'Falta de jugadores',
    'Problema en la cancha',
    'Otro'
  ];

  const handleCancelarSoloEste = async () => {
    if (!motivo) {
      alert('Por favor, seleccioná un motivo para la cancelación');
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

      // Crear registro de recupero SOLO si no está pagado
      if (!turno.pagado && anticipacion === 'mas_24h' && turno.tipo_turno === 'alquiler' && turno.modalidad_alquiler === 'abono') {
        await base44.entities.CancelacionCancha.create({
          turno_cancha_id: turno.id,
          cliente: turno.cliente,
          fecha_original: turno.fecha,
          hora_original: turno.hora_inicio,
          cancha: turno.cancha,
          motivo_cancelacion: motivo,
          anticipacion: 'mas_24h',
          estado: 'pendiente_recupero'
        });
      }

      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['cancelaciones-cancha'] });
      
      const mensaje = turno.pagado 
        ? '✅ Turno cancelado. Ya estaba pagado, no afecta finanzas.'
        : anticipacion === 'mas_24h' 
          ? '✅ Turno cancelado. Se generó registro de recupero.'
          : '✅ Turno cancelado. No se genera recupero.';
      
      alert(mensaje);
      
      onOpenChange(false);
      setMotivo('');
      setAnticipacion('mas_24h');
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

    setLoading(true);
    try {
      // Obtener el día de la semana del turno actual
      const fechaTurno = new Date(turno.fecha + 'T00:00:00');
      const diaSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][fechaTurno.getDay()];
      
      // Buscar TODOS los turnos que coincidan con el mismo día, hora y cancha
      const todosTurnos = await base44.entities.TurnoCancha.list();
      const turnosRecurrentes = todosTurnos.filter(t => {
        if (t.estado === 'cancelado') return false; // Ignorar ya cancelados
        const fechaT = new Date(t.fecha + 'T00:00:00');
        const diaT = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][fechaT.getDay()];
        
        return (
          diaT === diaSemana &&
          t.hora_inicio === turno.hora_inicio &&
          t.cancha === turno.cancha &&
          t.cliente === turno.cliente
        );
      });

      if (turnosRecurrentes.length === 0) {
        alert('No se encontraron turnos recurrentes para cancelar');
        setLoading(false);
        return;
      }

      // Cancelar todos los turnos
      for (const t of turnosRecurrentes) {
        // Solo actualizar el estado del turno
        await base44.entities.TurnoCancha.update(t.id, {
          estado: 'cancelado',
          notas: `${t.notas || ''}\n\nCANCELACIÓN RECURRENCIA SEMANAL${t.pagado ? ' (YA PAGADO - NO AFECTA FINANZAS)' : ''}`.trim()
        });

        // Cancelar recordatorio si existe
        const recordatorios = await base44.entities.RecordatorioCancha.filter({ 
          turno_cancha_id: t.id 
        });
        
        if (recordatorios.length > 0) {
          await base44.entities.RecordatorioCancha.update(recordatorios[0].id, {
            estado: 'cancelado'
          });
        }

        // NO crear registros de recupero ni afectar cobros si el turno ya está pagado
        // Los turnos pagados no generan recuperos ni afectan KPIs al cancelarse
      }

      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
      
      alert(`✅ Se cancelaron ${turnosRecurrentes.length} turnos de la recurrencia semanal`);
      onOpenChange(false);
      setMotivo('');
      setAnticipacion('mas_24h');
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
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná un motivo" />
              </SelectTrigger>
              <SelectContent>
                {motivosOpciones.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Botón cancelar turno */}
          <Button
            onClick={handleCancelarSoloEste}
            disabled={loading || !motivo}
            className="w-full bg-rose-600 hover:bg-rose-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Cancelar este turno
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">
                Acción independiente
              </span>
            </div>
          </div>

          {/* Botón eliminar recurrencia (independiente) */}
          <Button
            onClick={handleEliminarRecurrencia}
            disabled={loading}
            variant="outline"
            className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            <CalendarX className="w-4 h-4 mr-2" />
            Borrar recurrencia semanal completa
          </Button>

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