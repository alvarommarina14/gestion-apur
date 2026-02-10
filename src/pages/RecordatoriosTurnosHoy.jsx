import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, Users, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function RecordatoriosTurnosHoy() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();
  const hoy = format(new Date(), 'yyyy-MM-dd');

  // Fetch user
  useEffect(() => {
    const getUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    getUser();
  }, []);

  // Fetch turnos de hoy
  const { data: todayTurnos = [], isLoading: turnosLoading } = useQuery({
    queryKey: ['turnos-hoy'],
    queryFn: async () => {
      const allTurnos = await base44.entities.TurnoCancha.list();
      return allTurnos.filter(t => t.fecha === hoy && t.estado === 'activo');
    },
    refetchInterval: 60000, // Refrescar cada minuto
  });

  // Fetch clases de hoy
  const { data: todayClases = [], isLoading: clasesLoading } = useQuery({
    queryKey: ['clases-hoy'],
    queryFn: async () => {
      const allClases = await base44.entities.Clase.list();
      return allClases.filter(c => 
        c.fecha === hoy && 
        (c.estado === 'programada' || c.estado === 'realizada')
      );
    },
    refetchInterval: 60000,
  });

  // Combinar y ordenar turnos y clases
  const getAllItems = () => {
    const items = [
      ...todayTurnos.map(t => ({
        ...t,
        type: 'turno',
        hora: t.hora_inicio,
        titulo: t.cliente,
        icon: t.tipo_turno === 'clase' ? '📚' : '🎾',
      })),
      ...todayClases.map(c => ({
        ...c,
        type: 'clase',
        hora: c.hora_inicio,
        titulo: c.alumnos_nombres?.[0] || 'Clase',
        icon: '👥',
      }))
    ];

    return items.sort((a, b) => a.hora.localeCompare(b.hora));
  };

  const allItems = getAllItems();

  const handleMarcarRealizado = async (item) => {
    try {
      if (item.type === 'turno') {
        await base44.entities.TurnoCancha.update(item.id, {
          estado: 'cancelado'
        });
      } else if (item.type === 'clase') {
        await base44.entities.Clase.update(item.id, {
          estado: 'realizada'
        });
      }
      queryClient.invalidateQueries({ queryKey: ['turnos-hoy'] });
      queryClient.invalidateQueries({ queryKey: ['clases-hoy'] });
      toast.success('Marcado como realizado');
    } catch (error) {
      toast.error('Error: ' + error.message);
    }
  };

  const getTypeLabel = (item) => {
    if (item.type === 'clase') return 'Clase';
    if (item.modalidad_alquiler === 'abono') return 'Alquiler - Abono';
    return 'Alquiler - Suelto';
  };

  const getTypeColor = (item) => {
    if (item.type === 'clase') return 'bg-blue-50 border-blue-200 text-blue-700';
    if (item.modalidad_alquiler === 'abono') return 'bg-purple-50 border-purple-200 text-purple-700';
    return 'bg-emerald-50 border-emerald-200 text-emerald-700';
  };

  const isLoading = turnosLoading || clasesLoading;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Recordatorios de Turnos Hoy</h1>
        <p className="text-slate-500 text-sm mt-1">
          {format(new Date(), 'EEEE, d MMMM yyyy', { locale: es })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">{allItems.length}</div>
              <p className="text-sm text-slate-500">Turnos totales</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {todayClases.filter(c => c.estado === 'programada').length}
              </div>
              <p className="text-sm text-slate-500">Clases</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {todayTurnos.filter(t => t.tipo_turno === 'alquiler').length}
              </div>
              <p className="text-sm text-slate-500">Alquileres</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de turnos */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      ) : allItems.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No hay turnos registrados para hoy</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {allItems.map((item) => (
            <Card key={`${item.type}-${item.id}`} className="overflow-hidden">
              <div className="flex items-start justify-between p-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{item.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900 text-lg">
                          {item.titulo}
                        </h3>
                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium border',
                          getTypeColor(item)
                        )}>
                          {getTypeLabel(item)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{item.hora_inicio || item.hora}</span>
                        </div>
                        {item.cancha && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">Cancha {item.cancha}</span>
                          </div>
                        )}
                      </div>

                      {/* Detalles adicionales */}
                      {item.type === 'clase' && item.alumnos_nombres && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
                          <Users className="w-4 h-4" />
                          <span>{item.alumnos_nombres.join(', ')}</span>
                        </div>
                      )}

                      {item.type === 'turno' && item.monto && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
                          <DollarSign className="w-4 h-4" />
                          <span>${item.monto}</span>
                          {item.pagado && (
                            <span className="text-green-600 font-medium">✓ Pagado</span>
                          )}
                        </div>
                      )}

                      {item.notas && (
                        <p className="text-sm text-slate-600 mt-2 italic">
                          "{item.notas}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleMarcarRealizado(item)}
                  variant="outline"
                  size="sm"
                  className="ml-4 gap-2 whitespace-nowrap"
                >
                  <CheckCircle className="w-4 h-4" />
                  Realizado
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}