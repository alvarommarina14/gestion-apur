import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
    color: 'border-amber-500 bg-amber-50 text-amber-700'
  },
  { 
    value: 'ausente_sin_aviso', 
    label: 'Ausente sin aviso', 
    color: 'border-rose-500 bg-rose-50 text-rose-700'
  },
];

export default function ModalClientesClase({ 
  open, 
  onOpenChange, 
  turno, 
  onCancelarTurno 
}) {
  const [clientesEstado, setClientesEstado] = useState({});
  const [showCancelarTurno, setShowCancelarTurno] = useState(false);

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
    }
  }, [open, turno]);

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
                      onClick={() => handleEstadoChange(cliente, opcion.value)}
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