import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Users, 
  Plus, 
  Search, 
  Star, 
  UserCheck, 
  UserPlus, 
  Phone, 
  Mail, 
  Calendar,
  DollarSign,
  FileText,
  Edit,
  TrendingUp,
  Trash2,
  Eye,
  RefreshCw,
  MoreVertical,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';
import DetalleClienteModal from '@/components/clientes/DetalleClienteModal';
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal';
import SeleccionTipoClienteModal from '@/components/clientes/SeleccionTipoClienteModal';
import ListaEsperaPanel from '@/components/alumnos/ListaEsperaPanel';
import EnviarRecordatorioBtn from '@/components/recordatorios/EnviarRecordatorioBtn';
import ReporteAlumnoModal from '@/components/alumnos/ReporteAlumnoModal';
import RegistrarPagoModal from '@/components/modals/RegistrarPagoModal';
import { cn } from '@/lib/utils';

export default function ClientesPage() {
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [seccionActual, setSeccionActual] = useState('todos');
  const [subTab, setSubTab] = useState('clientes');
  const [modalDetalle, setModalDetalle] = useState({ open: false, cliente: null });
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalSeleccion, setModalSeleccion] = useState(false);
  const [tipoClienteSeleccionado, setTipoClienteSeleccionado] = useState(null);
  const [eliminandoCliente, setEliminandoCliente] = useState(null);
  const [reporteModal, setReporteModal] = useState({ open: false, alumno: null });
  const [pagoModal, setPagoModal] = useState({ open: false, alumno: null });
  const [filtroEstadoPago, setFiltroEstadoPago] = useState('todos');
  const [ordenamiento, setOrdenamiento] = useState('reciente');

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('-total_gastado'),
  });

  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
  });

  const { data: cobros = [] } = useQuery({
    queryKey: ['cobros-clientes'],
    queryFn: () => base44.entities.CobroCliente.list(),
  });

  const { data: pagos = [] } = useQuery({
    queryKey: ['pagos'],
    queryFn: () => base44.entities.Pago.list(),
  });

  // Eliminar cliente
  const eliminarClienteMutation = useMutation({
    mutationFn: async (clienteId) => {
      const cliente = clientes.find(c => c.id === clienteId);
      
      // Eliminar cobros del cliente
      const cobros = await base44.entities.CobroCliente.filter({ cliente_id: clienteId });
      for (const cobro of cobros) {
        await base44.entities.CobroCliente.delete(cobro.id);
      }
      
      // Eliminar turnos del cliente
      if (cliente?.nombre) {
        const turnos = await base44.entities.TurnoCancha.filter({ cliente: cliente.nombre });
        for (const turno of turnos) {
          await base44.entities.TurnoCancha.delete(turno.id);
        }
      }
      
      // Eliminar alumno sincronizado si existe
      if (cliente?.es_alumno && cliente?.profesor_id) {
        const alumnosFiltrados = await base44.entities.Alumno.filter({ 
          nombre: cliente.nombre,
          whatsapp: cliente.telefono
        });
        for (const alumno of alumnosFiltrados) {
          await base44.entities.Alumno.delete(alumno.id);
        }
      }
      
      // Finalmente eliminar el cliente
      return await base44.entities.Cliente.delete(clienteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['alumnos'] });
      queryClient.invalidateQueries({ queryKey: ['cobros-clientes'] });
      setEliminandoCliente(null);
    },
    onError: (error) => {
      console.error('Error eliminando cliente:', error);
      alert('Error al eliminar cliente: ' + error.message);
    }
  });

  // Filtrar clientes por sección
  const clientesFiltrados = useMemo(() => {
    let filtrados = [...clientes];

    // Filtrar por sección principal
    if (seccionActual === 'clase') {
      filtrados = filtrados.filter(c => c.tipo_cliente === 'clase');
    } else if (seccionActual === 'alquiler') {
      filtrados = filtrados.filter(c => c.tipo_cliente === 'abono' || c.tipo_cliente === 'suelto');
    }

    // Filtrar por estado de pago
    if (filtroEstadoPago !== 'todos') {
      filtrados = filtrados.filter(cliente => {
        // Para clientes clase con alumno asociado
        if (cliente.es_alumno) {
          const alumno = alumnos.find(a => 
            a.nombre.toLowerCase() === cliente.nombre.toLowerCase()
          );
          if (alumno) {
            if (filtroEstadoPago === 'al_dia') {
              return alumno.estado_mes_actual === 'pagado' || alumno.estado === 'activo';
            } else if (filtroEstadoPago === 'moroso') {
              return alumno.estado === 'moroso' || alumno.estado_mes_actual === 'moroso';
            } else if (filtroEstadoPago === 'debe') {
              return alumno.estado_mes_actual === 'debe' || alumno.estado_mes_actual === 'pendiente';
            }
          }
        }
        
        // Para clientes de alquiler (abono)
        if (cliente.tipo_cliente === 'abono') {
          const cobrosPendientes = cobros.filter(c => 
            c.cliente_id === cliente.id && c.estado !== 'pagado'
          );
          if (filtroEstadoPago === 'al_dia') {
            return cobrosPendientes.length === 0;
          } else if (filtroEstadoPago === 'moroso') {
            return cobros.some(c => c.cliente_id === cliente.id && c.estado === 'moroso');
          } else if (filtroEstadoPago === 'debe') {
            return cobros.some(c => c.cliente_id === cliente.id && c.estado === 'pendiente');
          }
        }
        
        return false;
      });
    }

    // Filtrar por búsqueda
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase();
      filtrados = filtrados.filter(c => 
        c.nombre.toLowerCase().includes(termino) ||
        c.telefono?.includes(termino) ||
        c.email?.toLowerCase().includes(termino)
      );
    }

    // Ordenar según la opción seleccionada
    switch (ordenamiento) {
      case 'reciente':
        filtrados.sort((a, b) => {
          const fechaA = new Date(a.created_date || 0);
          const fechaB = new Date(b.created_date || 0);
          return fechaB - fechaA;
        });
        break;
      case 'antiguo':
        filtrados.sort((a, b) => {
          const fechaA = new Date(a.created_date || 0);
          const fechaB = new Date(b.created_date || 0);
          return fechaA - fechaB;
        });
        break;
      case 'alfabetico':
        filtrados.sort((a, b) => a.nombre.localeCompare(b.nombre));
        break;
      default:
        break;
    }

    return filtrados;
    }, [clientes, seccionActual, busqueda, filtroEstadoPago, alumnos, cobros, pagos, ordenamiento]);

  const clasificacionConfig = {
    nuevo: { icon: UserPlus, color: 'bg-blue-100 text-blue-700', label: 'Nuevo' },
    ocasional: { icon: UserPlus, color: 'bg-blue-100 text-blue-700', label: 'Ocasional' },
    recurrente: { icon: UserCheck, color: 'bg-emerald-100 text-emerald-700', label: 'Recurrente' },
  };

  const renderClientesGrid = () => (
    <>
      {/* Buscador y Filtros */}
      <Card className="shadow-sm mb-4">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar cliente..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={ordenamiento} onValueChange={setOrdenamiento}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reciente">Más recientes</SelectItem>
                <SelectItem value="antiguo">Más antiguos</SelectItem>
                <SelectItem value="alfabetico">Alfabético</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtros de estado de pago */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filtroEstadoPago === 'todos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstadoPago('todos')}
              className={filtroEstadoPago === 'todos' ? 'bg-slate-900' : ''}
            >
              Todos
            </Button>
            <Button
              variant={filtroEstadoPago === 'al_dia' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstadoPago('al_dia')}
              className={filtroEstadoPago === 'al_dia' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              Al día
            </Button>
            <Button
              variant={filtroEstadoPago === 'debe' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstadoPago('debe')}
              className={filtroEstadoPago === 'debe' ? 'bg-amber-600 hover:bg-amber-700' : ''}
            >
              Debe pagar
            </Button>
            <Button
              variant={filtroEstadoPago === 'moroso' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroEstadoPago('moroso')}
              className={filtroEstadoPago === 'moroso' ? 'bg-rose-600 hover:bg-rose-700' : ''}
            >
              Morosos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid de clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="p-4">
                <div className="h-32 bg-slate-100 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))
        ) : clientesFiltrados.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">
              {busqueda ? 'No se encontraron clientes' : 'No hay clientes en esta sección'}
            </p>
          </div>
        ) : (
          clientesFiltrados.map((cliente) => {
            const config = clasificacionConfig[cliente.clasificacion] || clasificacionConfig.nuevo;
            const Icon = config?.icon || UserPlus;

            // Función para calcular estado dinámico de cobros
            const getEstadoDinamicoCobro = (cobro) => {
              if (cobro.estado === 'pagado') return 'pagado';

              const hoy = new Date();
              const [año, mes] = cobro.mes.split('-');
              const fechaVencimiento = new Date(parseInt(año), parseInt(mes) - 1, 15);

              return hoy > fechaVencimiento ? 'moroso' : 'pendiente';
            };

            // Calcular estado de pago del cliente
             let estadoPago = null;
             if (cliente.es_alumno) {
               const alumno = alumnos.find(a => 
                 a.nombre.toLowerCase() === cliente.nombre.toLowerCase()
               );
               if (alumno) {
                 const hoy = new Date();
                 const mesActual = format(hoy, 'yyyy-MM');
                 const diaActual = hoy.getDate();
                 const fechaVencimiento = new Date(parseInt(mesActual.split('-')[0]), parseInt(mesActual.split('-')[1]) - 1, 15);

                 // Verificar si hay pagos del mes actual
                 const pagosDelMes = pagos.filter(p => {
                   const mesDelPago = p.mes_correspondiente || format(parseISO(p.fecha), 'yyyy-MM');
                   return mesDelPago === mesActual && p.alumno_id === alumno.id;
                 });

                 if (pagosDelMes.length > 0) {
                   estadoPago = 'al_dia';
                 } else if (hoy > fechaVencimiento) {
                   estadoPago = 'moroso';
                 } else if (diaActual >= 5) {
                   estadoPago = 'debe';
                 }
               }
            } else if (cliente.tipo_cliente === 'abono' || cliente.tipo_cliente === 'suelto') {
              // Generar cobro virtual para el mes actual si no existe
              const hoy = new Date();
              const mesActual = format(hoy, 'yyyy-MM');
              const diaActual = hoy.getDate();

              let cobrosCliente = cobros.filter(c => c.cliente_id === cliente.id);
              const yaExisteCobro = cobrosCliente.some(c => c.mes === mesActual);

              // Si no existe cobro para el mes actual y el cliente tiene precio, crear uno virtual
              if (!yaExisteCobro && cliente.precio > 0 && diaActual >= 5) {
                const cobroVirtual = {
                  id: 'virtual',
                  cliente_id: cliente.id,
                  mes: mesActual,
                  monto: cliente.precio,
                  estado: 'pendiente',
                };
                cobrosCliente = [...cobrosCliente, cobroVirtual];
              }

              // Calcular estados dinámicamente
              if (cobrosCliente.length > 0) {
                const cobrosMoroso = cobrosCliente.filter(c => getEstadoDinamicoCobro(c) === 'moroso');
                const cobrosPendientes = cobrosCliente.filter(c => getEstadoDinamicoCobro(c) === 'pendiente');
                const cobrosPagados = cobrosCliente.filter(c => getEstadoDinamicoCobro(c) === 'pagado');

                if (cobrosMoroso.length > 0) {
                  estadoPago = 'moroso';
                } else if (cobrosPendientes.length > 0) {
                  estadoPago = 'debe';
                } else if (cobrosPagados.length > 0 && cobrosPendientes.length === 0 && cobrosMoroso.length === 0) {
                  estadoPago = 'al_dia';
                }
              }
            }

            return (
              <Card key={cliente.id} className="shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-1">{cliente.nombre}</h3>
                      <div className="flex gap-2 flex-wrap">
                        <Badge className={cn(
                          'text-xs',
                          cliente.tipo_cliente === 'clase'
                            ? 'bg-purple-100 text-purple-700'
                            : cliente.tipo_cliente === 'abono'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-amber-100 text-amber-700'
                        )}>
                          {cliente.tipo_cliente === 'clase'
                            ? 'Clase'
                            : cliente.tipo_cliente === 'abono'
                            ? 'Abono'
                            : 'Suelto'}
                        </Badge>
                        {cliente.clasificacion === 'recurrente' && (
                          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700">
                            Recurrente
                          </Badge>
                        )}
                        {estadoPago === 'al_dia' && (
                          <Badge className="text-xs bg-emerald-100 text-emerald-700">
                            Al día
                          </Badge>
                        )}
                        {estadoPago === 'debe' && (
                          <Badge className="text-xs bg-amber-100 text-amber-700">
                            Debe pagar
                          </Badge>
                        )}
                        {estadoPago === 'moroso' && (
                          <Badge className="text-xs bg-rose-100 text-rose-700">
                            Moroso
                          </Badge>
                        )}
                        {!cliente.activo && (
                          <Badge variant="outline" className="text-xs">Inactivo</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mb-3">
                    {cliente.telefono && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-4 h-4" />
                        <span>{cliente.telefono}</span>
                      </div>
                    )}
                    {cliente.email && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{cliente.email}</span>
                      </div>
                    )}
                    {cliente.es_alumno && cliente.profesor_nombre && (
                      <div className="flex items-center gap-2 text-slate-600 text-xs">
                        <UserCheck className="w-4 h-4" />
                        <span>Alumno sincronizado - Profesor: {cliente.profesor_nombre}</span>
                      </div>
                    )}
                    {cliente.precio > 0 && (
                      <div className="flex items-center gap-2 text-blue-600 font-semibold">
                        <DollarSign className="w-4 h-4" />
                        <span>
                          ${(cliente.precio || 0).toLocaleString('es-AR')}/mes
                        </span>
                      </div>
                    )}
                    {cliente.total_turnos > 0 && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <RefreshCw className="w-4 h-4" />
                        <span>{cliente.total_turnos} turnos</span>
                      </div>
                    )}
                  </div>

                  {cliente.notas && (
                    <div className="mb-3 p-2 bg-slate-50 rounded text-xs text-slate-600 line-clamp-2">
                      <FileText className="w-3 h-3 inline mr-1" />
                      {cliente.notas}
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex gap-2 pt-3 border-t border-slate-100">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setModalDetalle({ open: true, cliente })}
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                    
                    {/* Menú de opciones */}
                    {(() => {
                      // Para clientes clase con alumno
                      if (cliente.es_alumno) {
                        const alumno = alumnos.find(a => 
                          a.nombre.toLowerCase() === cliente.nombre.toLowerCase()
                        );
                        if (alumno) {
                          return (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setReporteModal({ open: true, alumno })}>
                                  <FileText className="w-4 h-4 mr-2" />
                                  Reporte detallado
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <EnviarRecordatorioBtn 
                                    alumno={alumno} 
                                    variant="ghost" 
                                    size="sm" 
                                    className="w-full justify-start p-0 h-auto font-normal hover:bg-transparent" 
                                  />
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => setEliminandoCliente(cliente)}
                                  className="text-rose-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          );
                        }
                      }
                      
                      // Para clientes de alquiler
                      if (cliente.tipo_cliente === 'abono' || cliente.tipo_cliente === 'suelto') {
                        const clienteComoAlumno = {
                          id: cliente.id,
                          nombre: cliente.nombre,
                          whatsapp: cliente.telefono,
                          precio_mensual: cliente.precio,
                          estado_mes_actual: estadoPago === 'moroso' ? 'moroso' : estadoPago === 'debe' ? 'pendiente' : 'pagado',
                          estado: estadoPago === 'moroso' ? 'moroso' : 'activo'
                        };
                        
                        return (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <EnviarRecordatorioBtn 
                                  alumno={clienteComoAlumno} 
                                  variant="ghost" 
                                  size="sm" 
                                  className="w-full justify-start p-0 h-auto font-normal hover:bg-transparent" 
                                />
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setEliminandoCliente(cliente)}
                                className="text-rose-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        );
                      }
                      
                      // Para otros casos, solo botón de eliminar
                      return (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEliminandoCliente(cliente)}
                          className="text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestión de Clientes</h1>
            <p className="text-slate-500 text-sm">{clientes.length} clientes registrados</p>
          </div>
          <Button 
            onClick={() => setModalSeleccion(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo cliente
          </Button>
        </header>

        {/* Tabs principales */}
        <Tabs value={seccionActual} onValueChange={(v) => {
          setSeccionActual(v);
          setSubTab('clientes');
        }}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="clase">Clientes Clase</TabsTrigger>
            <TabsTrigger value="alquiler">Alquiler Cancha</TabsTrigger>
          </TabsList>

          {/* Sección: Todos */}
          <TabsContent value="todos" className="space-y-4">
            {renderClientesGrid()}
          </TabsContent>

          {/* Sección: Clientes Clase */}
          <TabsContent value="clase" className="space-y-4">
            <Tabs value={subTab} onValueChange={setSubTab}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="clientes">Clientes</TabsTrigger>
                <TabsTrigger value="lista-espera">Lista de Espera</TabsTrigger>
              </TabsList>

              <TabsContent value="clientes">
                {renderClientesGrid()}
              </TabsContent>

              <TabsContent value="lista-espera">
                <ListaEsperaPanel />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Sección: Alquiler Cancha */}
          <TabsContent value="alquiler" className="space-y-4">
            <Tabs value={subTab} onValueChange={setSubTab}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="clientes">Clientes</TabsTrigger>
                <TabsTrigger value="lista-espera">Lista de Espera</TabsTrigger>
              </TabsList>

              <TabsContent value="clientes">
                {renderClientesGrid()}
              </TabsContent>

              <TabsContent value="lista-espera">
                <ListaEsperaPanel />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>

      <SeleccionTipoClienteModal
        open={modalSeleccion}
        onOpenChange={setModalSeleccion}
        onSelect={(tipo) => {
          setTipoClienteSeleccionado(tipo);
          setModalNuevo(true);
        }}
      />

      <DetalleClienteModal
         open={modalDetalle.open}
         onOpenChange={(open) => !open && setModalDetalle({ open: false, cliente: null })}
         cliente={modalDetalle.cliente}
       />

      <NuevoClienteModal
        open={modalNuevo}
        onOpenChange={(open) => {
          setModalNuevo(open);
          if (!open) setTipoClienteSeleccionado(null);
        }}
        tipoCliente={tipoClienteSeleccionado}
      />

      <ReporteAlumnoModal 
        open={reporteModal.open}
        onOpenChange={(open) => setReporteModal({ ...reporteModal, open })}
        alumno={reporteModal.alumno}
      />

      <RegistrarPagoModal 
         open={pagoModal.open}
         onOpenChange={(open) => setPagoModal({ ...pagoModal, open })}
         alumno={pagoModal.alumno}
         esCliente={pagoModal.esCliente}
       />

      {/* Modal Eliminar Cliente */}
      <AlertDialog open={!!eliminandoCliente} onOpenChange={(open) => {
        if (!open) setEliminandoCliente(null);
      }}>
        <AlertDialogContent>
          <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que deseas eliminar a {eliminandoCliente?.nombre}? Esta acción eliminará también todos sus turnos, cobros y datos relacionados.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => eliminarClienteMutation.mutate(eliminandoCliente.id)}
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