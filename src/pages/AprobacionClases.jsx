import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function AprobacionClases() {
  const queryClient = useQueryClient();
  const [procesando, setProcesando] = useState(null);
  const [seleccionadas, setSeleccionadas] = useState(new Set());

  const { data: clasesPendientes = [], isLoading } = useQuery({
    queryKey: ['clases-pendientes'],
    queryFn: async () => {
      const clases = await base44.entities.Clase.filter({
        estado_aprobacion: 'pendiente'
      });
      return clases;
    },
  });

  const { data: profesores = {} } = useQuery({
    queryKey: ['profesores-map'],
    queryFn: async () => {
      const profs = await base44.entities.Profesor.list();
      return profs.reduce((acc, p) => ({ ...acc, [p.id]: p.nombre }), {});
    },
  });

  const { data: alumnos = {} } = useQuery({
    queryKey: ['alumnos-map'],
    queryFn: async () => {
      const alus = await base44.entities.Alumno.list();
      return alus.reduce((acc, a) => ({ ...acc, [a.id]: a.nombre }), {});
    },
  });

  const aprobarMutation = useMutation({
    mutationFn: async (claseId) => {
      // Obtener datos de la clase
      const clases = await base44.entities.Clase.filter({ id: claseId });
      const clase = clases[0];
      
      // Actualizar estado de aprobación
      await base44.entities.Clase.update(claseId, {
        estado_aprobacion: 'aprobada'
      });

      // Crear TurnoCancha
      try {
        const [h, m] = clase.hora_inicio.split(':').map(Number);
        const horaFin = new Date(0, 0, 0, h, m + clase.duracion);
        const horaFinStr = `${String(horaFin.getHours()).padStart(2, '0')}:${String(horaFin.getMinutes()).padStart(2, '0')}`;
        
        const empleados = await base44.entities.User.list();
        const empleadosIds = empleados.map(e => e.id);
        const empleadosEmails = empleados.map(e => e.email);
        const empleadosNombres = empleados.map(e => e.full_name);
        
        const alumnosNombres = clase.alumnos_nombres?.join(', ') || 'Clase';
        
        await base44.entities.TurnoCancha.create({
          fecha: clase.fecha,
          hora_inicio: clase.hora_inicio,
          hora_fin: horaFinStr,
          duracion: clase.duracion,
          cancha: clase.cancha || '',
          cliente: alumnosNombres,
          tipo_turno: 'clase',
          monto: clase.precio || 0,
          pagado: false,
          empleados_asignados_ids: empleadosIds,
          empleados_asignados_emails: empleadosEmails,
          empleados_asignados_nombres: empleadosNombres,
          estado: 'activo',
          notas: clase.notas || `Clase - ${alumnosNombres}`,
        });
      } catch (error) {
        console.error('Error creando TurnoCancha:', error);
      }

      // Sincronizar con Google Calendar (con retry)
      try {
        const syncResult = await base44.functions.invoke('sincronizarClaseGoogleCalendar', {
          clase_id: claseId,
        });
        console.log('✅ Clase sincronizada con Google Calendar:', syncResult.data);
      } catch (error) {
        console.error('❌ Error sincronizando con Google Calendar:', error);
        // No fallar si hay error en sincronización, pero registrar el error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clases-pendientes'] });
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      setProcesando(null);
    },
  });

  const rechazarMutation = useMutation({
    mutationFn: async (claseId) => {
      await base44.entities.Clase.update(claseId, {
        estado_aprobacion: 'rechazada'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clases-pendientes'] });
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      setProcesando(null);
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: async (clasesIds) => {
      await Promise.all(
        clasesIds.map(id => base44.entities.Clase.delete(id))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clases-pendientes'] });
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      setSeleccionadas(new Set());
      setProcesando(null);
    },
  });

  const toggleSeleccion = (claseId) => {
    const nueva = new Set(seleccionadas);
    if (nueva.has(claseId)) {
      nueva.delete(claseId);
    } else {
      nueva.add(claseId);
    }
    setSeleccionadas(nueva);
  };

  const seleccionarTodas = () => {
    if (seleccionadas.size === clasesPendientes.length) {
      setSeleccionadas(new Set());
    } else {
      setSeleccionadas(new Set(clasesPendientes.map(c => c.id)));
    }
  };

  const handleEliminarSeleccionadas = async () => {
    if (!confirm(`¿Eliminar ${seleccionadas.size} clase${seleccionadas.size !== 1 ? 's' : ''}?`)) return;
    setProcesando('eliminar');
    await eliminarMutation.mutateAsync(Array.from(seleccionadas));
  };

  const handleEliminarTodas = async () => {
    if (!confirm(`¿Eliminar todas las ${clasesPendientes.length} clases pendientes?`)) return;
    setProcesando('eliminar');
    await eliminarMutation.mutateAsync(clasesPendientes.map(c => c.id));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Cargando clases pendientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
         {/* Header */}
         <div className="mb-8">
           <h1 className="text-3xl font-bold text-slate-900 mb-2">Aprobación de Clases</h1>
           <p className="text-slate-600">
             {clasesPendientes.length} clase{clasesPendientes.length !== 1 ? 's' : ''} pendiente{clasesPendientes.length !== 1 ? 's' : ''} de aprobación
           </p>
         </div>

         {/* Acciones masivas */}
         {clasesPendientes.length > 0 && (
           <div className="mb-6 flex gap-2 flex-wrap items-center">
             <Button
               variant="outline"
               size="sm"
               onClick={seleccionarTodas}
               className="gap-2"
             >
               <Checkbox 
                 checked={seleccionadas.size === clasesPendientes.length && clasesPendientes.length > 0}
                 className="cursor-pointer"
               />
               {seleccionadas.size === clasesPendientes.length ? 'Desseleccionar todas' : 'Seleccionar todas'}
             </Button>

             {seleccionadas.size > 0 && (
               <>
                 <span className="text-sm text-slate-600">
                   {seleccionadas.size} seleccionada{seleccionadas.size !== 1 ? 's' : ''}
                 </span>
                 <Button
                   variant="destructive"
                   size="sm"
                   onClick={handleEliminarSeleccionadas}
                   disabled={procesando === 'eliminar'}
                   className="gap-2"
                 >
                   <Trash2 className="w-4 h-4" />
                   Eliminar seleccionadas
                 </Button>
               </>
             )}

             <Button
               variant="destructive"
               size="sm"
               onClick={handleEliminarTodas}
               disabled={procesando === 'eliminar'}
               className="gap-2 ml-auto"
             >
               <Trash2 className="w-4 h-4" />
               Eliminar todas
             </Button>
           </div>
         )}

        {clasesPendientes.length === 0 ? (
          <Card className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <p className="text-slate-600">No hay clases pendientes de aprobación</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {clasesPendientes.map((clase) => (
              <Card key={clase.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Información básica */}
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Fecha y Hora</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {format(new Date(clase.fecha), "d 'de' MMMM", { locale: es })}
                      </p>
                      <p className="text-sm text-slate-600">{clase.hora_inicio}</p>
                    </div>

                    {/* Sede y Cancha */}
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Ubicación</p>
                      <p className="text-sm font-medium text-slate-900">{clase.sede}</p>
                      {clase.cancha && (
                        <p className="text-sm text-slate-600">Cancha: {clase.cancha}</p>
                      )}
                    </div>

                    {/* Profesor */}
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Profesor</p>
                      <p className="text-sm font-medium text-slate-900">
                        {profesores[clase.profesor_id] || 'Desconocido'}
                      </p>
                    </div>
                  </div>

                  {/* Alumnos */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Alumnos</p>
                    <div className="flex flex-wrap gap-2">
                      {clase.alumnos_ids?.map((alumnoId) => (
                        <Badge key={alumnoId} variant="outline">
                          {alumnos[alumnoId] || 'Alumno'}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Tipo y Duración */}
                  <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b">
                    <div>
                      <p className="text-xs text-slate-500">Tipo</p>
                      <p className="text-sm font-medium text-slate-900">
                        {clase.tipo === 'individual' ? 'Individual' : 'Grupal'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Duración</p>
                      <p className="text-sm font-medium text-slate-900">{clase.duracion} min</p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        setProcesando(clase.id);
                        aprobarMutation.mutate(clase.id);
                      }}
                      disabled={procesando === clase.id}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {procesando === clase.id ? 'Aprobando...' : 'Aprobar'}
                    </Button>
                    <Button
                      onClick={() => {
                        setProcesando(clase.id);
                        rechazarMutation.mutate(clase.id);
                      }}
                      disabled={procesando === clase.id}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {procesando === clase.id ? 'Rechazando...' : 'Rechazar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}