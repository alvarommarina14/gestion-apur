import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, Dumbbell } from 'lucide-react';

export default function SeleccionTipoClienteModal({ open, onOpenChange, onSelect }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Cliente</DialogTitle>
          <DialogDescription>
            ¿Qué tipo de cliente deseas agregar?
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <Card 
            className="p-4 cursor-pointer hover:shadow-lg transition-all active:scale-95"
            onClick={() => {
              onSelect('alumno');
              onOpenChange(false);
            }}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Alumno</h3>
                <p className="text-xs text-slate-500 mt-1">Clases con profesor</p>
              </div>
            </div>
          </Card>

          <Card 
            className="p-4 cursor-pointer hover:shadow-lg transition-all active:scale-95"
            onClick={() => {
              onSelect('abono_cancha');
              onOpenChange(false);
            }}
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="bg-emerald-100 p-3 rounded-lg">
                <Dumbbell className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Abono Cancha</h3>
                <p className="text-xs text-slate-500 mt-1">Alquiler/abono mensual</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}