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
    mutationFn: async (profesorId) => {
      const recordatoriosAEliminar = recordatorios.filter(rec => {
        const alumno = alumnos.find(a => a.id === rec.alumno_id);
        return alumno?.profesor_id === profesorId;
      });
      
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
        
        {/* Recordatorios pendientes */}
         <RecordatoriosPendientes compact={false} />
      </div>
    </div>
  );
}