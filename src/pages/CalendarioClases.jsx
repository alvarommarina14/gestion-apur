import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import CalendarioClases from '@/components/clases/CalendarioClases';
import NuevaClaseModal from '@/components/modals/NuevaClaseModal';
import CancelarClaseModal from '@/components/modals/CancelarClaseModal';

export default function CalendarioClasesPage() {
  const [nuevaClaseModal, setNuevaClaseModal] = useState(false);
  const [claseSeleccionada, setClaseSeleccionada] = useState(null);
  const [profesorSeleccionado, setProfesorSeleccionado] = useState(null);

  // Cargar profesor seleccionado
  React.useEffect(() => {
    const profesorGuardado = localStorage.getItem('profesor_seleccionado');
    if (profesorGuardado) {
      try {
        setProfesorSeleccionado(JSON.parse(profesorGuardado));
      } catch (e) {
        console.error('Error parsing profesor seleccionado', e);
      }
    }
  }, []);

  const { data: clases = [], isLoading } = useQuery({
    queryKey: ['clases'],
    queryFn: () => base44.entities.Clase.list(),
  });

  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
  });

  // Filtrar clases por profesor si hay uno seleccionado
  const clasesFiltradas = React.useMemo(() => {
    if (!profesorSeleccionado) return clases;
    
    const alumnosProfesor = alumnos
      .filter(a => a.profesor_id === profesorSeleccionado.id)
      .map(a => a.id);
    
    return clases.filter(c => 
      c.alumnos_ids?.some(id => alumnosProfesor.includes(id))
    );
  }, [clases, alumnos, profesorSeleccionado]);

  const handleClaseClick = (clase) => {
    setClaseSeleccionada(clase);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Calendario de Clases</h1>
            <p className="text-slate-500 text-sm">
              Vista calendario de todas las clases programadas
              {profesorSeleccionado && (
                <span className="ml-2 text-emerald-600 font-medium">
                  • {profesorSeleccionado.nombre}
                </span>
              )}
            </p>
          </div>
          <Button 
            onClick={() => setNuevaClaseModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva clase
          </Button>
        </header>

        {/* Calendario */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            {isLoading ? (
              <div className="h-[700px] flex items-center justify-center">
                <p className="text-slate-500">Cargando calendario...</p>
              </div>
            ) : (
              <CalendarioClases 
                clases={clasesFiltradas} 
                onClaseClick={handleClaseClick}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modales */}
      <NuevaClaseModal 
        open={nuevaClaseModal}
        onOpenChange={setNuevaClaseModal}
      />

      <CancelarClaseModal 
        open={!!claseSeleccionada}
        onOpenChange={(open) => !open && setClaseSeleccionada(null)}
        clase={claseSeleccionada}
      />
    </div>
  );
}