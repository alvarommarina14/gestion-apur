import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, CheckCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { registrarCreacion } from '@/components/utils/auditLog';
import { useQuery } from '@tanstack/react-query';

export default function NuevoClienteModal({ open, onOpenChange }) {
   const queryClient = useQueryClient();
   const [success, setSuccess] = useState(false);
   const [formData, setFormData] = useState({
      nombre: '',
      telefono: '',
      email: '',
      clasificacion: 'recurrente',
      tipo_cliente: 'clase',
      precio: 0,
      es_alumno: false,
      profesor_id: '',
      profesor_nombre: '',
      notas: '',
    });

   const { data: profesores = [] } = useQuery({
     queryKey: ['profesores-list'],
     queryFn: () => base44.entities.Profesor.list(),
   });

  React.useEffect(() => {
    if (open) {
      setFormData({
        nombre: '',
        telefono: '',
        email: '',
        clasificacion: 'recurrente',
        tipo_cliente: 'clase',
        es_alumno: false,
        profesor_id: '',
        profesor_nombre: '',
        notas: '',
      });
      setSuccess(false);
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const newCliente = await base44.entities.Cliente.create(data);
      await registrarCreacion('Cliente', newCliente.id, data.nombre);

      // Si es alumno, crear también en la entidad Alumno
      if (data.es_alumno && data.profesor_id) {
        await base44.entities.Alumno.create({
          profesor_id: data.profesor_id,
          profesor_nombre: data.profesor_nombre,
          nombre: data.nombre,
          whatsapp: data.telefono,
          observaciones: data.notas,
          estado: 'activo',
          precio_mensual: 0,
          clases_por_mes: 0,
          clases_a_recuperar: 0,
          deuda_total: 0,
          total_clases_asistidas: 0,
        });
        await registrarCreacion('Alumno', newCliente.id, data.nombre);
      }

      return newCliente;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['alumnos'] });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
      }, 1500);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">¡Cliente creado!</h3>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            Nuevo Cliente
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Nombre completo"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Teléfono *</Label>
              <Input
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="+54 9 ..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="cliente@email.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Clasificación</Label>
              <Select
                value={formData.clasificacion}
                onValueChange={(v) => setFormData({ ...formData, clasificacion: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                     <SelectItem value="recurrente">Recurrente</SelectItem>
                     <SelectItem value="suelto">Suelto</SelectItem>
                   </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
               <Label>Tipo</Label>
               <Select
                 value={formData.tipo_cliente}
                 onValueChange={(v) => setFormData({ ...formData, tipo_cliente: v })}
               >
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="clase">Clase</SelectItem>
                   <SelectItem value="abono">Abono</SelectItem>
                   <SelectItem value="suelto">Suelto</SelectItem>
                 </SelectContent>
               </Select>
             </div>
            </div>

            {formData.tipo_cliente === 'clase' && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Checkbox
                id="es-alumno"
                checked={formData.es_alumno}
                onCheckedChange={(checked) => setFormData({
                  ...formData,
                  es_alumno: checked,
                  profesor_id: checked ? formData.profesor_id : '',
                  profesor_nombre: checked ? formData.profesor_nombre : '',
                })}
              />
              <Label htmlFor="es-alumno" className="font-medium cursor-pointer">
                Es alumno
              </Label>
            </div>
            )}

            {formData.es_alumno && (
            <div className="space-y-2">
              <Label>Profesor *</Label>
              <Select
                value={formData.profesor_id}
                onValueChange={(profesorId) => {
                  const profesor = profesores.find(p => p.id === profesorId);
                  setFormData({
                    ...formData,
                    profesor_id: profesorId,
                    profesor_nombre: profesor?.nombre || '',
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona profesor" />
                </SelectTrigger>
                <SelectContent>
                  {profesores.map(prof => (
                    <SelectItem key={prof.id} value={prof.id}>
                      {prof.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Observaciones, preferencias, etc..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {createMutation.isPending ? 'Creando...' : 'Crear cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}