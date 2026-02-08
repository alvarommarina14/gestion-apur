import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Shield,
  Users,
  Check,
  X,
  Save,
  Edit,
  Phone,
  Mail,
  ChevronRight,
  AlertCircle,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const rolesConfig = {
  admin: { label: 'Administrador', color: 'bg-purple-100 text-purple-700' },
  empleado: { label: 'Empleado', color: 'bg-blue-100 text-blue-700' },
  profesor: { label: 'Profesor', color: 'bg-emerald-100 text-emerald-700' },
};

const SECCIONES_PROFESOR = [
  'dashboard', 'alumnos', 'pagos', 'recordatorios', 'reportes'
];

const SECCIONES_EMPLEADO = [
  'agenda_canchas', 'recordatorios_cancha', 'reportes'
];

const seccionesConfig = [
  { id: 'gestion_clases', label: 'Gestión de Clases', categoria: 'Clases' },
  { id: 'gestion_profesores', label: 'Gestión de Profesores', categoria: 'Clases' },
  { id: 'gestion_alumnos', label: 'Gestión de Alumnos', categoria: 'Clases' },
  { id: 'gestion_pagos', label: 'Gestión de Pagos', categoria: 'Clases' },
  { id: 'reportes', label: 'Reportes', categoria: 'Clases' },
  { id: 'booking_canchas', label: 'Booking de Canchas', categoria: 'Canchas' },
  { id: 'agenda_empleados', label: 'Mi Agenda', categoria: 'Canchas' },
  { id: 'dashboard_ocupacion', label: 'Dashboard de Ocupación', categoria: 'Canchas' },
  { id: 'recordatorios_cancha_admin', label: 'Canchas Admin', categoria: 'Canchas' },
  { id: 'recordatorios_cancha_empleado', label: 'Mis Recordatorios', categoria: 'Canchas' },
  { id: 'gestion_clientes', label: 'Gestión de Clientes', categoria: 'Clientes' },
  { id: 'configuracion', label: 'Configuración', categoria: 'Sistema' },
  { id: 'empleados', label: 'Empleados', categoria: 'Sistema' },
];

