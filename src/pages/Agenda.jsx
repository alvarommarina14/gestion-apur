import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addWeeks, 
  subWeeks,
  isSameDay,
  parseISO,
  isToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Clock,
  MapPin,
  User,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/ui/StatusBadge';
import NuevaClaseModal from '@/components/modals/NuevaClaseModal';
import CancelarClaseModal from '@/components/modals/CancelarClaseModal';
import RegistrarAsistenciaModal from '@/components/modals/RegistrarAsistenciaModal';
import { cn } from '@/lib/utils';

export default function Agenda() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [nuevaClaseModal, setNuevaClaseModal] = useState({ open: false, recupero: null });
  const [cancelarModal, setCancelarModal] = useState({ open: false, clase: null });
  const [asistenciaModal, setAsistenciaModal] = useState({ open: false, clase: null });
  
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  
  const { data: clases = [], isLoading } = useQuery({
    queryKey: ['clases'],
    queryFn: () => base44.entities.Clase.list('-fecha'),
  });
  
  // Días de la semana
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  }, [weekStart]);
  
  // Clases por día
  const clasesPorDia = useMemo(() => {
    const map = {};
    weekDays.forEach(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      map[dayStr] = clases
        .filter(c => c.fecha === dayStr)
        .sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || ''));
    });
    return map;
  }, [clases, weekDays]);
  
  // Clases del día seleccionado
  const clasesDelDia = useMemo(() => {
    const dayStr = format(selectedDate, 'yyyy-MM-dd');
    return clases
      .filter(c => c.fecha === dayStr)
      .sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || ''));
  }, [clases, selectedDate]);
  
  const handlePrevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const handleNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const handleToday = () => {
    setCurrentWeek(new Date());
    setSelectedDate(new Date());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Agenda</h1>
            <p className="text-slate-500 text-sm">
              {format(weekStart, "d MMM", { locale: es })} - {format(weekEnd, "d MMM yyyy", { locale: es })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border rounded-lg">
              <Button variant="ghost" size="sm" onClick={handlePrevWeek}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleToday}>
                Hoy
              </Button>
              <Button variant="ghost" size="sm" onClick={handleNextWeek}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button 
              onClick={() => setNuevaClaseModal({ open: true, recupero: null })}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva clase
            </Button>
          </div>
        </header>
        
        {/* Week Calendar */}
        <Card className="shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b">
            {weekDays.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const clasesCount = clasesPorDia[dayStr]?.length || 0;
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);
              
              return (
                <button
                  key={dayStr}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'p-4 text-center border-r last:border-r-0 transition-colors',
                    isSelected && 'bg-emerald-50',
                    !isSelected && 'hover:bg-slate-50'
                  )}
                >
                  <p className={cn(
                    'text-xs font-medium uppercase',
                    isCurrentDay ? 'text-emerald-600' : 'text-slate-500'
                  )}>
                    {format(day, 'EEE', { locale: es })}
                  </p>
                  <p className={cn(
                    'text-2xl font-bold mt-1',
                    isCurrentDay && 'text-emerald-600',
                    isSelected && !isCurrentDay && 'text-slate-900',
                    !isSelected && !isCurrentDay && 'text-slate-700'
                  )}>
                    {format(day, 'd')}
                  </p>
                  {clasesCount > 0 && (
                    <div className="mt-2 flex justify-center gap-1">
                      {[...Array(Math.min(clasesCount, 4))].map((_, i) => (
                        <div 
                          key={i} 
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            isCurrentDay ? 'bg-emerald-500' : 'bg-slate-400'
                          )} 
                        />
                      ))}
                      {clasesCount > 4 && (
                        <span className="text-xs text-slate-500">+{clasesCount - 4}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Day Detail */}
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-lg">
                {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
              </h3>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                {clasesDelDia.length} clases
              </span>
            </div>
            
            {clasesDelDia.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No hay clases programadas</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => setNuevaClaseModal({ open: true, recupero: null })}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar clase
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {clasesDelDia.map((clase) => (
                  <div 
                    key={clase.id}
                    className={cn(
                      'group p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md',
                      clase.estado === 'realizada' && 'bg-emerald-50/50 border-emerald-200',
                      clase.estado === 'programada' && 'bg-white border-slate-200 hover:border-slate-300',
                      ['cancelada_anticipada', 'cancelada_tarde', 'no_show', 'suspendida'].includes(clase.estado) && 'bg-slate-50 border-slate-200 opacity-60'
                    )}
                    onClick={() => {
                      if (clase.estado === 'programada' && !clase.asistencia_registrada) {
                        setAsistenciaModal({ open: true, clase });
                      } else {
                        setCancelarModal({ open: true, clase });
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-lg font-bold text-slate-800">{clase.hora_inicio}</span>
                          <StatusBadge status={clase.estado} size="sm" />
                          {clase.es_recupero && (
                            <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-medium rounded">
                              Recupero
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span className="flex items-center gap-1.5">
                            {clase.tipo === 'individual' ? (
                              <User className="w-4 h-4" />
                            ) : (
                              <Users className="w-4 h-4" />
                            )}
                            {clase.alumnos_nombres?.join(', ') || 'Sin alumnos'}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            {clase.sede} {clase.cancha && `- ${clase.cancha}`}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {clase.duracion || 50} min
                          </span>
                        </div>
                      </div>
                      
                      {clase.estado === 'programada' && !clase.asistencia_registrada && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAsistenciaModal({ open: true, clase });
                          }}
                        >
                          Registrar asistencia
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Modals */}
      <NuevaClaseModal 
        open={nuevaClaseModal.open}
        onOpenChange={(open) => setNuevaClaseModal({ ...nuevaClaseModal, open })}
        recupero={nuevaClaseModal.recupero}
      />
      
      <CancelarClaseModal 
        open={cancelarModal.open}
        onOpenChange={(open) => setCancelarModal({ ...cancelarModal, open })}
        clase={cancelarModal.clase}
      />
      
      <RegistrarAsistenciaModal 
        open={asistenciaModal.open}
        onOpenChange={(open) => setAsistenciaModal({ ...asistenciaModal, open })}
        clase={asistenciaModal.clase}
      />
    </div>
  );
}