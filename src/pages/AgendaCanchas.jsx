import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar, Plus, Lock, AlertCircle, ChevronDown } from 'lucide-react';
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
        // Traer turnos de cancha con clases para obtener alumnos_ids
        const turnosCompletos = await base44.entities.TurnoCancha.list();
        const cobros = await base44.entities.CobroCliente.filter({ mes: mesFiltro });
        
        // Mapear cliente_id a alumno_ids de las clases
        const estadosPago = {};
        
        turnosCompletos.forEach(turno => {
          if (turno.tipo_turno === 'clase' && turno.alumnos_ids && turno.alumnos_ids.length > 0) {
            // Buscar si existe cobro para el cliente (profesor)
            const cobroBuscado = cobros.find(c => c.cliente_id === turno.cliente);
            if (cobroBuscado) {
              // Asignar el estado a cada alumno de esta clase
              turno.alumnos_ids.forEach(alumnoId => {
                estadosPago[alumnoId] = cobroBuscado.estado;
              });
            }
          }
        });
        
        return estadosPago;
      } catch (error) {
        console.error('Error al traer cobros:', error);
        return {};
      }
    },
  });

  const handleDescargarPDF = async () => {
    try {
      const response = await base44.functions.invoke('generarPDFAgenda', {
        fecha: format(selectedDate, 'yyyy-MM-dd'),
        selectedCancha: 'todas'
      });
      
      // La respuesta es el PDF directamente
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `planilla_${format(selectedDate, 'dd-MM-yyyy')}.pdf`;
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
      queryClient.invalidateQueries({ queryKey: ['turnos'] });
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
      queryClient.invalidateQueries({ queryKey: ['bloqueos'] });
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