import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar, Plus, Download, Lock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import PlanillaCanchas from '@/components/agenda/PlanillaCanchas';
import CalendarioMes from '@/components/agenda/CalendarioMes';
import NuevoTurnoModal from '@/components/agenda/NuevoTurnoModal';
import NuevoBloqueoModal from '@/components/disponibilidad/NuevoBloqueoModal';
import { toast } from 'sonner';

export default function AgendaCanchas() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showNuevoTurnoModal, setShowNuevoTurnoModal] = useState(false);
  const [showBloqueoModal, setShowBloqueoModal] = useState(false);
  const [nuevoTurnoType, setNuevoTurnoType] = useState('alquiler');
  const [turnoEditando, setTurnoEditando] = useState(null);
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
    setTurnoEditando(null);
    setNuevoTurnoType(type);
    setShowNuevoTurnoModal(true);
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
    queryClient.invalidateQueries({ queryKey: ['bloqueos'] });
  };

  const turnosFecha = turnos.filter(t => t.fecha === format(selectedDate, 'yyyy-MM-dd'));

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Planilla de Turnos</h1>
        <p className="text-slate-500 text-sm mt-1">
          {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: es })}
        </p>
      </div>

      {/* Botones de acciones */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}
          variant="outline"
          className="gap-2"
        >
          ← Día anterior
        </Button>
        <Button
          onClick={() => setSelectedDate(new Date())}
          variant="outline"
          className="gap-2"
        >
          Hoy
        </Button>
        <Button
          onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}
          variant="outline"
          className="gap-2"
        >
          Día siguiente →
        </Button>

        <div className="flex-1 flex flex-wrap gap-2 justify-end">
          <Button
            onClick={() => handleNuevoTurno('clase')}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Nueva Clase
          </Button>
          <Button
            onClick={() => handleNuevoTurno('alquiler')}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            Nuevo Alquiler
          </Button>
          <Button
            onClick={() => setShowBloqueoModal(true)}
            variant="outline"
            className="gap-2"
          >
            <Lock className="w-4 h-4" />
            Bloquear
          </Button>
          <Button
            onClick={handleDescargarPDF}
            variant="outline"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Planilla */}
      <Card className="p-4">
        {turnosLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <PlanillaCanchas
            date={selectedDate}
            turnos={turnosFecha}
            onEdit={handleEditTurno}
            onDelete={handleDeleteTurno}
          />
        )}
      </Card>

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
        <NuevoBloqueoModal
          isOpen={showBloqueoModal}
          onClose={handleCloseBloqueoModal}
          initialDate={selectedDate}
        />
      )}
    </div>
  );
}