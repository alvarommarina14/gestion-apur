import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar, Plus, Lock, AlertCircle, ChevronDown, Download } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import PlanillaCanchas from '@/components/agenda/PlanillaCanchas';
import CalendarioVistasTurnos from '@/components/agenda/CalendarioVistasTurnos';
import NuevoTurnoModal from '@/components/agenda/NuevoTurnoModal';
import BloquearTurnoModal from '@/components/agenda/BloquearTurnoModal';
import NuevaClaseAgendaModal from '@/components/agenda/NuevaClaseAgendaModal';
import NuevoAlquilerModal from '@/components/agenda/NuevoAlquilerModal';
import { toast } from 'sonner';

export default function AgendaCanchas() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('planilla');
  const [showNuevoTurnoModal, setShowNuevoTurnoModal] = useState(false);
  const [showBloqueoModal, setShowBloqueoModal] = useState(false);
  const [showNuevaClaseModal, setShowNuevaClaseModal] = useState(false);
  const [showNuevoAlquilerModal, setShowNuevoAlquilerModal] = useState(false);
  const [nuevoTurnoType, setNuevoTurnoType] = useState('alquiler');
  const [turnoEditando, setTurnoEditando] = useState(null);
  const [bloqueoEditando, setBloqueoEditando] = useState(null);
  const queryClient = useQueryClient();

  const { data: turnos = [], isLoading: turnosLoading } = useQuery({
    queryKey: ['turnos'],
    queryFn: () => base44.entities.TurnoCancha.list(),
  });

  const { data: recordatorios = [] } = useQuery({
    queryKey: ['recordatorios'],
    queryFn: () => base44.entities.RecordatorioCancha.list(),
  });

  const { data: bloqueos = [] } = useQuery({
    queryKey: ['bloqueos'],
    queryFn: () => base44.entities.DisponibilidadCancha.list(),
  });

  // Query para traer estados de pago del mes seleccionado
   const mesFiltro = format(selectedDate, 'yyyy-MM');
   const { data: cobrosPago = {} } = useQuery({
     queryKey: ['cobros', mesFiltro],
     queryFn: async () => {
       try {
         const [cobros, pagos] = await Promise.all([
           base44.entities.CobroCliente.filter({ mes: mesFiltro }),
           base44.entities.Pago.filter({ mes_correspondiente: mesFiltro })
         ]);

         console.log('🔍 DEBUG - Cobros traídos para mes', mesFiltro, ':', cobros);
         console.log('🔍 DEBUG - Pagos traídos para mes', mesFiltro, ':', pagos);

         // Mapear cliente_id (alumno_id) directamente a su estado de pago
         const estadosPago = {};

         // Verificar si ya pasó el día 15 del mes actual
         const hoy = new Date();
         const [año, mes] = mesFiltro.split('-');
         const vencimiento = new Date(parseInt(año), parseInt(mes) - 1, 15);
         const pasóVencimiento = hoy > vencimiento;

         // Primero agregar cobros
         cobros.forEach(cobro => {
           console.log('📌 Procesando cobro:', cobro.cliente_id, cobro.cliente_nombre, cobro.estado);
           let estado = cobro.estado;

           // Si pasó la fecha de vencimiento y sigue pendiente, marcar como moroso
           if (pasóVencimiento && estado === 'pendiente') {
             estado = 'moroso';
             console.log('⚠️ MOROSO: Pasó la fecha de vencimiento para', cobro.cliente_nombre);
           }

           estadosPago[cobro.cliente_id] = { estado, fuera_de_termino: cobro.fuera_de_termino };
         });

         // Si hay pagos de alumno, marcar como pagado
         pagos.forEach(pago => {
           console.log('💰 Procesando pago:', pago.alumno_id, pago.alumno_nombre);
           estadosPago[pago.alumno_id] = { estado: 'pagado', fuera_de_termino: false };
         });

         console.log('✅ Estados finales:', estadosPago);
         return estadosPago;
       } catch (error) {
         console.error('Error al traer cobros y pagos:', error);
         return {};
       }
     },
   });

  const handleDescargarPDF = async () => {
    try {
      const response = await base44.functions.invoke('generarPDFAgendaCanchas', {
        fecha: format(selectedDate, 'yyyy-MM-dd')
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `agenda-canchas-${format(selectedDate, 'dd-MM-yyyy')}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      toast.success('PDF descargado correctamente');
    } catch (error) {
      toast.error('Error al descargar PDF: ' + error.message);
    }
  };



  const handleNuevoTurno = (type) => {
    setTurnoEditando(null);
    setNuevoTurnoType(type);
    setShowNuevoTurnoModal(true);
  };

  const handleNuevaClase = () => {
    setShowNuevaClaseModal(true);
  };

  const handleEditTurno = (turno) => {
    setTurnoEditando(turno);
    setNuevoTurnoType(turno.tipo_turno);
    setShowNuevoTurnoModal(true);
  };

  const handleDeleteTurno = async (turno) => {
    if (!confirm('¿Eliminar este turno?')) return;
    try {
      await base44.entities.TurnoCancha.delete(turno.id);

      // Actualizar el cache inmediatamente removiendo el turno
      queryClient.setQueryData(['turnos'], (prevTurnos) => 
        prevTurnos.filter(t => t.id !== turno.id)
      );

      toast.success('Turno eliminado');
    } catch (error) {
      toast.error('Error al eliminar: ' + error.message);
    }
  };

  const handleCloseModal = () => {
    setShowNuevoTurnoModal(false);
    setTurnoEditando(null);
    queryClient.invalidateQueries({ queryKey: ['turnos'] });
  };

  const handleCloseBloqueoModal = () => {
    setShowBloqueoModal(false);
    setBloqueoEditando(null);
    queryClient.invalidateQueries({ queryKey: ['bloqueos'] });
  };

  const handleEditBloqueo = (bloqueo) => {
    setBloqueoEditando(bloqueo);
    setShowBloqueoModal(true);
  };

  const handleDeleteBloqueo = async (bloqueo) => {
    if (!confirm('¿Eliminar este bloqueo?')) return;
    try {
      await base44.entities.DisponibilidadCancha.delete(bloqueo.id);

      // Actualizar el cache inmediatamente removiendo el bloqueo
      queryClient.setQueryData(['bloqueos'], (prevBloqueos) => 
        prevBloqueos.filter(b => b.id !== bloqueo.id)
      );

      toast.success('Bloqueo eliminado');
    } catch (error) {
      toast.error('Error al eliminar: ' + error.message);
    }
  };

  const motivosBloqueo = [
    { value: 'mantenimiento', label: 'Mantenimiento' },
    { value: 'evento_privado', label: 'Evento privado' },
    { value: 'clima', label: 'Clima' },
    { value: 'reparacion', label: 'Reparación' },
    { value: 'otro', label: 'Otro' }
  ];

  const handleBloquear = (motivo) => {
    setShowBloqueoModal(true);
  };

  const turnosFecha = turnos.filter(t => t.fecha === format(selectedDate, 'yyyy-MM-dd'));

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Gestión de Turnos</h1>
        <p className="text-slate-500 text-sm mt-1">
          {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}
        </p>
      </div>

      {/* Botones de acciones principales */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleNuevaClase}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Nueva Clase
        </Button>
        <Button
          onClick={() => setShowNuevoAlquilerModal(true)}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" />
          Nuevo Alquiler
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="gap-2"
            >
              <Lock className="w-4 h-4" />
              Bloquear
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {motivosBloqueo.map(motivo => (
              <DropdownMenuItem
                key={motivo.value}
                onClick={() => handleBloquear(motivo.value)}
              >
                {motivo.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          onClick={handleDescargarPDF}
          variant="outline"
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Descargar PDF
        </Button>
        <Button
          onClick={handleBorrarTodos}
          variant="outline"
          className="gap-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
        >
          Borrar Todos
        </Button>
      </div>

      {/* Tabs de vistas */}
      <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="planilla">Planilla de Turnos</TabsTrigger>
          <TabsTrigger value="calendario">Calendario</TabsTrigger>
        </TabsList>

        {/* Vista Planilla */}
        <TabsContent value="planilla" className="space-y-4">
          <div className="flex flex-wrap gap-3 mb-4">
            <Button
              onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}
              variant="outline"
              className="gap-2 text-sm"
            >
              ← Anterior
            </Button>
            <Button
              onClick={() => setSelectedDate(new Date())}
              variant="outline"
              className="gap-2 text-sm"
            >
              Hoy
            </Button>
            <Button
              onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}
              variant="outline"
              className="gap-2 text-sm"
            >
              Siguiente →
            </Button>
          </div>

          <Card className="p-4">
            {turnosLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
              </div>
            ) : (
              <PlanillaCanchas
                 date={selectedDate}
                 turnos={turnosFecha}
                 bloqueos={bloqueos}
                 pagosAlumnos={cobrosPago}
                 pagosClientes={cobrosPago}
                 onEdit={handleEditTurno}
                 onDelete={handleDeleteTurno}
                 onEditBloqueo={handleEditBloqueo}
                 onDeleteBloqueo={handleDeleteBloqueo}
               />
            )}
          </Card>
        </TabsContent>

        {/* Vista Calendario */}
        <TabsContent value="calendario" className="space-y-4">
          <Card className="p-4">
            {turnosLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
              </div>
            ) : (
              <CalendarioVistasTurnos
                date={selectedDate}
                turnos={turnos}
                onDateClick={(date) => {
                  setSelectedDate(date);
                  setViewMode('planilla');
                }}
              />
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modales */}
      {showNuevoTurnoModal && (
        <NuevoTurnoModal
          isOpen={showNuevoTurnoModal}
          onClose={handleCloseModal}
          initialDate={selectedDate}
          initialType={nuevoTurnoType}
          turno={turnoEditando}
        />
      )}

      {showBloqueoModal && (
        <BloquearTurnoModal
          isOpen={showBloqueoModal}
          onClose={handleCloseBloqueoModal}
          initialDate={selectedDate}
          bloqueo={bloqueoEditando}
        />
      )}

      {showNuevaClaseModal && (
        <NuevaClaseAgendaModal
          isOpen={showNuevaClaseModal}
          onClose={() => {
            setShowNuevaClaseModal(false);
            queryClient.invalidateQueries({ queryKey: ['clases'] });
            queryClient.invalidateQueries({ queryKey: ['turnos'] });
          }}
          initialDate={selectedDate}
        />
      )}

      {showNuevoAlquilerModal && (
        <NuevoAlquilerModal
          isOpen={showNuevoAlquilerModal}
          onClose={() => {
            setShowNuevoAlquilerModal(false);
            queryClient.invalidateQueries({ queryKey: ['turnos'] });
          }}
          initialDate={selectedDate}
        />
      )}
    </div>
  );
}