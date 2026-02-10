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
import NuevoAlumnoModal from '@/components/modals/NuevoAlumnoModal';

export default function NuevoClienteModal({ open, onOpenChange }) {
   const queryClient = useQueryClient();
   const [success, setSuccess] = useState(false);
   const [clienteCreado, setClienteCreado] = useState(null);
   const [tipoRegistro, setTipoRegistro] = useState(null); // 'abono' o 'alumno'
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
        clases_por_mes: '4',
        horario_preferido: '',
        sede_preferida: '',
        tipo_asistencia: 'un_dia',
        dia_preferido: '',
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
         precio: 0,
         es_alumno: false,
         profesor_id: '',
         profesor_nombre: '',
         clases_por_mes: '4',
         horario_preferido: '',
         sede_preferida: '',
         tipo_asistencia: 'un_dia',
         dia_preferido: '',
         notas: '',
       });
       setSuccess(false);
       setTipoRegistro(null);
     }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const newCliente = await base44.entities.Cliente.create(data);
      await registrarCreacion('Cliente', newCliente.id, data.nombre);
      return newCliente;
    },
    onSuccess: (newCliente) => {
       queryClient.invalidateQueries({ queryKey: ['clientes'] });
       if (formData.es_alumno && formData.profesor_id) {
         // Mostrar modal de nuevo alumno si marcó "es alumno"
         setClienteCreado(newCliente);
       } else {
         setSuccess(true);
         setTimeout(() => {
           setSuccess(false);
           onOpenChange(false);
         }, 1500);
       }
     },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  // Mostrar selector de tipo de registro
  if (tipoRegistro === null) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              Nuevo Cliente
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Button
              onClick={() => setTipoRegistro('abono')}
              className="w-full h-20 bg-purple-50 hover:bg-purple-100 text-slate-900 border-2 border-purple-200 flex flex-col items-center justify-center gap-2"
            >
              <span className="text-lg font-semibold">💳 Abono Cancha</span>
              <span className="text-xs text-slate-600">Alquiler con abono mensual</span>
            </Button>

            <Button
              onClick={() => setTipoRegistro('alumno')}
              className="w-full h-20 bg-emerald-50 hover:bg-emerald-100 text-slate-900 border-2 border-emerald-200 flex flex-col items-center justify-center gap-2"
            >
              <span className="text-lg font-semibold">👨‍🎓 Alumno</span>
              <span className="text-xs text-slate-600">Clases con profesor</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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

   if (clienteCreado) {
     return (
       <NuevoAlumnoModal 
         open={true}
         onOpenChange={(isOpen) => {
           if (!isOpen) {
             // Cerrar todo y resetear
             queryClient.invalidateQueries({ queryKey: ['clientes'] });
             queryClient.invalidateQueries({ queryKey: ['alumnos'] });
             setClienteCreado(null);
             onOpenChange(false);
           }
         }}
         clienteData={{
           nombre: clienteCreado.nombre,
           whatsapp: clienteCreado.telefono,
           profesor_id: formData.profesor_id,
           profesor_nombre: formData.profesor_nombre,
           precio_mensual: formData.precio,
           observaciones: formData.notas,
         }}
       />
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
             <div className="space-y-4">
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
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Precio mensual *</Label>
                   <Input
                     type="number"
                     min="0"
                     step="100"
                     value={formData.precio}
                     onChange={(e) => setFormData({ ...formData, precio: parseFloat(e.target.value) || 0 })}
                     placeholder="Ej: 35000"
                     required={formData.es_alumno}
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Clases por mes</Label>
                   <Select
                     value={formData.clases_por_mes}
                     onValueChange={(v) => setFormData({ ...formData, clases_por_mes: v })}
                   >
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="1">1 clase</SelectItem>
                       <SelectItem value="2">2 clases</SelectItem>
                       <SelectItem value="4">4 clases</SelectItem>
                       <SelectItem value="8">8 clases</SelectItem>
                       <SelectItem value="12">12 clases</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Sede preferida</Label>
                   <Input
                     value={formData.sede_preferida}
                     onChange={(e) => setFormData({ ...formData, sede_preferida: e.target.value })}
                     placeholder="Club Norte"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Horario</Label>
                   <Input
                     type="time"
                     value={formData.horario_preferido}
                     onChange={(e) => setFormData({ ...formData, horario_preferido: e.target.value })}
                   />
                 </div>
               </div>
               <div className="space-y-2">
                 <Label>Tipo de asistencia</Label>
                 <Select
                   value={formData.tipo_asistencia}
                   onValueChange={(v) => setFormData({ ...formData, tipo_asistencia: v, dia_preferido: v === 'varios_dias' ? '' : formData.dia_preferido })}
                 >
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="un_dia">Un día a la semana</SelectItem>
                     <SelectItem value="varios_dias">Varios días a la semana</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               {formData.tipo_asistencia === 'un_dia' && (
                 <div className="space-y-2">
                   <Label>Día preferido</Label>
                   <Select
                     value={formData.dia_preferido}
                     onValueChange={(v) => setFormData({ ...formData, dia_preferido: v })}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Seleccionar" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="lunes">Lunes</SelectItem>
                       <SelectItem value="martes">Martes</SelectItem>
                       <SelectItem value="miercoles">Miércoles</SelectItem>
                       <SelectItem value="jueves">Jueves</SelectItem>
                       <SelectItem value="viernes">Viernes</SelectItem>
                       <SelectItem value="sabado">Sábado</SelectItem>
                       <SelectItem value="domingo">Domingo</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
               )}
             </div>
            )}

            {formData.tipo_cliente === 'abono' && (
             <div className="space-y-2">
               <Label>Precio mensual *</Label>
               <Input
                 type="number"
                 min="0"
                 step="100"
                 value={formData.precio}
                 onChange={(e) => setFormData({ ...formData, precio: parseFloat(e.target.value) || 0 })}
                 placeholder="Ej: 120000"
                 required
               />
             </div>
            )}

            {formData.tipo_cliente === 'suelto' && (
             <div className="space-y-2">
               <Label>Precio *</Label>
               <Input
                 type="number"
                 min="0"
                 step="100"
                 value={formData.precio}
                 onChange={(e) => setFormData({ ...formData, precio: parseFloat(e.target.value) || 0 })}
                 placeholder="Ej: 50000"
                 required
               />
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