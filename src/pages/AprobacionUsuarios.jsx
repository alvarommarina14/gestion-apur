import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock, Mail, Phone } from 'lucide-react';

export default function AprobacionUsuarios() {
  const queryClient = useQueryClient();

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios-pendientes'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.estado_aprobacion === 'pendiente' && u.rol === 'admin');
    },
  });

  const aprobarMutation = useMutation({
    mutationFn: async (userId) => {
      await base44.entities.User.update(userId, { estado_aprobacion: 'aprobado' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-pendientes'] });
    },
  });

  const rechazarMutation = useMutation({
    mutationFn: async (userId) => {
      await base44.entities.User.update(userId, { estado_aprobacion: 'rechazado' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-pendientes'] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Aprobación de Usuarios
        </h1>
        <p className="text-slate-600">
          Revisa y aprueba las solicitudes de acceso como administrador
        </p>
      </div>

      {usuarios.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg">
              No hay solicitudes pendientes de aprobación
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {usuarios.map((usuario) => (
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
                    onClick={() => aprobarMutation.mutate(usuario.id)}
                    disabled={aprobarMutation.isPending}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Aprobar
                  </Button>
                  <Button
                    onClick={() => {
                      if (confirm('¿Estás seguro de rechazar esta solicitud?')) {
                        rechazarMutation.mutate(usuario.id);
                      }
                    }}
                    disabled={rechazarMutation.isPending}
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
    </div>
  );
}