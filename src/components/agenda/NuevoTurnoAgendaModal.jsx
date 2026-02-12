import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const HORAS = Array.from({ length: 29 }, (_, i) => {
  const hora = Math.floor(i / 2) + 8;
  const minuto = (i % 2) * 30;
  return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
});

export default function NuevoTurnoAgendaModal({ open, onOpenChange, fecha }) {
  const [paso, setPaso] = useState(1);
  const [tipoTurno, setTipoTurno] = useState('clase');
  const [tipoClase, setTipoClase] = useState('individual');
  const [modalidad, setModalidad] = useState('suelto');
  const [cliente, setCliente] = useState('');
  const [cancha, setCancha] = useState('1');
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [duracion, setDuracion] = useState('60');
  const [profesor, setProfesor] = useState('');
  const [alumnos, setAlumnos] = useState([]);
  const [monto, setMonto] = useState('');

  const queryClient = useQueryClient();

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list(),
    enabled: open,
  });

  const { data: profesores = [] } = useQuery({
    queryKey: ['profesores'],
    queryFn: () => base44.entities.Profesor.list(),
    enabled: open,
  });

  const { data: alumnosList = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
    enabled: open,
  });

  const crearTurnoMutation = useMutation({
    mutationFn: async () => {
      const horaFin = agregarMinutos(horaInicio, parseInt(duracion));
      
      const turnoData = {
        fecha: format(fecha, 'yyyy-MM-dd'),
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        duracion: parseInt(duracion),
        cancha,
        cliente,
        tipo_turno: tipoTurno,
        profesor: tipoTurno === 'clase' ? profesor : '',
        modalidad_alquiler: tipoTurno === 'alquiler' ? modalidad : undefined,
        monto: monto ? parseFloat(monto) : 0,
        pagado: false,
        estado: 'activo',
        alumnos_nombres: alumnos,
        empleados_asignados_ids: [],
      };

      return await base44.entities.TurnoCancha.create(turnoData);
    },
    onSuccess: () => {
      toast.success('Turno creado');
      queryClient.invalidateQueries({ queryKey: ['turnos-cancha'] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Error al crear turno');
    }
  });

  const agregarMinutos = (hora, minutos) => {
    const [h, m] = hora.split(':').map(Number);
    const total = h * 60 + m + minutos;
    const newH = Math.floor(total / 60);
    const newM = total % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  const resetForm = () => {
    setPaso(1);
    setTipoTurno('clase');
    setTipoClase('individual');
    setModalidad('suelto');
    setCliente('');
    setCancha('1');
    setHoraInicio('09:00');
    setDuracion('60');
    setProfesor('');
    setAlumnos([]);
    setMonto('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Turno</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {paso === 1 && (
            <>
              <div className="space-y-2">
                <Label>Tipo de Turno</Label>
                <Select value={tipoTurno} onValueChange={setTipoTurno}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clase">Clase</SelectItem>
                    <SelectItem value="alquiler">Alquiler Cancha</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tipoTurno === 'clase' && (
                <>
                  <div className="space-y-2">
                    <Label>Tipo de Clase</Label>
                    <Select value={tipoClase} onValueChange={setTipoClase}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="grupal">Grupal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Modalidad</Label>
                <Select value={modalidad} onValueChange={setModalidad}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suelto">Suelto</SelectItem>
                    <SelectItem value="abono">Abono</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={() => setPaso(2)} className="w-full">
                Siguiente
              </Button>
            </>
          )}

          {paso === 2 && (
            <>
              <div className="space-y-2">
                <Label>Cliente/Alumno</Label>
                <Select value={cliente} onValueChange={setCliente}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.nombre}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {tipoTurno === 'clase' && (
                <div className="space-y-2">
                  <Label>Profesor</Label>
                  <Select value={profesor} onValueChange={setProfesor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {profesores.map(p => (
                        <SelectItem key={p.id} value={p.nombre}>
                          {p.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Cancha</Label>
                <Select value={cancha} onValueChange={setCancha}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['1', '2', '3', '4'].map(c => (
                      <SelectItem key={c} value={c}>
                        Cancha {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={() => setPaso(3)} className="w-full">
                Siguiente
              </Button>
            </>
          )}

          {paso === 3 && (
            <>
              <div className="space-y-2">
                <Label>Hora Inicio</Label>
                <Select value={horaInicio} onValueChange={setHoraInicio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HORAS.map(h => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duración</Label>
                <Select value={duracion} onValueChange={setDuracion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1.5 horas</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Monto</Label>
                <Input 
                  type="number"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0"
                />
              </div>

              <Button 
                onClick={() => crearTurnoMutation.mutate()}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={crearTurnoMutation.isPending}
              >
                Crear Turno
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}