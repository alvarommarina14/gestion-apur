import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import GestionarClaseModal from './GestionarClaseModal';

const getEstadoPago = (alumnoId, estadosPago) => {
  // Si no existe cobro registrado para este alumno, retorna null
  if (!estadosPago[alumnoId]) {
    return null;
  }

  const estadoCobro = estadosPago[alumnoId];

  // Si ya está pagado, retorna 'pagado'
  if (estadoCobro === 'pagado') {
    return 'pagado';
  }

  // Si está moroso, retorna 'moroso'
  if (estadoCobro === 'moroso') {
    return 'moroso';
  }

  // Si existe cobro pero no está pagado, es pendiente
  return 'pendiente';
};

const getPagoBadge = (estado) => {
  if (estado === 'pagado') {
    return <Badge className="bg-emerald-600 text-xs">Pagado</Badge>;
  }
  if (estado === 'moroso') {
    return <Badge className="bg-rose-600 text-xs">Moroso</Badge>;
  }
  return <Badge className="bg-orange-600 text-xs">Pendiente</Badge>;
};

export default function TarjetaClase({ turno, estadosPago = {}, onEdit }) {
  const [mostrarGestionar, setMostrarGestionar] = useState(false);

  return (
    <div className="space-y-2.5">
      {/* Profesor - Título y botones editar/eliminar */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-blue-700">
          {turno.profesor || 'Sin profesor'}
        </p>
        <div className="flex gap-1">
          {onEdit && (
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(turno);
              }}
              className="h-6 w-6 hover:bg-blue-100 hover:text-blue-600"
            >
              <Edit2 className="w-3 h-3" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setMostrarGestionar(true);
            }}
            className="h-6 w-6 hover:bg-rose-100 hover:text-rose-600"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Horario */}
      <div className="text-xs text-slate-600">
        {turno.hora_inicio} - {turno.hora_fin}
      </div>

      {/* Cantidad de Alumnos */}
      <div className="text-xs font-semibold text-slate-700">
        Alumnos ({turno.alumnos_nombres?.length || 0})
      </div>

      {/* Lista de Alumnos con Estado de Deuda */}
      <div className="space-y-1 pl-2 border-l-2 border-blue-200">
        {turno.alumnos_nombres?.map((alumno, idx) => {
          const alumnoId = turno.alumnos_ids?.[idx];
          const estadoPago = getEstadoPago(alumnoId, estadosPago);
          return (
            <div key={idx} className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-700 truncate flex-1">
                {alumno}
              </p>
              {estadoPago && getPagoBadge(estadoPago)}
            </div>
          );
        })}
      </div>

      {/* Notas */}
      {turno.notas && (
        <div className="pt-1 border-t border-slate-200">
          <p className="text-xs text-slate-600 italic">
            <span className="font-semibold">Notas: </span>{turno.notas}
          </p>
        </div>
      )}

      {/* Modal Gestionar Clase */}
      <GestionarClaseModal 
        isOpen={mostrarGestionar} 
        onClose={() => setMostrarGestionar(false)} 
        clase={{...turno, turno_cancha_id: turno.id}}
      />
    </div>
  );
}