import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle, XCircle, DollarSign, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TarjetaClaseConPagos({ turno, isAdmin, onTurnoClick }) {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const { data: profesor } = useQuery({
    queryKey: ['profesor', turno.profesor_id],
    queryFn: async () => {
      if (!turno.profesor_id) return null;
      try {
        return await base44.entities.Profesor.read(turno.profesor_id);
      } catch (e) {
        return null;
      }
    },
    enabled: !!turno.profesor_id && !turno.profesor,
  });

  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos-pagos', turno.id],
    queryFn: async () => {
      if (!turno.alumnos_ids?.length) return [];
      return await base44.entities.Alumno.list();
    },
  });

  const { data: cobros = [] } = useQuery({
    queryKey: ['cobros-alumnos', turno.alumnos_ids],
    queryFn: async () => {
      if (!turno.alumnos_ids?.length) return [];
      const allCobros = await base44.entities.CobroCliente.list();
      return allCobros;
    },
  });

  const alumnosConPago = useMemo(() => {
    return (turno.alumnos_ids || []).map(alumnoId => {
      const alumno = alumnos.find(a => a.id === alumnoId);
      
      // Buscar cobros del alumno (cliente asociado)
      const cobrosAlumno = cobros.filter(c => {
        const alumnoEsCliente = alumnos.find(a => a.id === alumnoId);
        return c.cliente_id === alumnoEsCliente?.cliente_id;
      });
      
      // Determinar estado de pago mensual (abono/clase)
      const mesActual = new Date().toISOString().substring(0, 7); // YYYY-MM
      const cobroMensual = cobrosAlumno.find(c => 
        c.tipo_cobro === 'abono_mensual' && c.mes === mesActual
      );
      
      const tienePagoMensual = cobroMensual?.estado === 'pagado';
      
      return {
        nombre: alumno?.nombre || 'Sin nombre',
        tienePagoMensual,
      };
    });
  }, [turno.alumnos_ids, alumnos, cobros]);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const handleTogglePago = async (e) => {
    e.stopPropagation();
    setIsUpdating(true);
    try {
      const nuevoEstado = !turno.pagado;
      await base44.functions.invoke('sincronizarPagosTurnos', {
        turnoId: turno.id,
        pagado: nuevoEstado,
        tipo_turno: turno.tipo_turno,
        modalidad_alquiler: turno.modalidad_alquiler
      });
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      queryClient.invalidateQueries({ queryKey: ['cobros-clientes'] });
    } catch (error) {
      console.error('Error updating pago:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      className={cn(
        'h-full rounded-lg border-2 p-3 transition-all',
        turno.pagado
          ? 'bg-emerald-50 border-emerald-400'
          : 'bg-rose-50 border-rose-400'
      )}
      onClick={() => onTurnoClick?.(turno)}
    >
      {/* Header con estado */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={handleTogglePago}
          disabled={isUpdating}
          className={cn(
            'px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer hover:opacity-80 disabled:opacity-50',
            turno.pagado
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-rose-100 text-rose-700'
          )}
        >
          {turno.pagado ? (
            <>
              <CheckCircle className="w-3 h-3" />
              PAGADO
            </>
          ) : (
            <>
              <XCircle className="w-3 h-3" />
              PENDIENTE
            </>
          )}
        </button>
        <span className="text-xs font-semibold text-slate-500">
          {turno.duracion} min
        </span>
      </div>

      {/* Cliente con monto y estado */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="font-bold text-slate-900 text-base leading-tight">
            {turno.cliente}
          </p>
          <p className="text-sm text-slate-600 mt-0.5">
            {turno.hora_inicio} - {turno.hora_fin}
          </p>
        </div>
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="font-bold text-slate-900 text-sm">
            {formatMoney(turno.monto)}
          </span>
          {turno.pagado ? (
            <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
          ) : (
            <div className="h-5 w-5 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
          )}
        </div>
      </div>

      {/* Tipo y Profesor */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
          Clase
        </span>
        {(turno.profesor || profesor?.nombre) && (
          <div className="flex items-center gap-1 text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded">
            <User className="w-3 h-3" />
            <span>Prof. {turno.profesor || profesor?.nombre}</span>
          </div>
        )}
        {turno.pagado && (
          <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded text-xs font-semibold">
            Clase pagada
          </span>
        )}
      </div>

      {/* Precio de la clase */}
      <div className="flex items-center gap-1.5 mb-3 p-2 bg-white/50 rounded border border-slate-200">
        <DollarSign className="w-4 h-4 text-slate-600" />
        <span className="font-bold text-slate-900">
          {formatMoney(turno.monto)}
        </span>
        <span className={cn(
          'ml-auto px-2 py-0.5 rounded text-xs font-semibold',
          turno.pagado
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-rose-100 text-rose-700'
        )}>
          {turno.pagado ? 'Pagado' : 'Deuda'}
        </span>
      </div>

      {/* Alumnos con estado de pago */}
      {alumnosConPago.length > 0 && (
        <div className="mt-3 pt-2 border-t border-slate-300 space-y-1.5">
          <p className="text-xs font-semibold text-slate-700 mb-2">Alumnos:</p>
          {alumnosConPago.map((alumno, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className="text-slate-700 font-medium text-xs">{alumno.nombre}</span>
              <span className={cn(
                'px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5',
                alumno.tienePagoMensual
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700'
              )}>
                {alumno.tienePagoMensual ? (
                  <>
                    <CheckCircle className="w-2.5 h-2.5" />
                    Mensual pagado
                  </>
                ) : (
                  <>
                    <XCircle className="w-2.5 h-2.5" />
                    Deuda mensual
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Notas */}
      {turno.notas && (
        <p className="text-xs text-slate-500 italic mt-2 border-t pt-2">
          {turno.notas}
        </p>
      )}
    </div>
  );
}