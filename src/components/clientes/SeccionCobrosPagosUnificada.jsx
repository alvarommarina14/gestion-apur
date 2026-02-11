import React, { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  Plus, 
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import RegistrarPagoCobroModal from './RegistrarPagoCobroModal';

export default function SeccionCobrosPagosUnificada({ cliente }) {
  const queryClient = useQueryClient();
  const [modalRegistrar, setModalRegistrar] = useState({ open: false, cobro: null });
  const [itemAEliminar, setItemAEliminar] = useState(null);

  // Fetch cobros del cliente
  const { data: cobrosClientes = [] } = useQuery({
    queryKey: ['cobros-clientes', cliente?.id],
    queryFn: () => base44.entities.CobroCliente.filter({ cliente_id: cliente.id }),
    enabled: !!cliente?.id,
  });

  // Fetch pagos de alumno (si aplica)
  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
    enabled: !!cliente?.id,
  });

  const { data: pagosAlumnos = [] } = useQuery({
    queryKey: ['pagos-alumnos', cliente?.id],
    queryFn: async () => {
      if (!cliente?.nombre) return [];
      const alumnosCliente = alumnos.filter(a => 
        a.nombre.toLowerCase().includes(cliente.nombre.toLowerCase()) ||
        cliente.nombre.toLowerCase().includes(a.nombre.toLowerCase())
      );
      if (alumnosCliente.length === 0) return [];
      
      const pagos = [];
      for (const alumno of alumnosCliente) {
        const pagosList = await base44.entities.Pago.filter({ alumno_id: alumno.id });
        pagos.push(...pagosList);
      }
      return pagos;
    },
    enabled: !!cliente?.nombre && alumnos.length > 0,
  });

  // Eliminar cobro o pago
  const deleteMutation = useMutation({
    mutationFn: async (item) => {
      if (item.tipo === 'cobro') {
        return await base44.entities.CobroCliente.delete(item.id);
      } else {
        return await base44.entities.Pago.delete(item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cobros-clientes', cliente?.id] });
      queryClient.invalidateQueries({ queryKey: ['pagos-alumnos', cliente?.id] });
      setItemAEliminar(null);
    },
  });

  // Función para calcular estado dinámico de cobros
  const getEstadoDinamicoCobro = (cobro) => {
    if (cobro.estado === 'pagado') return 'pagado';
    
    // Verificar si hay pagos de alumno que cubran este mes
    const pagoDelMes = pagosAlumnos.some(p => {
      const mesDelPago = p.mes_correspondiente || format(parseISO(p.fecha), 'yyyy-MM');
      return mesDelPago === cobro.mes;
    });
    
    if (pagoDelMes) return 'pagado';
    
    const hoy = new Date();
    const [año, mes] = cobro.mes.split('-');
    const fechaVencimiento = new Date(parseInt(año), parseInt(mes) - 1, 15);
    
    return hoy > fechaVencimiento ? 'moroso' : 'pendiente';
  };

  // Calcular cobro virtual del mes actual si no existe
  const cobrosConVirtual = useMemo(() => {
    if (!cliente?.precio) return cobrosClientes;
    
    const hoy = new Date();
    const mesActual = format(hoy, 'yyyy-MM');
    const diaActual = hoy.getDate();
    
    const yaExisteCobro = cobrosClientes.some(c => c.mes === mesActual);
    
    if (!yaExisteCobro && cliente.precio > 0 && diaActual >= 5) {
      const cobroVirtual = {
        id: `virtual-${mesActual}`,
        cliente_id: cliente.id,
        cliente_nombre: cliente.nombre,
        tipo_cobro: cliente.tipo_cliente || 'abono_mensual',
        mes: mesActual,
        monto: cliente.precio,
        estado: 'pendiente',
        virtual: true,
      };
      return [...cobrosClientes, cobroVirtual];
    }
    
    return cobrosClientes;
  }, [cobrosClientes, cliente]);

  // Estadísticas
  const estadisticas = useMemo(() => {
    const totalCobrosPendientes = cobrosConVirtual
      .filter(c => getEstadoDinamicoCobro(c) !== 'pagado')
      .reduce((sum, c) => sum + (c.monto || 0), 0);
    
    const totalCobrosPagados = cobrosConVirtual
      .filter(c => getEstadoDinamicoCobro(c) === 'pagado')
      .reduce((sum, c) => sum + (c.monto || 0), 0);

    const totalPagosAlumnos = pagosAlumnos.reduce((sum, p) => sum + (p.monto || 0), 0);

    return {
      totalCobrosPendientes,
      totalCobrosPagados,
      cantidadCobros: cobrosConVirtual.length,
      totalPagosAlumnos,
      cantidadPagos: pagosAlumnos.length,
    };
  }, [cobrosConVirtual, pagosAlumnos]);

  const renderEstadoBadge = (estado) => {
    const config = {
      pagado: { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, label: '✓ Pagado' },
      pendiente: { color: 'bg-amber-100 text-amber-700', icon: Clock, label: '⏳ Pendiente' },
      moroso: { color: 'bg-rose-100 text-rose-700', icon: AlertCircle, label: '⚠️ Moroso' },
    };
    const cfg = config[estado];
    const Icon = cfg?.icon || Clock;
    return (
      <Badge className={cfg?.color}>
        <Icon className="w-3 h-3 mr-1" />
        {cfg?.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Estadísticas */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className="shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-xs text-emerald-700 font-medium">Cobros Pagados</p>
              <p className="text-xl font-bold text-emerald-600">
                ${estadisticas.totalCobrosPagados.toLocaleString('es-AR')}
              </p>
              <p className="text-xs text-emerald-600">({cobrosConVirtual.filter(c => getEstadoDinamicoCobro(c) === 'pagado').length})</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-gradient-to-br from-rose-50 to-rose-100">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-xs text-rose-700 font-medium">Cobros Pendientes</p>
              <p className="text-xl font-bold text-rose-600">
                ${estadisticas.totalCobrosPendientes.toLocaleString('es-AR')}
              </p>
              <p className="text-xs text-rose-600">({cobrosConVirtual.filter(c => getEstadoDinamicoCobro(c) !== 'pagado').length})</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cobros y Pagos Unificados */}
      <div className="space-y-2">
        {(() => {
          const movimientosFiltrados = [
            ...cobrosConVirtual.filter(c => getEstadoDinamicoCobro(c) !== 'pagado' || !c.virtual),
            ...pagosAlumnos
          ];
          return (
            <>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-slate-900 text-sm">Movimientos ({movimientosFiltrados.length})</h4>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setModalRegistrar({ 
              open: true, 
              cobro: cobrosConVirtual.find(c => c.mes === format(new Date(), 'yyyy-MM')) 
            })}
            className="h-7"
          >
            <Plus className="w-3 h-3 mr-1" />
            Cobrar
          </Button>
        </div>

              {movimientosFiltrados.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No hay movimientos registrados</p>
                </div>
              ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {/* Combinar y ordenar cobros y pagos por fecha */}
            {[
              ...cobrosConVirtual
                .filter(c => getEstadoDinamicoCobro(c) !== 'pagado' || !c.virtual)
                .map(c => ({
                  ...c,
                  tipo: 'cobro',
                  fecha_orden: c.mes + '-15'
                })),
              ...pagosAlumnos.map(p => ({
                ...p,
                tipo: 'pago',
                fecha_orden: p.fecha
              }))
            ]
              .sort((a, b) => b.fecha_orden.localeCompare(a.fecha_orden))
              .map((item) => {
                if (item.tipo === 'cobro') {
                  const estadoDinamico = getEstadoDinamicoCobro(item);
                  return (
                    <Card key={item.id} className="shadow-sm">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium text-slate-900 text-sm">
                                {format(parseISO(item.mes + '-01'), "MMMM yyyy", { locale: es })}
                              </span>
                              {renderEstadoBadge(estadoDinamico)}
                            </div>
                            <div className="text-xs text-slate-500">
                              {item.tipo_cobro === 'abono_mensual' ? 'Abono' : 'Cancha suelta'}
                            </div>
                          </div>
                          <div className="text-right flex items-start gap-2">
                            <div>
                              <div className="font-semibold text-slate-900">
                                ${(item.monto || 0).toLocaleString('es-AR')}
                              </div>
                              {item.fecha_pago && (
                                <p className="text-xs text-slate-500">
                                  {format(parseISO(item.fecha_pago), "d MMM", { locale: es })}
                                </p>
                              )}
                            </div>
                            {estadoDinamico !== 'pagado' && !item.virtual && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setModalRegistrar({ open: true, cobro: item })}
                                className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              >
                                <DollarSign className="w-3 h-3" />
                              </Button>
                            )}
                            {!item.virtual && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setItemAEliminar({ ...item, tipo: 'cobro' })}
                                className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                } else {
                  return (
                    <Card key={item.id} className="shadow-sm">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium text-slate-900 text-sm">
                                {format(parseISO(item.fecha), "d 'de' MMM yyyy", { locale: es })}
                              </span>
                              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700">
                                {item.medio_pago || 'Efectivo'}
                              </Badge>
                            </div>
                            {item.notas && (
                              <p className="text-xs text-slate-600 truncate">{item.notas}</p>
                            )}
                          </div>
                          <div className="text-right flex items-start gap-2">
                            <div className="font-semibold text-emerald-600">
                              ${(item.monto || 0).toLocaleString('es-AR')}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setItemAEliminar({ ...item, tipo: 'pago' })}
                              className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }
              })}
          </div>
        )}
      </div>

      {/* Modal Registrar Pago */}
      <RegistrarPagoCobroModal
        open={modalRegistrar.open}
        onOpenChange={(open) => !open && setModalRegistrar({ open: false, cobro: null })}
        cobro={modalRegistrar.cobro}
        cliente={cliente}
      />

      {/* Alert Eliminar */}
      <AlertDialog open={!!itemAEliminar} onOpenChange={(open) => !open && setItemAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              Eliminar {itemAEliminar?.tipo === 'cobro' ? 'cobro' : 'pago'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemAEliminar && deleteMutation.mutate(itemAEliminar)}
              disabled={deleteMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Eliminar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}