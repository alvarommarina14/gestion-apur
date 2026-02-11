import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, Users, DollarSign, CheckCircle, AlertCircle, Trash2, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { addDays, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function RecordatoriosTurnosHoy() {
   const [user, setUser] = useState(null);
   const queryClient = useQueryClient();
   const [modalPagoIndividual, setModalPagoIndividual] = useState(false);
   const [claseSeleccionada, setClaseSeleccionada] = useState(null);
   const [medioPago, setMedioPago] = useState('');

  // Fetch user
  useEffect(() => {
    const getUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    getUser();
  }, []);



   // Cargar clientes y alumnos pendientes/morosos
   const { data: clientesPendientes = [] } = useQuery({
     queryKey: ['clientes-pendientes'],
     queryFn: async () => {
       const mesActual = format(new Date(), 'yyyy-MM');
       const pagos = await base44.entities.Pago.list();
       const pagosDelMes = pagos.filter(p => p.mes_correspondiente === mesActual);

       const alumnos = await base44.entities.Alumno.list();
       const clientes = await base44.entities.Cliente.list();

       const resultado = [];

       // Alumnos pendientes/morosos
       for (const alumno of alumnos) {
         const pagado = pagosDelMes.some(p => p.alumno_id === alumno.id);
         if (!pagado) {
           resultado.push({
             type: 'alumno',
             id: alumno.id,
             nombre: alumno.nombre,
             profesor_nombre: alumno.profesor_nombre,
             estado: alumno.deuda_total > 0 ? 'moroso' : 'pendiente',
             monto: alumno.precio_mensual
           });
         }
       }

       // Clientes con abono pendiente
       for (const cliente of clientes) {
         if (cliente.tipo_cliente === 'clase' && cliente.es_alumno) continue; // Ya está en alumnos
         const cobros = await base44.entities.CobroCliente.list();
         const cobroDelMes = cobros.find(c => c.cliente_id === cliente.id && c.mes === mesActual);
         if (cobroDelMes && !cobroDelMes.pagado) {
           resultado.push({
             type: 'cliente',
             id: cliente.id,
             nombre: cliente.nombre,
             estado: cobroDelMes.estado === 'moroso' ? 'moroso' : 'pendiente',
             monto: cliente.precio
           });
         }
       }

       return resultado.sort((a, b) => {
         // Morosos primero
         if (a.estado === 'moroso' && b.estado !== 'moroso') return -1;
         if (a.estado !== 'moroso' && b.estado === 'moroso') return 1;
         return a.nombre.localeCompare(b.nombre);
       });
     },
     refetchInterval: 60000
   });



   const formatMoney = (amount) => {
     return new Intl.NumberFormat('es-AR', {
       style: 'currency',
       currency: 'ARS',
       minimumFractionDigits: 0,
     }).format(amount || 0);
   };

  const getEstadoPagoColor = (estado) => {
    switch(estado) {
      case 'pagado': return 'bg-green-100 text-green-700 border-green-200';
      case 'moroso': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const getEstadoPagoLabel = (estado) => {
    switch(estado) {
      case 'pagado': return '✓ Pagado';
      case 'moroso': return 'Moroso';
      default: return 'Pendiente';
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Sección de Recordatorios de Pagos Pendientes/Morosos */}
      {clientesPendientes.length > 0 && (
      <div className="pt-6">
          <div className="mb-4">
            <h2 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
              Recordatorios de Pagos
            </h2>
            <p className="text-sm text-slate-500 mt-1">Alumnos y clientes con pagos pendientes o morosos</p>
          </div>

          {clientesPendientes.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">¡Todos los pagos están al día! 🎉</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {clientesPendientes.map((cliente) => (
                <Card key={`${cliente.type}-${cliente.id}`} className={cn(
                  'overflow-hidden',
                  cliente.estado === 'moroso' && 'border-red-300 bg-red-50'
                )}>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          {cliente.estado === 'moroso' ? (
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          ) : (
                            <Clock className="w-5 h-5 text-amber-600" />
                          )}
                          <div>
                            <h3 className="font-semibold text-slate-900">{cliente.nombre}</h3>
                            {cliente.profesor_nombre && (
                              <p className="text-sm text-slate-500">Prof: {cliente.profesor_nombre}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <div className="text-right">
                          <p className="text-sm text-slate-600">{formatMoney(cliente.monto)}</p>
                          <span className={cn(
                            'text-xs font-semibold px-3 py-1 rounded-full block mt-1',
                            cliente.estado === 'moroso' 
                              ? 'bg-red-200 text-red-700' 
                              : 'bg-amber-200 text-amber-700'
                          )}>
                            {cliente.estado === 'moroso' ? 'Moroso' : 'Pendiente'}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => {
                            setClaseSeleccionada({ id: cliente.id, professor_nombre: cliente.profesor_nombre });
                            setModalPagoIndividual(true);
                          }}
                        >
                          <DollarSign className="w-4 h-4" />
                          Pagar
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
                ))}
                </div>
          )}
          </div>
          )}

        {/* Modal Pago Individual */}
        {modalPagoIndividual && claseSeleccionada?.alumnos_ids?.[0] && (
          <Dialog open={modalPagoIndividual} onOpenChange={setModalPagoIndividual}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Registrar pago - {claseSeleccionada?.profesor_nombre}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const alumnoId = claseSeleccionada.alumnos_ids[0];
                  const alumno = alumnos[0];

                  if (!alumno) {
                    toast.error('Error: No se encontró el alumno');
                    return;
                  }

                  const mes = format(new Date(claseSeleccionada.fecha), 'yyyy-MM');

                  await base44.entities.Pago.create({
                    alumno_id: alumnoId,
                    alumno_nombre: alumno.nombre,
                    fecha: format(new Date(), 'yyyy-MM-dd'),
                    monto: Number(pagosAlumnos.monto || alumno.precio_mensual),
                    medio_pago: medioPago,
                    mes_correspondiente: mes,
                  });

                  setModalPagoIndividual(false);
                  setClaseSeleccionada(null);
                  setPagosAlumnos({});
                  setMedioPago('');
                  queryClient.invalidateQueries({ queryKey: ['clases-hoy'] });
                  queryClient.invalidateQueries({ queryKey: ['alumnos'] });
                  queryClient.invalidateQueries({ queryKey: ['pagos'] });
                  queryClient.invalidateQueries({ queryKey: ['alumnos-con-pagos'] });
                  queryClient.invalidateQueries({ queryKey: ['clientes-pendientes'] });
                  toast.success('Pago registrado correctamente');
                } catch (error) {
                  toast.error('Error: ' + error.message);
                }
              }} className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="font-semibold text-slate-800">{claseSeleccionada?.alumnos_nombres?.[0]}</p>
                  <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="text-slate-500">Precio mensual</span>
                    <span className="font-medium">{formatMoney(alumnos[0]?.precio_mensual)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input
                    type="number"
                    defaultValue={alumnos[0]?.precio_mensual}
                    onChange={(e) => setPagosAlumnos({ ...pagosAlumnos, monto: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Medio de pago</Label>
                  <Select value={medioPago} onValueChange={setMedioPago}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="mercadopago">MercadoPago</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setModalPagoIndividual(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                    Registrar pago
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal Pagos Grupales */}
        <Dialog open={modalPagoGrupal} onOpenChange={setModalPagoGrupal}>
         <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <Users className="w-5 h-5 text-emerald-600" />
               Registrar Pagos - {claseSeleccionada?.profesor_nombre}
             </DialogTitle>
           </DialogHeader>

           <div className="space-y-4 py-4">
             {alumnosLoading ? (
               <div className="flex items-center justify-center py-8">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
               </div>
             ) : alumnos.length === 0 ? (
               <p className="text-sm text-slate-500 text-center py-4">No hay alumnos registrados</p>
             ) : (
               alumnos.map((alumno) => (
                 <div key={alumno.id} className="border rounded-lg p-4 space-y-3 bg-slate-50">
                   <div>
                     <p className="font-semibold text-slate-900">{alumno.nombre}</p>
                     <p className="text-sm text-slate-500 mt-1">Precio mensual: {formatMoney(alumno.precio_mensual)}</p>
                   </div>

                   <div className="space-y-2">
                     <Label className="text-xs">Medio de pago</Label>
                     <Select 
                       value={alumnosPagos[alumno.id]?.medio || ''}
                       onValueChange={(value) => {
                         setAlumnosPagos({
                           ...alumnosPagos,
                           [alumno.id]: { ...alumnosPagos[alumno.id], medio: value }
                         });
                       }}
                     >
                       <SelectTrigger className="h-8 text-sm">
                         <SelectValue placeholder="Seleccionar..." />
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

                   <Button
                     size="sm"
                     className="w-full bg-emerald-600 hover:bg-emerald-700"
                     disabled={!alumnosPagos[alumno.id]?.medio}
                     onClick={async () => {
                       try {
                         const mes = format(new Date(claseSeleccionada.fecha), 'yyyy-MM');
                         await base44.entities.Pago.create({
                           alumno_id: alumno.id,
                           alumno_nombre: alumno.nombre,
                           fecha: format(new Date(), 'yyyy-MM-dd'),
                           monto: alumno.precio_mensual,
                           medio_pago: alumnosPagos[alumno.id].medio,
                           mes_correspondiente: mes,
                         });
                         setAlumnosPagos({
                           ...alumnosPagos,
                           [alumno.id]: { ...alumnosPagos[alumno.id], guardado: true }
                         });
                         queryClient.invalidateQueries({ queryKey: ['alumnos-con-pagos'] });
                         queryClient.invalidateQueries({ queryKey: ['clientes-pendientes'] });
                         toast.success(`Pago de ${alumno.nombre} registrado`);
                         } catch (error) {
                         toast.error('Error: ' + error.message);
                         }
                         }}
                   >
                     {alumnosPagos[alumno.id]?.guardado ? '✓ Pagado' : 'Registrar pago'}
                   </Button>
                 </div>
               ))
             )}
           </div>

           <DialogFooter>
             <Button variant="outline" onClick={() => {
               setModalPagoGrupal(false);
               setAlumnosPagos({});
               queryClient.invalidateQueries({ queryKey: ['clases-hoy'] });
             }}>
               Cerrar
             </Button>
           </DialogFooter>
         </DialogContent>
        </Dialog>
        </div>
        );
        }