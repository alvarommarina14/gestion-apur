import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle, Clock, MapPin, User, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';


export default function RecordatoriosCanchaEmpleado() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: recordatorios = [], isLoading } = useQuery({
    queryKey: ['recordatorios-cancha', selectedDate],
    queryFn: () => base44.entities.RecordatorioCancha.filter({ fecha: selectedDate }),
    staleTime: 30000,
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos-cancha', selectedDate],
    queryFn: () => base44.entities.TurnoCancha.filter({ fecha: selectedDate }),
    staleTime: 30000,
  });

  const marcarHechoMutation = useMutation({
    mutationFn: async (recordatorio) => {
      await base44.entities.RecordatorioCancha.update(recordatorio.id, {
        estado: 'hecho',
        hecho_por: user.email,
        hecho_por_nombre: user.full_name,
        hora_confirmacion: new Date().toISOString(),
      });

      if (recordatorio.turno_cancha_id) {
        await base44.entities.TurnoCancha.update(recordatorio.turno_cancha_id, {
          pagado: true,
        });
      }

      if (recordatorio.repeticion_semanal) {
        const fechaActual = parseISO(recordatorio.fecha);
        const proximaSemana = new Date(fechaActual);
        proximaSemana.setDate(proximaSemana.getDate() + 7);

        await base44.entities.RecordatorioCancha.create({
          fecha: format(proximaSemana, 'yyyy-MM-dd'),
          hora: recordatorio.hora,
          cancha: recordatorio.cancha,
          profesor: recordatorio.profesor,
          monto: recordatorio.monto,
          repeticion_semanal: true,
          dia_semana: format(proximaSemana, 'EEEE', { locale: es }),
          recordatorio_base_id: recordatorio.recordatorio_base_id || recordatorio.id,
          notas: recordatorio.notas,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordatorios-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
    },
  });

  const itemsCombinados = useMemo(() => {
    const items = [];

    // Agregar turnos de cancha del día
    turnos.forEach(turno => {
      items.push({
        id: turno.id,
        tipo: 'turno',
        hora_inicio: turno.hora_inicio,
        cancha: turno.cancha,
        cliente: turno.cliente,
        tipo_turno: turno.tipo_turno,
        modalidad_alquiler: turno.modalidad_alquiler,
        monto: turno.monto,
        pagado: turno.pagado,
        profesor: turno.profesor,
        estado: 'pendiente',
        data: turno,
      });
    });

    // Agregar recordatorios de cancha del día
    recordatorios.forEach(rec => {
      items.push({
        id: rec.id,
        tipo: 'recordatorio',
        hora_inicio: rec.hora,
        cancha: rec.cancha,
        cliente: rec.cliente,
        tipo_turno: rec.tipo_turno,
        modalidad_alquiler: rec.modalidad_alquiler,
        monto: rec.monto,
        pagado: rec.pagado,
        profesor: rec.profesor,
        estado: rec.estado,
        repeticion_semanal: rec.repeticion_semanal,
        hecho_por_nombre: rec.hecho_por_nombre,
        hora_confirmacion: rec.hora_confirmacion,
        data: rec,
      });
    });

    // Ordenar por hora y estado
    return items.sort((a, b) => {
      const estadoOrder = { pendiente: 0, hecho: 1 };
      if (estadoOrder[a.estado] !== estadoOrder[b.estado]) {
        return estadoOrder[a.estado] - estadoOrder[b.estado];
      }
      return (a.hora_inicio || '').localeCompare(b.hora_inicio || '');
    });
  }, [recordatorios, turnos]);

  const stats = useMemo(() => {
    const pendientes = itemsCombinados.filter(i => i.estado === 'pendiente').length;
    const hechos = itemsCombinados.filter(i => i.estado === 'hecho').length;
    const total = itemsCombinados.length;
    return { pendientes, hechos, total };
  }, [itemsCombinados]);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Recordatorios de Cancha</h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            {format(parseISO(selectedDate), "EEEE d 'de' MMMM, yyyy", { locale: es })}
          </p>
        </header>

        {/* Selector de fecha */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">Seleccionar fecha</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card className="shadow-sm">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-amber-200 bg-amber-50/30">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-amber-600">{stats.pendientes}</p>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Pendientes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{stats.hechos}</p>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Completados</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de recordatorios */}
        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Recordatorios de hoy</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">
                <Clock className="w-8 h-8 animate-spin mx-auto mb-2 opacity-40" />
                <p>Cargando...</p>
              </div>
            ) : itemsCombinados.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No hay turnos ni recordatorios para hoy</p>
              </div>
            ) : (
              <div className="divide-y">
                {itemsCombinados.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'p-4 transition-all',
                      item.estado === 'hecho' ? 'bg-slate-50' : 'bg-white hover:bg-slate-50/50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'px-3 py-1 rounded-lg font-semibold text-lg',
                            item.estado === 'hecho' 
                              ? 'bg-slate-200 text-slate-500' 
                              : 'bg-emerald-100 text-emerald-700'
                          )}>
                            {item.hora_inicio}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              <span className={cn(
                                'font-medium',
                                item.estado === 'hecho' ? 'text-slate-500 line-through' : 'text-slate-800'
                              )}>
                                Cancha {item.cancha}
                              </span>
                            </div>
                            {item.profesor && (
                              <div className="flex items-center gap-2 mt-1">
                                <User className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-600">{item.profesor}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-sm flex-wrap">
                          <span className={cn(
                            "px-2 py-0.5 text-xs font-medium rounded",
                            item.tipo_turno === 'clase' 
                              ? "bg-blue-100 text-blue-700" 
                              : "bg-purple-100 text-purple-700"
                          )}>
                            {item.tipo_turno === 'clase' ? '📚 Clase' : '🎾 Alquiler'}
                            {item.modalidad_alquiler && ` (${item.modalidad_alquiler})`}
                          </span>
                          {item.cliente && (
                            <span className="text-xs text-slate-600">
                              👤 {item.cliente}
                            </span>
                          )}
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-slate-400" />
                            <span className="font-semibold text-slate-700">
                              {formatMoney(item.monto)}
                            </span>
                            {item.pagado && (
                              <CheckCircle className="w-4 h-4 text-emerald-600 ml-1" />
                            )}
                          </div>
                          {item.repeticion_semanal && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                              Semanal
                            </span>
                          )}
                        </div>

                        {item.estado === 'hecho' && (
                          <div className="text-xs text-slate-500 pt-1">
                            ✓ Confirmado por {item.hecho_por_nombre} a las{' '}
                            {format(parseISO(item.hora_confirmacion), 'HH:mm')}
                          </div>
                        )}
                        </div>

                        <div className="flex items-center gap-2 text-slate-400 shrink-0">
                        <Eye className="w-5 h-5" />
                        <span className="text-sm font-medium">Ver</span>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}