export default function GestionAccesoUnificada() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('roles');
  const [selectedItem, setSelectedItem] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [localPermisos, setLocalPermisos] = useState({});
  const [editEmpleado, setEditEmpleado] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [seccionesEmpleado, setSeccionesEmpleado] = useState({});

  // Datos
  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios_acceso'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users;
    },
  });

  const { data: permisos = [] } = useQuery({
    queryKey: ['permisos_todos'],
    queryFn: async () => {
      const rolPermisos = await base44.entities.RolPermiso.list();
      const usuarioPermisos = await base44.entities.PermisoUsuario.list();
      return { rolPermisos, usuarioPermisos };
    },
  });

  // Mutaciones
  const updateRolMutation = useMutation({
    mutationFn: async (updates) => {
      await Promise.all(updates.map(({ id, data }) => 
        base44.entities.RolPermiso.update(id, data)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permisos_todos'] });
      setHasChanges(false);
    },
  });

  const updateUsuarioMutation = useMutation({
    mutationFn: async (data) => {
      const existing = permisos.usuarioPermisos?.find(p => p.usuario_id === data.usuario_id);
      if (existing) {
        await base44.entities.PermisoUsuario.update(existing.id, data);
      } else {
        await base44.entities.PermisoUsuario.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permisos_todos'] });
      setHasChanges(false);
    },
  });

  const updateEmpleadoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios_acceso'] });
      setEditEmpleado(null);
    },
  });

  // Datos procesados
  const permisosPorRol = useMemo(() => {
    const grouped = {};
    permisos.rolPermisos?.forEach(permiso => {
      if (!grouped[permiso.rol]) grouped[permiso.rol] = {};
      grouped[permiso.rol][permiso.seccion] = permiso;
    });
    return grouped;
  }, [permisos]);

  const usuariosConRol = useMemo(() => {
    return usuarios.filter(u => ['profesor', 'empleado'].includes(u.rol));
  }, [usuarios]);

  const seccionesPorCategoria = useMemo(() => {
    const grouped = {};
    seccionesConfig.forEach(seccion => {
      if (!grouped[seccion.categoria]) grouped[seccion.categoria] = [];
      grouped[seccion.categoria].push(seccion);
    });
    return grouped;
  }, []);

  // Handlers
  const handleSelectRol = (rol) => {
    setActiveTab('roles');
    setSelectedItem({ type: 'rol', value: rol });
    setLocalPermisos(permisosPorRol[rol] || {});
    setHasChanges(false);
  };

  const handleSelectUsuario = (usuario) => {
    setActiveTab('usuarios');
    setSelectedItem({ type: 'usuario', value: usuario });
    const permisoActual = permisos.usuarioPermisos?.find(p => p.usuario_id === usuario.id);
    const secciones = usuario.rol === 'profesor' ? SECCIONES_PROFESOR : SECCIONES_EMPLEADO;
    
    const seccionesIniciales = secciones.map(sec => {
      const existing = permisoActual?.secciones_acceso?.find(s => s.seccion === sec);
      return existing || { seccion: sec, ver: false, crear: false, editar: false, eliminar: false };
    });

    setLocalPermisos({
      usuario_id: usuario.id,
      usuario_email: usuario.email,
      usuario_nombre: usuario.full_name,
      usuario_rol: usuario.rol,
      secciones_acceso: seccionesIniciales,
      activo: permisoActual?.activo ?? true,
    });
    setHasChanges(false);
  };

  const handlePermissionChange = (seccionIndex, campo, value) => {
    const nuevas = [...localPermisos.secciones_acceso];
    nuevas[seccionIndex] = { ...nuevas[seccionIndex], [campo]: value };
    setLocalPermisos({ ...localPermisos, secciones_acceso: nuevas });
    setHasChanges(true);
  };

  const handleTogglePermiso = (rol, seccion, tipo) => {
    const current = localPermisos[seccion];
    if (!current) return;
    setLocalPermisos(prev => ({
      ...prev,
      [seccion]: {
        ...current,
        permisos: { ...current.permisos, [tipo]: !current.permisos[tipo] },
      },
    }));
    setHasChanges(true);
  };

  const handleGuardar = async () => {
    if (selectedItem.type === 'rol') {
      const updates = [];
      Object.entries(localPermisos).forEach(([seccion, permiso]) => {
        if (permiso.id) {
          updates.push({
            id: permiso.id,
            data: {
              rol: permiso.rol,
              seccion: permiso.seccion,
              permisos: permiso.permisos,
              activo: permiso.activo,
            },
          });
        }
      });
      await updateRolMutation.mutateAsync(updates);
    } else {
      await updateUsuarioMutation.mutateAsync(localPermisos);
    }
  };

  const handleEditEmpleado = (usuario) => {
    setEditEmpleado(usuario);
    setEditFormData({
      tel: usuario.tel || '',
      activo: usuario.activo !== false,
      recibir_notificaciones_cancha: usuario.recibir_notificaciones_cancha !== false,
    });
    const permisoActual = permisos.usuarioPermisos?.find(p => p.usuario_id === usuario.id);
    setSeccionesEmpleado(permisoActual?.secciones_acceso || {});
  };

  const handleSaveEmpleado = async () => {
    await updateEmpleadoMutation.mutateAsync({
      id: editEmpleado.id,
      data: editFormData,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-emerald-600" />
            Gestión de Acceso Unificada
          </h1>
          <p className="text-slate-500 text-sm">Configura roles, permisos de usuarios y empleados</p>
        </header>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Panel izquierdo: Selección */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base">Roles Globales</CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-2">
                {Object.entries(rolesConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => handleSelectRol(key)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      selectedItem?.value === key
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'hover:bg-slate-100 text-slate-700'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="capitalize">{config.label}</span>
                      {selectedItem?.value === key && <ChevronRight className="w-4 h-4" />}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base">Usuarios</CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-2 max-h-96 overflow-y-auto">
                {usuariosConRol.map(usuario => (
                  <button
                    key={usuario.id}
                    onClick={() => handleSelectUsuario(usuario)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all',
                      selectedItem?.value?.id === usuario.id
                        ? 'bg-emerald-100'
                        : 'hover:bg-slate-100'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{usuario.full_name}</p>
                        <p className="text-xs text-slate-500 capitalize">{usuario.rol}</p>
                      </div>
                      {selectedItem?.value?.id === usuario.id && (
                        <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Panel central: Permisos */}
          <div className="lg:col-span-2">
            {selectedItem ? (
              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>
                      {selectedItem.type === 'rol' 
                        ? `${rolesConfig[selectedItem.value].label}` 
                        : selectedItem.value.full_name}
                    </CardTitle>
                  </div>
                  {hasChanges && (
                    <Button
                      onClick={handleGuardar}
                      disabled={updateRolMutation.isPending || updateUsuarioMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Guardar
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="pt-4 space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {selectedItem.type === 'rol' ? (
                    // Vista de rol global
                    Object.entries(seccionesPorCategoria).map(([categoria, secciones]) => (
                      <div key={categoria}>
                        <h4 className="font-semibold text-slate-700 mb-2 text-sm">{categoria}</h4>
                        <div className="space-y-2">
                          {secciones.map(seccion => {
                            const permiso = localPermisos[seccion.id];
                            if (!permiso) return null;

                            return (
                              <div key={seccion.id} className="border rounded-lg p-3 space-y-2">
                                <p className="text-sm font-medium text-slate-800">{seccion.label}</p>
                                <div className="grid grid-cols-4 gap-2">
                                  {['ver', 'crear', 'editar', 'eliminar'].map(tipo => (
                                    <div key={tipo} className="flex items-center gap-2">
                                      <Switch
                                        checked={permiso.permisos?.[tipo] || false}
                                        onCheckedChange={() => handleTogglePermiso(selectedItem.value, seccion.id, tipo)}
                                      />
                                      <span className="text-xs text-slate-600 capitalize">{tipo}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    // Vista de usuario individual
                    localPermisos.secciones_acceso?.map((seccion, idx) => (
                      <div key={seccion.seccion} className="border rounded-lg p-3 space-y-2">
                        <p className="text-sm font-medium text-slate-800 capitalize">
                          {seccion.seccion.replace(/_/g, ' ')}
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {['ver', 'crear', 'editar', 'eliminar'].map(tipo => (
                            <div key={tipo} className="flex items-center gap-2">
                              <Switch
                                checked={seccion[tipo] || false}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(idx, tipo, checked)
                                }
                              />
                              <span className="text-xs text-slate-600 capitalize">{tipo}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-sm">
                <CardContent className="pt-12 pb-12 text-center text-slate-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>Selecciona un rol o usuario para ver sus permisos</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Panel derecho: Empleados */}
          <div className="lg:col-span-1">
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Empleados
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                {usuariosConRol.filter(u => u.rol === 'empleado').map(emp => (
                  <div key={emp.id} className="border rounded-lg p-2.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{emp.full_name}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {emp.activo !== false && (
                            <Badge className="bg-emerald-100 text-emerald-700 text-xs">Activo</Badge>
                          )}
                          {emp.recibir_notificaciones_cancha !== false && (
                            <Badge className="bg-purple-100 text-purple-700 text-xs">🔔</Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditEmpleado(emp)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-slate-500 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{emp.email}</span>
                      </div>
                      {emp.tel && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{emp.tel}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal editar empleado */}
      <Dialog open={!!editEmpleado} onOpenChange={() => setEditEmpleado(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar: {editEmpleado?.full_name}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={editFormData.tel}
                onChange={(e) => setEditFormData({ ...editFormData, tel: e.target.value })}
                placeholder="+5493414567890"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <Label className="font-medium">Activo</Label>
              <Switch
                checked={editFormData.activo}
                onCheckedChange={(checked) => setEditFormData({ ...editFormData, activo: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <Label className="font-medium">Notificaciones</Label>
              <Switch
                checked={editFormData.recibir_notificaciones_cancha}
                onCheckedChange={(checked) => 
                  setEditFormData({ ...editFormData, recibir_notificaciones_cancha: checked })
                }
              />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEmpleado(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEmpleado}
              disabled={updateEmpleadoMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}