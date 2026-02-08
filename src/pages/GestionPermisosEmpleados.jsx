import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, Edit, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function GestionPermisosEmpleados() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState({ open: false, empleado: null });
  const [permisos, setPermisos] = useState({});

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: empleados = [], isLoading } = useQuery({
    queryKey: ['empleados-permisos'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: permisosPorUsuario = [] } = useQuery({
    queryKey: ['permisos-usuario'],
    queryFn: () => base44.entities.PermisoUsuario.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empleados-permisos'] });
      setModal({ open: false, empleado: null });
    },
  });

  const secciones = [
    { id: 'tareas', nombre: 'Tareas', icon: '✅' },
    { id: 'agenda', nombre: 'Agenda de Canchas', icon: '📅' },
    { id: 'recordatorios', nombre: 'Recordatorios', icon: '🔔' },
    { id: 'reportes', nombre: 'Reportes', icon: '📊' },
  ];

  const handleOpenModal = (empleado) => {
    const permisosEmpleado = permisosPorUsuario.find(p => p.usuario_id === empleado.id);
    setPermisos(permisosEmpleado?.secciones_acceso || {});
    setModal({ open: true, empleado });
  };

  const handleTogglePermiso = (seccion, permiso) => {
    setPermisos({
      ...permisos,
      [seccion]: {
        ...(permisos[seccion] || {}),
        [permiso]: !permisos[seccion]?.[permiso],
      },
    });
  };

  const handleGuardarPermisos = () => {
    const datosPermiso = {
      ...permisos,
    };

    updateMutation.mutate({
      id: modal.empleado.id,
      data: {
        permisos_secciones: datosPermiso,
      },
    });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Permisos de Empleados</h1>
            <p className="text-slate-500 text-sm">Administrar acceso a secciones por empleado</p>
          </div>
        </header>

        {/* Lista */}
        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Empleados y sus permisos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">Cargando...</div>
            ) : empleados.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No hay empleados registrados</p>
              </div>
            ) : (
              <div className="divide-y">
                {empleados.map((empleado) => {
                  const tienePermisos = permisosPorUsuario.find(p => p.usuario_id === empleado.id);
                  return (
                    <div key={empleado.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <h3 className="font-semibold text-slate-900">{empleado.full_name}</h3>
                          <p className="text-sm text-slate-600">{empleado.email}</p>
                          {tienePermisos && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {Object.entries(tienePermisos.secciones_acceso || {}).map(([seccion, config]) => (
                                config.ver && (
                                  <Badge key={seccion} className="bg-blue-100 text-blue-700 text-xs">
                                    {secciones.find(s => s.id === seccion)?.nombre}
                                  </Badge>
                                )
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => handleOpenModal(empleado)}
                          className="h-9"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      <Dialog open={modal.open} onOpenChange={(open) => setModal({ ...modal, open })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Permisos: {modal.empleado?.full_name}</DialogTitle>
            <DialogDescription>
              Selecciona qué secciones puede acceder este empleado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {secciones.map((seccion) => (
              <div key={seccion.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="font-semibold text-base">
                    {seccion.icon} {seccion.nombre}
                  </Label>
                  <Checkbox
                    checked={permisos[seccion.id]?.ver || false}
                    onCheckedChange={() => handleTogglePermiso(seccion.id, 'ver')}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  {seccion.id === 'tareas' && 'Ver y completar tareas asignadas'}
                  {seccion.id === 'agenda' && 'Ver agenda y turnos de canchas'}
                  {seccion.id === 'recordatorios' && 'Ver y gestionar recordatorios'}
                  {seccion.id === 'reportes' && 'Acceder a reportes y estadísticas'}
                </p>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setModal({ open: false, empleado: null })}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleGuardarPermisos}
              disabled={updateMutation.isPending}
            >
              Guardar permisos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}