import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  DollarSign, 
  FileText, 
  Edit, 
  Save,
  X,
  Star,
  UserCheck,
  UserPlus,
  CheckCircle,
  Clock,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import SeccionCobros from './SeccionCobros';
import { registrarCambioCliente, registrarEliminacion } from '@/components/utils/auditLog';

export default function DetalleClienteModal({ open, onOpenChange, cliente, turnos = [] }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [formData, setFormData] = useState({});

  // Fetch pagos y cobros del cliente
  const { data: cobrosClientes = [] } = useQuery({
    queryKey: ['cobros-clientes', cliente?.id],
    queryFn: () => base44.entities.CobroCliente.filter({ cliente_id: cliente.id }),
    enabled: !!cliente?.id,
  });

  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
    enabled: open,
  });

  const { data: pagosAlumnos = [] } = useQuery({
    queryKey: ['pagos-alumnos', cliente?.id],
    queryFn: async () => {
      if (!cliente) return [];
      // Buscar alumnos que tengan el nombre del cliente
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
    enabled: !!cliente && alumnos.length > 0,
  });

  React.useEffect(() => {
    if (cliente) {
      setFormData({
        nombre: cliente.nombre,
        telefono: cliente.telefono || '',
        email: cliente.email || '',
        clasificacion: cliente.clasificacion,
        tipo_cliente: cliente.tipo_cliente || 'clase',
        notas: cliente.notas || '',
      });
    }
    setEditando(false);
  }, [cliente, open]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // Registrar cambios
      const cambios = [];
      for (const [campo, valorNuevo] of Object.entries(data)) {
        const valorAnterior = cliente[campo];
        if (valorAnterior !== valorNuevo) {
          cambios.push({ campo, valorAnterior, valorNuevo });
        }
      }
      
      await base44.entities.Cliente.update(id, data);
      
      // Registrar auditoría para cada cambio
      for (const cambio of cambios) {
        await registrarCambioCliente(
          id, 
          cliente.nombre, 
          cambio.campo, 
          cambio.valorAnterior, 
          cambio.valorNuevo
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setEditando(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await registrarEliminacion('Cliente', id, cliente.nombre, 'Cliente eliminado por administrador');
      await base44.entities.Cliente.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      onOpenChange(false);
    },
  });

  const turnosCliente = useMemo(() => {
    if (!cliente) return [];
    return turnos
      .filter(t => t.cliente === cliente.nombre)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [cliente, turnos]);

  const estadisticas = useMemo(() => {
    const total = turnosCliente.length;
    const pagados = turnosCliente.filter(t => t.pagado).length;
    const pendientes = total - pagados;
    const gastado = turnosCliente.reduce((sum, t) => sum + (t.pagado ? (t.monto || 0) : 0), 0);
    const porCobrar = turnosCliente.reduce((sum, t) => sum + (!t.pagado ? (t.monto || 0) : 0), 0);
    const ultimo = turnosCliente[0]?.fecha;

    // Deudas de cobros pendientes
    const deudaCobros = cobrosClientes
      .filter(c => c.estado === 'pendiente' || c.estado === 'moroso')
      .reduce((sum, c) => sum + (c.monto || 0), 0);

    // Total pagos de alumnos
    const totalPagosAlumnos = pagosAlumnos.reduce((sum, p) => sum + (p.monto || 0), 0);
    const cantidadPagosAlumnos = pagosAlumnos.length;

    return { 
      total, 
      pagados, 
      pendientes, 
      gastado, 
      porCobrar, 
      ultimo, 
      deudaCobros,
      totalPagosAlumnos,
      cantidadPagosAlumnos
    };
  }, [turnosCliente, cobrosClientes, pagosAlumnos]);

  const handleGuardar = () => {
    updateMutation.mutate({
      id: cliente.id,
      data: formData,
    });
  };

  if (!cliente) return null;

  const clasificacionConfig = {
    nuevo: { icon: UserPlus, color: 'bg-blue-100 text-blue-700', label: 'Nuevo' },
    recurrente: { icon: UserCheck, color: 'bg-emerald-100 text-emerald-700', label: 'Recurrente' },
  };

  const config = clasificacionConfig[cliente.clasificacion];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <User className="w-5 h-5 text-emerald-600" />
            {cliente.nombre}
            <Badge className={cn('ml-auto', config.color)}>
              <Icon className="w-3 h-3 mr-1" />
              {config.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="cobros">Cobros</TabsTrigger>
            <TabsTrigger value="pagos">Pagos</TabsTrigger>
            <TabsTrigger value="historial">Turnos</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="flex-1 overflow-y-auto space-y-4 px-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-slate-900">Datos del cliente</h3>
              {!editando ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditando(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      if (confirm(`¿Eliminar el cliente "${cliente.nombre}"? Esta acción no se puede deshacer.`)) {
                        deleteMutation.mutate(cliente.id);
                      }
                    }}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditando(false)}>
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleGuardar} disabled={updateMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  disabled={!editando}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    disabled={!editando}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!editando}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Clasificación</Label>
                  <Select
                    value={formData.clasificacion}
                    onValueChange={(v) => setFormData({ ...formData, clasificacion: v })}
                    disabled={!editando}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nuevo">Nuevo</SelectItem>
                      <SelectItem value="recurrente">Recurrente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.tipo_cliente || 'clase'}
                    onValueChange={(v) => setFormData({ ...formData, tipo_cliente: v })}
                    disabled={!editando}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clase">Clase</SelectItem>
                      <SelectItem value="abono">Abono</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  disabled={!editando}
                  rows={4}
                  placeholder="Observaciones, preferencias, etc..."
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cobros" className="flex-1 overflow-y-auto px-1">
            <SeccionCobros cliente={cliente} />
          </TabsContent>

          <TabsContent value="pagos" className="flex-1 overflow-y-auto px-1">
            {pagosAlumnos.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No hay pagos registrados</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-emerald-700">Total Pagado</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        ${estadisticas.totalPagosAlumnos.toLocaleString('es-AR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-emerald-700">Cantidad</p>
                      <p className="text-xl font-bold text-emerald-600">
                        {estadisticas.cantidadPagosAlumnos}
                      </p>
                    </div>
                  </div>
                </div>

                {pagosAlumnos
                  .sort((a, b) => b.fecha.localeCompare(a.fecha))
                  .map((pago) => (
                    <Card key={pago.id} className="shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-slate-900">
                                {format(parseISO(pago.fecha), "d 'de' MMM yyyy", { locale: es })}
                              </span>
                              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700">
                                {pago.medio_pago || 'Efectivo'}
                              </Badge>
                            </div>
                            {pago.notas && (
                              <p className="text-sm text-slate-600">{pago.notas}</p>
                            )}
                            <p className="text-xs text-slate-400 mt-1">
                              Mes: {format(parseISO(pago.mes_correspondiente + '-01'), "MMMM yyyy", { locale: es })}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-emerald-600">
                              ${(pago.monto || 0).toLocaleString('es-AR')}
                            </div>
                            {pago.fuera_de_termino && (
                              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 mt-1">
                                Fuera de término
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="historial" className="flex-1 overflow-y-auto px-1">
            {turnosCliente.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No hay turnos registrados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {turnosCliente.map((turno) => (
                  <Card key={turno.id} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-slate-900">
                              {format(parseISO(turno.fecha), "d 'de' MMM yyyy", { locale: es })}
                            </span>
                            <span className="text-sm text-slate-500">{turno.hora_inicio}</span>
                            <Badge variant="outline" className="text-xs">
                              Cancha {turno.cancha}
                            </Badge>
                          </div>
                          <div className="text-sm text-slate-600">
                            {turno.tipo_turno === 'clase' ? '📚 Clase' : '🎾 Alquiler'}
                            {turno.profesor && ` - ${turno.profesor}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={cn(
                            'font-semibold',
                            turno.pagado ? 'text-emerald-600' : 'text-amber-600'
                          )}>
                            ${(turno.monto || 0).toLocaleString('es-AR')}
                          </div>
                          {turno.pagado ? (
                            <Badge className="bg-emerald-100 text-emerald-700 text-xs mt-1">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Pagado
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 text-xs mt-1">
                              <Clock className="w-3 h-3 mr-1" />
                              Pendiente
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="flex-1 overflow-y-auto px-1">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3">Turnos de Cancha</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="shadow-sm">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-900">{estadisticas.total}</p>
                        <p className="text-xs text-slate-500 mt-1">Total Turnos</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-emerald-600">{estadisticas.pagados}</p>
                        <p className="text-xs text-slate-500 mt-1">Pagados</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm border-amber-200 bg-amber-50/30">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-amber-600">{estadisticas.pendientes}</p>
                        <p className="text-xs text-slate-500 mt-1">Pendientes</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm border-purple-200 bg-purple-50/30">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-xl font-bold text-purple-600">
                          ${estadisticas.gastado.toLocaleString('es-AR')}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Total Gastado</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3">Pagos de Clases</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-emerald-600">
                          {estadisticas.cantidadPagosAlumnos}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Cantidad</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-xl font-bold text-emerald-600">
                          ${estadisticas.totalPagosAlumnos.toLocaleString('es-AR')}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Total Pagado</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3">Deudas</h4>
                <div className="space-y-3">
                  {estadisticas.porCobrar > 0 && (
                    <Card className="shadow-sm border-rose-200 bg-rose-50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-rose-600">
                            ${estadisticas.porCobrar.toLocaleString('es-AR')}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">Turnos por cobrar</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {estadisticas.deudaCobros > 0 && (
                    <Card className="shadow-sm border-rose-200 bg-rose-50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-rose-600">
                            ${estadisticas.deudaCobros.toLocaleString('es-AR')}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">Cobros pendientes</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {estadisticas.porCobrar === 0 && estadisticas.deudaCobros === 0 && (
                    <Card className="shadow-sm border-emerald-200 bg-emerald-50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                          <p className="text-sm text-emerald-700 font-medium">Sin deudas pendientes</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {estadisticas.ultimo && (
                <div className="p-4 bg-slate-50 rounded-lg text-center">
                  <p className="text-sm text-slate-500">Último turno</p>
                  <p className="font-medium text-slate-900 mt-1">
                    {format(parseISO(estadisticas.ultimo), "d 'de' MMMM yyyy", { locale: es })}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}