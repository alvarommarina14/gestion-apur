import React from 'react';
import { DollarSign, Phone, Clock, AlertTriangle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/ui/StatusBadge';
import EnviarRecordatorioBtn from '@/components/recordatorios/EnviarRecordatorioBtn';
import { cn } from '@/lib/utils';

export default function CobrarHoyListUnificado({ itemsCobranza = [], onRegistrarPago, onEnviarRecordatorio }) {
  if (itemsCobranza.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Todos los pagos están al día</p>
      </div>
    );
  }

  const morosos = itemsCobranza.filter(a => a.estado === 'moroso');
  const pendientes = itemsCobranza.filter(a => a.estado !== 'moroso');

  return (
    <div className="space-y-4">
      {morosos.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Morosos ({morosos.length})
          </h4>
          <div className="space-y-2">
            {morosos.map((item) => (
              <ItemCobroItem 
                key={item.id} 
                item={item} 
                isMoroso 
                onRegistrarPago={onRegistrarPago}
                onEnviarRecordatorio={onEnviarRecordatorio}
              />
            ))}
          </div>
        </div>
      )}
      
      {pendientes.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Pendientes ({pendientes.length})
          </h4>
          <div className="space-y-2">
            {pendientes.map((item) => (
              <ItemCobroItem 
                key={item.id} 
                item={item} 
                onRegistrarPago={onRegistrarPago}
                onEnviarRecordatorio={onEnviarRecordatorio}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ItemCobroItem({ item, isMoroso, onRegistrarPago, onEnviarRecordatorio }) {
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const monto = item.precio_mensual || item.precio || 0;
  const deuda = item.deuda_total || 0;

  return (
    <div className={cn(
      'rounded-lg border p-3 transition-all',
      isMoroso ? 'bg-rose-50/50 border-rose-200' : 'bg-white border-slate-200'
    )}>
      <div className="space-y-2.5">
        {/* Nombre y estado */}
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800 text-sm">{item.nombre}</span>
          {item.estado && (
            <StatusBadge status={item.estado} size="sm" />
          )}
        </div>
        
        {/* Montos */}
        <div className="flex items-center gap-3 text-sm">
          <span className={cn(
            'font-semibold',
            isMoroso ? 'text-rose-600' : 'text-slate-700'
          )}>
            {formatMoney(monto)}
          </span>
          {deuda > 0 && (
            <span className="text-rose-600 text-xs">
              Deuda: {formatMoney(deuda)}
            </span>
          )}
          {item.profesor && (
            <span className="text-xs text-slate-500 ml-auto">
              Prof: {item.profesor}
            </span>
          )}
        </div>
        
        {/* Botones */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => onRegistrarPago?.(item)}
            className={cn(
              'flex-1',
              isMoroso ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
            )}
          >
            <DollarSign className="w-4 h-4 mr-1" />
            Cobrar
          </Button>
          {item.whatsapp && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const mensaje = encodeURIComponent(`Recordatorio de pago: ${item.nombre}, monto: ${formatMoney(monto)}`);
                window.open(`https://wa.me/${item.whatsapp.replace(/\D/g, '')}?text=${mensaje}`, '_blank');
              }}
              className="h-9 px-3"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}