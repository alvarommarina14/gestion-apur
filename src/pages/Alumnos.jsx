import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus,
  Search,
  Filter,
  Phone,
  User,
  DollarSign,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import StatusBadge from '@/components/ui/StatusBadge';
import NuevoAlumnoModal from '@/components/modals/NuevoAlumnoModal';
import RegistrarPagoModal from '@/components/modals/RegistrarPagoModal';
import DetalleAlumnoModal from '@/components/modals/DetalleAlumnoModal';
import EnviarRecordatorioBtn from '@/components/recordatorios/EnviarRecordatorioBtn';
import ReporteAlumnoModal from '@/components/alumnos/ReporteAlumnoModal';
import ListaEsperaPanel from '@/components/alumnos/ListaEsperaPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export default function Alumnos() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [nuevoModal, setNuevoModal] = useState({ open: false, alumno: null });
  const [pagoModal, setPagoModal] = useState({ open: false, alumno: null });
  const [detalleModal, setDetalleModal] = useState({ open: false, alumno: null });
  const [reporteModal, setReporteModal] = useState({ open: false, alumno: null });
  
  const { data: alumnos = [], isLoading } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
  });
  
  const filteredAlumnos = useMemo(() => {
    return alumnos.filter(alumno => {
      const matchSearch = alumno.nombre?.toLowerCase().includes(search.toLowerCase());
      const matchEstado = filterEstado === 'todos' || alumno.estado === filterEstado;
      return matchSearch && matchEstado;
    });
  }, [alumnos, search, filterEstado]);
  
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };
  
  const handleDelete = async (alumno) => {
    if (!confirm(`¿Estás seguro de eliminar a ${alumno.nombre}?`)) return;
    
    await base44.entities.Alumno.delete(alumno.id);
    queryClient.invalidateQueries({ queryKey: ['alumnos'] });
  };

  // Stats
  const stats = useMemo(() => ({
    total: alumnos.length,
    activos: alumnos.filter(a => a.estado === 'activo').length,
    morosos: alumnos.filter(a => a.estado === 'moroso').length,
    pausados: alumnos.filter(a => a.estado === 'pausado').length,
  }), [alumnos]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Alumnos</h1>
            <p className="text-slate-500 text-sm">
              {stats.activos} activos · {stats.morosos} morosos · {stats.pausados} pausados
            </p>
          </div>
          <Button 
            onClick={() => setNuevoModal({ open: true, alumno: null })}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo alumno
          </Button>
        </header>

        {/* Tabs */}
        <Tabs defaultValue="alumnos" className="w-full">
          <TabsList>
            <TabsTrigger value="alumnos">Alumnos</TabsTrigger>
            <TabsTrigger value="lista-espera">Lista de Espera</TabsTrigger>
          </TabsList>

          <TabsContent value="alumnos" className="space-y-4">
        
        {/* Filters */}
        <Card className="shadow-sm">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="activo">Activos</SelectItem>
                  <SelectItem value="moroso">Morosos</SelectItem>
                  <SelectItem value="pausado">Pausados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Table */}
        <Card className="shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Alumno</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Precio mensual</TableHead>
                  <TableHead className="text-center">Clases/mes</TableHead>
                  <TableHead className="text-center">A recuperar</TableHead>
                  <TableHead className="text-right">Deuda</TableHead>
                  <TableHead>Último pago</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8} className="h-16">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredAlumnos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                      <User className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p>No se encontraron alumnos</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAlumnos.map((alumno) => (
                    <TableRow 
                      key={alumno.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setDetalleModal({ open: true, alumno })}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold',
                            alumno.estado === 'activo' && 'bg-emerald-100 text-emerald-700',
                            alumno.estado === 'moroso' && 'bg-rose-100 text-rose-700',
                            alumno.estado === 'pausado' && 'bg-slate-100 text-slate-600'
                          )}>
                            {alumno.nombre?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{alumno.nombre}</p>
                            <p className="text-xs text-slate-500">{alumno.whatsapp}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={alumno.estado} size="sm" />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(alumno.precio_mensual)}
                      </TableCell>
                      <TableCell className="text-center">
                        {alumno.clases_por_mes || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {alumno.clases_a_recuperar > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                            <RefreshCw className="w-3.5 h-3.5" />
                            {alumno.clases_a_recuperar}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {alumno.deuda_total > 0 ? (
                          <span className="text-rose-600 font-medium">
                            {formatMoney(alumno.deuda_total)}
                          </span>
                        ) : (
                          <span className="text-emerald-600">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {alumno.ultimo_pago_fecha ? (
                          <span className="text-sm text-slate-600">
                            {format(new Date(alumno.ultimo_pago_fecha), "d MMM", { locale: es })}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setDetalleModal({ open: true, alumno });
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setReporteModal({ open: true, alumno });
                            }}>
                              <FileText className="w-4 h-4 mr-2" />
                              Reporte detallado
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setPagoModal({ open: true, alumno });
                            }}>
                              <DollarSign className="w-4 h-4 mr-2" />
                              Registrar pago
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                              <div onClick={(e) => e.stopPropagation()}>
                                <EnviarRecordatorioBtn alumno={alumno} variant="ghost" size="sm" className="w-full justify-start p-0 h-auto font-normal" />
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setNuevoModal({ open: true, alumno });
                            }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(alumno);
                              }}
                              className="text-rose-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
          </TabsContent>

          <TabsContent value="lista-espera">
            <ListaEsperaPanel />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Modals */}
      <NuevoAlumnoModal 
        open={nuevoModal.open}
        onOpenChange={(open) => setNuevoModal({ ...nuevoModal, open })}
        alumno={nuevoModal.alumno}
      />
      
      <RegistrarPagoModal 
        open={pagoModal.open}
        onOpenChange={(open) => setPagoModal({ ...pagoModal, open })}
        alumno={pagoModal.alumno}
      />
      
      <DetalleAlumnoModal 
        open={detalleModal.open}
        onOpenChange={(open) => setDetalleModal({ ...detalleModal, open })}
        alumno={detalleModal.alumno}
      />
      
      <ReporteAlumnoModal 
        open={reporteModal.open}
        onOpenChange={(open) => setReporteModal({ ...reporteModal, open })}
        alumno={reporteModal.alumno}
      />
    </div>
    </div>
  );
}