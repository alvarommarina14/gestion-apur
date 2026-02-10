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
import SeleccionTipoClienteModal from '@/components/clientes/SeleccionTipoClienteModal';
import { cn } from '@/lib/utils';

export default function ClientesPage() {
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [modalDetalle, setModalDetalle] = useState({ open: false, cliente: null });
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalSeleccion, setModalSeleccion] = useState(false);
  const [tipoClienteSeleccionado, setTipoClienteSeleccionado] = useState(null);

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('-total_gastado'),
  });

  // Filtrar clientes
  const clientesFiltrados = useMemo(() => {
    let filtrados = clientes;

    if (filtroTipo === 'clase') {
      filtrados = filtrados.filter(c => c.es_alumno);
    } else if (filtroTipo === 'alquiler') {
      filtrados = filtrados.filter(c => !c.es_alumno);
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
  }, [clientes, filtroTipo, busqueda]);

  const clasificacionConfig = {
    nuevo: { icon: UserPlus, color: 'bg-blue-100 text-blue-700', label: 'Nuevo' },
    ocasional: { icon: UserPlus, color: 'bg-blue-100 text-blue-700', label: 'Ocasional' },
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
            onClick={() => setModalSeleccion(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo cliente
          </Button>
        </header>

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
          <Tabs value={filtroTipo} onValueChange={setFiltroTipo}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="clase">Clientes Clase</TabsTrigger>
              <TabsTrigger value="alquiler">Alquiler Cancha</TabsTrigger>
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
                {busqueda || filtroTipo !== 'todos' 
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
                const config = clasificacionConfig[cliente.clasificacion] || clasificacionConfig.nuevo;
                const Icon = config?.icon || UserPlus;

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
                        <Badge className={cn(
                          'text-xs',
                          cliente.es_alumno 
                            ? 'bg-purple-100 text-purple-700' 
                            : cliente.tipo_cliente === 'abono'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-blue-700'
                        )}>
                          {cliente.es_alumno 
                            ? 'Clase' 
                            : cliente.tipo_cliente === 'abono'
                            ? 'Abono Cancha'
                            : 'Cancha Suelta'}
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
                      {cliente.precio > 0 && (
                        <div className="flex items-center gap-2 text-blue-600 font-semibold">
                          <DollarSign className="w-4 h-4" />
                          <span>
                            ${(cliente.precio || 0).toLocaleString('es-AR')}
                            {cliente.tipo_cliente === 'abono' && '/mes'}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                        <TrendingUp className="w-4 h-4" />
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
       />

      <NuevoClienteModal
        open={modalNuevo}
        onOpenChange={setModalNuevo}
      />
    </div>
  );
}