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
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
  const [selectedItem, setSelectedItem] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [localPermisos, setLocalPermisos] = useState({});
  const [editEmpleado, setEditEmpleado] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [seccionesEmpleado, setSeccionesEmpleado] = useState({});
  const [procesandoClase, setProcesandoClase] = useState(null);
  const [clasesSeleccionadas, setClasesSeleccionadas] = useState(new Set());

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

  const { data: clasesPendientes = [], isLoading: loadingClases } = useQuery({
    queryKey: ['clases-pendientes'],
    queryFn: async () => {
      const clases = await base44.entities.Clase.filter({
        estado_aprobacion: 'pendiente'
      });
      const profesoresMap = await base44.entities.Profesor.list();
      const profesorPorId = profesoresMap.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});
      
      return clases.map(clase => ({
        ...clase,
        profesor_nombre: profesorPorId[clase.profesor_id]?.nombre || 'Desconocido'
      }));
    },
  });

  const { data: alumnos = {} } = useQuery({
    queryKey: ['alumnos-map'],
    queryFn: async () => {
      const alus = await base44.entities.Alumno.list();
      return alus.reduce((acc, a) => ({ ...acc, [a.id]: a.nombre }), {});
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

  const aprobarUsuarioMutation = useMutation({
    mutationFn: async (userId) => {
      await base44.entities.User.update(userId, { estado_aprobacion: 'aprobado' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios_acceso'] });
    },
  });

  const rechazarUsuarioMutation = useMutation({
    mutationFn: async (userId) => {
      await base44.entities.User.update(userId, { estado_aprobacion: 'rechazado' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios_acceso'] });
    },
  });

  const aprobarClaseMutation = useMutation({
    mutationFn: async (claseId) => {
      const clases = await base44.entities.Clase.filter({ id: claseId });
      const clase = clases[0];
      
      await base44.entities.Clase.update(claseId, {
        estado_aprobacion: 'aprobada'
      });

      try {
        const [h, m] = clase.hora_inicio.split(':').map(Number);
        const horaFin = new Date(0, 0, 0, h, m + clase.duracion);
        const horaFinStr = `${String(horaFin.getHours()).padStart(2, '0')}:${String(horaFin.getMinutes()).padStart(2, '0')}`;
        
        const empleados = await base44.entities.User.list();
        const empleadosIds = empleados.map(e => e.id);
        const empleadosEmails = empleados.map(e => e.email);
        const empleadosNombres = empleados.map(e => e.full_name);
        
        const alumnosNombres = clase.alumnos_nombres?.join(', ') || 'Clase';
        
        await base44.entities.TurnoCancha.create({
          fecha: clase.fecha,
          hora_inicio: clase.hora_inicio,
          hora_fin: horaFinStr,
          duracion: clase.duracion,
          cancha: clase.cancha || '',
          cliente: alumnosNombres,
          tipo_turno: 'clase',
          monto: clase.precio || 0,
          pagado: false,
          empleados_asignados_ids: empleadosIds,
          empleados_asignados_emails: empleadosEmails,
          empleados_asignados_nombres: empleadosNombres,
          estado: 'activo',
          notas: clase.notas || `Clase - ${alumnosNombres}`,
        });
      } catch (error) {
        console.error('Error creando TurnoCancha:', error);
      }

      try {
        const syncResult = await base44.functions.invoke('sincronizarClaseGoogleCalendar', {
          clase_id: claseId,
        });
        console.log('✅ Clase sincronizada con Google Calendar:', syncResult.data);
      } catch (error) {
        console.error('❌ Error sincronizando con Google Calendar:', error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clases-pendientes'] });
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      setProcesandoClase(null);
    },
  });

  const rechazarClaseMutation = useMutation({
    mutationFn: async (claseId) => {
      await base44.entities.Clase.update(claseId, {
        estado_aprobacion: 'rechazada'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clases-pendientes'] });
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      setProcesandoClase(null);
    },
  });

  const eliminarClasesMutation = useMutation({
    mutationFn: async (clasesIds) => {
      await Promise.all(
        clasesIds.map(id => base44.entities.Clase.delete(id))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clases-pendientes'] });
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      setClasesSeleccionadas(new Set());
      setProcesandoClase(null);
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

  const usuariosPendientes = useMemo(() => {
    return usuarios.filter(u => u.estado_aprobacion === 'pendiente' && u.rol === 'admin');
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
    setSelectedItem({ type: 'rol', value: rol });
    setLocalPermisos(permisosPorRol[rol] || {});
    setHasChanges(false);
  };

  const handleSelectUsuario = (usuario) => {
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
    setSeccionesEmpleado(permisoActual?.secciones_acceso || []);
  };

  const handleSaveEmpleado = async () => {
    await updateEmpleadoMutation.mutateAsync({
      id: editEmpleado.id,
      data: editFormData,
    });
    
    const permisoActual = permisos.usuarioPermisos?.find(p => p.usuario_id === editEmpleado.id);
    const permisoData = {
      usuario_id: editEmpleado.id,
      usuario_email: editEmpleado.email,
      usuario_nombre: editEmpleado.full_name,
      usuario_rol: editEmpleado.rol,
      secciones_acceso: seccionesEmpleado,
      activo: true,
    };
    
    if (permisoActual) {
      await base44.entities.PermisoUsuario.update(permisoActual.id, permisoData);
    } else {
      await base44.entities.PermisoUsuario.create(permisoData);
    }
    queryClient.invalidateQueries({ queryKey: ['permisos_todos'] });
    queryClient.invalidateQueries({ queryKey: ['permisos_usuario'] });
  };

  const toggleSeleccionClase = (claseId) => {
    const nueva = new Set(clasesSeleccionadas);
    if (nueva.has(claseId)) {
      nueva.delete(claseId);
    } else {
      nueva.add(claseId);
    }
    setClasesSeleccionadas(nueva);
  };

  const seleccionarTodasClases = () => {
    if (clasesSeleccionadas.size === clasesPendientes.length) {
      setClasesSeleccionadas(new Set());
    } else {
      setClasesSeleccionadas(new Set(clasesPendientes.map(c => c.id)));
    }
  };

  const handleEliminarClasesSeleccionadas = async () => {
    if (!confirm(`¿Eliminar ${clasesSeleccionadas.size} clase${clasesSeleccionadas.size !== 1 ? 's' : ''}?`)) return;
    setProcesandoClase('eliminar');
    await eliminarClasesMutation.mutateAsync(Array.from(clasesSeleccionadas));
  };

  const handleAprobarClasesSeleccionadas = async () => {
    if (!confirm(`¿Aprobar ${clasesSeleccionadas.size} clase${clasesSeleccionadas.size !== 1 ? 's' : ''}?`)) return;
    setProcesandoClase('aprobar-masivo');
    const clasesParaAprobar = Array.from(clasesSeleccionadas);
    try {
      await Promise.all(clasesParaAprobar.map(claseId => aprobarClaseMutation.mutateAsync(claseId)));
    } catch (error) {
      console.error('Error aprobando clases:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-emerald-600" />
            Gestión de Acceso
          </h1>
          <p className="text-slate-500 text-sm">Configura permisos, aprueba usuarios y clases</p>
        </header>

        <Tabs defaultValue="permisos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="permisos">Permisos</TabsTrigger>
            <TabsTrigger value="usuarios">
              Usuarios
              {usuariosPendientes.length > 0 && (
                <Badge className="ml-2 bg-rose-500 text-white">{usuariosPendientes.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="clases">
              Clases
              {clasesPendientes.length > 0 && (
                <Badge className="ml-2 bg-amber-500 text-white">{clasesPendientes.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB PERMISOS */}
          <TabsContent value="permisos">
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
          </TabsContent>

          {/* TAB USUARIOS PENDIENTES */}
          <TabsContent value="usuarios">
            {usuariosPendientes.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
                  <p className="text-slate-600 text-lg">
                    No hay solicitudes pendientes de aprobación
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {usuariosPendientes.map((usuario) => (
                  <Card key={usuario.id} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">{usuario.full_name}</CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                              <Clock className="w-3 h-3 mr-1" />
                              Pendiente
                            </Badge>
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                              Solicita: Administrador
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="w-4 h-4" />
                          <span>{usuario.email}</span>
                        </div>
                        {usuario.tel && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone className="w-4 h-4" />
                            <span>{usuario.tel}</span>
                          </div>
                        )}
                        <div className="text-xs text-slate-500">
                          Registrado: {new Date(usuario.created_date).toLocaleDateString('es-AR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          onClick={() => aprobarUsuarioMutation.mutate(usuario.id)}
                          disabled={aprobarUsuarioMutation.isPending}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Aprobar
                        </Button>
                        <Button
                          onClick={() => {
                            if (confirm('¿Estás seguro de rechazar esta solicitud?')) {
                              rechazarUsuarioMutation.mutate(usuario.id);
                            }
                          }}
                          disabled={rechazarUsuarioMutation.isPending}
                          variant="outline"
                          className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Rechazar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB CLASES PENDIENTES */}
          <TabsContent value="clases">
            {clasesPendientes.length > 0 && (
              <div className="mb-6 flex gap-2 flex-wrap items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={seleccionarTodasClases}
                  className="gap-2"
                >
                  <Checkbox 
                    checked={clasesSeleccionadas.size === clasesPendientes.length && clasesPendientes.length > 0}
                    className="cursor-pointer"
                  />
                  {clasesSeleccionadas.size === clasesPendientes.length ? 'Desseleccionar todas' : 'Seleccionar todas'}
                </Button>

                {clasesSeleccionadas.size > 0 && (
                  <>
                    <span className="text-sm text-slate-600">
                      {clasesSeleccionadas.size} seleccionada{clasesSeleccionadas.size !== 1 ? 's' : ''}
                    </span>
                    <Button
                      size="sm"
                      onClick={handleAprobarClasesSeleccionadas}
                      disabled={procesandoClase === 'aprobar-masivo'}
                      className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Aceptar seleccionadas
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleEliminarClasesSeleccionadas}
                      disabled={procesandoClase === 'eliminar'}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar seleccionadas
                    </Button>
                  </>
                )}
              </div>
            )}

            {clasesPendientes.length === 0 ? (
              <Card className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                <p className="text-slate-600">No hay clases pendientes de aprobación</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {clasesPendientes.map((clase) => (
                  <Card key={clase.id} className={cn("overflow-hidden", clasesSeleccionadas.has(clase.id) && "ring-2 ring-emerald-500 bg-emerald-50")}>
                    <CardContent className="p-6">
                      <div className="flex gap-4 mb-4">
                        <Checkbox
                          checked={clasesSeleccionadas.has(clase.id)}
                          onCheckedChange={() => toggleSeleccionClase(clase.id)}
                          className="mt-1 cursor-pointer"
                        />
                        <div className="flex-1 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Fecha y Hora</p>
                              <p className="text-lg font-semibold text-slate-900">
                                {format(new Date(clase.fecha), "d 'de' MMMM", { locale: es })}
                              </p>
                              <p className="text-sm text-slate-600">{clase.hora_inicio}</p>
                            </div>

                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Ubicación</p>
                              <p className="text-sm font-medium text-slate-900">{clase.sede}</p>
                              {clase.cancha && (
                                <p className="text-sm text-slate-600">Cancha: {clase.cancha}</p>
                              )}
                            </div>

                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Profesor</p>
                              <p className="text-sm font-medium text-slate-900">
                                {clase.profesor_nombre || 'Desconocido'}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Alumnos</p>
                            <div className="flex flex-wrap gap-2">
                              {clase.alumnos_ids?.map((alumnoId) => (
                                <Badge key={alumnoId} variant="outline">
                                  {alumnos[alumnoId] || 'Alumno'}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                            <div>
                              <p className="text-xs text-slate-500">Tipo</p>
                              <p className="text-sm font-medium text-slate-900">
                                {clase.tipo === 'individual' ? 'Individual' : 'Grupal'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Duración</p>
                              <p className="text-sm font-medium text-slate-900">{clase.duracion} min</p>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <Button
                              onClick={() => {
                                setProcesandoClase(clase.id);
                                aprobarClaseMutation.mutate(clase.id);
                              }}
                              disabled={procesandoClase === clase.id}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              {procesandoClase === clase.id ? 'Aprobando...' : 'Aprobar'}
                            </Button>
                            <Button
                              onClick={() => {
                                setProcesandoClase(clase.id);
                                rechazarClaseMutation.mutate(clase.id);
                              }}
                              disabled={procesandoClase === clase.id}
                              variant="destructive"
                              className="flex-1"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              {procesandoClase === clase.id ? 'Rechazando...' : 'Rechazar'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal editar empleado */}
      <Dialog open={!!editEmpleado} onOpenChange={() => setEditEmpleado(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

            <div className="border-t pt-4">
              <Label className="font-semibold mb-3 block">Acceso a secciones (Empleados)</Label>
              <div className="space-y-3">
                {[
                  { id: 'empleados', nombre: 'Tareas', icon: '✅' },
                  { id: 'booking_canchas', nombre: 'Agenda de Canchas', icon: '📅' },
                  { id: 'recordatorios_cancha_empleado', nombre: 'Mis Recordatorios', icon: '🔔' },
                  { id: 'reportes', nombre: 'Reportes', icon: '📊' },
                ].map(seccion => {
                  const seccionData = seccionesEmpleado.find(s => s.seccion === seccion.id) || { seccion: seccion.id, ver: false };
                  
                  return (
                    <div key={seccion.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50">
                      <Switch
                        checked={seccionData.ver || false}
                        onCheckedChange={(checked) => {
                          const nuevasSecciones = seccionesEmpleado.filter(s => s.seccion !== seccion.id);
                          nuevasSecciones.push({
                            seccion: seccion.id,
                            ver: checked,
                            crear: checked,
                            editar: checked,
                            eliminar: false,
                          });
                          setSeccionesEmpleado(nuevasSecciones);
                        }}
                      />
                      <Label className="flex-1 cursor-pointer m-0">
                        {seccion.icon} {seccion.nombre}
                      </Label>
                    </div>
                  );
                })}
              </div>
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