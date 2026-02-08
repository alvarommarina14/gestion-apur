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
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DetalleClienteModal from '@/components/clientes/DetalleClienteModal';
import NuevoClienteModal from '@/components/clientes/NuevoClienteModal';
import { cn } from '@/lib/utils';

export default function ClientesPage() {
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [filtroClasificacion, setFiltroClasificacion] = useState('todos');
  const [modalDetalle, setModalDetalle] = useState({ open: false, cliente: null });
  const [modalNuevo, setModalNuevo] = useState(false);

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('-total_gastado'),
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos-cancha-clientes'],
    queryFn: () => base44.entities.TurnoCancha.list(),
  });

  // Filtrar clientes
  const clientesFiltrados = useMemo(() => {
    let filtrados = clientes;

    if (filtroClasificacion !== 'todos') {
      filtrados = filtrados.filter(c => c.clasificacion === filtroClasificacion);
    }

    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase();
      filtrados = filtrados.filter(c => 
        c.nombre.toLowerCase().includes(termino) ||
        c.telefono?.includes(termino) ||
        c.email?.toLowerCase().includes(termino)
      );
    }

    return filtrados;
  }, [clientes, filtroClasificacion, busqueda]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = clientes.length;
    const recurrentes = clientes.filter(c => c.clasificacion === 'recurrente').length;
    const clases = clientes.filter(c => c.tipo_cliente === 'clase').length;
    const totalIngresos = clientes.reduce((sum, c) => sum + (c.total_gastado || 0), 0);
    const promedioGasto = total > 0 ? (totalIngresos / total).toFixed(0) : 0;

    return { total, recurrentes, clases, totalIngresos, promedioGasto };
  }, [clientes]);

  const clasificacionConfig = {
    nuevo: { icon: UserPlus, color: 'bg-blue-100 text-blue-700', label: 'Nuevo' },
    recurrente: { icon: UserCheck, color: 'bg-emerald-100 text-emerald-700', label: 'Recurrente' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestión de Clientes</h1>
            <p className="text-slate-500 text-sm">Historial, clasificación y seguimiento</p>
          </div>
          <Button 
            onClick={() => setModalNuevo(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo cliente
          </Button>
        </header>

        {/* Stats */}
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           <Card className="shadow-sm">
             <CardContent className="pt-6">
               <div className="text-center">
                 <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                 <p className="text-sm text-slate-500 mt-1">Total Clientes</p>
               </div>
             </CardContent>
           </Card>
           <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
             <CardContent className="pt-6">
               <div className="text-center">
                 <p className="text-2xl font-bold text-emerald-600">{stats.recurrentes}</p>
                 <p className="text-sm text-slate-500 mt-1">Abonos Cancha</p>
               </div>
             </CardContent>
           </Card>
           <Card className="shadow-sm border-purple-200 bg-purple-50/30">
             <CardContent className="pt-6">
               <div className="text-center">
                 <p className="text-2xl font-bold text-purple-600">{stats.clases}</p>
                 <p className="text-sm text-slate-500 mt-1">Clases</p>
               </div>
             </CardContent>
           </Card>
           <Card className="shadow-sm border-amber-200 bg-amber-50/30">
             <CardContent className="pt-6">
               <div className="text-center">
                 <p className="text-2xl font-bold text-amber-600">{stats.abonos}</p>
                 <p className="text-sm text-slate-500 mt-1">Abonos</p>
               </div>
             </CardContent>
           </Card>
         </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, teléfono o email..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Tabs value={filtroClasificacion} onValueChange={setFiltroClasificacion}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="nuevo">Nuevos</TabsTrigger>
              <TabsTrigger value="recurrente">Recurrentes</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Lista de clientes */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="shadow-sm animate-pulse">
                <CardContent className="p-6 h-40" />
              </Card>
            ))}
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium mb-2">No hay clientes</p>
              <p className="text-sm mb-4">
                {busqueda || filtroClasificacion !== 'todos' 
                  ? 'No se encontraron resultados con los filtros aplicados'
                  : 'Comienza agregando tu primer cliente'}
              </p>
              <Button variant="outline" onClick={() => setModalNuevo(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar cliente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientesFiltrados.map((cliente) => {
              const config = clasificacionConfig[cliente.clasificacion];
              const Icon = config.icon;
              const turnosCliente = turnos.filter(t => t.cliente === cliente.nombre);

              return (
                <Card 
                  key={cliente.id} 
                  className="shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setModalDetalle({ open: true, cliente })}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 mb-1">{cliente.nombre}</h3>
                        <Badge className={cn('text-xs', config.color)}>
                          <Icon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
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
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <span>{cliente.total_turnos || turnosCliente.length} turnos</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                        <DollarSign className="w-4 h-4" />
                        <span>${(cliente.total_gastado || 0).toLocaleString('es-AR')}</span>
                      </div>
                    </div>

                    {cliente.notas && (
                      <div className="mt-3 p-2 bg-slate-50 rounded text-xs text-slate-600 line-clamp-2">
                        <FileText className="w-3 h-3 inline mr-1" />
                        {cliente.notas}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <DetalleClienteModal
        open={modalDetalle.open}
        onOpenChange={(open) => setModalDetalle({ ...modalDetalle, open })}
        cliente={modalDetalle.cliente}
        turnos={turnos}
      />

      <NuevoClienteModal
        open={modalNuevo}
        onOpenChange={setModalNuevo}
      />
    </div>
  );
}