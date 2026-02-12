import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, addDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Lock, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import CalendarioAgendaCanchas from '@/components/agenda/CalendarioAgendaCanchas';
import NuevoTurnoAgendaModal from '@/components/agenda/NuevoTurnoAgendaModal';
import BloquearCanchaModal from '@/components/agenda/BloquearCanchaModal';

export default function AgendaCanchas() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [modalNuevoTurno, setModalNuevoTurno] = useState(false);
  const [modalBloquear, setModalBloquear] = useState(false);
  const queryClient = useQueryClient();

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos-cancha', format(fechaSeleccionada, 'yyyy-MM-dd')],
    queryFn: () => base44.entities.TurnoCancha.list(),
  });

  const { data: bloqueos = [] } = useQuery({
    queryKey: ['bloqueos', format(fechaSeleccionada, 'yyyy-MM-dd')],
    queryFn: () => base44.entities.DisponibilidadCancha.list(),
  });

  const handleDescargarPDF = async () => {
    try {
      const res = await base44.functions.invoke('generarPDFAgendaCanchas', {
        fecha: format(fechaSeleccionada, 'yyyy-MM-dd'),
        turnos: turnos.filter(t => t.fecha === format(fechaSeleccionada, 'yyyy-MM-dd'))
      });
      // Descargar PDF
      const link = document.createElement('a');
      link.href = res.data.url;
      link.download = `agenda-${format(fechaSeleccionada, 'yyyy-MM-dd')}.pdf`;
      link.click();
    } catch (error) {
      console.error('Error descargando PDF:', error);
    }
  };

  const cambiarFecha = (dias) => {
    setFechaSeleccionada(addDays(fechaSeleccionada, dias));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Agenda de Canchas</h1>
            <p className="text-slate-500 text-sm">{format(fechaSeleccionada, 'EEEE, d MMMM yyyy', { locale: es })}</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => handleDescargarPDF()}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button 
              onClick={() => setModalBloquear(true)}
              variant="outline"
            >
              <Lock className="w-4 h-4 mr-2" />
              Bloquear
            </Button>
            <Button 
              onClick={() => setModalNuevoTurno(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Turno
            </Button>
          </div>
        </header>

        {/* Selector de fecha */}
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => cambiarFecha(-1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold text-slate-700">
              {format(fechaSeleccionada, 'd MMMM yyyy', { locale: es })}
            </span>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => cambiarFecha(1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Grilla de turnos */}
        <CalendarioAgendaCanchas 
          fecha={fechaSeleccionada} 
          turnos={turnos}
          bloqueos={bloqueos}
          onNuevoTurno={() => setModalNuevoTurno(true)}
        />
      </div>

      {/* Modales */}
      <NuevoTurnoAgendaModal 
        open={modalNuevoTurno}
        onOpenChange={setModalNuevoTurno}
        fecha={fechaSeleccionada}
      />

      <BloquearCanchaModal 
        open={modalBloquear}
        onOpenChange={setModalBloquear}
        fecha={fechaSeleccionada}
      />
    </div>
  );
}