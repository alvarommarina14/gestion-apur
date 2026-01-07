import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Bell,
  Plus,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  User,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import MetricCard from '@/components/ui/MetricCard';
import { cn } from '@/lib/utils';

export default function OperacionesClub() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [filtros, setFiltros] = useState({
    fecha: '',
    empleado: 'todos',
    cancha: 'todas',
    estado: 'todos',
  });

  const { data: recordatorios = [], isLoading } = useQuery({
    queryKey: ['recordatorios-club'],
    queryFn: () => base44.entities.RecordatorioClub.list('-fecha_hora'),
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => base44.entities.User.list(),
  });

  const empleados = usuarios.filter(u => u.activo);

  // Calcular KPIs
  const kpis = useMemo(() => {
    const hoy = format(new Date(), 'yyyy-MM-dd');
    const recordatoriosHoy = recordatorios.filter(r => r.fecha === hoy);
    
    return {
      pendientesHoy: recordatoriosHoy.filter(r => r.estado === 'PENDIENTE').length,
      hechosHoy: recordatoriosHoy.filter(r => r.estado === 'HECHO').length,
      vencidosHoy: recordatoriosHoy.filter(r => r.estado === 'VENCIDO').length,
    };
  }, [recordatorios]);

  // Filtrar recordatorios
  const recordatoriosFiltrados = useMemo(() => {
    return recordatorios.filter(r => {
      if (filtros.fecha && r.fecha !== filtros.fecha) return false;
      if (filtros.empleado !== 'todos' && r.asignado_a !== filtros.empleado) return false;
      if (filtros.cancha !== 'todas' && r.cancha !== filtros.cancha) return false;
      if (filtros.estado !== 'todos' && r.estado !== filtros.estado) return false;
      return true;
    });
  }, [recordatorios, filtros]);

  // Separar próximos de históricos
  const proximos = recordatoriosFiltrados.filter(r => 
    r.estado === 'PENDIENTE' || (r.estado === 'HECHO' && isToday(parseISO(r.fecha)))
  );
  
  const historicos = recordatoriosFiltrados.filter(r => 
    r.estado === 'HECHO' && !isToday(parseISO(r.fecha)) || r.estado === 'VENCIDO'
  );

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Operaciones Club</h1>
            <p className="text-slate-500 text-sm">Gestión de recordatorios y tareas</p>
          </div>
          <Button 
            onClick={() => setModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo recordatorio
          </Button>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Pendientes hoy"
            value={kpis.pendientesHoy}
            icon={Clock}
            variant="warning"
          />
          <MetricCard
            title="Hechos hoy"
            value={kpis.hechosHoy}
            icon={CheckCircle}
            variant="success"
          />
          <MetricCard
            title="Vencidos hoy"
            value={kpis.vencidosHoy}
            icon={AlertTriangle}
            variant="danger"
          />
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={filtros.fecha}
                  onChange={(e) => setFiltros({ ...filtros, fecha: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Empleado</Label>
                <Select
                  value={filtros.empleado}
                  onValueChange={(v) => setFiltros({ ...filtros, empleado: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {empleados.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cancha</Label>
                <Select
                  value={filtros.cancha}
                  onValueChange={(v) => setFiltros({ ...filtros, cancha: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {[1,2,3,4,5,6,7,8].map(num => (
                      <SelectItem key={num} value={`Cancha ${num}`}>
                        Cancha {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={filtros.estado}
                  onValueChange={(v) => setFiltros({ ...filtros, estado: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                    <SelectItem value="HECHO">Hecho</SelectItem>
                    <SelectItem value="VENCIDO">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de próximos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximos recordatorios</CardTitle>
          </CardHeader>
          <CardContent>
            {proximos.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No hay recordatorios próximos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {proximos.map(rec => (
                  <RecordatorioCard key={rec.id} recordatorio={rec} formatMoney={formatMoney} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Históricos */}
        {historicos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {historicos.slice(0, 10).map(rec => (
                  <RecordatorioCard key={rec.id} recordatorio={rec} formatMoney={formatMoney} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal Nuevo Recordatorio */}
      <NuevoRecordatorioModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        empleados={empleados}
      />
    </div>
  );
}

function RecordatorioCard({ recordatorio, formatMoney }) {
  const estadoConfig = {
    PENDIENTE: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: Clock },
    HECHO: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: CheckCircle },
    VENCIDO: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: AlertTriangle },
  };

  const config = estadoConfig[recordatorio.estado];
  const Icon = config.icon;

  return (
    <div className={cn('rounded-lg border p-4', config.bg, config.border)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="font-semibold">
                {recordatorio.hora} - {format(parseISO(recordatorio.fecha), "d 'de' MMM", { locale: es })}
              </span>
            </div>
            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', config.text, config.bg)}>
              {recordatorio.cancha}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium">{recordatorio.accion}</span>
            {recordatorio.monto > 0 && (
              <span className="text-emerald-600 font-semibold">{formatMoney(recordatorio.monto)}</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <User className="w-4 h-4" />
            <span>Asignado a: {recordatorio.asignado_a_nombre}</span>
          </div>

          {recordatorio.estado === 'HECHO' && recordatorio.marcado_por_nombre && (
            <p className="text-xs text-slate-500">
              Hecho por {recordatorio.marcado_por_nombre} a las{' '}
              {format(parseISO(recordatorio.completado_en), 'HH:mm', { locale: es })}
            </p>
          )}

          {recordatorio.notas && (
            <p className="text-sm text-slate-600 italic">{recordatorio.notas}</p>
          )}
        </div>

        <div className={cn('p-2 rounded-lg', config.bg)}>
          <Icon className={cn('w-5 h-5', config.text)} />
        </div>
      </div>
    </div>
  );
}

function NuevoRecordatorioModal({ open, onOpenChange, empleados }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fecha: format(new Date(), 'yyyy-MM-dd'),
    hora: '09:00',
    cancha: 'Cancha 1',
    accion: 'Sacar cancha',
    monto: '',
    asignado_a: '',
    notas: '',
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RecordatorioClub.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordatorios-club'] });
      onOpenChange(false);
      setFormData({
        fecha: format(new Date(), 'yyyy-MM-dd'),
        hora: '09:00',
        cancha: 'Cancha 1',
        accion: 'Sacar cancha',
        monto: '',
        asignado_a: '',
        notas: '',
      });
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const empleado = empleados.find(e => e.id === formData.asignado_a);
    const fechaHora = new Date(`${formData.fecha}T${formData.hora}:00`);

    await createMutation.mutateAsync({
      ...formData,
      fecha_hora: fechaHora.toISOString(),
      asignado_a_nombre: empleado?.full_name || '',
      monto: formData.monto ? Number(formData.monto) : 0,
      estado: 'PENDIENTE',
    });

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo recordatorio</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input
                type="time"
                value={formData.hora}
                onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cancha</Label>
            <Select
              value={formData.cancha}
              onValueChange={(v) => setFormData({ ...formData, cancha: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5,6,7,8].map(num => (
                  <SelectItem key={num} value={`Cancha ${num}`}>
                    Cancha {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Acción</Label>
            <Select
              value={formData.accion}
              onValueChange={(v) => setFormData({ ...formData, accion: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sacar cancha">Sacar cancha</SelectItem>
                <SelectItem value="Cobrar">Cobrar</SelectItem>
                <SelectItem value="Sacar + Cobrar">Sacar + Cobrar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(formData.accion === 'Cobrar' || formData.accion === 'Sacar + Cobrar') && (
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                type="number"
                value={formData.monto}
                onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                placeholder="0"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Asignar a</Label>
            <Select
              value={formData.asignado_a}
              onValueChange={(v) => setFormData({ ...formData, asignado_a: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar empleado..." />
              </SelectTrigger>
              <SelectContent>
                {empleados.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Información adicional..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Creando...' : 'Crear recordatorio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}