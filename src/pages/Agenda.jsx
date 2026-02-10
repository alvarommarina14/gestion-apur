import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, ChevronLeft, ChevronRight, Calendar, Filter, Trash2, Ban, Download } from 'lucide-react';
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
import NuevaClaseModal from '@/components/modals/NuevaClaseModal';
import EditarClaseProfesorModal from '@/components/agenda/EditarClaseProfesorModal';
import NuevoBloqueoModal from '@/components/disponibilidad/NuevoBloqueoModal';
import CancelarCanchaModal from '@/components/agenda/CancelarCanchaModal';
import ModalCancelarTurno from '@/components/agenda/ModalCancelarTurno';
import EditarClaseEnAgendaModal from '@/components/agenda/EditarClaseEnAgendaModal';

import { cn } from '@/lib/utils';

export default function Agenda() {
  const queryClient = useQueryClient();
  const [vista, setVista] = useState('dia');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCancha, setSelectedCancha] = useState('todas');
  const [claseModal, setClaseModal] = useState({ open: false, clase: null });
   const [turnoModal, setTurnoModal] = useState({ open: false, turno: null });
   const [bloqueoModal, setBloqueoModal] = useState(false);
   const [cancelarModal, setCancelarModal] = useState({ open: false, turno: null });
   const [cancelarTurnoModal, setCancelarTurnoModal] = useState({ open: false, turno: null });
    const [editarClaseAgendaModal, setEditarClaseAgendaModal] = useState({ open: false, turno: null });
    const [showCalendario, setShowCalendario] = useState(false);
    const [limpiadoLoading, setLimpiadoLoading] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const fechaStr = format(selectedDate, 'yyyy-MM-dd');

  // Para vista de calendario, cargar todos los turnos del mes
  const mesStr = format(selectedDate, 'yyyy-MM');
  
  const { data: turnos = [], isLoading } = useQuery({
    queryKey: ['turnos-cancha', showCalendario ? mesStr : fechaStr],
    queryFn: async () => {
      if (showCalendario) {
        // Cargar todos los turnos del mes para el calendario
        const allTurnos = await base44.entities.TurnoCancha.list('-fecha', 500);
        // Filtrar cancelados
        return allTurnos.filter(t => t.estado !== 'cancelado');
      }
      const dayTurnos = await base44.entities.TurnoCancha.filter({ fecha: fechaStr });
      // Filtrar cancelados
      return dayTurnos.filter(t => t.estado !== 'cancelado');
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

  const { data: bloqueos = [] } = useQuery({
    queryKey: ['disponibilidad-canchas'],
    queryFn: () => base44.entities.DisponibilidadCancha.filter({ estado: 'activo' }),
  });

  const isAdmin = user?.role === 'admin';
  const isProfesor = user?.role === 'profesor';
  const canEdit = isAdmin || isProfesor;

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
    if (!isAdmin) return null;
    
    // Filtrar solo turnos activos (no cancelados)
    const turnosActivos = turnosFiltrados.filter(t => t.estado !== 'cancelado');
    
    const total = turnosActivos.length;
    const pagados = turnosActivos.filter(t => t.pagado).length;
    const pendientes = total - pagados;
    const montoPagado = turnosActivos.filter(t => t.pagado).reduce((sum, t) => sum + (t.monto || 0), 0);
    const montoPendiente = turnosActivos.filter(t => !t.pagado).reduce((sum, t) => sum + (t.monto || 0), 0);
    
    return { total, pagados, pendientes, montoPagado, montoPendiente };
  }, [turnosFiltrados, isAdmin]);

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

  const handleLimpiarGoogleCalendar = async () => {
    if (!confirm('⚠️ Esto eliminará TODOS los turnos de Google Calendar. ¿Está seguro?')) return;
    
    setLimpiadoLoading(true);
    try {
      const response = await base44.functions.invoke('borrarTodosTurnosCancha');
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      alert(`✅ ${response.data.mensaje}`);
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setLimpiadoLoading(false);
    }
  };

  const handleBorrar50Turnos = async () => {
    if (!confirm('⚠️ Esto eliminará los primeros 50 turnos de la BD y de Google Calendar. ¿Está seguro?')) return;
    
    setLimpiadoLoading(true);
    try {
      const response = await base44.functions.invoke('borrar50Turnos');
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      alert(`✅ ${response.data.mensaje}`);
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setLimpiadoLoading(false);
    }
  };

  const handleDescargarPDF = async () => {
    try {
      const { data } = await base44.functions.invoke('generarPDFAgenda', {
        fecha: fechaStr,
        selectedCancha,
      });
      
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Agenda_${fechaStr}${selectedCancha !== 'todas' ? `_Cancha${selectedCancha}` : ''}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      alert(`❌ Error al generar PDF: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header */}
         <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
           <div>
             <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Agenda de Canchas</h1>
             <p className="text-slate-500 dark:text-slate-400 text-sm">Sistema de reservas del club</p>
           </div>
           <div className="flex items-center gap-2 flex-wrap">
             {isAdmin && !showCalendario && (
               <Button
                 onClick={handleDescargarPDF}
                 variant="outline"
                 className="border-blue-300 text-blue-700 hover:bg-blue-50 h-11 lg:h-10 text-base lg:text-sm active:scale-95 touch-manipulation"
               >
                 <Download className="w-5 h-5 mr-2" />
                 Descargar PDF
               </Button>
             )}
             {canEdit && (
                 <>
                   <Button
                     onClick={() => setClaseModal({ open: true, clase: null })}
                     className="bg-emerald-600 hover:bg-emerald-700 h-11 lg:h-10 text-base lg:text-sm active:scale-95 touch-manipulation w-full sm:w-auto"
                   >
                     <Plus className="w-5 h-5 mr-2" />
                     Crear clase
                   </Button>
                   <Button
                     onClick={() => setTurnoModal({ open: true, turno: null })}
                     className="bg-blue-600 hover:bg-blue-700 h-11 lg:h-10 text-base lg:text-sm active:scale-95 touch-manipulation w-full sm:w-auto"
                   >
                     <Plus className="w-5 h-5 mr-2" />
                     Nuevo turno cancha
                   </Button>
                 {isAdmin && (
                   <Button
                     onClick={() => setBloqueoModal(true)}
                     variant="outline"
                     className="border-rose-300 text-rose-700 hover:bg-rose-50 h-11 lg:h-10 text-base lg:text-sm active:scale-95 touch-manipulation w-full sm:w-auto"
                   >
                     <Ban className="w-5 h-5 mr-2" />
                     Bloquear cancha
                   </Button>
                 )}
               </>
             )}
           </div>
         </header>

        {/* Stats - Solo para Admin */}
        {isAdmin && stats && (
         <div className="grid grid-cols-1 gap-3 sm:gap-4">
           <Card className="shadow-sm dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="pt-4 sm:pt-6 pb-4">
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Turnos del día</p>
                </div>
              </CardContent>
            </Card>
         </div>
        )}

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
            onTurnoClick={(turno) => setCancelarTurnoModal({ open: true, turno })}
          />
        ) : (
          <VistaCalendarioCancha
            turnos={turnosFiltrados}
            recordatorios={recordatorios}
            bloqueos={bloqueos}
            selectedDate={selectedDate}
            selectedCancha={selectedCancha}
            fecha={selectedDate}
            isAdmin={isAdmin}
            onTurnoClick={(turno) => setCancelarTurnoModal({ open: true, turno })}
            onEditarClase={(clase) => {
              // Abrir modal específico para editar clase en agenda
              setEditarClaseAgendaModal({ open: true, turno: clase });
            }}
            onEditarTurno={(turno) => setTurnoModal({ open: true, turno })}
            onCancelarCancha={(turno) => isAdmin && turno.modalidad_alquiler === 'abono' && setCancelarModal({ open: true, turno })}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Modales */}
      {canEdit && (
        <>
          <NuevaClaseModal
            open={claseModal.open}
            onOpenChange={(open) => setClaseModal({ ...claseModal, open })}
          />
          <NuevoTurnoModal
            open={turnoModal.open}
            onOpenChange={(open) => setTurnoModal({ ...turnoModal, open })}
            turno={turnoModal.turno}
            fecha={selectedDate}
            isProfesor={isProfesor}
          />
        </>
      )}

      {isAdmin && (
        <>
          <NuevoBloqueoModal
            open={bloqueoModal}
            onOpenChange={setBloqueoModal}
          />
          <CancelarCanchaModal
             open={cancelarModal.open}
             onOpenChange={(open) => setCancelarModal({ ...cancelarModal, open })}
             turno={cancelarModal.turno}
             fechaSeleccionada={fechaStr}
             onSuccess={() => {
               // El modal maneja invalidación, solo reabrir modal después
             }}
           />
          </>
          )}

          <ModalCancelarTurno
          open={cancelarTurnoModal.open}
          onOpenChange={(open) => setCancelarTurnoModal({ ...cancelarTurnoModal, open })}
          turno={cancelarTurnoModal.turno}
          />

          <EditarClaseEnAgendaModal
          open={editarClaseAgendaModal.open}
          onOpenChange={(open) => setEditarClaseAgendaModal({ ...editarClaseAgendaModal, open })}
          turno={editarClaseAgendaModal.turno}
          />
          </div>
          );
          }