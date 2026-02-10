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
  Trash2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import SeccionCobros from './SeccionCobros';
import { registrarCambioCliente, registrarEliminacion } from '@/components/utils/auditLog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function DetalleClienteModal({ open, onOpenChange, cliente }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [formData, setFormData] = useState({});
  const [pagoAEliminar, setPagoAEliminar] = useState(null);

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

  const { data: profesores = [] } = useQuery({
    queryKey: ['profesores'],
    queryFn: () => base44.entities.Profesor.list(),
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

  const { data: alumnoCliente } = useQuery({
    queryKey: ['alumno-cliente', cliente?.id],
    queryFn: async () => {
      if (!cliente?.es_alumno || !cliente?.profesor_id) return null;
      const alumnosEncontrados = alumnos.find(a => 
        a.nombre.toLowerCase() === cliente.nombre.toLowerCase()
      );
      return alumnosEncontrados || null;
    },
    enabled: !!cliente?.es_alumno && alumnos.length > 0,
  });

  const { data: asistencias = [] } = useQuery({
    queryKey: ['asistencia', cliente?.id],
    queryFn: async () => {
      if (!cliente?.nombre) return [];
      const asistenciasEncontradas = await base44.entities.Asistencia.filter({ 
        alumno_nombre: cliente.nombre 
      });
      return asistenciasEncontradas.sort((a, b) => b.fecha.localeCompare(a.fecha));
    },
    enabled: !!cliente?.nombre,
  });

  React.useEffect(() => {
    if (cliente && open) {
      setFormData({
        nombre: cliente.nombre,
        telefono: cliente.telefono || '',
        email: cliente.email || '',
        clasificacion: cliente.clasificacion,
        tipo_cliente: cliente.tipo_cliente || 'clase',
        precio: cliente.precio || 0,
        notas: cliente.notas || '',
        profesor_id: cliente.profesor_id || '',
        profesor_nombre: cliente.profesor_nombre || '',
      });
      setEditando(false);
    }
  }, [cliente?.id, open]);

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
      
      // Si es alumno y cambió el profesor, actualizar también el alumno sincronizado PRIMERO
      if (cliente.es_alumno && (data.profesor_id || data.profesor_nombre)) {
        const alumnoSincronizado = alumnos.find(a => 
          a.nombre.toLowerCase() === cliente.nombre.toLowerCase()
        );
        if (alumnoSincronizado) {
          const updateData = {};
          if (data.profesor_id) updateData.profesor_id = data.profesor_id;
          if (data.profesor_nombre) updateData.profesor_nombre = data.profesor_nombre;
          if (Object.keys(updateData).length > 0) {
            await base44.entities.Alumno.update(alumnoSincronizado.id, updateData);
          }
        }
      }
      
      // Ahora actualizar el cliente
      await base44.entities.Cliente.update(id, data);
      
      // Si cambió el precio, actualizar total_gastado
      if (data.precio !== undefined && data.precio !== cliente.precio) {
        await base44.entities.Cliente.update(id, {
          total_gastado: (cliente.total_gastado || 0) + (data.precio || 0) - (cliente.precio || 0)
        });
      }
      
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
      
      return data;
    },
    onSuccess: (updatedData) => {
      // Actualizar el formData con los datos guardados para evitar que se pierdan
      setFormData(prev => ({ ...prev, ...updatedData }));
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['alumnos'] });
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

  const deletePagoMutation = useMutation({
    mutationFn: (pagoId) => base44.entities.Pago.delete(pagoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagos-alumnos', cliente?.id] });
      setPagoAEliminar(null);
    },
  });

  const estadisticas = useMemo(() => {
    // Total pagos de alumnos
    const totalPagosAlumnos = pagosAlumnos.reduce((sum, p) => sum + (p.monto || 0), 0);
    const cantidadPagosAlumnos = pagosAlumnos.length;

    // Deudas de cobros pendientes y morosos
    const deudaCobros = cobrosClientes
      .filter(c => c.estado === 'pendiente' || c.estado === 'moroso')
      .reduce((sum, c) => sum + (c.monto || 0), 0);

    // Estado general del cliente
    const cobrosActuales = cobrosClientes.filter(c => {
      const mesActual = format(new Date(), 'yyyy-MM');
      return c.mes === mesActual;
    });
    
    let estadoGeneral = 'pagado';
    if (cobrosActuales.some(c => c.estado === 'moroso')) {
      estadoGeneral = 'moroso';
    } else if (cobrosActuales.some(c => c.estado === 'pendiente')) {
      estadoGeneral = 'pendiente';
    }

    return { 
      deudaCobros,
      totalPagosAlumnos,
      cantidadPagosAlumnos,
      estadoGeneral
    };
  }, [cobrosClientes, pagosAlumnos]);

  const handleGuardar = () => {
    console.log('Guardando cliente con datos:', formData);
    updateMutation.mutate({
      id: cliente.id,
      data: formData,
    });
  };

  if (!cliente) return null;

  const clasificacionConfig = {
    nuevo: { icon: UserPlus, color: 'bg-blue-100 text-blue-700', label: 'Nuevo' },
    ocasional: { icon: UserPlus, color: 'bg-blue-100 text-blue-700', label: 'Ocasional' },
    recurrente: { icon: UserCheck, color: 'bg-emerald-100 text-emerald-700', label: 'Recurrente' },
  };

  const config = clasificacionConfig[cliente.clasificacion] || clasificacionConfig.nuevo;
  const Icon = config?.icon || UserPlus;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <User className="w-5 h-5 text-emerald-600" />
            {cliente.nombre}
            <div className="ml-auto flex gap-2">
              <Badge className={cn('', config.color)}>
                <Icon className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>
              <Badge className={cn('', 
                estadisticas.estadoGeneral === 'pagado' ? 'bg-emerald-100 text-emerald-700' :
                estadisticas.estadoGeneral === 'pendiente' ? 'bg-amber-100 text-amber-700' :
                'bg-rose-100 text-rose-700'
              )}>
                {estadisticas.estadoGeneral === 'pagado' ? '✓ Pagado' :
                 estadisticas.estadoGeneral === 'pendiente' ? '⏳ Pendiente' :
                 '⚠️ Moroso'}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden">
           <TabsList className="grid w-full grid-cols-4">
             <TabsTrigger value="info">Info</TabsTrigger>
             <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
             <TabsTrigger value="cobros">Cobros</TabsTrigger>
             <TabsTrigger value="pagos">Pagos</TabsTrigger>
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
                      <SelectItem value="suelto">Suelto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {cliente.es_alumno && (
                <div className="space-y-2">
                  <Label>Profesor</Label>
                  {editando ? (
                    <Select
                      value={formData.profesor_id || ''}
                      onValueChange={(v) => {
                        const profesor = profesores.find(p => p.id === v);
                        setFormData({ 
                          ...formData, 
                          profesor_id: v,
                          profesor_nombre: profesor?.nombre || ''
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar profesor" />
                      </SelectTrigger>
                      <SelectContent>
                        {profesores.map((prof) => (
                          <SelectItem key={prof.id} value={prof.id}>
                            {prof.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={cliente.profesor_nombre || 'Sin asignar'}
                      disabled
                      className="bg-slate-50"
                    />
                  )}
                </div>
              )}

              {((formData.tipo_cliente === 'abono' || formData.tipo_cliente === 'suelto') && editando) && (
                <div className="space-y-2">
                  <Label>
                    {formData.tipo_cliente === 'abono' ? 'Precio mensual' : 'Precio'}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={formData.precio || cliente.precio || 0}
                    onChange={(e) => setFormData({ ...formData, precio: parseFloat(e.target.value) || 0 })}
                    placeholder={formData.tipo_cliente === 'abono' ? 'Ej: 120000' : 'Ej: 50000'}
                  />
                </div>
              )}

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

          <TabsContent value="asistencia" className="flex-1 overflow-y-auto px-1">
            <div className="space-y-3">
              {asistencias.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <User className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>No hay registros de asistencia</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <Card className="shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-sm text-emerald-700 font-medium">Presentes</p>
                          <p className="text-2xl font-bold text-emerald-600">
                            {asistencias.filter(a => a.estado === 'presente').length}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-sm text-amber-700 font-medium">Con Aviso</p>
                          <p className="text-2xl font-bold text-amber-600">
                            {asistencias.filter(a => a.estado === 'ausente_con_aviso').length}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm bg-gradient-to-br from-rose-50 to-rose-100">
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-sm text-rose-700 font-medium">Sin Aviso</p>
                          <p className="text-2xl font-bold text-rose-600">
                            {asistencias.filter(a => a.estado === 'ausente_sin_aviso').length}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-2">
                    {asistencias.map((asistencia) => {
                      const estadoConfig = {
                        presente: { color: 'bg-emerald-100 text-emerald-700', label: '✓ Presente', icon: CheckCircle },
                        ausente_con_aviso: { color: 'bg-amber-100 text-amber-700', label: '⚠️ Ausente con aviso', icon: AlertCircle },
                        ausente_sin_aviso: { color: 'bg-rose-100 text-rose-700', label: '✗ Ausente sin aviso', icon: AlertCircle },
                      };
                      const config = estadoConfig[asistencia.estado] || estadoConfig.presente;

                      return (
                        <Card key={asistencia.id} className="shadow-sm">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={config.color}>{config.label}</Badge>
                                  <span className="text-sm text-slate-500">
                                    {format(parseISO(asistencia.fecha), "d 'de' MMM yyyy", { locale: es })}
                                  </span>
                                </div>
                                {asistencia.notas && (
                                  <p className="text-sm text-slate-600">{asistencia.notas}</p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
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
                          <div className="text-right flex items-start gap-2">
                            <div>
                              <div className="font-semibold text-emerald-600">
                                ${(pago.monto || 0).toLocaleString('es-AR')}
                              </div>
                              {pago.fuera_de_termino && (
                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 mt-1">
                                  Fuera de término
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPagoAEliminar(pago)}
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 w-8 p-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>


          </Tabs>

          {/* Alert Dialog para eliminar pago */}
          <AlertDialog open={!!pagoAEliminar} onOpenChange={(open) => !open && setPagoAEliminar(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                Eliminar pago
              </AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de que deseas eliminar el pago de ${(pagoAEliminar?.monto || 0).toLocaleString('es-AR')} del {pagoAEliminar?.fecha && format(parseISO(pagoAEliminar.fecha), "d 'de' MMMM", { locale: es })}? Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => pagoAEliminar && deletePagoMutation.mutate(pagoAEliminar.id)}
                disabled={deletePagoMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700"
              >
                Eliminar
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
          </AlertDialog>
          </DialogContent>
          </Dialog>
          );
          }