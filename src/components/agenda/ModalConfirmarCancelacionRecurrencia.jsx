import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function ModalConfirmarCancelacionRecurrencia({ isOpen, onClose, onConfirm, turno, isPending }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Cancelar Recurrencia Semanal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-slate-900">{turno?.cliente}</p>
            <p className="text-sm text-slate-600">
              Se eliminarán todos los 52 turnos de esta clase recurrente
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              Esta acción no se puede deshacer. Se eliminarán todos los turnos de la grilla.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            No, mantener
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isPending ? 'Cancelando...' : 'Sí, cancelar recurrencia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}