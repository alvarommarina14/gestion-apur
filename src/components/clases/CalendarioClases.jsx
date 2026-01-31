import React, { useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

moment.locale('es');
const localizer = momentLocalizer(moment);

const messages = {
  allDay: 'Todo el día',
  previous: 'Anterior',
  next: 'Siguiente',
  today: 'Hoy',
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
  agenda: 'Agenda',
  date: 'Fecha',
  time: 'Hora',
  event: 'Clase',
  noEventsInRange: 'No hay clases en este rango',
  showMore: (total) => `+ Ver más (${total})`,
};

export default function CalendarioClases({ clases, onClaseClick }) {
  const events = useMemo(() => {
    return clases.map(clase => {
      const [horas, minutos] = (clase.hora_inicio || '09:00').split(':').map(Number);
      const fecha = parseISO(clase.fecha);
      const start = new Date(fecha);
      start.setHours(horas, minutos, 0);
      
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + (clase.duracion || 50));

      const horaInicio = clase.hora_inicio || '09:00';
      const horaFin = new Date(start);
      horaFin.setMinutes(horaFin.getMinutes() + (clase.duracion || 50));
      const horaFinStr = horaFin.getHours().toString().padStart(2, '0') + ':' + horaFin.getMinutes().toString().padStart(2, '0');
      
      return {
        id: clase.id,
        title: `${horaInicio} - ${horaFinStr} | ${clase.alumnos_nombres?.join(', ') || 'Sin alumnos'}`,
        start,
        end,
        resource: clase,
      };
    });
  }, [clases]);

  const eventStyleGetter = (event) => {
    const clase = event.resource;
    let backgroundColor = '#10b981'; // emerald-600 por defecto
    
    if (clase.estado === 'realizada') {
      backgroundColor = '#059669'; // emerald-700
    } else if (clase.estado === 'cancelada_anticipada' || clase.estado === 'cancelada_tarde') {
      backgroundColor = '#f59e0b'; // amber-500
    } else if (clase.estado === 'reprogramada') {
      backgroundColor = '#6366f1'; // indigo-500
    } else if (clase.es_recupero) {
      backgroundColor = '#8b5cf6'; // purple-500
    } else if (clase.estado === 'programada') {
      backgroundColor = '#10b981'; // emerald-600
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
        fontSize: '13px',
        padding: '2px 6px',
      }
    };
  };

  return (
    <div className="h-[700px] bg-white rounded-lg p-4">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        messages={messages}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={(event) => onClaseClick(event.resource)}
        views={['month', 'week', 'day', 'agenda']}
        defaultView="week"
        step={30}
        showMultiDayTimes
        style={{ height: '100%' }}
      />
      
      {/* Leyenda */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-600" />
          <span>Programada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-700" />
          <span>Realizada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-500" />
          <span>Cancelada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-indigo-500" />
          <span>Reprogramada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-purple-500" />
          <span>Recupero</span>
        </div>
      </div>
    </div>
  );
}