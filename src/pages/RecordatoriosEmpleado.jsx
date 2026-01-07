import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO, subDays, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function RecordatoriosEmpleado() {
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: recordatorios = [], isLoading } = useQuery({
    queryKey: ['recordatorios-club'],
    queryFn: () => base44.entities.RecordatorioClub.list('-fecha_hora'),
  });

  const marcarHechoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RecordatorioClub.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordatorios-club'] });
    },
  });

  // Filtrar recordatorios del usuario
  const misRecordatorios = useMemo(() => {
    if (!currentUser) return [];
    return recordatorios.filter(r => r.asignado_a === currentUser.id);
  }, [recordatorios, currentUser]);

  // Separar pendientes y últimos 7 días
  const pendientes = misRecordatorios.filter(r => r.estado === 'PENDIENTE');
  
  const ultimos7Dias = misRecordatorios.filter(r => {
    if (r.estado !== 'HECHO') return false;
    const hace7Dias = subDays(new Date(), 7);
    return isAfter(parseISO(r.fecha), hace7Dias);
  });

  const handleMarcarHecho = async (recordatorio) => {
    await marcarHechoMutation.mutateAsync({
      id: recordatorio.id,
      data: {
        estado: 'HECHO',
        marcado_por: currentUser.email,
        marcado_por_nombre: currentUser.full_name,
        completado_en: new Date().toISOString(),
      },
    });
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Mis recordatorios</h1>
          <p className="text-slate-500 text-sm">
            Hola {currentUser?.full_name}, aquí están tus tareas pendientes
          </p>
        </header>

        {/* Pendientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-amber-600" />
              Pendientes ({pendientes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendientes.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>¡Todo al día! No hay tareas pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendientes.map(rec => (
                  <TareaCard
                    key={rec.id}
                    recordatorio={rec}
                    onMarcarHecho={handleMarcarHecho}
                    formatMoney={formatMoney}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Histórico últimos 7 días */}
        {ultimos7Dias.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Completados (últimos 7 días)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ultimos7Dias.map(rec => (
                  <div
                    key={rec.id}
                    className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 opacity-60"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <span className="font-semibold">
                        {rec.hora} - {format(parseISO(rec.fecha), "d 'de' MMM", { locale: es })}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        {rec.cancha}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm ml-8">
                      <span>{rec.accion}</span>
                      {rec.monto > 0 && (
                        <span className="text-emerald-600 font-semibold">{formatMoney(rec.monto)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function TareaCard({ recordatorio, onMarcarHecho, formatMoney }) {
  const [loading, setLoading] = React.useState(false);

  const handleClick = async () => {
    setLoading(true);
    await onMarcarHecho(recordatorio);
    setLoading(false);
  };

  return (
    <Card className="border-2 border-slate-200 hover:border-emerald-300 transition-all">
      <CardContent className="p-5">
        <div className="space-y-4">
          {/* Info principal */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  <Clock className="w-5 h-5 text-amber-600" />
                  {recordatorio.hora}
                </div>
                <span className="text-sm text-slate-500">
                  {format(parseISO(recordatorio.fecha), "EEEE d 'de' MMMM", { locale: es })}
                </span>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200">
                  <span className="text-xl">🎾</span>
                  <span className="font-semibold text-blue-900">{recordatorio.cancha}</span>
                </div>
                
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200">
                  <span className="text-xl">👉</span>
                  <span className="font-semibold text-purple-900">{recordatorio.accion}</span>
                </div>

                {recordatorio.monto > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="text-xl">💵</span>
                    <span className="font-semibold text-emerald-900">{formatMoney(recordatorio.monto)}</span>
                  </div>
                )}
              </div>

              {recordatorio.notas && (
                <p className="text-sm text-slate-600 italic bg-slate-50 p-3 rounded border border-slate-200">
                  {recordatorio.notas}
                </p>
              )}
            </div>
          </div>

          {/* Botón grande */}
          <Button
            onClick={handleClick}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg font-semibold"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            {loading ? 'Marcando...' : 'Marcar HECHO'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}