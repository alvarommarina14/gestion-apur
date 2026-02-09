import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Plus, AlertCircle, CheckCircle, Trash2, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import NuevoCbroModal from './NuevoCbroModal';
import RegistrarPagoCobroModal from './RegistrarPagoCobroModal';
import { es } from 'date-fns/locale';
import { parseISO } from 'date-fns';

export default function SeccionCobros({ cliente }) {
   const [modalNuevoCobro, setModalNuevoCobro] = useState(false);
   const [modalPago, setModalPago] = useState({ open: false, cobro: null });
   const queryClient = useQueryClient();

   const deleteCbroMutation = useMutation({
     mutationFn: (cobroId) => base44.entities.CobroCliente.delete(cobroId),
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['cobros-cliente', cliente.id] });
     },
   });

   const getEstadoDinamico = (cobro) => {
     // Si ya está pagado, mantener estado pagado
     if (cobro.estado === 'pagado') {
       return 'pagado';
     }

     // Calcular estado basado en día del mes (5 al 15 = pendiente, después 15 = moroso)
     const hoy = new Date();
     const diaActual = hoy.getDate();
     const [año, mes] = cobro.mes.split('-');
     const fechaVencimiento = new Date(parseInt(año), parseInt(mes) - 1, 15);
     
     return hoy > fechaVencimiento ? 'moroso' : 'pendiente';
   };

  const { data: cobros = [] } = useQuery({
    queryKey: ['cobros-cliente', cliente.id],
    queryFn: () => base44.entities.CobroCliente.filter({ cliente_id: cliente.id }),
  });

  const stats = useMemo(() => {
    const pendientes = cobros.filter(c => getEstadoDinamico(c) === 'pendiente').reduce((sum, c) => sum + (c.monto || 0), 0);
    const morosos = cobros.filter(c => getEstadoDinamico(c) === 'moroso').reduce((sum, c) => sum + (c.monto || 0), 0);
    const pagados = cobros.filter(c => c.estado === 'pagado').reduce((sum, c) => sum + (c.monto || 0), 0);

    return { pendientes, morosos, pagados };
  }, [cobros]);

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'pagado':
        return 'bg-emerald-100 text-emerald-700';
      case 'moroso':
        return 'bg-rose-100 text-rose-700';
      case 'pendiente':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-sm border-amber-200 bg-amber-50/30">
          <CardContent className="pt-4 pb-4">
            <p className="text-lg font-bold text-amber-600">${stats.pendientes.toLocaleString('es-AR')}</p>
            <p className="text-xs text-slate-500">Pendiente</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-rose-200 bg-rose-50/30">
          <CardContent className="pt-4 pb-4">
            <p className="text-lg font-bold text-rose-600">${stats.morosos.toLocaleString('es-AR')}</p>
            <p className="text-xs text-slate-500">Moroso</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
          <CardContent className="pt-4 pb-4">
            <p className="text-lg font-bold text-emerald-600">${stats.pagados.toLocaleString('es-AR')}</p>
            <p className="text-xs text-slate-500">Pagado</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de cobros */}
      <div className="space-y-2">
        {cobros.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-8 text-center">
              <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm text-slate-500">Sin registros de cobros</p>
            </CardContent>
          </Card>
        ) : (
          cobros.map(cobro => {
            const estadoDinamico = getEstadoDinamico(cobro);
            return (
            <Card key={cobro.id} className="shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-slate-900">
                        {cobro.tipo_cobro === 'abono_mensual' ? 'Abono' : 'Cancha suelta'} - {cobro.mes}
                      </p>
                      <Badge className={cn('text-xs', getEstadoColor(estadoDinamico))}>
                        {estadoDinamico === 'pagado' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {estadoDinamico === 'moroso' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {estadoDinamico.charAt(0).toUpperCase() + estadoDinamico.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      Monto: <span className="font-semibold">${(cobro.monto || 0).toLocaleString('es-AR')}</span>
                    </p>
                    {cobro.fecha_pago && (
                      <p className="text-xs text-emerald-600">
                        Pagado: {format(parseISO(cobro.fecha_pago), 'd MMM yyyy', { locale: es })}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {estadoDinamico !== 'pagado' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setModalPago({ open: true, cobro })}
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('¿Eliminar este cobro?')) {
                          deleteCbroMutation.mutate(cobro.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
          })
        )}
      </div>

      <Button 
        onClick={() => setModalNuevoCobro(true)}
        variant="outline"
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        Registrar cobro
      </Button>

      <NuevoCbroModal
        open={modalNuevoCobro}
        onOpenChange={setModalNuevoCobro}
        cliente={cliente}
      />
    </div>
  );
}