import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Plus, Download, Lock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import VistaCalendarioCancha from '@/components/agenda/VistaCalendarioCancha';
import CalendarioMes from '@/components/agenda/CalendarioMes';
import NuevoTurnoModal from '@/components/agenda/NuevoTurnoModal';
import NuevoBloqueoModal from '@/components/disponibilidad/NuevoBloqueoModal';
import { toast } from 'sonner';

export default function AgendaCanchas() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCourt, setSelectedCourt] = useState('1');
  const [viewMode, setViewMode] = useState('dia');
  const [showNuevoTurnoModal, setShowNuevoTurnoModal] = useState(false);
  const [showBloqueoModal, setShowBloqueoModal] = useState(false);
  const [nuevoTurnoType, setNuevoTurnoType] = useState('alquiler');
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

  const handleDescargarPDF = async () => {
    try {
      const response = await base44.functions.invoke('generarPDFAgenda', {
        fecha: format(selectedDate, 'yyyy-MM-dd')
      });
      
      if (response.data?.pdfUrl) {
        const link = document.createElement('a');
        link.href = response.data.pdfUrl;
        link.download = `planilla_${format(selectedDate, 'dd-MM-yyyy')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('PDF descargado correctamente');
      }
    } catch (error) {
      toast.error('Error al descargar PDF: ' + error.message);
    }
  };

  const handleNuevoTurno = (type) => {
    setNuevoTurnoType(type);
    setShowNuevoTurnoModal(true);
  };

  const handleCloseModal = () => {
    setShowNuevoTurnoModal(false);
    queryClient.invalidateQueries({ queryKey: ['turnos'] });
  };

  const handleCloseBloqueoModal = () => {
    setShowBloqueoModal(false);
    queryClient.invalidateQueries({ queryKey: ['bloqueos'] });
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header con botones de acciones */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Agenda de Canchas</h1>
            <p className="text-slate-500 text-sm mt-1">
              {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}
            </p>
          </div>
        </div>

        {/* Botones de acciones principales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Button
            onClick={handleDescargarPDF}
            variant="outline"
            className="gap-2 h-10 lg:h-auto"
          >
            <Download className="w-4 h-4" />
            <span className="hidden lg:inline">Descargar PDF</span>
            <span className="lg:hidden text-xs">PDF</span>
          </Button>
          
          <Button
            onClick={() => handleNuevoTurno('clase')}
            className="gap-2 h-10 lg:h-auto bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden lg:inline">Nueva Clase</span>
            <span className="lg:hidden text-xs">Clase</span>
          </Button>
          
          <Button
            onClick={() => handleNuevoTurno('alquiler')}
            className="gap-2 h-10 lg:h-auto bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden lg:inline">Nuevo Alquiler</span>
            <span className="lg:hidden text-xs">Alquiler</span>
          </Button>
          
          <Button
            onClick={() => setShowBloqueoModal(true)}
            variant="outline"
            className="gap-2 h-10 lg:h-auto"
          >
            <Lock className="w-4 h-4" />
            <span className="hidden lg:inline">Bloquear Cancha</span>
            <span className="lg:hidden text-xs">Bloquear</span>
          </Button>
        </div>
      </div>

      {/* Tabs de vistas */}
      <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dia">Vista Día</TabsTrigger>
          <TabsTrigger value="calendario">Calendario Mes</TabsTrigger>
        </TabsList>

        {/* Vista Día */}
        <TabsContent value="dia" className="space-y-4">
          <Card className="p-4">
            {turnosLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
              </div>
            ) : turnos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
                <p>No hay turnos programados para hoy</p>
              </div>
            ) : (
              <VistaCalendarioCancha
                date={selectedDate}
                turnos={turnos.filter(t => t.fecha === format(selectedDate, 'yyyy-MM-dd'))}
                recordatorios={recordatorios}
                bloqueos={bloqueos}
              />
            )}
          </Card>
        </TabsContent>

        {/* Vista Calendario */}
        <TabsContent value="calendario" className="space-y-4">
          <Card className="p-4">
            <CalendarioMes
              date={selectedDate}
              turnos={turnos}
              recordatorios={recordatorios}
              bloqueos={bloqueos}
              onDayClick={(date) => {
                setSelectedDate(date);
                setViewMode('dia');
              }}
              onTurnoClick={(turno) => {
                setSelectedDate(new Date(turno.fecha));
                setViewMode('dia');
              }}
            />
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
        />
      )}

      {showBloqueoModal && (
        <NuevoBloqueoModal
          isOpen={showBloqueoModal}
          onClose={handleCloseBloqueoModal}
          initialDate={selectedDate}
        />
      )}
    </div>
  );
}