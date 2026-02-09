import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import CancelarCanchaModal from '@/components/agenda/CancelarCanchaModal';

export default function BotonesCancelacion({ turno, onModalClose }) {
  const [showCancelModal, setShowCancelModal] = useState(false);

  if (!turno) return null;

  const handleSuccess = () => {
    setShowCancelModal(false);
    // Cerrar el modal padre (editar turno)
    onModalClose?.();
  };

  return (
    <>
      <div className="w-full sm:mr-auto flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowCancelModal(true);
          }}
          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 w-full sm:w-auto flex items-center justify-center"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Cancelar cancha
        </Button>
      </div>

      <CancelarCanchaModal
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        turno={turno}
        onSuccess={handleSuccess}
      />
    </>
  );
}