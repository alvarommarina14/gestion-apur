import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, Trash2 } from 'lucide-react';

export default function LimpiezaDatosModal({ open, onOpenChange }) {
  const [tipoLimpieza, setTipoLimpieza] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [profesorSeleccionado, setProfesorSeleccionado] = useState('');
  const [tiposCobro, setTiposCobro] = useState([]);
  const [confirmando, setConfirmando] = useState(false);
  const queryClient = useQueryClient();

  const { data: profesores = [] } = useQuery({
    queryKey: ['profesores'],
    queryFn: () => base44.entities.Profesor.list(),
    enabled: open,
  });

  const limpiarMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('limpiarDatos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      queryClient.invalidateQueries({ queryKey: ['pagos'] });
      queryClient.invalidateQueries({ queryKey: ['cobros-clientes'] });
      queryClient.invalidateQueries({ queryKey: ['asistencia'] });
      setTipoLimpieza('');
      setPeriodo('');
      setProfesorSeleccionado('');
      setTiposCobro([]);
      setConfirmando(false);
      onOpenChange(false);
    },
  });

  const handleLimpiar = async () => {
    let datos = { tipo: tipoLimpieza };

    if (tipoLimpieza === 'periodo') {
      datos.periodo = periodo;
    } else if (tipoLimpieza === 'profesor') {
      datos.profesor_id = profesorSeleccionado;
    } else if (tipoLimpieza === 'cobros') {
      datos.tipos_cobro = tiposCobro;
    }

    await limpiarMutation.mutateAsync(datos);
  };

  const mesesDisponibles = Array.from({ length: 24 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return {
      value: `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`,
      label: format(d, 'MMMM yyyy', { locale: es }),
    };
  });

  const canConfirm =
    (tipoLimpieza === 'periodo' && periodo) ||
    (tipoLimpieza === 'profesor' && profesorSeleccionado) ||
    (tipoLimpieza === 'cobros' && tiposCobro.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-600" />
            Limpiar Datos
          </DialogTitle>
          <DialogDescription>
            Elimina registros por período, profesor o tipo de cobro
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-rose-200 bg-rose-50">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <AlertDescription className="text-rose-800 text-sm">
              Esta acción es irreversible. Selecciona cuidadosamente qué deseas eliminar.
            </AlertDescription>
          </Alert>

          {!confirmando ? (
            <>
              {/* Selector de tipo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  ¿Qué deseas limpiar?
                </label>
                <Select value={tipoLimpieza} onValueChange={setTipoLimpieza}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="periodo">Por Período</SelectItem>
                    <SelectItem value="profesor">Por Profesor</SelectItem>
                    <SelectItem value="cobros">Por Tipo de Cobro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Por período */}
              {tipoLimpieza === 'periodo' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Selecciona el mes a limpiar
                  </label>
                  <Select value={periodo} onValueChange={setPeriodo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona mes..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mesesDisponibles.map((mes) => (
                        <SelectItem key={mes.value} value={mes.value}>
                          {mes.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {periodo && (
                    <p className="text-xs text-slate-600">
                      Se eliminarán: Turnos, Clases, Pagos y Cobros de {mesesDisponibles.find(m => m.value === periodo)?.label}
                    </p>
                  )}
                </div>
              )}

              {/* Por profesor */}
              {tipoLimpieza === 'profesor' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Selecciona el profesor
                  </label>
                  <Select value={profesorSeleccionado} onValueChange={setProfesorSeleccionado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona profesor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {profesores.map((prof) => (
                        <SelectItem key={prof.id} value={prof.id}>
                          {prof.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {profesorSeleccionado && (
                    <p className="text-xs text-slate-600">
                      Se eliminarán: Todas las clases, pagos y asistencias de este profesor
                    </p>
                  )}
                </div>
              )}

              {/* Por tipo de cobro */}
              {tipoLimpieza === 'cobros' && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700">
                    Selecciona qué cobros eliminar
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'abono_mensual', label: 'Abonos mensuales' },
                      { value: 'cancha_suelta', label: 'Canchas sueltas' },
                    ].map((tipo) => (
                      <div key={tipo.value} className="flex items-center gap-2">
                        <Checkbox
                          id={tipo.value}
                          checked={tiposCobro.includes(tipo.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setTiposCobro([...tiposCobro, tipo.value]);
                            } else {
                              setTiposCobro(tiposCobro.filter(t => t !== tipo.value));
                            }
                          }}
                        />
                        <label htmlFor={tipo.value} className="text-sm cursor-pointer">
                          {tipo.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setConfirmando(true)}
                  disabled={!canConfirm}
                >
                  Continuar
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <Alert className="border-rose-300 bg-rose-100">
                <AlertTriangle className="h-4 w-4 text-rose-700" />
                <AlertDescription className="text-rose-900 text-sm font-medium">
                  ¿Estás seguro? Esta acción no se puede deshacer.
                </AlertDescription>
              </Alert>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setConfirmando(false)}
                >
                  Atrás
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleLimpiar}
                  disabled={limpiarMutation.isPending}
                >
                  {limpiarMutation.isPending ? 'Eliminando...' : 'Sí, eliminar'}
                </Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}