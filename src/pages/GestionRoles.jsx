import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Shield,
  Check,
  X,
  Save,
  RefreshCw,
  User,
  UserCog,
  GraduationCap,
  Eye,
  Edit3,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const rolesConfig = {
  admin: {
    label: 'Administrador',
    icon: Shield,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  empleado: {
    label: 'Empleado',
    icon: UserCog,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  profesor: {
    label: 'Profesor',
    icon: GraduationCap,
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
};

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

export default function GestionRoles() {
  const queryClient = useQueryClient();
  const [selectedRol, setSelectedRol] = useState('admin');
  const [hasChanges, setHasChanges] = useState(false);
  const [localPermisos, setLocalPermisos] = useState({});

  const { data: permisos = [], isLoading } = useQuery({
    queryKey: ['rol-permisos'],
    queryFn: () => base44.entities.RolPermiso.list(),
  });

  // Agrupar permisos por rol
  const permisosPorRol = useMemo(() => {
    const grouped = {};
    permisos.forEach(permiso => {
      if (!grouped[permiso.rol]) {
        grouped[permiso.rol] = {};
      }
      grouped[permiso.rol][permiso.seccion] = permiso;
    });
    return grouped;
  }, [permisos]);

  // Actualizar estado local cuando cambian los permisos
  React.useEffect(() => {
    setLocalPermisos(permisosPorRol);
    setHasChanges(false);
  }, [permisosPorRol]);

  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      await Promise.all(updates.map(({ id, data }) => 
        base44.entities.RolPermiso.update(id, data)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rol-permisos'] });
      setHasChanges(false);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RolPermiso.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rol-permisos'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RolPermiso.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rol-permisos'] });
    },
  });

  const handleTogglePermiso = (rol, seccion, tipo) => {
    setHasChanges(true);
    setLocalPermisos(prev => {
      const current = prev[rol]?.[seccion];
      if (!current) return prev;

      return {
        ...prev,
        [rol]: {
          ...prev[rol],
          [seccion]: {
            ...current,
            permisos: {
              ...current.permisos,
              [tipo]: !current.permisos[tipo],
            },
          },
        },
      };
    });
  };

  const handleToggleSeccion = (rol, seccion) => {
    setHasChanges(true);
    setLocalPermisos(prev => {
      const current = prev[rol]?.[seccion];
      if (!current) return prev;

      const todosActivos = Object.values(current.permisos).every(v => v);

      return {
        ...prev,
        [rol]: {
          ...prev[rol],
          [seccion]: {
            ...current,
            permisos: {
              ver: !todosActivos,
              crear: !todosActivos,
              editar: !todosActivos,
              eliminar: !todosActivos,
            },
          },
        },
      };
    });
  };

  const handleGuardarCambios = async () => {
    const updates = [];
    
    Object.entries(localPermisos).forEach(([rol, secciones]) => {
      Object.entries(secciones).forEach(([seccion, permiso]) => {
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
    });

    await updateMutation.mutateAsync(updates);
  };

  const handleInicializarPermisos = async () => {
    if (!confirm('¿Inicializar permisos por defecto? Esto creará configuraciones para todas las secciones.')) return;

    const permisosDefault = [];

    // Admin: Acceso total
    seccionesConfig.forEach(seccion => {
      permisosDefault.push({
        rol: 'admin',
        seccion: seccion.id,
        permisos: { ver: true, crear: true, editar: true, eliminar: true },
        activo: true,
        descripcion: `Acceso completo a ${seccion.label}`,
      });
    });

    // Empleado: Acceso limitado a canchas
    ['booking_canchas', 'agenda_empleados', 'recordatorios_cancha_empleado'].forEach(seccionId => {
      const seccion = seccionesConfig.find(s => s.id === seccionId);
      permisosDefault.push({
        rol: 'empleado',
        seccion: seccionId,
        permisos: { ver: true, crear: true, editar: true, eliminar: false },
        activo: true,
        descripcion: `Acceso a ${seccion.label}`,
      });
    });

    // Profesor: Acceso a sus alumnos y clases
    ['gestion_alumnos', 'gestion_clases', 'gestion_pagos', 'reportes'].forEach(seccionId => {
      const seccion = seccionesConfig.find(s => s.id === seccionId);
      permisosDefault.push({
        rol: 'profesor',
        seccion: seccionId,
        permisos: { ver: true, crear: true, editar: true, eliminar: false },
        activo: true,
        descripcion: `Acceso a ${seccion.label} de sus alumnos`,
      });
    });

    await Promise.all(permisosDefault.map(p => createMutation.mutateAsync(p)));
  };

  const permisosRolActual = localPermisos[selectedRol] || {};

  // Agrupar secciones por categoría
  const seccionesPorCategoria = useMemo(() => {
    const grouped = {};
    seccionesConfig.forEach(seccion => {
      if (!grouped[seccion.categoria]) {
        grouped[seccion.categoria] = [];
      }
      grouped[seccion.categoria].push(seccion);
    });
    return grouped;
  }, []);

  const RolIcon = rolesConfig[selectedRol]?.icon || Shield;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-7 h-7 text-emerald-600" />
              Gestión de Roles y Permisos
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Configura los permisos de acceso para cada rol del sistema
            </p>
          </div>
          <div className="flex gap-2">
            {permisos.length === 0 && (
              <Button
                onClick={handleInicializarPermisos}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Inicializar permisos
              </Button>
            )}
            {hasChanges && (
              <Button
                onClick={handleGuardarCambios}
                disabled={updateMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 gap-2"
              >
                <Save className="w-4 h-4" />
                {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            )}
          </div>
        </header>

        {/* Info Card */}
        {permisos.length === 0 && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-amber-900 font-medium mb-1">
                    No hay permisos configurados
                  </p>
                  <p className="text-sm text-amber-700">
                    Haz clic en "Inicializar permisos" para crear la configuración por defecto de roles y permisos.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs por Rol */}
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <Tabs value={selectedRol} onValueChange={setSelectedRol}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                {Object.entries(rolesConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <TabsTrigger key={key} value={key} className="gap-2">
                      <Icon className="w-4 h-4" />
                      {config.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {Object.keys(rolesConfig).map(rol => (
                <TabsContent key={rol} value={rol} className="space-y-6">
                  {/* Header del rol */}
                  <div className={cn(
                    'flex items-center gap-3 p-4 rounded-lg border',
                    rolesConfig[rol].color
                  )}>
                    <RolIcon className="w-8 h-8" />
                    <div>
                      <h3 className="font-semibold text-lg">{rolesConfig[rol].label}</h3>
                      <p className="text-sm opacity-75">
                        Configura los permisos para este rol
                      </p>
                    </div>
                  </div>

                  {/* Tabla de permisos por categoría */}
                  {Object.entries(seccionesPorCategoria).map(([categoria, secciones]) => (
                    <div key={categoria}>
                      <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <div className="h-1 w-1 bg-emerald-600 rounded-full" />
                        {categoria}
                      </h4>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead className="w-[300px]">Sección</TableHead>
                              <TableHead className="text-center w-24">Ver</TableHead>
                              <TableHead className="text-center w-24">Crear</TableHead>
                              <TableHead className="text-center w-24">Editar</TableHead>
                              <TableHead className="text-center w-24">Eliminar</TableHead>
                              <TableHead className="text-center w-32">Todos</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {secciones.map(seccion => {
                              const permiso = permisosRolActual[seccion.id];
                              if (!permiso) return null;

                              const todosActivos = Object.values(permiso.permisos).every(v => v);

                              return (
                                <TableRow key={seccion.id}>
                                  <TableCell className="font-medium">
                                    {seccion.label}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Switch
                                      checked={permiso.permisos.ver}
                                      onCheckedChange={() => handleTogglePermiso(rol, seccion.id, 'ver')}
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Switch
                                      checked={permiso.permisos.crear}
                                      onCheckedChange={() => handleTogglePermiso(rol, seccion.id, 'crear')}
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Switch
                                      checked={permiso.permisos.editar}
                                      onCheckedChange={() => handleTogglePermiso(rol, seccion.id, 'editar')}
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Switch
                                      checked={permiso.permisos.eliminar}
                                      onCheckedChange={() => handleTogglePermiso(rol, seccion.id, 'eliminar')}
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Button
                                      variant={todosActivos ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => handleToggleSeccion(rol, seccion.id)}
                                      className={cn(
                                        todosActivos && "bg-emerald-600 hover:bg-emerald-700"
                                      )}
                                    >
                                      {todosActivos ? (
                                        <>
                                          <Check className="w-4 h-4 mr-1" />
                                          Todos
                                        </>
                                      ) : (
                                        <>
                                          <X className="w-4 h-4 mr-1" />
                                          Ninguno
                                        </>
                                      )}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Resumen de permisos */}
        <div className="grid md:grid-cols-3 gap-4">
          {Object.entries(rolesConfig).map(([rol, config]) => {
            const permisosRol = localPermisos[rol] || {};
            const totalSecciones = seccionesConfig.length;
            const seccionesConAcceso = Object.values(permisosRol).filter(
              p => p.permisos.ver
            ).length;
            const Icon = config.icon;

            return (
              <Card key={rol} className={cn('border-l-4', config.color.split(' ')[0])}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn('p-2 rounded-lg', config.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{config.label}</h3>
                      <p className="text-xs text-slate-500">Resumen de accesos</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Secciones con acceso:</span>
                      <span className="font-semibold">{seccionesConAcceso}/{totalSecciones}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}