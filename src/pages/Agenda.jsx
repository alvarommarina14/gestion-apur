import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, ChevronLeft, ChevronRight, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import VistaCalendarioCancha from '@/components/agenda/VistaCalendarioCancha';
import NuevoTurnoModal from '@/components/agenda/NuevoTurnoModal';
import { cn } from '@/lib/utils';

export default function Agenda() {
  const queryClient = useQueryClient();
  const [vista, setVista] = useState('dia');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCancha, setSelectedCancha] = useState('todas');
  const [turnoModal, setTurnoModal] = useState({ open: false, turno: null });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: turnos = [], isLoading } = useQuery({
    queryKey: ['turnos-cancha'],
    queryFn: () => base44.entities.TurnoCancha.list('-fecha'),
  });

  const isAdmin = user?.role === 'admin';

  const turnosFiltrados = useMemo(() => {
    const fechaStr = format(selectedDate, 'yyyy-MM-dd');
    let filtered = turnos.filter(t => t.fecha === fechaStr);
    
    if (selectedCancha !== 'todas') {
      filtered = filtered.filter(t => t.cancha === selectedCancha);
    }
    
    return filtered;
  }, [turnos, selectedDate, selectedCancha]);

  const turnosPendientesPago = useMemo(() => {
    const hoy = format(new Date(), 'yyyy-MM-dd');
    return turnos.filter(t => t.fecha === hoy && !t.pagado);
  }, [turnos]);

  const stats = useMemo(() => {
    const total = turnosFiltrados.length;
    const pagados = turnosFiltrados.filter(t => t.pagado).length;
    const pendientes = total - pagados;
    const montoPagado = turnosFiltrados.filter(t => t.pagado).reduce((sum, t) => sum + (t.monto || 0), 0);
    const montoPendiente = turnosFiltrados.filter(t => !t.pagado).reduce((sum, t) => sum + (t.monto || 0), 0);
    
    return { total, pagados, pendientes, montoPagado, montoPendiente };
  }, [turnosFiltrados]);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1));
  const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const handleToday = () => setSelectedDate(new Date());

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Agenda de Canchas</h1>
            <p className="text-slate-500 text-sm">Sistema de reservas del club</p>
          </div>
          {isAdmin && (
            <Button
              onClick={() => setTurnoModal({ open: true, turno: null })}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo turno
            </Button>
          )}
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-sm text-slate-500 mt-1">Turnos</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{stats.pagados}</p>
                <p className="text-sm text-slate-500 mt-1">Pagados</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-rose-200 bg-rose-50/30">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-rose-600">{stats.pendientes}</p>
                <p className="text-sm text-slate-500 mt-1">Pendientes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-blue-200 bg-blue-50/30">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-lg font-bold text-blue-600">{formatMoney(stats.montoPagado)}</p>
                <p className="text-xs text-slate-500 mt-1">
                  de {formatMoney(stats.montoPagado + stats.montoPendiente)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controles */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handlePrevDay}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-[200px] text-center">
              <p className="font-semibold text-slate-900">
                {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
              </p>
              <p className="text-xs text-slate-500">{format(selectedDate, 'yyyy')}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleNextDay}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              Hoy
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedCancha} onValueChange={setSelectedCancha}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las canchas</SelectItem>
                <SelectItem value="1">Cancha 1</SelectItem>
                <SelectItem value="2">Cancha 2</SelectItem>
                <SelectItem value="3">Cancha 3</SelectItem>
                <SelectItem value="4">Cancha 4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Alerta de pagos pendientes */}
        {turnosPendientesPago.length > 0 && (
          <Card className="shadow-sm border-rose-200 bg-rose-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-rose-900">
                    ⚠️ {turnosPendientesPago.length} turno(s) pendiente(s) de pago hoy
                  </p>
                  <p className="text-sm text-rose-700 mt-0.5">
                    Total a cobrar: {formatMoney(turnosPendientesPago.reduce((sum, t) => sum + (t.monto || 0), 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vista de calendario */}
        <VistaCalendarioCancha
          turnos={turnosFiltrados}
          fecha={selectedDate}
          isAdmin={isAdmin}
          onTurnoClick={(turno) => isAdmin && setTurnoModal({ open: true, turno })}
          isLoading={isLoading}
        />
      </div>

      {/* Modal */}
      {isAdmin && (
        <NuevoTurnoModal
          open={turnoModal.open}
          onOpenChange={(open) => setTurnoModal({ ...turnoModal, open })}
          turno={turnoModal.turno}
          fecha={selectedDate}
        />
      )}
    </div>
  );
}