import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  User
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const asistenciaOptions = [
  { 
    value: 'presente', 
    label: 'Presente', 
    icon: CheckCircle2, 
    color: 'border-emerald-500 bg-emerald-50 text-emerald-700',
    description: 'Asistió a la clase'
  },
  { 
    value: 'ausente_con_aviso', 
    label: 'Ausente con aviso', 
    icon: Clock, 
    color: 'border-amber-500 bg-amber-50 text-amber-700',
    description: 'Avisó con +24h de anticipación'
  },
  { 
    value: 'ausente_sin_aviso', 
    label: 'Ausente sin aviso', 
    icon: XCircle, 
    color: 'border-rose-500 bg-rose-50 text-rose-700',
    description: 'No avisó o avisó tarde'
  },
];

export default function RegistrarAsistenciaModal({ open, onOpenChange, clase }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Estado para cada alumno
  const [asistencias, setAsistencias] = useState(() => {
    const initial = {};
    (clase?.alumnos_ids || []).forEach((id, idx) => {
      initial[id] = {
        estado: '',
        notas: '',
        nombre: clase?.alumnos_nombres?.[idx] || 'Alumno',
      };
    });
    return initial;
  });

  const handleAsistenciaChange = (alumnoId, estado) => {
    setAsistencias(prev => ({
      ...prev,
      [alumnoId]: { ...prev[alumnoId], estado }
    }));
  };

  const handleNotasChange = (alumnoId, notas) => {
    setAsistencias(prev => ({
      ...prev,
      [alumnoId]: { ...prev[alumnoId], notas }
    }));
  };

  const allSelected = Object.values(asistencias).every(a => a.estado);

  const handleSubmit = async () => {
    if (!clase || !allSelected) return;
    
    setLoading(true);
    
    try {
      // Crear asistencias y recuperos si corresponde
      for (const [alumnoId, data] of Object.entries(asistencias)) {
        // Crear registro de asistencia
        await base44.entities.Asistencia.create({
          clase_id: clase.id,
          alumno_id: alumnoId,
          alumno_nombre: data.nombre,
          fecha: clase.fecha,
          estado: data.estado,
          genera_recupero: data.estado === 'ausente_con_aviso',
          notas: data.notas,
        });
        
        // Si ausente con aviso, crear recupero
        if (data.estado === 'ausente_con_aviso') {
          await base44.entities.Recupero.create({
            alumno_id: alumnoId,
            alumno_nombre: data.nombre,
            clase_original_id: clase.id,
            fecha_original: clase.fecha,
            motivo: 'cancelacion_alumno',
            estado: 'pendiente',
            notas: data.notas,
          });
          
          // Actualizar clases a recuperar del alumno
          const alumnos = await base44.entities.Alumno.filter({ id: alumnoId });
          if (alumnos.length > 0) {
            await base44.entities.Alumno.update(alumnoId, {
              clases_a_recuperar: (alumnos[0].clases_a_recuperar || 0) + 1,
            });
          }
        }
        
        // Si presente, actualizar total de clases asistidas
        if (data.estado === 'presente') {
          const alumnos = await base44.entities.Alumno.filter({ id: alumnoId });
          if (alumnos.length > 0) {
            await base44.entities.Alumno.update(alumnoId, {
              total_clases_asistidas: (alumnos[0].total_clases_asistidas || 0) + 1,
            });
          }
        }
      }
      
      // Marcar clase con asistencia registrada y estado realizada
      await base44.entities.Clase.update(clase.id, {
        asistencia_registrada: true,
        estado: 'realizada',
      });
      
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      queryClient.invalidateQueries({ queryKey: ['asistencias'] });
      queryClient.invalidateQueries({ queryKey: ['alumnos'] });
      queryClient.invalidateQueries({ queryKey: ['recuperos'] });
      
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
      }, 1500);
      
    } catch (error) {
      console.error('Error registrando asistencia:', error);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">¡Asistencia registrada!</h3>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar asistencia</DialogTitle>
          <DialogDescription>
            {clase?.fecha && format(new Date(clase.fecha), "EEEE d 'de' MMMM", { locale: es })} - {clase?.hora_inicio}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {Object.entries(asistencias).map(([alumnoId, data]) => (
            <div key={alumnoId} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
                <span className="font-medium text-slate-800">{data.nombre}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {asistenciaOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = data.estado === option.value;
                  
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleAsistenciaChange(alumnoId, option.value)}
                      className={cn(
                        'p-3 rounded-lg border-2 transition-all text-center',
                        isSelected ? option.color : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <Icon className={cn(
                        'w-5 h-5 mx-auto mb-1',
                        isSelected ? '' : 'text-slate-400'
                      )} />
                      <span className={cn(
                        'text-xs font-medium',
                        isSelected ? '' : 'text-slate-600'
                      )}>
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              
              {data.estado === 'ausente_con_aviso' && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <p className="text-amber-700">
                    Se generará una clase a recuperar para este alumno
                  </p>
                </div>
              )}
              
              {data.estado && (
                <div className="space-y-1">
                  <Label className="text-xs">Notas (opcional)</Label>
                  <Textarea
                    value={data.notas}
                    onChange={(e) => handleNotasChange(alumnoId, e.target.value)}
                    placeholder="Observaciones..."
                    rows={2}
                    className="text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !allSelected}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? 'Guardando...' : 'Guardar asistencia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}