import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bell, DollarSign, Trash2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

export default function RecordatoriosCanchaHoy({ turnos = [], fecha }) {
  const queryClient = useQueryClient();
  const [modalNoPago, setModalNoPago] = useState(false);
  const [modalPago, setModalPago] = useState(false);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [medioPago, setMedioPago] = useState('');
  const [notasPago, setNotasPago] = useState('');

  const turnosHoy = turnos.filter(t => 
    t.fecha === format(fecha, 'yyyy-MM-dd') && 
    t.estado !== 'cancelado'
  ).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  const eliminarRecordatorioMutation = useMutation({
     mutationFn: async (turnoId) => {
       const recordatorios = await base44.entities.RecordatorioCancha.filter({ 
         turno_cancha_id: turnoId 
       });

       for (const rec of recordatorios) {
         await base44.entities.RecordatorioCancha.delete(rec.id);
       }
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ 
         queryKey: ['turnos-cancha'],
         exact: false
       });
       queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
     },
     onError: (error) => {
       console.error('Error al eliminar recordatorio:', error);
       alert('Error al eliminar el recordatorio');
     }
   });

  const registrarPagoMutation = useMutation({
    mutationFn: async ({ turno, medio, notas }) => {
      const user = await base44.auth.me();
      
      // Actualizar turno como pagado
      await base44.entities.TurnoCancha.update(turno.id, {
        pagado: true,
        notas_pago: notas || `Pagado vía ${medio}`,
        cobrado_por: user?.full_name || 'Desconocido',
        hora_cobro: new Date().toISOString(),
      });

      // Si es cancha suelta, crear cobro individual
      if (turno.modalidad_alquiler === 'suelto') {
        const clientes = await base44.entities.Cliente.filter({ nombre: turno.cliente });
        let clienteId;
        
        if (clientes.length > 0) {
          clienteId = clientes[0].id;
        } else {
          const nuevoCliente = await base44.entities.Cliente.create({
            nombre: turno.cliente,
            telefono: '',
            tipo_cliente: 'clase',
            clasificacion: 'ocasional',
            notas: 'Cliente creado desde pago de cancha suelta'
          });
          clienteId = nuevoCliente.id;
        }

        await base44.entities.CobroCliente.create({
          cliente_id: clienteId,
          cliente_nombre: turno.cliente,
          tipo_cobro: 'cancha_suelta',
          monto: turno.monto,
          estado: 'pagado',
          fecha_pago: format(new Date(), 'yyyy-MM-dd'),
          medio_pago: medio,
          notas: `Cancha ${turno.cancha} - ${turno.fecha} ${turno.hora_inicio}`,
        });
      }

      // Actualizar recordatorio
      const recordatorios = await base44.entities.RecordatorioCancha.filter({ 
        turno_cancha_id: turno.id 
      });
      
      if (recordatorios.length > 0) {
        await base44.entities.RecordatorioCancha.update(recordatorios[0].id, {
          pagado: true,
          estado: 'hecho'
        });
      }
    },
    onSuccess: () => {
      setModalPago(false);
      setTurnoSeleccionado(null);
      setMedioPago('');
      setNotasPago('');
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['cobros-clientes'] });
      queryClient.invalidateQueries({ queryKey: ['clientes-list'] });
    }
  });

  const registrarNoPagoMutation = useMutation({
    mutationFn: async ({ turno, motivoNoPago }) => {
      // Actualizar turno con nota de no pago
      await base44.entities.TurnoCancha.update(turno.id, {
        notas: `${turno.notas || ''}\nNo pagó: ${motivoNoPago}`.trim(),
      });

      // Crear recordatorio de seguimiento
      await base44.entities.RecordatorioCancha.create({
        turno_cancha_id: turno.id,
        fecha: turno.fecha,
        hora: turno.hora_inicio,
        cancha: turno.cancha,
        cliente: turno.cliente,
        tipo_turno: turno.tipo_turno,
        modalidad_alquiler: turno.modalidad_alquiler,
        monto: turno.monto,
        pagado: false,
        estado: 'pendiente',
        notas: `SEGUIMIENTO - No pagó: ${motivoNoPago}`,
      });

      // Si es cancha suelta o abono, registrar en cobros como moroso
      if (turno.tipo_turno === 'alquiler') {
        const clientes = await base44.entities.Cliente.filter({ nombre: turno.cliente });
        let clienteId;
        
        if (clientes.length > 0) {
          clienteId = clientes[0].id;
        } else {
          const nuevoCliente = await base44.entities.Cliente.create({
            nombre: turno.cliente,
            telefono: '',
            tipo_cliente: turno.modalidad_alquiler === 'abono' ? 'abono' : 'clase',
            clasificacion: 'ocasional',
            notas: 'Cliente creado desde turno no pago'
          });
          clienteId = nuevoCliente.id;
        }

        await base44.entities.CobroCliente.create({
          cliente_id: clienteId,
          cliente_nombre: turno.cliente,
          tipo_cobro: turno.modalidad_alquiler === 'abono' ? 'abono_mensual' : 'cancha_suelta',
          mes: turno.modalidad_alquiler === 'abono' ? format(new Date(turno.fecha), 'yyyy-MM') : undefined,
          monto: turno.monto,
          estado: 'moroso',
          fecha_vencimiento: turno.fecha,
          notas: `No pagó: ${motivoNoPago}`,
        });
      }
    },
    onSuccess: () => {
      setModalNoPago(false);
      setTurnoSeleccionado(null);
      setMotivo('');
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['cobros-clientes'] });
      queryClient.invalidateQueries({ queryKey: ['clientes-list'] });
    }
  });

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (turnosHoy.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-slate-400" />
            Recordatorios Canchas Hoy
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-slate-500">No hay turnos programados para hoy</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-600" />
            Recordatorios Canchas Hoy
            <Badge variant="outline" className="ml-auto">
              {turnosHoy.length} turnos
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {turnosHoy.map((turno) => (
            <div
              key={turno.id}
              className={cn(
                'border-2 rounded-lg p-4 transition-all',
                turno.pagado
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Estado y Hora */}
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant={turno.pagado ? 'default' : 'destructive'}
                      className={turno.pagado ? 'bg-emerald-600' : ''}
                    >
                      {turno.pagado ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Pagado
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1" />
                          Pendiente
                        </>
                      )}
                    </Badge>
                    <span className="text-sm font-semibold text-slate-700">
                      {turno.hora_inicio} - {turno.hora_fin}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Cancha {turno.cancha}
                    </Badge>
                  </div>

                  {/* Cliente y Tipo */}
                  <h4 className="font-bold text-slate-900 text-lg mb-1">
                    {turno.cliente}
                  </h4>
                  
                  <div className="flex items-center gap-2 mb-2">
                    {turno.tipo_turno === 'clase' ? (
                      <Badge className="bg-blue-100 text-blue-700">
                        Clase
                      </Badge>
                    ) : (
                      <Badge className="bg-purple-100 text-purple-700">
                        Alquiler - {turno.modalidad_alquiler === 'abono' ? 'Abono' : 'Suelto'}
                      </Badge>
                    )}
                  </div>

                  {/* Monto */}
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-slate-500" />
                    <span className="text-xl font-bold text-emerald-600">
                      {formatMoney(turno.monto)}
                    </span>
                  </div>

                  {turno.notas && (
                    <p className="text-xs text-slate-500 mt-2 italic">
                      {turno.notas}
                    </p>
                  )}
                </div>

                {/* Botones de Acción */}
                <div className="flex flex-col gap-2 items-end">
                  {!turno.pagado && (
                    <>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 w-full"
                        onClick={() => {
                          setTurnoSeleccionado(turno);
                          setModalPago(true);
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Pagó
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-rose-300 text-rose-600 hover:bg-rose-50 w-full"
                        onClick={() => {
                          setTurnoSeleccionado(turno);
                          setModalNoPago(true);
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        No pagó
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-slate-500 hover:text-rose-600 w-full"
                    onClick={() => {
                      if (confirm('¿Eliminar este recordatorio?')) {
                        eliminarRecordatorioMutation.mutate(turno.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Modal Registrar Pago */}
      <Dialog open={modalPago} onOpenChange={setModalPago}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              Registrar Pago
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-sm text-slate-600">Cliente</p>
              <p className="font-semibold text-slate-900">{turnoSeleccionado?.cliente}</p>
              <p className="text-2xl font-bold text-emerald-600 mt-2">
                {formatMoney(turnoSeleccionado?.monto)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Medio de pago *</Label>
              <Select value={medioPago} onValueChange={setMedioPago}>
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
              <Label>Notas (opcional)</Label>
              <Textarea
                value={notasPago}
                onChange={(e) => setNotasPago(e.target.value)}
                placeholder="Observaciones..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalPago(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!medioPago || registrarPagoMutation.isPending}
              onClick={() => {
                registrarPagoMutation.mutate({
                  turno: turnoSeleccionado,
                  medio: medioPago,
                  notas: notasPago
                });
              }}
            >
              {registrarPagoMutation.isPending ? 'Guardando...' : 'Registrar pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal No Pagó */}
      <Dialog open={modalNoPago} onOpenChange={setModalNoPago}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Registrar No Pago
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-rose-50 rounded-lg p-3 border border-rose-200">
              <p className="text-sm text-slate-600">Cliente</p>
              <p className="font-semibold text-slate-900">{turnoSeleccionado?.cliente}</p>
              <p className="text-2xl font-bold text-rose-600 mt-2">
                {formatMoney(turnoSeleccionado?.monto)}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Se creará un recordatorio de seguimiento y se marcará como moroso
              </p>
            </div>

            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Select value={motivo} onValueChange={setMotivo}>
                <SelectTrigger>
                  <SelectValue placeholder="¿Por qué no pagó?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Olvidó efectivo">Olvidó efectivo</SelectItem>
                  <SelectItem value="Pagará después">Pagará después</SelectItem>
                  <SelectItem value="No tenía dinero">No tenía dinero</SelectItem>
                  <SelectItem value="Quiere transferir">Quiere transferir</SelectItem>
                  <SelectItem value="Disputa precio">Disputa precio</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                ⚠️ Esta acción creará un registro de seguimiento y actualizará los KPIs financieros automáticamente
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalNoPago(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!motivo || registrarNoPagoMutation.isPending}
              onClick={() => {
                registrarNoPagoMutation.mutate({
                  turno: turnoSeleccionado,
                  motivoNoPago: motivo
                });
              }}
            >
              {registrarNoPagoMutation.isPending ? 'Guardando...' : 'Registrar no pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}