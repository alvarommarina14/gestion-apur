import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import RecordatoriosCanchaHoy from '@/components/agenda/RecordatoriosCanchaHoy';

export default function RecordatoriosCanchaHoyPage() {
  const fechaHoy = new Date();
  const fechaStr = format(fechaHoy, 'yyyy-MM-dd');

  const { data: turnos = [], isLoading } = useQuery({
    queryKey: ['turnos-cancha', fechaStr],
    queryFn: async () => {
      const dayTurnos = await base44.entities.TurnoCancha.filter({ fecha: fechaStr });
      return dayTurnos.filter(t => t.estado !== 'cancelado');
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className="text-center py-12">
          <p className="text-slate-500">Cargando recordatorios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
      <RecordatoriosCanchaHoy turnos={turnos} fecha={fechaHoy} />
    </div>
  );
}