import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageCircle, Send, CheckCircle } from 'lucide-react';

export default function EnviarRecordatorioBtn({ alumno, variant = "outline", size = "sm", className }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const currentMonth = format(new Date(), 'yyyy-MM');
  
  const { data: configuraciones = [] } = useQuery({
    queryKey: ['configuraciones'],
    queryFn: () => base44.entities.ConfiguracionRecordatorios.list(),
  });
  
  const configManual = configuraciones.find(c => c.tipo === 'manual' && c.activo);
  
  const [mensaje, setMensaje] = useState('');
  
  React.useEffect(() => {
    if (open && configManual) {
      const mensajePersonalizado = configManual.mensaje_template
        .replace(/\{nombre\}/g, alumno?.nombre?.split(' ')[0] || 'Alumno')
        .replace(/\{monto\}/g, new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
          minimumFractionDigits: 0,
        }).format(alumno?.precio_mensual || 0))
        .replace(/\{mes\}/g, format(new Date(), 'MMMM', { locale: es }));
      
      setMensaje(mensajePersonalizado);
    }
  }, [open, configManual, alumno]);
  
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Recordatorio.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordatorios'] });
    },
  });
  
  const handleEnviar = async () => {
    // Crear recordatorio
    await createMutation.mutateAsync({
      alumno_id: alumno.id,
      alumno_nombre: alumno.nombre,
      tipo: 'manual',
      fecha_programada: format(new Date(), 'yyyy-MM-dd'),
      estado: 'enviado',
      fecha_enviado: new Date().toISOString(),
      mensaje: mensaje,
      canal: 'whatsapp',
      whatsapp: alumno.whatsapp,
      monto_recordado: alumno.precio_mensual,
      mes_correspondiente: currentMonth,
    });
    
    // Abrir WhatsApp
    const mensajeEncoded = encodeURIComponent(mensaje);
    const numero = alumno.whatsapp?.replace(/\D/g, '');
    window.open(`https://wa.me/${numero}?text=${mensajeEncoded}`, '_blank');
    
    setSuccess(true);
    
    setTimeout(() => {
      setSuccess(false);
      setOpen(false);
    }, 1500);
  };
  
  if (success) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">¡Recordatorio enviado!</h3>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <MessageCircle className="w-4 h-4 mr-1" />
        Recordar
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar recordatorio</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-sm font-medium text-slate-800">{alumno?.nombre}</p>
              <p className="text-xs text-slate-500">{alumno?.whatsapp}</p>
            </div>
            
            <div className="space-y-2">
              <Label>Mensaje</Label>
              <Textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={5}
                placeholder="Escribe el mensaje..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleEnviar}
              disabled={!mensaje}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar por WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}