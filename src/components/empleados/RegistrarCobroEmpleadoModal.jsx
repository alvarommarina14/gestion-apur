import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
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
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react';

export default function RegistrarCobroEmpleadoModal({ open, onOpenChange, item, tipo, empleado }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    medio_pago: 'efectivo',
    pagar_luego: false,
    notas: '',
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('nombre', 500),
  });

  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list('nombre', 500),
  });

  const registrarCobroMutation = useMutation({
    mutationFn: async (data) => {
      const ahora = new Date().toISOString();
      const empleadoNombre = empleado?.full_name || empleado?.email || 'Empleado';

      if (tipo === 'turno') {
        // Actualizar turno
        const notasPago = data.pagar_luego 
          ? `Dijo pagar luego - Registrado por ${empleadoNombre}`
          : `Pagado: ${data.medio_pago}${data.medio_pago === 'transferencia' ? ' (Enviar comprobante)' : ''} - ${data.notas || ''}`;

        await base44.entities.TurnoCancha.update(item.id, {
          pagado: !data.pagar_luego,
          notas_pago: notasPago,
          cobrado_por: empleadoNombre,
          hora_cobro: ahora,
        });

        // Si pagó y es alquiler, actualizar CobroCliente si existe
        if (!data.pagar_luego && item.tipo_turno === 'alquiler' && item.modalidad_alquiler === 'suelto') {
          const cliente = clientes.find(c => c.nombre === item.cliente);
          
          if (cliente) {
            // Buscar cobro pendiente del cliente para este mes
            const mesActual = format(new Date(), 'yyyy-MM');
            const cobrosCliente = await base44.entities.CobroCliente.filter({
              cliente_id: cliente.id,
              mes: mesActual,
              tipo_cobro: 'cancha_suelta',
              estado: 'pendiente'
            });

            if (cobrosCliente.length > 0) {
              // Actualizar el primer cobro pendiente
              await base44.entities.CobroCliente.update(cobrosCliente[0].id, {
                estado: 'pagado',
                fecha_pago: format(new Date(), 'yyyy-MM-dd'),
                medio_pago: data.medio_pago,
                notas: `Cobrado por ${empleadoNombre} - ${data.notas || ''}`,
              });
            } else {
              // Crear un cobro ya pagado
              await base44.entities.CobroCliente.create({
                cliente_id: cliente.id,
                cliente_nombre: cliente.nombre,
                tipo_cobro: 'cancha_suelta',
                mes: mesActual,
                monto: item.monto || 0,
                estado: 'pagado',
                fecha_pago: format(new Date(), 'yyyy-MM-dd'),
                fecha_vencimiento: format(new Date(), 'yyyy-MM-dd'),
                medio_pago: data.medio_pago,
                notas: `Cobrado por ${empleadoNombre} - ${data.notas || ''}`,
              });
            }
          }
        }
      } else if (tipo === 'clase') {
        // Actualizar clase
        const notasPago = data.pagar_luego 
          ? `Dijo pagar luego - Registrado por ${empleadoNombre}`
          : `Pagado: ${data.medio_pago}${data.medio_pago === 'transferencia' ? ' (Enviar comprobante)' : ''} - ${data.notas || ''}`;

        await base44.entities.Clase.update(item.id, {
          notas_pago: notasPago,
          cobrado_por: empleadoNombre,
          hora_cobro: ahora,
        });

        // Si pagó, actualizar deuda de alumnos si corresponde
        if (!data.pagar_luego && item.alumnos_ids) {
          const precioIndividual = item.tipo === 'grupal' 
            ? (item.precio || 0) / (item.alumnos_ids.length || 1)
            : (item.precio || 0);

          for (const alumnoId of item.alumnos_ids) {
            const alumno = alumnos.find(a => a.id === alumnoId);
            
            if (alumno) {
              // Reducir deuda si tiene
              const nuevaDeuda = Math.max(0, (alumno.deuda_total || 0) - precioIndividual);
              
              await base44.entities.Alumno.update(alumnoId, {
                deuda_total: nuevaDeuda,
                estado_mes_actual: nuevaDeuda === 0 ? 'pagado' : alumno.estado_mes_actual,
              });

              // Crear registro de pago
              await base44.entities.Pago.create({
                alumno_id: alumnoId,
                alumno_nombre: alumno.nombre,
                fecha: format(new Date(), 'yyyy-MM-dd'),
                monto: precioIndividual,
                medio_pago: data.medio_pago,
                mes_correspondiente: format(new Date(), 'yyyy-MM'),
                notas: `Clase del ${item.fecha} - Cobrado por ${empleadoNombre}`,
              });
            }
          }
        }
      }
    },
    onSuccess: () => {
      setShowSuccess(true);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
        queryClient.invalidateQueries({ queryKey: ['clases'] });
        queryClient.invalidateQueries({ queryKey: ['cobros-clientes'] });
        queryClient.invalidateQueries({ queryKey: ['alumnos'] });
        queryClient.invalidateQueries({ queryKey: ['pagos'] });
        setShowSuccess(false);
        onOpenChange(false);
        setFormData({
          medio_pago: 'efectivo',
          pagar_luego: false,
          notas: '',
        });
      }, 1500);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    registrarCobroMutation.mutate(formData);
  };

  if (!item) return null;

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

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
              El cobro ha sido registrado correctamente
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              {tipo === 'turno' ? (
                <>
                  <p className="text-sm text-slate-600">Cancha {item.cancha}</p>
                  <p className="font-semibold text-slate-900">{item.cliente}</p>
                  <p className="text-sm text-slate-600">{item.tipo_turno === 'clase' ? 'Clase' : 'Alquiler'}</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600">Clase {item.tipo}</p>
                  <p className="font-semibold text-slate-900">
                    {item.alumnos_nombres?.join(', ') || 'Sin alumnos'}
                  </p>
                </>
              )}
              <p className="text-2xl font-bold text-emerald-600 mt-2">
                {formatMoney(tipo === 'turno' ? item.monto : item.precio)}
              </p>
            </div>

            <div>
              <Label htmlFor="tipo_pago">¿Cómo va a pagar?</Label>
              <Select
                value={formData.pagar_luego ? 'luego' : formData.medio_pago}
                onValueChange={(value) => {
                  if (value === 'luego') {
                    setFormData({ ...formData, pagar_luego: true, medio_pago: '' });
                  } else {
                    setFormData({ ...formData, pagar_luego: false, medio_pago: value });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="debito">Débito</SelectItem>
                  <SelectItem value="credito">Crédito</SelectItem>
                  <SelectItem value="mercadopago">MercadoPago</SelectItem>
                  <SelectItem value="luego">Dijo pagar luego</SelectItem>
                </SelectContent>
              </Select>
              
              {formData.medio_pago === 'transferencia' && !formData.pagar_luego && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <p className="text-xs text-amber-700">Recordá pedir el comprobante</p>
                </div>
              )}

              {formData.pagar_luego && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700">
                    Se registrará que dijo pagar luego. Quedará pendiente de cobro.
                  </p>
                </div>
              )}
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
                  'Registrar'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}