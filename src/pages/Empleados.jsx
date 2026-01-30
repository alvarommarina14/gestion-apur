import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Plus, Edit, Trash2, CheckCircle, XCircle, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Empleados() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState({ open: false, empleado: null });
  const [formData, setFormData] = useState({
    tel: '',
    activo: true,
    recibir_notificaciones_cancha: true,
    role: 'user',
  });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: empleados = [], isLoading } = useQuery({
    queryKey: ['users-empleados'],
    queryFn: () => base44.entities.User.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-empleados'] });
      setModal({ open: false, empleado: null });
    },
  });

  const handleOpenModal = (empleado = null) => {
    if (empleado) {
      setFormData({
        tel: empleado.tel || '',
        activo: empleado.activo !== false,
        recibir_notificaciones_cancha: empleado.recibir_notificaciones_cancha !== false,
        role: empleado.role || 'user',
      });
    }
    setModal({ open: true, empleado });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (modal.empleado) {
      updateMutation.mutate({ id: modal.empleado.id, data: formData });
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <XCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Acceso denegado</h2>
            <p className="text-slate-600">Solo administradores pueden ver esta sección</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = {
    total: empleados.length,
    activos: empleados.filter(e => e.activo !== false).length,
    inactivos: empleados.filter(e => e.activo === false).length,
    admins: empleados.filter(e => e.role === 'admin').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Usuarios Registrados</h1>
            <p className="text-slate-500 text-sm">Administrar empleados y permisos</p>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="shadow-sm">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{stats.activos}</p>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Activos</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-blue-200 bg-blue-50/30">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.admins}</p>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Admins</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-200 bg-slate-50/30">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-slate-600">{stats.inactivos}</p>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Inactivos</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista */}
        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Empleados registrados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">Cargando...</div>
            ) : empleados.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No hay empleados registrados</p>
              </div>
            ) : (
              <div className="divide-y">
                {empleados.map((empleado) => (
                  <div key={empleado.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-slate-900 text-lg">{empleado.full_name}</h3>
                          <Badge className={empleado.activo !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}>
                            {empleado.activo !== false ? 'Activo' : 'Inactivo'}
                          </Badge>
                          {empleado.role === 'admin' && (
                            <Badge className="bg-blue-100 text-blue-700">Admin</Badge>
                          )}
                          {empleado.recibir_notificaciones_cancha !== false && (
                            <Badge className="bg-purple-100 text-purple-700">🔔 Notif</Badge>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-slate-400" />
                            {empleado.email}
                          </div>
                          {empleado.tel && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-slate-400" />
                              {empleado.tel}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleOpenModal(empleado)}
                          className="h-9 w-9"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      <Dialog open={modal.open} onOpenChange={(open) => setModal({ ...modal, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuario: {modal.empleado?.full_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="font-medium">{modal.empleado?.email}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={formData.tel}
                onChange={(e) => setFormData({ ...formData, tel: e.target.value })}
                placeholder="+5493414567890"
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <Label className="font-medium">Activo</Label>
                <p className="text-xs text-slate-500 mt-0.5">Puede usar la app</p>
              </div>
              <Switch
                checked={formData.activo}
                onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div>
                <Label className="font-medium">Notificaciones cancha</Label>
                <p className="text-xs text-slate-500 mt-0.5">Push de recordatorios</p>
              </div>
              <Switch
                checked={formData.recibir_notificaciones_cancha}
                onCheckedChange={(checked) => setFormData({ ...formData, recibir_notificaciones_cancha: checked })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModal({ open: false, empleado: null })}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                Actualizar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}