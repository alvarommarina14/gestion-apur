import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { X } from 'lucide-react';

export default function NuevaClaseAgendaModal({ isOpen, onClose, initialDate }) {
  const [cancha, setCancha] = useState('1');
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [duracion, setDuracion] = useState(50);
  const [tipo, setTipo] = useState('individual');
  const [profesor, setProfesor] = useState('');
  const [nuevoProfesor, setNuevoProfesor] = useState('');
  const [showNuevoProfesor, setShowNuevoProfesor] = useState(false);
  const [alumnos, setAlumnos] = useState([]);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState('');
  const [precio, setPrecio] = useState('');
  const [notas, setNotas] = useState('');
  const queryClient = useQueryClient();

  // Fetch profesores
  const { data: profesores = [] } = useQuery({
    queryKey: ['profesores'],
    queryFn: () => base44.entities.Profesor.list(),
  });

  // Fetch clientes (alumnos)
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list(),
  });

  // Filtrar solo clientes que son alumnos
  const alumnosDisponibles = clientes.filter(c => c.es_alumno === true);

  const mutation = useMutation({
    mutationFn: async () => {
      let profesorId = profesor;

      // Crear profesor si es necesario
      if (showNuevoProfesor && nuevoProfesor) {
        const nuevoProf = await base44.entities.Profesor.create({
          nombre: nuevoProfesor,
          activo: true
        });
        profesorId = nuevoProf.id;
      }

      if (!profesorId) {
        throw new Error('Selecciona o crea un profesor');
      }

      if (tipo === 'individual' && alumnos.length === 0) {
        throw new Error('Selecciona al menos un alumno');
      }

      // Crear clase
      const horaFin = new Date(new Date(`2000-01-01 ${horaInicio}`).getTime() + duracion * 60000);
      const horaFinStr = `${String(horaFin.getHours()).padStart(2, '0')}:${String(horaFin.getMinutes()).padStart(2, '0')}`;

      const clase = await base44.entities.Clase.create({
        fecha: format(initialDate, 'yyyy-MM-dd'),
        hora_inicio: horaInicio,
        duracion,
        tipo,
        sede: 'Sede Principal',
        cancha,
        alumnos_ids: alumnos,
        alumnos_nombres: alumnos.map(aId => {
          const a = alumnosDisponibles.find(x => x.id === aId);
          return a?.nombre || '';
        }).filter(Boolean),
        precio: parseFloat(precio) || 0,
        estado: 'programada',
        profesor_id: profesorId
      });

      // Crear turno en cancha si es en la grilla
      await base44.entities.TurnoCancha.create({
        fecha: format(initialDate, 'yyyy-MM-dd'),
        hora_inicio: horaInicio,
        hora_fin: horaFinStr,
        duracion: duracion === 80 ? 80 : 60,
        cancha,
        cliente: alumnosDisponibles.find(x => x.id === alumnos[0])?.nombre || 'Clase',
        tipo_turno: 'clase',
        profesor: profesores.find(p => p.id === profesorId)?.nombre || '',
        monto: parseFloat(precio) || 0,
        pagado: false,
        estado: 'activo',
        empleados_asignados_ids: [],
        notas
      });

      return clase;
    },
    onSuccess: () => {
      toast.success('Clase creada correctamente');
      queryClient.invalidateQueries({ queryKey: ['clases'] });
      queryClient.invalidateQueries({ queryKey: ['turnos'] });
      handleClose();
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    }
  });

  const handleClose = () => {
    setCancha('1');
    setHoraInicio('09:00');
    setDuracion(50);
    setTipo('individual');
    setProfesor('');
    setNuevoProfesor('');
    setShowNuevoProfesor(false);
    setAlumnos([]);
    setAlumnoSeleccionado('');
    setPrecio('');
    setNotas('');
    onClose();
  };

  const agregarAlumno = () => {
    if (alumnoSeleccionado && !alumnos.includes(alumnoSeleccionado)) {
      setAlumnos([...alumnos, alumnoSeleccionado]);
      setAlumnoSeleccionado('');
    }
  };

  const removerAlumno = (alumnoId) => {
    setAlumnos(alumnos.filter(id => id !== alumnoId));
  };

  const alumnosSeleccionados = alumnos.map(id => 
    alumnosDisponibles.find(a => a.id === id)
  ).filter(Boolean);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Clase</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cancha y Horario */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Cancha
              </label>
              <Select value={cancha} onValueChange={setCancha}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Cancha 1</SelectItem>
                  <SelectItem value="2">Cancha 2</SelectItem>
                  <SelectItem value="3">Cancha 3</SelectItem>
                  <SelectItem value="4">Cancha 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Hora inicio
              </label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Duración
              </label>
              <Select value={duracion.toString()} onValueChange={(v) => setDuracion(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 minutos</SelectItem>
                  <SelectItem value="80">80 minutos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Profesor */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Profesor
            </label>
            {!showNuevoProfesor ? (
              <div className="flex gap-2">
                <Select value={profesor} onValueChange={setProfesor}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecciona profesor" />
                  </SelectTrigger>
                  <SelectContent>
                    {profesores.filter(p => p.activo).map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNuevoProfesor(true)}
                >
                  + Nuevo
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nuevoProfesor}
                  onChange={(e) => setNuevoProfesor(e.target.value)}
                  placeholder="Nombre del profesor"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowNuevoProfesor(false);
                    setNuevoProfesor('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>

          {/* Tipo de clase */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Tipo de clase
            </label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="grupal">Grupal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Alumnos */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Alumnos ({alumnos.length})
            </label>
            <div className="flex gap-2 mb-2">
              <Select value={alumnoSeleccionado} onValueChange={setAlumnoSeleccionado}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecciona alumno" />
                </SelectTrigger>
                <SelectContent>
                  {alumnosDisponibles
                    .filter(a => !alumnos.includes(a.id))
                    .map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={agregarAlumno}
                disabled={!alumnoSeleccionado || (tipo === 'individual' && alumnos.length > 0)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Agregar
              </Button>
            </div>

            {/* Lista de alumnos seleccionados */}
            {alumnosSeleccionados.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {alumnosSeleccionados.map(a => (
                  <div
                    key={a.id}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full flex items-center gap-2 text-sm"
                  >
                    {a.nombre}
                    {tipo === 'grupal' && (
                      <button
                        onClick={() => removerAlumno(a.id)}
                        className="hover:text-blue-900"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Precio y Notas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Precio
              </label>
              <input
                type="number"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Notas
            </label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalles o comentarios..."
              className="resize-none h-20"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {mutation.isPending ? 'Creando...' : 'Crear Clase'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}