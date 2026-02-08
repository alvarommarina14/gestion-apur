import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import NuevaListaEsperaModal from './NuevaListaEsperaModal';

const niveles = { principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado' };
const tiposClase = { individual: 'Individual', grupal: 'Grupal' };

export default function ListaEsperaPanel() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: listaEspera = [] } = useQuery({
    queryKey: ['lista-espera'],
    queryFn: async () => {
      return await base44.entities.ListaEspera.filter({ estado: 'espera' });
    }
  });

  const eliminarMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.ListaEspera.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lista-espera'] });
    }
  });

  const asignarMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.ListaEspera.update(id, { estado: 'asignado' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lista-espera'] });
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-900">Lista de Espera ({listaEspera.length})</h2>
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 gap-2"
        >
          <Plus className="w-4 h-4" />
          Agregar
        </Button>
      </div>

      {listaEspera.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-slate-600">No hay solicitudes en lista de espera</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {listaEspera.map((solicitud) => (
            <Card key={solicitud.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{solicitud.nombre}</h3>
                    <p className="text-sm text-slate-600">{solicitud.telefono}</p>
                    {solicitud.email && (
                      <p className="text-sm text-slate-600">{solicitud.email}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{niveles[solicitud.nivel]}</Badge>
                    <Badge className={cn(
                      solicitud.tipo_clase === 'individual' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    )}>
                      {tiposClase[solicitud.tipo_clase]}
                    </Badge>
                  </div>
                </div>

                {/* Días y horarios */}
                <div className="grid grid-cols-2 gap-3 mb-3 pb-3 border-b">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Días</p>
                    <p className="text-sm text-slate-700 capitalize">
                      {solicitud.dias_disponibles?.join(', ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Horario</p>
                    <p className="text-sm text-slate-700">
                      {solicitud.hora_inicio} - {solicitud.hora_fin}
                    </p>
                  </div>
                </div>

                {/* Notas */}
                {solicitud.notas && (
                  <div className="mb-3 pb-3 border-b">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Notas</p>
                    <p className="text-sm text-slate-700">{solicitud.notas}</p>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => asignarMutation.mutate(solicitud.id)}
                    disabled={asignarMutation.isPending}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 gap-2 flex-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Asignado
                  </Button>
                  <Button
                    onClick={() => eliminarMutation.mutate(solicitud.id)}
                    disabled={eliminarMutation.isPending}
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NuevaListaEsperaModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}