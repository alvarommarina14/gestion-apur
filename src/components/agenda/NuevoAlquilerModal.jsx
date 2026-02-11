import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Search, AlertTriangle } from 'lucide-react';

export default function NuevoAlquilerModal({ isOpen, onClose, initialDate }) {
  const [cancha, setCancha] = useState('1');
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [duracion, setDuracion] = useState(50);
  const [modalidad, setModalidad] = useState('suelto');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [showListaClientes, setShowListaClientes] = useState(false);
  const [notas, setNotas] = useState('');
  const [recurrenciaSemanal, setRecurrenciaSemanal] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  // Fetch clientes
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list(),
  });

  // Fetch turnos existentes
  const { data: turnosExistentes = [] } = useQuery({
    queryKey: ['turnos-cancha-validacion'],
    queryFn: () => base44.entities.TurnoCancha.list(),
  });

  const validarDisponibilidad = (fecha, horaInicio, duracion, canchaSel) => {
    const horaFin = new Date(new Date(`2000-01-01 ${horaInicio}`).getTime() + duracion * 60000);
    const horaFinStr = `${String(horaFin.getHours()).padStart(2, '0')}:${String(horaFin.getMinutes()).padStart(2, '0')}`;
    
    const solapados = turnosExistentes.filter(t => {
      if (t.fecha !== fecha || t.cancha !== canchaSel) return false;
      if (t.estado === 'cancelado') return false;
      
      const tFin = t.hora_fin;
      if (horaInicio >= t.hora_inicio && horaInicio < tFin) return true;
      if (horaFinStr > t.hora_inicio && horaFinStr <= tFin) return true;
      if (horaInicio <= t.hora_inicio && horaFinStr >= tFin) return true;
      
      return false;
    });
    
    if (solapados.length > 0) {
      const turno = solapados[0];
      return {
        error: `⚠️ La Cancha ${canchaSel} ya está ocupada entre ${turno.hora_inicio} y ${turno.hora_fin} por ${turno.cliente}`,
        tipo: 'solapamiento'
      };
    }
    
    return null;
  };

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase())
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!clienteSeleccionado) {
        throw new Error('Selecciona un cliente');
      }

      // Validar disponibilidad antes de crear
      const validacion = validarDisponibilidad(format(initialDate, 'yyyy-MM-dd'), horaInicio, duracion, cancha);
      if (validacion) {
        throw new Error(validacion.error);
      }

      const clienteObj = clientes.find(c => c.id === clienteSeleccionado);
      const horaFin = new Date(new Date(`2000-01-01 ${horaInicio}`).getTime() + duracion * 60000);
      const horaFinStr = `${String(horaFin.getHours()).padStart(2, '0')}:${String(horaFin.getMinutes()).padStart(2, '0')}`;

      const datosTurno = {
        hora_inicio: horaInicio,
        hora_fin: horaFinStr,
        duracion: duracion === 80 ? 80 : 60,
        cancha,
        cliente: clienteObj.nombre,
        tipo_turno: 'alquiler',
        modalidad_alquiler: modalidad,
        pagado: false,
        estado: 'activo',
        empleados_asignados_ids: [],
        notas
      };

      if (recurrenciaSemanal) {
        // Crear 52 alquileres (un año de repeticiones semanales)
        for (let i = 0; i < 52; i++) {
          const fecha = new Date(initialDate);
          fecha.setDate(fecha.getDate() + (i * 7));
          
          await base44.entities.TurnoCancha.create({
            ...datosTurno,
            fecha: format(fecha, 'yyyy-MM-dd')
          });
        }
      } else {
        await base44.entities.TurnoCancha.create({
          ...datosTurno,
          fecha: format(initialDate, 'yyyy-MM-dd')
        });
      }

      return true;
    },
    onSuccess: () => {
      toast.success('Alquiler creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['turnos'] });
      queryClient.invalidateQueries({ queryKey: ['turnos-hoy'] });
      handleClose();
    },
    onError: (error) => {
      setError(error.message);
      toast.error(error.message);
    }
  });

  const handleClose = () => {
    setCancha('1');
    setHoraInicio('09:00');
    setDuracion(50);
    setModalidad('suelto');
    setBusquedaCliente('');
    setClienteSeleccionado('');
    setShowListaClientes(false);
    setNotas('');
    setRecurrenciaSemanal(false);
    setError('');
    onClose();
  };

  const clienteObj = clientes.find(c => c.id === clienteSeleccionado);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Alquiler</DialogTitle>
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
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

          {/* Cliente */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Cliente
            </label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={busquedaCliente}
                  onChange={(e) => setBusquedaCliente(e.target.value)}
                  onFocus={() => setShowListaClientes(true)}
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Lista de clientes */}
              {showListaClientes && (
                <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                  {clientesFiltrados.length > 0 ? (
                    clientesFiltrados.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setClienteSeleccionado(c.id);
                          setBusquedaCliente(c.nombre);
                          setShowListaClientes(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 text-sm text-slate-700"
                      >
                        {c.nombre}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-slate-500">
                      No hay clientes disponibles
                    </div>
                  )}
                </div>
              )}

              {/* Cerrar lista al hacer click afuera */}
              {showListaClientes && (
                <div
                  className="fixed inset-0 z-0"
                  onClick={() => setShowListaClientes(false)}
                />
              )}
            </div>

            {clienteObj && (
              <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-md text-sm text-emerald-700">
                ✓ {clienteObj.nombre}
              </div>
            )}
          </div>

          {/* Modalidad */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2">
              Modalidad
            </label>
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

          {/* Notas */}
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

          {/* Recurrencia semanal */}
          <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <input
              type="checkbox"
              id="recurrencia-alquiler"
              checked={recurrenciaSemanal}
              onChange={(e) => setRecurrenciaSemanal(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer"
            />
            <label htmlFor="recurrencia-alquiler" className="text-sm font-medium text-emerald-700 cursor-pointer">
              Repetir semanalmente durante un año
            </label>
          </div>

          {/* Botones */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {mutation.isPending ? 'Creando...' : 'Crear Alquiler'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}