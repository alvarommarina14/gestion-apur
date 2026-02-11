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



   const [alumnosPagos, setAlumnosPagos] = useState({});

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

   // Combinar y ordenar turnos y clases con filtro
  const getAllItems = () => {
    let items = [];

    if (filtro === 'todos' || filtro === 'alquileres') {
      items.push(...todayTurnos
        .filter(t => t.tipo_turno === 'alquiler')
        .map(t => ({
          ...t,
          type: 'turno',
          hora: t.hora_inicio,
          titulo: t.cliente,
          icon: '🎾',
        })));
    }

    if (filtro === 'todos' || filtro === 'clases') {
      items.push(...todayClases.map(c => ({
        ...c,
        type: 'clase',
        hora: c.hora_inicio,
        titulo: `Clase ${c.profesor_nombre || 'Profesor'}`,
        icon: '👥',
      })));
    }

    return items.sort((a, b) => a.hora.localeCompare(b.hora));
  };

  const allItems = getAllItems();

  // Filtrar clientes pendientes según el filtro
  const clientesFiltrados = clientesPendientes.filter(cliente => {
    if (filtro === 'todos') return true;
    if (filtro === 'clases') return cliente.type === 'alumno';
    if (filtro === 'alquileres') return cliente.type === 'cliente';
    return true;
  });

  const handleMarcarRealizado = async (item) => {
    try {
      if (item.type === 'turno') {
        await base44.entities.TurnoCancha.update(item.id, {
          estado: 'activo'
        });
      } else if (item.type === 'clase') {
        await base44.entities.Clase.update(item.id, {
          estado: 'realizada'
        });
      }
      queryClient.invalidateQueries({ queryKey: ['turnos-hoy'] });
      queryClient.invalidateQueries({ queryKey: ['clases-hoy'] });
      toast.success('Marcado como realizado');
    } catch (error) {
      toast.error('Error: ' + error.message);
    }
  };

  const handleEliminar = async (item) => {
     if (!confirm('¿Eliminar este turno?')) return;
     try {
       if (item.type === 'turno') {
         await base44.entities.TurnoCancha.delete(item.id);
       } else if (item.type === 'clase') {
         await base44.entities.Clase.delete(item.id);
       }
       queryClient.invalidateQueries({ queryKey: ['turnos-hoy'] });
       queryClient.invalidateQueries({ queryKey: ['clases-hoy'] });
       toast.success('Eliminado correctamente');
     } catch (error) {
       toast.error('Error: ' + error.message);
     }
   };

   const registrarPagoGrupalMutation = useMutation({
     mutationFn: async ({ clase, pagosAlumnos, medio }) => {
       const mes = format(new Date(clase.fecha), 'yyyy-MM');

       // Procesar pago de cada alumno
       for (const alumnoId in pagosAlumnos) {
         const estado = pagosAlumnos[alumnoId];
         const alumno = alumnos.find(a => a.id === alumnoId);
         if (!alumno) continue;

         if (estado === 'pagado') {
           // Crear registro de pago
           await base44.entities.Pago.create({
             alumno_id: alumnoId,
             alumno_nombre: alumno.nombre,
             fecha: format(new Date(), 'yyyy-MM-dd'),
             monto: alumno.precio_mensual,
             medio_pago: medio,
             mes_correspondiente: mes,
           });
         }
       }
     },
     onSuccess: () => {
       setModalPagoGrupal(false);
       setClaseSeleccionada(null);
       setPagosAlumnos({});
       setMedioPago('');
       queryClient.invalidateQueries({ queryKey: ['clases-hoy'] });
       queryClient.invalidateQueries({ queryKey: ['alumnos'] });
       queryClient.invalidateQueries({ queryKey: ['pagos'] });
       queryClient.invalidateQueries({ queryKey: ['pagos-alumnos'] });
       queryClient.invalidateQueries({ queryKey: ['cobros-clientes'] });
       queryClient.invalidateQueries({ queryKey: ['clientes'] });
       toast.success('Pagos registrados correctamente');
     }
   });

   const formatMoney = (amount) => {
     return new Intl.NumberFormat('es-AR', {
       style: 'currency',
       currency: 'ARS',
       minimumFractionDigits: 0,
     }).format(amount || 0);
   };

  const getTypeLabel = (item) => {
    if (item.type === 'clase') return 'Clase';
    if (item.modalidad_alquiler === 'abono') return 'Alquiler - Abono';
    return 'Alquiler - Suelto';
  };

  const getTypeColor = (item) => {
     if (item.type === 'clase') return 'bg-blue-50 border-blue-200 text-blue-700';
     if (item.modalidad_alquiler === 'abono') return 'bg-purple-50 border-purple-200 text-purple-700';
     return 'bg-emerald-50 border-emerald-200 text-emerald-700';
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

  const isLoading = turnosLoading || clasesLoading;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Recordatorios de Turnos</h1>
        <div className="flex items-center gap-4 mt-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setFechaSeleccionada(subDays(fechaSeleccionada, 1))}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <p className="text-slate-600 min-w-64 text-center font-medium">
            {format(fechaSeleccionada, 'EEEE, d MMMM yyyy', { locale: es })}
          </p>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setFechaSeleccionada(addDays(fechaSeleccionada, 1))}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <Button
          variant={filtro === 'todos' ? 'default' : 'outline'}
          onClick={() => setFiltro('todos')}
          className={filtro === 'todos' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
        >
          Todos ({allItems.length})
        </Button>
        <Button
          variant={filtro === 'clases' ? 'default' : 'outline'}
          onClick={() => setFiltro('clases')}
          className={filtro === 'clases' ? 'bg-blue-600 hover:bg-blue-700' : ''}
        >
          Clases ({todayClases.length})
        </Button>
        <Button
          variant={filtro === 'alquileres' ? 'default' : 'outline'}
          onClick={() => setFiltro('alquileres')}
          className={filtro === 'alquileres' ? 'bg-purple-600 hover:bg-purple-700' : ''}
        >
          Alquileres ({todayTurnos.filter(t => t.tipo_turno === 'alquiler').length})
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">{allItems.length}</div>
              <p className="text-sm text-slate-500">Turnos totales</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {todayClases.filter(c => c.estado === 'programada').length}
              </div>
              <p className="text-sm text-slate-500">Clases</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {todayTurnos.filter(t => t.tipo_turno === 'alquiler').length}
              </div>
              <p className="text-sm text-slate-500">Alquileres</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de turnos */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      ) : allItems.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No hay turnos registrados para hoy</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="space-y-3">
          {allItems.map((item) => (
            <Card key={`${item.type}-${item.id}`} className="overflow-hidden">
              <div className="flex items-start justify-between p-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{item.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900 text-lg">
                          {item.titulo}
                        </h3>
                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium border',
                          getTypeColor(item)
                        )}>
                          {getTypeLabel(item)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{item.hora_inicio || item.hora}</span>
                        </div>
                        {item.cancha && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Cancha {item.cancha}</span>
                          </div>
                        )}
                      </div>

                      {/* Alumnos/clientes con estado de pago */}
                       <div className="mt-3 space-y-2">
                         {alumnosConPagos
                           .filter(a => 
                             (item.type === 'clase' && a.clase_id === item.id) ||
                             (item.type === 'turno' && a.turno_id === item.id)
                           )
                           .map((alumno) => (
                             <div key={alumno.alumno_id || alumno.turno_id} className="flex items-center justify-between bg-slate-50 rounded px-3 py-2">
                               <span className="text-sm font-medium text-slate-700">{alumno.nombre}</span>
                               <div className="flex items-center gap-2">
                                 <span className="text-xs text-slate-500">{formatMoney(alumno.monto)}</span>
                                 <span className={cn(
                                   'text-xs font-semibold px-2 py-1 rounded border',
                                   getEstadoPagoColor(alumno.estado_pago)
                                 )}>
                                   {getEstadoPagoLabel(alumno.estado_pago)}
                                 </span>
                               </div>
                             </div>
                           ))}
                       </div>

                       {item.notas && (
                         <p className="text-sm text-slate-600 mt-2 italic">
                           "{item.notas}"
                         </p>
                       )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                   <Button
                     onClick={() => handleMarcarRealizado(item)}
                     variant="outline"
                     size="sm"
                     className="gap-2 whitespace-nowrap"
                   >
                     <CheckCircle className="w-4 h-4" />
                     Realizado
                   </Button>
                   <Button
                     onClick={() => handleEliminar(item)}
                     variant="outline"
                     size="sm"
                     className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                   >
                     <Trash2 className="w-4 h-4" />
                     Eliminar
                   </Button>
                 </div>
              </div>
            </Card>
          ))}
          </div>

          {/* Sección de Recordatorios de Pagos Pendientes/Morosos */}
          {clientesFiltrados.length > 0 && (
          <div className="pt-6 border-t-2 border-slate-200">
          <div className="mb-4">
            <h2 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
              Recordatorios de Pagos
            </h2>
            <p className="text-sm text-slate-500 mt-1">Alumnos y clientes con pagos pendientes o morosos</p>
          </div>

          {clientesFiltrados.length === 0 ? (
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
              {clientesFiltrados.map((cliente) => (
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
          </>
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