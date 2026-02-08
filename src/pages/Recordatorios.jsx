import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, CheckCircle, Clock, XCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import MetricCard from '@/components/ui/MetricCard';
import RecordatoriosPendientes from '@/components/recordatorios/RecordatoriosPendientes';

export default function RecordatoriosPage() {
  const queryClient = useQueryClient();
  const [deletingProfesor, setDeletingProfesor] = useState(null);
  
  const { data: recordatorios = [] } = useQuery({
    queryKey: ['recordatorios'],
    queryFn: () => base44.entities.Recordatorio.list('-created_date'),
  });

  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
  });
  
  // Agrupar recordatorios por profesor
  const recordatoriosPorProfesor = useMemo(() => {
    const grouped = {};
    recordatorios.forEach(rec => {
      const alumno = alumnos.find(a => a.id === rec.alumno_id);
      if (alumno?.profesor_id) {
        const profesorId = alumno.profesor_id;
        if (!grouped[profesorId]) {
          grouped[profesorId] = { profesor_id: profesorId, recordatorios: [] };
        }
        grouped[profesorId].recordatorios.push(rec);
      }
    });
    return Object.values(grouped);
  }, [recordatorios, alumnos]);
  
  // Stats
  const stats = useMemo(() => ({
    pendientes: recordatorios.filter(r => r.estado === 'pendiente').length,
    enviados: recordatorios.filter(r => r.estado === 'enviado').length,
    cancelados: recordatorios.filter(r => r.estado === 'cancelado').length,
    total: recordatorios.length,
  }), [recordatorios]);

  const deleteMutation = useMutation({
    mutationFn: async (target) => {
      let recordatoriosAEliminar;
      
      if (target === 'enviados') {
        // Eliminar todos los enviados
        recordatoriosAEliminar = recordatorios.filter(rec => rec.estado === 'enviado');
      } else {
        // Eliminar todos de un profesor
        recordatoriosAEliminar = recordatorios.filter(rec => {
          const alumno = alumnos.find(a => a.id === rec.alumno_id);
          return alumno?.profesor_id === target;
        });
      }
      
      await Promise.all(
        recordatoriosAEliminar.map(rec => base44.entities.Recordatorio.delete(rec.id))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordatorios'] });
      setDeletingProfesor(null);
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Recordatorios</h1>
          <p className="text-slate-500 text-sm">
            Gestión de recordatorios de pago enviados
          </p>
        </header>
        
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Pendientes"
            value={stats.pendientes}
            icon={Clock}
            variant={stats.pendientes > 0 ? 'warning' : 'default'}
          />
          <MetricCard
            title="Enviados"
            value={stats.enviados}
            icon={CheckCircle}
            variant="success"
          />
          <MetricCard
            title="Cancelados"
            value={stats.cancelados}
            icon={XCircle}
            variant="default"
          />
          <MetricCard
            title="Total"
            value={stats.total}
            icon={Bell}
            variant="info"
          />
        </div>
        
        {/* Recordatorios Enviados - Limpiar rápido */}
        {stats.enviados > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">Limpiar recordatorios enviados</p>
                <p className="text-sm text-slate-500">{stats.enviados} recordatorio{stats.enviados !== 1 ? 's' : ''} para eliminar</p>
              </div>
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm(`¿Eliminar los ${stats.enviados} recordatorios enviados?`)) {
                    deleteMutation.mutate('enviados');
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar enviados'}
              </Button>
            </CardContent>
          </Card>
        )}
        
        {/* Recordatorios por profesor */}
        {recordatoriosPorProfesor.length > 0 && (
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">Recordatorios por profesor</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {recordatoriosPorProfesor.map((grupo) => {
                  const profesor = recordatorios.find(r => {
                    const alumno = alumnos.find(a => a.id === r.alumno_id);
                    return alumno?.profesor_id === grupo.profesor_id;
                  });
                  const alumno = profesor ? alumnos.find(a => a.id === profesor.alumno_id) : null;
                  const profesorData = alumno ? { id: grupo.profesor_id, nombre: alumno.profesor_nombre } : null;
                  
                  return (
                    <div key={grupo.profesor_id} className="p-4 rounded-lg border bg-white hover:shadow-sm transition-shadow flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800">{profesorData?.nombre || 'Profesor desconocido'}</p>
                        <p className="text-sm text-slate-500">
                          {grupo.recordatorios.length} recordatorio{grupo.recordatorios.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm(`¿Eliminar todos los ${grupo.recordatorios.length} recordatorios de este profesor?`)) {
                            deleteMutation.mutate(grupo.profesor_id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar todo'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Recordatorios pendientes */}
         <RecordatoriosPendientes compact={false} />
      </div>
    </div>
  );
}