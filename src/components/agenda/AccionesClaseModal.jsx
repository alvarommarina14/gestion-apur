import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Ban, CheckCircle, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AccionesClaseModal({ 
  open, 
  onOpenChange, 
  turno, 
  onCancelar, 
  onRegistrarAsistencia 
}) {
  const [cancelMode, setCancelMode] = useState(null);

  if (!turno) return null;

  const handleCancelar = () => {
    onCancelar(cancelMode);
    setCancelMode(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Opciones de la clase</DialogTitle>
          <DialogDescription>
            {turno.cliente} • {turno.fecha && format(parseISO(turno.fecha), "d 'de' MMMM", { locale: es })} • {turno.hora_inicio}
          </DialogDescription>
        </DialogHeader>

        {!cancelMode ? (
          <div className="space-y-3">
            <Button
              onClick={() => onRegistrarAsistencia(turno)}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              size="lg"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Registrar Asistencia
            </Button>
            <Button
              onClick={() => setCancelMode(null) || setCancelMode('select')}
              variant="outline"
              className="w-full border-rose-300 text-rose-700 hover:bg-rose-50"
              size="lg"
            >
              <Ban className="w-5 h-5 mr-2" />
              Cancelar Cancha
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4 mr-2" />
              Cerrar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
              <p className="text-sm text-rose-900 font-medium">
                ¿Cómo deseas cancelar esta clase?
              </p>
            </div>

            <div className="space-y-2">
              <Label>Opción de cancelación</Label>
              <Select value={cancelMode === 'select' ? '' : cancelMode} onValueChange={setCancelMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una opción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoy">Cancelar solo por hoy</SelectItem>
                  <SelectItem value="semanal">Cancelar recurrencia semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setCancelMode(null)}
              >
                Atrás
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleCancelar}
                disabled={cancelMode === 'select'}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}