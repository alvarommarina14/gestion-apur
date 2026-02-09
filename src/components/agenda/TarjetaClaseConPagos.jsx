import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle, XCircle, DollarSign, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TarjetaClaseConPagos({ turno, isAdmin, onTurnoClick }) {
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
      const cobrosAlumno = cobros.filter(c => {
        const alumnoEsCliente = alumnos.find(a => a.id === alumnoId);
        return c.cliente_id === alumnoEsCliente?.cliente_id;
      });
      
      const ultimoCobro = cobrosAlumno?.[0];
      const estado = ultimoCobro?.estado || 'sin-datos';
      const monto = ultimoCobro?.monto || 0;
      
      return {
        nombre: alumno?.nombre || 'Sin nombre',
        estado,
        monto,
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
        <span className={cn(
          'px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1',
          turno.pagado
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-rose-100 text-rose-700'
        )}>
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
        </span>
        <span className="text-xs font-semibold text-slate-500">
          {turno.duracion} min
        </span>
      </div>

      {/* Cliente y hora */}
      <div className="mb-2">
        <p className="font-bold text-slate-900 text-base leading-tight">
          {turno.cliente}
        </p>
        <p className="text-sm text-slate-600 mt-0.5">
          {turno.hora_inicio} - {turno.hora_fin}
        </p>
      </div>

      {/* Profesor */}
      <div className="flex items-center gap-1 text-sm text-slate-600 mb-2">
        <User className="w-3.5 h-3.5" />
        <span>{turno.profesor || profesor?.nombre || 'No asignado'}</span>
      </div>

      {/* Precio de la clase */}
      {turno.monto > 0 && (
        <div className="flex items-center gap-1.5 mb-2">
          <DollarSign className="w-4 h-4 text-slate-500" />
          <span className="font-bold text-slate-900 text-base">
            {formatMoney(turno.monto)}
          </span>
        </div>
      )}

      {/* Alumnos con estado de pago */}
      {alumnosConPago.length > 0 && (
        <div className="mt-3 pt-2 border-t border-slate-300 space-y-1.5">
          <p className="text-xs font-semibold text-slate-700 mb-2">Alumnos:</p>
          {alumnosConPago.map((alumno, idx) => (
            <div key={idx} className="text-xs space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-medium">{alumno.nombre}</span>
                <span className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5',
                  alumno.estado === 'pagado'
                    ? 'bg-emerald-100 text-emerald-700'
                    : alumno.estado === 'moroso'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                )}>
                  {alumno.estado === 'pagado' && <CheckCircle className="w-2.5 h-2.5" />}
                  {alumno.estado === 'moroso' && <XCircle className="w-2.5 h-2.5" />}
                  {alumno.estado.charAt(0).toUpperCase() + alumno.estado.slice(1)}
                </span>
              </div>
              {alumno.monto > 0 && (
                <div className="text-slate-600">
                  Monto: <span className="font-semibold">{formatMoney(alumno.monto)}</span>
                </div>
              )}
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