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
import CalendarioCompleto from '@/components/agenda/CalendarioCompleto';
import NuevoTurnoModal from '@/components/agenda/NuevoTurnoModal';
import { cn } from '@/lib/utils';

export default function Agenda() {
  const queryClient = useQueryClient();
  const [vista, setVista] = useState('dia');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCancha, setSelectedCancha] = useState('todas');
  const [turnoModal, setTurnoModal] = useState({ open: false, turno: null });
  const [showCalendario, setShowCalendario] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const fechaStr = format(selectedDate, 'yyyy-MM-dd');

  // Para vista de calendario, cargar todos los turnos del mes
  const mesStr = format(selectedDate, 'yyyy-MM');
  
  const { data: turnos = [], isLoading } = useQuery({
    queryKey: ['turnos-cancha', showCalendario ? mesStr : fechaStr],
    queryFn: () => {
      if (showCalendario) {
        // Cargar todos los turnos del mes para el calendario
        return base44.entities.TurnoCancha.list('-fecha', 500);
      }
      return base44.entities.TurnoCancha.filter({ fecha: fechaStr });
    },
  });

  const { data: recordatorios = [] } = useQuery({
    queryKey: ['recordatorios-cancha', showCalendario ? mesStr : fechaStr],
    queryFn: () => {
      if (showCalendario) {
        // Cargar todos los recordatorios del mes para el calendario
        return base44.entities.RecordatorioCancha.list('-fecha', 500);
      }
      return base44.entities.RecordatorioCancha.filter({ fecha: fechaStr });
    },
  });

  const isAdmin = user?.role === 'admin';

  const turnosFiltrados = useMemo(() => {
    let filtered = [...turnos];
    
    if (selectedCancha !== 'todas') {
      filtered = filtered.filter(t => t.cancha === selectedCancha);
    }
    
    return filtered;
  }, [turnos, selectedCancha]);

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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Agenda de Canchas</h1>
            <p className="text-slate-500 text-sm">Sistema de reservas del club</p>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="shadow-sm">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Turnos</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-emerald-200 bg-emerald-50/30">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-emerald-600">{stats.pagados}</p>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Pagados</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-rose-200 bg-rose-50/30">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-rose-600">{stats.pendientes}</p>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">Pendientes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-blue-200 bg-blue-50/30">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="text-center">
                <p className="text-base sm:text-lg font-bold text-blue-600">{formatMoney(stats.montoPagado)}</p>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-1">
                  de {formatMoney(stats.montoPagado + stats.montoPendiente)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controles */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Button variant="outline" size="icon" onClick={handlePrevDay} className="h-10 w-10 shrink-0 active:scale-95 touch-manipulation">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-[180px] text-center px-2">
              <p className="font-semibold text-slate-900 text-sm sm:text-base">
                {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
              </p>
              <p className="text-xs text-slate-500">{format(selectedDate, 'yyyy')}</p>
            </div>
            <Button variant="outline" size="icon" onClick={handleNextDay} className="h-10 w-10 shrink-0 active:scale-95 touch-manipulation">
              <ChevronRight className="w-5 h-5" />
            </Button>
            <Button variant="outline" onClick={handleToday} className="h-10 px-4 shrink-0 active:scale-95 touch-manipulation">
              Hoy
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Tabs value={showCalendario ? 'calendario' : 'lista'} onValueChange={(v) => setShowCalendario(v === 'calendario')} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-2 h-10">
                <TabsTrigger value="lista" className="text-sm">Vista Día</TabsTrigger>
                <TabsTrigger value="calendario" className="text-sm">Calendario</TabsTrigger>
              </TabsList>
            </Tabs>

            {!showCalendario && (
              <Select value={selectedCancha} onValueChange={setSelectedCancha}>
                <SelectTrigger className="w-full sm:w-40 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="1">Cancha 1</SelectItem>
                  <SelectItem value="2">Cancha 2</SelectItem>
                  <SelectItem value="3">Cancha 3</SelectItem>
                  <SelectItem value="4">Cancha 4</SelectItem>
                </SelectContent>
              </Select>
            )}
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

        {/* Vista de calendario o día */}
        {showCalendario ? (
          <CalendarioCompleto
            turnos={turnos}
            recordatorios={recordatorios}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onCreateTurno={(fecha) => {
              setSelectedDate(fecha);
              setTurnoModal({ open: true, turno: null });
            }}
            onTurnoClick={(turno) => isAdmin && setTurnoModal({ open: true, turno })}
          />
        ) : (
          <VistaCalendarioCancha
            turnos={turnosFiltrados}
            recordatorios={recordatorios}
            selectedDate={selectedDate}
            selectedCancha={selectedCancha}
            fecha={selectedDate}
            isAdmin={isAdmin}
            onTurnoClick={(turno) => isAdmin && setTurnoModal({ open: true, turno })}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Botón flotante para crear turno - Solo admins */}
      {isAdmin && (
        <Button
          onClick={() => setTurnoModal({ open: true, turno: null })}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-emerald-600 hover:bg-emerald-700 z-40 active:scale-95 touch-manipulation"
          size="icon"
        >
          <Plus className="w-6 h-6" />
        </Button>
      )}

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