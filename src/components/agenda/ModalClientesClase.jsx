import React, { useState, useMemo } from 'react';
import { format, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, AlertCircle, X, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

const estadosAusencia = [
  { 
    value: 'presente', 
    label: 'Presente', 
    color: 'border-emerald-500 bg-emerald-50 text-emerald-700'
  },
  { 
    value: 'ausente_con_aviso', 
    label: 'Ausente con aviso', 
    color: 'border-amber-500 bg-amber-50 text-amber-700',
    requiresMotivo: true
  },
  { 
    value: 'ausente_sin_aviso', 
    label: 'Ausente sin aviso', 
    color: 'border-rose-500 bg-rose-50 text-rose-700'
  },
];

const motivosAusenciaAvisos = [
  { value: 'cliente_solicita', label: 'Cliente solicita' },
  { value: 'clima', label: 'Clima/Clima adverso' },
  { value: 'enfermedad', label: 'Enfermedad' },
  { value: 'viaje', label: 'Viaje' },
  { value: 'otro', label: 'Otro' },
];

export default function ModalClientesClase({ 
  open, 
  onOpenChange, 
  turno, 
  onCancelarTurno 
}) {
  const queryClient = useQueryClient();
  const [clientesEstado, setClientesEstado] = useState({});
  const [showCancelarTurno, setShowCancelarTurno] = useState(false);
  const [clienteAusente, setClienteAusente] = useState(null);
  const [mostrarMotivos, setMostrarMotivos] = useState(false);
  const [motivoAusencia, setMotivoAusencia] = useState('');
  const [loading, setLoading] = useState(false);

  // Calcular horas hasta la clase
  const horasHasta = useMemo(() => {
    if (!turno?.fecha || !turno?.hora_inicio) return null;
    try {
      const now = new Date();
      const [hora, minutos] = turno.hora_inicio.split(':');
      const claseDate = new Date(`${turno.fecha}T${hora}:${minutos}:00`);
      return differenceInHours(claseDate, now);
    } catch (e) {
      return null;
    }
  }, [turno]);

  const esMas24Horas = horasHasta !== null && horasHasta > 24;

  // Inicializar el estado de clientes cuando se abre el modal
  React.useEffect(() => {
    if (open && turno) {
      const clientesList = turno.cliente.split(',').map(c => c.trim());
      const initial = {};
      clientesList.forEach((cliente) => {
        initial[cliente] = {
          estado: '',
          notas: '',
        };
      });
      setClientesEstado(initial);
      setShowCancelarTurno(false);
      setClienteAusente(null);
      setMostrarMotivos(false);
      setMotivoAusencia('');
    }
  }, [open, turno]);

  const handleAusenciaConAviso = (cliente) => {
    // Siempre mostrar modal de motivos cuando se marca "Ausente con aviso"
    setClienteAusente(cliente);
    setMostrarMotivos(true);
  };

  const handleGuardarAusenciaConMotivo = async () => {
    if (!motivoAusencia || !clienteAusente) return;

    setLoading(true);
    try {
      // Marcar estado en el componente
      handleEstadoChange(clienteAusente, 'ausente_con_aviso');
      
      // Crear recupero con motivo
      // Incluir tipo de clase en las notas
      const tipoClase = turno.tipo === 'grupal' ? 'Clase Grupal' : 'Clase Individual';
      
      await base44.entities.Recupero.create({
        alumno_id: clienteAusente,
        alumno_nombre: clienteAusente,
        clase_original_id: turno.id,
        fecha_original: turno.fecha,
        motivo: motivoAusencia,
        estado: 'pendiente',
        notas: `${tipoClase} - ${turno.hora_inicio}h - Avisó con más de 24h`,
        vencimiento: new Date(new Date(turno.fecha).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });

      queryClient.invalidateQueries({ queryKey: ['recuperos'] });
      
      setClienteAusente(null);
      setMostrarMotivos(false);
      setMotivoAusencia('');
    } catch (error) {
      console.error('Error al crear recupero:', error);
    } finally {
      setLoading(false);
    }
  };

  const clientesArr = turno?.cliente.split(',').map(c => c.trim()) || [];

  const handleEstadoChange = (cliente, estado) => {
    setClientesEstado(prev => ({
      ...prev,
      [cliente]: { ...prev[cliente], estado }
    }));
  };

  const handleNotasChange = (cliente, notas) => {
    setClientesEstado(prev => ({
      ...prev,
      [cliente]: { ...prev[cliente], notas }
    }));
  };

  if (!turno) return null;

  // Modal de motivos para ausencia con aviso (más de 24h)
  if (mostrarMotivos && clienteAusente) {
    return (
      <Dialog open={mostrarMotivos} onOpenChange={(value) => {
        if (!value) {
          setMostrarMotivos(false);
          setClienteAusente(null);
          setMotivoAusencia('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Motivo de ausencia con aviso</DialogTitle>
            <DialogDescription>
              {clienteAusente} - Avisó con más de 24 horas de anticipación
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Selecciona el motivo *</Label>
              <Select value={motivoAusencia} onValueChange={setMotivoAusencia}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar motivo" />
                </SelectTrigger>
                <SelectContent>
                  {motivosAusenciaAvisos.map((motivo) => (
                    <SelectItem key={motivo.value} value={motivo.value}>
                      {motivo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              ℹ️ Se creará una clase a recuperar con este motivo en Recupero de Canchas.
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMostrarMotivos(false);
                setClienteAusente(null);
                setMotivoAusencia('');
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleGuardarAusenciaConMotivo}
              disabled={!motivoAusencia || loading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {loading ? 'Guardando...' : 'Guardar motivo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Registrar asistencia
          </DialogTitle>
          <DialogDescription>
            {turno.fecha && format(new Date(turno.fecha), "EEEE d 'de' MMMM", { locale: es })} - {turno.hora_inicio}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {clientesArr.map((cliente) => (
            <div key={cliente} className="space-y-3 border rounded-lg p-4 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-slate-200">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
                <span className="font-medium text-slate-800">{cliente}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {estadosAusencia.map((opcion) => {
                  const isSelected = clientesEstado[cliente]?.estado === opcion.value;

                  return (
                    <button
                      key={opcion.value}
                      type="button"
                      onClick={() => {
                        if (opcion.requiresMotivo) {
                          handleAusenciaConAviso(cliente);
                        } else {
                          handleEstadoChange(cliente, opcion.value);
                        }
                      }}
                      className={cn(
                        'p-3 rounded-lg border-2 transition-all text-center',
                        isSelected 
                          ? opcion.color 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      )}
                    >
                      <span className={cn(
                        'text-xs font-medium block',
                        isSelected ? '' : 'text-slate-600'
                      )}>
                        {opcion.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {clientesEstado[cliente]?.estado && (
                <div className="space-y-1">
                  <Label className="text-xs">Notas (opcional)</Label>
                  <Textarea
                    value={clientesEstado[cliente]?.notas || ''}
                    onChange={(e) => handleNotasChange(cliente, e.target.value)}
                    placeholder="Ej: Se comunicó antes, razón del fallo..."
                    rows={2}
                    className="text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
          {turno.modalidad_alquiler === 'abono' && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                onOpenChange(false);
                onCancelarTurno?.(turno);
              }}
              className="bg-rose-600 hover:bg-rose-700"
            >
              <Ban className="w-4 h-4 mr-2" />
              Cancelar turno
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}