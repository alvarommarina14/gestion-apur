import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Search,
  Shield,
  CheckCircle,
  Copy,
  Edit,
  Save,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SECCIONES_PROFESOR = [
  'dashboard',
  'alumnos',
  'pagos',
  'recordatorios',
  'reportes',
];

const SECCIONES_EMPLEADO = [
  'agenda_canchas',
  'recordatorios_cancha',
  'reportes',
];

export default function GestionPermisosUsuarios() {
  const [search, setSearch] = useState('');
  const [filterRol, setFilterRol] = useState('todos');
  const [editingUser, setEditingUser] = useState(null);
  const [editPermissions, setEditPermissions] = useState({});

  const queryClient = useQueryClient();

  // Obtener usuarios (profesores y empleados)
  const { data: usuarios = [], isLoading: loadingUsuarios } = useQuery({
    queryKey: ['usuarios_permisos'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => ['profesor', 'empleado'].includes(u.rol));
    },
  });

  // Obtener permisos de usuarios
  const { data: permisos = [] } = useQuery({
    queryKey: ['permisos_usuarios'],
    queryFn: () => base44.entities.PermisoUsuario.list(),
  });

  // Mutación para crear/actualizar permisos
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const existing = permisos.find(p => p.usuario_id === data.usuario_id);
      if (existing) {
        await base44.entities.PermisoUsuario.update(existing.id, data);
      } else {
        await base44.entities.PermisoUsuario.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permisos_usuarios'] });
      setEditingUser(null);
      setEditPermissions({});
    },
  });

  const usuariosFiltrados = usuarios.filter(u => {
    const matchSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                       u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRol = filterRol === 'todos' || u.rol === filterRol;
    return matchSearch && matchRol;
  });

  const getPermisosUsuario = (userId) => {
    return permisos.find(p => p.usuario_id === userId);
  };

  const handleEditUser = (user) => {
    const permisoActual = getPermisosUsuario(user.id);
    const secciones = user.rol === 'profesor' ? SECCIONES_PROFESOR : SECCIONES_EMPLEADO;
    
    const seccionesIniciales = secciones.map(sec => {
      const existing = permisoActual?.secciones_acceso?.find(s => s.seccion === sec);
      return existing || { seccion: sec, ver: false, crear: false, editar: false, eliminar: false };
    });

    setEditingUser(user);
    setEditPermissions({
      usuario_id: user.id,
      usuario_email: user.email,
      usuario_nombre: user.full_name,
      usuario_rol: user.rol,
      secciones_acceso: seccionesIniciales,
      activo: permisoActual?.activo ?? true,
    });
  };

  const handlePermissionChange = (seccionIndex, campo, value) => {
    const nuevasSecciones = [...editPermissions.secciones_acceso];
    nuevasSecciones[seccionIndex] = {
      ...nuevasSecciones[seccionIndex],
      [campo]: value,
    };
    setEditPermissions({
      ...editPermissions,
      secciones_acceso: nuevasSecciones,
    });
  };

  const handleSavePermissions = () => {
    saveMutation.mutate(editPermissions);
  };

  const handleDuplicarPermisos = (usuarioSource) => {
    const permisoSource = getPermisosUsuario(usuarioSource.id);
    if (!permisoSource) {
      alert('Este usuario no tiene permisos configurados');
      return;
    }

    // Copiar al portapapeles
    const texto = JSON.stringify(permisoSource.secciones_acceso);
    navigator.clipboard.writeText(texto);
    alert('Permisos copiados al portapapeles');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Permisos de Usuarios</h1>
          <p className="text-slate-500 text-sm">
            Configura accesos individuales para profesores y empleados
          </p>
        </header>

        {/* Filters */}
        <Card className="shadow-sm">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterRol} onValueChange={setFilterRol}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="profesor">Profesores</SelectItem>
                  <SelectItem value="empleado">Empleados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de usuarios */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg">Usuarios</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Permisos</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingUsuarios ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : usuariosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No hay usuarios
                      </TableCell>
                    </TableRow>
                  ) : (
                    usuariosFiltrados.map((user) => {
                      const userPermisos = getPermisosUsuario(user.id);
                      const seccionesConAcceso = userPermisos?.secciones_acceso?.filter(s => s.ver).length || 0;
                      const totalSecciones = user.rol === 'profesor' ? SECCIONES_PROFESOR.length : SECCIONES_EMPLEADO.length;

                      return (
                        <TableRow key={user.id} className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-800">
                            {user.full_name}
                          </TableCell>
                          <TableCell className="text-slate-600 text-sm">
                            {user.email}
                          </TableCell>
                          <TableCell>
                            <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                              {user.rol}
                            </span>
                          </TableCell>
                          <TableCell>
                            {userPermisos ? (
                              <span className="text-sm text-slate-600">
                                {seccionesConAcceso}/{totalSecciones} secciones
                              </span>
                            ) : (
                              <span className="text-sm text-slate-400">Sin configurar</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditUser(user)}
                                className="h-8 px-3"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDuplicarPermisos(user)}
                                className="h-8 px-3"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de edición de permisos */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              Permisos de {editingUser?.full_name}
            </DialogTitle>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-6">
              {/* Info del usuario */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Email:</span> {editingUser.email}
                </p>
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Rol:</span> <span className="capitalize">{editingUser.rol}</span>
                </p>
              </div>

              {/* Secciones y permisos */}
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900">Permisos por sección</h4>
                
                {editPermissions.secciones_acceso?.map((seccion, idx) => (
                  <div key={seccion.seccion} className="border rounded-lg p-4 space-y-3">
                    <h5 className="font-medium text-slate-800 capitalize">
                      {seccion.seccion.replace(/_/g, ' ')}
                    </h5>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {['ver', 'crear', 'editar', 'eliminar'].map((permisoType) => (
                        <div key={permisoType} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${seccion.seccion}-${permisoType}`}
                            checked={seccion[permisoType] || false}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(idx, permisoType, checked)
                            }
                          />
                          <Label
                            htmlFor={`${seccion.seccion}-${permisoType}`}
                            className="text-sm font-medium cursor-pointer capitalize"
                          >
                            {permisoType}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Estado activo */}
              <div className="flex items-center space-x-2 border-t pt-4">
                <Checkbox
                  id="activo"
                  checked={editPermissions.activo}
                  onCheckedChange={(checked) =>
                    setEditPermissions({ ...editPermissions, activo: checked })
                  }
                />
                <Label htmlFor="activo" className="text-sm font-medium cursor-pointer">
                  Permisos activos
                </Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSavePermissions}
              disabled={saveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? 'Guardando...' : 'Guardar permisos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}