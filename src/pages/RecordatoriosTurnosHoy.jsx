import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Clock, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import ModalPagoRecordatorio from '@/components/recordatorios/ModalPagoRecordatorio';

export default function RecordatoriosTurnosHoy() {
   const [user, setUser] = useState(null);
   const [modalPagoOpen, setModalPagoOpen] = useState(false);
   const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
   const [filtroTipo, setFiltroTipo] = useState('todos');

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
       const turnos = await base44.entities.TurnoCancha.list();

       const resultado = [];

       // Alumnos pendientes/morosos
       const hoy = new Date();
       const diaDelMes = hoy.getDate();

       for (const alumno of alumnos) {
         const pagado = pagosDelMes.some(p => p.alumno_id === alumno.id);
         if (pagado) {
           // Si ya pagó este mes, no mostrar
           continue;
         }

         // Determinar estado según fecha
         let estado = 'pendiente';
         if (diaDelMes > 15) {
           estado = 'moroso';
         }

         resultado.push({
           type: 'alumno',
           id: alumno.id,
           nombre: alumno.nombre,
           profesor_nombre: alumno.profesor_nombre,
           estado,
           monto: alumno.precio_mensual
         });
       }

       // Alquileres sin pagar (TurnoCancha con tipo_turno='alquiler' y pagado=false)
       const alquileresNoPagados = turnos.filter(t => t.tipo_turno === 'alquiler' && !t.pagado);
       for (const alquiler of alquileresNoPagados) {
         if (!resultado.some(r => r.id === alquiler.id && r.type === 'turno')) {
           // Determinar estado según fecha
           let estado = 'pendiente';
           if (diaDelMes > 15) {
             estado = 'moroso';
           }

           resultado.push({
             type: 'turno',
             id: alquiler.id,
             nombre: alquiler.cliente,
             estado,
             monto: alquiler.monto
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

  const clientesFiltrados = clientesPendientes.filter(cliente => {
    if (filtroTipo === 'todos') return true;
    if (filtroTipo === 'clases') return cliente.type === 'alumno';
    if (filtroTipo === 'alquileres') return cliente.type === 'turno' || cliente.type === 'cliente';
    return true;
  });

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Sección de Recordatorios de Pagos Pendientes/Morosos */}
      {clientesPendientes.length > 0 && (
      <div className="pt-6">
          <div className="mb-4 space-y-3">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
                Recordatorios de Pagos
              </h2>
              <p className="text-sm text-slate-500 mt-1">Alumnos y clientes con pagos pendientes o morosos</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filtroTipo === 'todos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroTipo('todos')}
                className={filtroTipo === 'todos' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              >
                Todos
              </Button>
              <Button
                variant={filtroTipo === 'clases' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroTipo('clases')}
                className={filtroTipo === 'clases' ? 'bg-blue-600 hover:bg-blue-700' : ''}
              >
                Clases
              </Button>
              <Button
                variant={filtroTipo === 'alquileres' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroTipo('alquileres')}
                className={filtroTipo === 'alquileres' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              >
                Alquileres
              </Button>
            </div>
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
                             setClienteSeleccionado(cliente);
                             setModalPagoOpen(true);
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
          </div>
  );
}