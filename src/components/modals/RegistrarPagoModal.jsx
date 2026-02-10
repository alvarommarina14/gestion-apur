import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function RegistrarPagoModal({ open, onOpenChange, alumno }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const currentMonth = format(new Date(), 'yyyy-MM');
  const currentDay = new Date().getDate();
  const isFueraDetermino = currentDay > 15;
  
  const [formData, setFormData] = useState({
    monto: alumno?.precio_mensual || '',
    medio_pago: '',
    mes_correspondiente: currentMonth,
    notas: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!alumno) return;
    
    setLoading(true);
    
    try {
      // Crear el pago
      await base44.entities.Pago.create({
        alumno_id: alumno.id,
        alumno_nombre: alumno.nombre,
        fecha: format(new Date(), 'yyyy-MM-dd'),
        monto: Number(formData.monto),
        medio_pago: formData.medio_pago,
        mes_correspondiente: formData.mes_correspondiente,
        fuera_de_termino: isFueraDetermino,
        notas: formData.notas,
      });
      
      // Sincronizar con CobroCliente y actualizar estado
      await base44.functions.invoke('sincronizarPagosCompleto', {
        tipo_evento: 'alumno_pago',
        alumnoId: alumno.id,
        monto: Number(formData.monto),
        fecha: format(new Date(), 'yyyy-MM-dd'),
        mes: formData.mes_correspondiente,
        medio_pago: formData.medio_pago
      });
      
      // Log de auditoría
      const nuevaDeuda = Math.max(0, (alumno.deuda_total || 0) - Number(formData.monto));
      await base44.entities.LogAuditoria.create({
        entidad: 'Pago',
        entidad_id: alumno.id,
        entidad_nombre: alumno.nombre,
        accion: 'crear',
        campo_modificado: 'pago_mensual',
        valor_anterior: `Deuda: ${alumno.deuda_total}`,
        valor_nuevo: `Pago: ${formData.monto} - Nueva deuda: ${nuevaDeuda}`,
        motivo: `Pago registrado - ${formData.medio_pago}`,
        fecha: new Date().toISOString(),
      });
      
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['alumnos'] });
      queryClient.invalidateQueries({ queryKey: ['pagos'] });
      queryClient.invalidateQueries({ queryKey: ['cobros-clientes'] });
      
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
        setFormData({
          monto: '',
          medio_pago: '',
          mes_correspondiente: currentMonth,
          notas: '',
        });
      }, 1500);
      
    } catch (error) {
      console.error('Error registrando pago:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  // Generar opciones de meses
  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = -2; i <= 1; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy', { locale: es }),
      });
    }
    return options;
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">¡Pago registrado!</h3>
            <p className="text-slate-500 mt-1">El pago de {alumno?.nombre} fue registrado correctamente</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Registrar pago
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Info del alumno */}
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="font-semibold text-slate-800">{alumno?.nombre}</p>
            <div className="flex items-center justify-between mt-1 text-sm">
              <span className="text-slate-500">Precio mensual</span>
              <span className="font-medium">{formatMoney(alumno?.precio_mensual)}</span>
            </div>
            {alumno?.deuda_total > 0 && (
              <div className="flex items-center justify-between mt-1 text-sm">
                <span className="text-rose-600">Deuda acumulada</span>
                <span className="font-medium text-rose-600">{formatMoney(alumno?.deuda_total)}</span>
              </div>
            )}
          </div>
          
          {isFueraDetermino && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
              <p className="text-amber-700">
                Este pago se registrará como <strong>fuera de término</strong> (después del día 15)
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                type="number"
                value={formData.monto}
                onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                placeholder="0"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Mes correspondiente</Label>
              <Select
                value={formData.mes_correspondiente}
                onValueChange={(v) => setFormData({ ...formData, mes_correspondiente: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getMonthOptions().map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Medio de pago</Label>
            <Select
              value={formData.medio_pago}
              onValueChange={(v) => setFormData({ ...formData, medio_pago: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="mercadopago">MercadoPago</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Observaciones del pago..."
              rows={2}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Registrando...' : 'Registrar pago'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}