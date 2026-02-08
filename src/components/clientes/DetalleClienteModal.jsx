import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

export default function DetalleClienteModal({ open, onOpenChange, cliente, turnos = [] }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [formData, setFormData] = useState({});

  React.useEffect(() => {
    if (cliente) {
      setFormData({
        nombre: cliente.nombre,
        telefono: cliente.telefono || '',
        email: cliente.email || '',
        clasificacion: cliente.clasificacion,
        notas: cliente.notas || '',
      });
    }
    setEditando(false);
  }, [cliente, open]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Cliente.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setEditando(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Cliente.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      onOpenChange(false);
    },
  });

  const deleteAllTurnosMutation = useMutation({
    mutationFn: async (clienteNombre) => {
      // Obtener todos los turnos del cliente
      const todosTurnos = await base44.entities.TurnoCancha.list();
      const turnosCliente = todosTurnos.filter(t => t.cliente === clienteNombre);

      // Obtener todos los recordatorios
      const todosRecordatorios = await base44.entities.RecordatorioCancha.list();

      // Agrupar por GCal event ID para eliminar series recurrentes
      const gcalEventIds = new Set();
      
      // Eliminar recordatorios asociados con delay
      for (const turno of turnosCliente) {
        if (turno.gcal_event_id) {
          gcalEventIds.add(turno.gcal_event_id);
        }
        const recordatorios = todosRecordatorios.filter(r => r.turno_cancha_id === turno.id);
        for (const rec of recordatorios) {
          await base44.entities.RecordatorioCancha.delete(rec.id);
          await new Promise(resolve => setTimeout(resolve, 30));
        }
      }

      // Eliminar turnos con delay
      for (const turno of turnosCliente) {
        await base44.entities.TurnoCancha.delete(turno.id);
        await new Promise(resolve => setTimeout(resolve, 30));
      }

      // Eliminar eventos de Google Calendar (incluyendo series recurrentes)
      for (const eventId of gcalEventIds) {
        try {
          await base44.functions.invoke('sincronizarTurnoGoogleCalendar', { 
            turno_id: 'gc_' + eventId,
            action: 'delete',
            recurringEventId: eventId
          });
        } catch (err) {
          console.warn('Error limpiando evento de Google Calendar:', err);
        }
      }

      return turnosCliente.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
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

    return { total, pagados, pendientes, gastado, porCobrar, ultimo };
  }, [turnosCliente]);

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
            <TabsTrigger value="stats">Estadísticas</TabsTrigger>
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
                  {turnosCliente.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        if (confirm(`¿Borrar TODAS las ${turnosCliente.length} reservas de ${cliente.nombre} en la app y Google Calendar? No se puede deshacer.`)) {
                          deleteAllTurnosMutation.mutate(cliente.nombre);
                        }
                      }}
                      className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                      disabled={deleteAllTurnosMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {deleteAllTurnosMutation.isPending ? 'Borrando...' : 'Borrar todas las reservas'}
                    </Button>
                  )}
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
                    Eliminar cliente
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
            <div className="grid grid-cols-2 gap-4">
              <Card className="shadow-sm">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-slate-900">{estadisticas.total}</p>
                    <p className="text-sm text-slate-500 mt-1">Total Turnos</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-emerald-600">{estadisticas.pagados}</p>
                    <p className="text-sm text-slate-500 mt-1">Pagados</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-amber-200 bg-amber-50/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-amber-600">{estadisticas.pendientes}</p>
                    <p className="text-sm text-slate-500 mt-1">Pendientes</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-purple-200 bg-purple-50/30">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      ${estadisticas.gastado.toLocaleString('es-AR')}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">Total Gastado</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {estadisticas.porCobrar > 0 && (
              <Card className="shadow-sm border-rose-200 bg-rose-50 mt-4">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-rose-600">
                      ${estadisticas.porCobrar.toLocaleString('es-AR')}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">Por cobrar</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {estadisticas.ultimo && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg text-center">
                <p className="text-sm text-slate-500">Último turno</p>
                <p className="font-medium text-slate-900 mt-1">
                  {format(parseISO(estadisticas.ultimo), "d 'de' MMMM yyyy", { locale: es })}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}