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

const diasDispoonibles = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const diasLabels = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

export default function NuevoClienteModal({ open, onOpenChange, tipoCliente }) {
   const queryClient = useQueryClient();
   const [success, setSuccess] = useState(false);
   const [clienteCreado, setClienteCreado] = useState(null);
   const [showNewProfesor, setShowNewProfesor] = useState(false);
   const [newProfesorData, setNewProfesorData] = useState({ nombre: '', email: '', telefono: '' });
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
       dias_semana: [],
       notas: '',
       });

   const { data: profesores = [] } = useQuery({
     queryKey: ['profesores-list'],
     queryFn: () => base44.entities.Profesor.list(),
   });

  React.useEffect(() => {
    if (open) {
       const tipoInicial = tipoCliente === 'alumno' ? 'clase' : 'abono';
       const esAlumno = tipoCliente === 'alumno';
       setFormData({
         nombre: '',
         telefono: '',
         email: '',
         clasificacion: 'recurrente',
         tipo_cliente: tipoInicial,
         precio: 0,
         es_alumno: esAlumno,
         profesor_id: '',
         profesor_nombre: '',
         clases_por_mes: '4',
         horario_preferido: '',
         sede_preferida: '',
         tipo_asistencia: 'un_dia',
         dia_preferido: '',
         dias_semana: [],
         notas: '',
         });
         setSuccess(false);
     }
  }, [open, tipoCliente]);

  const createProfesorMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Profesor.create(data);
    },
    onSuccess: (newProfesor) => {
      queryClient.invalidateQueries({ queryKey: ['profesores-list'] });
      setFormData({ ...formData, profesor_id: newProfesor.id, profesor_nombre: newProfesor.nombre });
      setNewProfesorData({ nombre: '', email: '', telefono: '' });
      setShowNewProfesor(false);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const newCliente = await base44.entities.Cliente.create(data);
      await registrarCreacion('Cliente', newCliente.id, data.nombre);
      return newCliente;
    },
    onSuccess: (newCliente) => {
       queryClient.invalidateQueries({ queryKey: ['clientes'] });
       if (tipoCliente === 'alumno' && formData.es_alumno && formData.profesor_id) {
         // Mostrar modal de nuevo alumno si es tipo alumno
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

   if (showNewProfesor) {
     return (
       <Dialog open={true} onOpenChange={setShowNewProfesor}>
         <DialogContent className="sm:max-w-md">
           <DialogHeader>
             <DialogTitle>Crear nuevo profesor</DialogTitle>
           </DialogHeader>
           <form 
             onSubmit={(e) => {
               e.preventDefault();
               createProfesorMutation.mutate(newProfesorData);
             }}
             className="space-y-4"
           >
             <div className="space-y-2">
               <Label>Nombre *</Label>
               <Input
                 value={newProfesorData.nombre}
                 onChange={(e) => setNewProfesorData({ ...newProfesorData, nombre: e.target.value })}
                 placeholder="Nombre del profesor"
                 required
               />
             </div>
             <div className="space-y-2">
               <Label>Email</Label>
               <Input
                 type="email"
                 value={newProfesorData.email}
                 onChange={(e) => setNewProfesorData({ ...newProfesorData, email: e.target.value })}
                 placeholder="profesor@email.com"
               />
             </div>
             <div className="space-y-2">
               <Label>Teléfono</Label>
               <Input
                 value={newProfesorData.telefono}
                 onChange={(e) => setNewProfesorData({ ...newProfesorData, telefono: e.target.value })}
                 placeholder="+54 9 ..."
               />
             </div>
             <DialogFooter>
               <Button type="button" variant="outline" onClick={() => setShowNewProfesor(false)}>
                 Cancelar
               </Button>
               <Button 
                 type="submit"
                 disabled={createProfesorMutation.isPending}
                 className="bg-emerald-600 hover:bg-emerald-700"
               >
                 {createProfesorMutation.isPending ? 'Creando...' : 'Crear'}
               </Button>
             </DialogFooter>
           </form>
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
       <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <UserPlus className="w-5 h-5 text-emerald-600" />
             Nuevo Cliente
           </DialogTitle>
         </DialogHeader>

         <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-4">
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
                     <SelectItem value="ocasional">Ocasional</SelectItem>
                   </SelectContent>
              </Select>
            </div>
            {tipoCliente === 'abono_cancha' && (
             <div className="space-y-2">
               <Label>Modalidad</Label>
               <Select
                 value={formData.tipo_cliente}
                 onValueChange={(v) => setFormData({ ...formData, tipo_cliente: v })}
               >
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="abono">Abono Mensual</SelectItem>
                   <SelectItem value="suelto">Cancha Suelta</SelectItem>
                 </SelectContent>
               </Select>
             </div>
            )}
            </div>

            {tipoCliente === 'alumno' && formData.es_alumno && (
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
                 <Button 
                   type="button"
                   variant="outline"
                   size="sm"
                   onClick={() => setShowNewProfesor(true)}
                   className="w-full"
                 >
                   + Crear nuevo profesor
                 </Button>
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
                   <Select
                     value={formData.sede_preferida}
                     onValueChange={(v) => setFormData({ ...formData, sede_preferida: v })}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Seleccionar sede" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="APUR">APUR</SelectItem>
                       <SelectItem value="Palos Verdes">Palos Verdes</SelectItem>
                     </SelectContent>
                   </Select>
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
               {formData.tipo_asistencia === 'varios_dias' && (
                 <div className="space-y-3">
                   <Label>Selecciona los días</Label>
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                     {diasDispoonibles.map(dia => (
                       <label key={dia} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50 transition">
                         <Checkbox
                           checked={formData.dias_semana.includes(dia)}
                           onCheckedChange={(checked) => {
                             if (checked) {
                               setFormData({
                                 ...formData,
                                 dias_semana: [...formData.dias_semana, dia]
                               });
                             } else {
                               setFormData({
                                 ...formData,
                                 dias_semana: formData.dias_semana.filter(d => d !== dia)
                               });
                             }
                           }}
                         />
                         <span className="text-sm font-medium text-slate-700">{diasLabels[dia]}</span>
                       </label>
                     ))}
                   </div>
                 </div>
               )}
             </div>
            )}

            {tipoCliente === 'abono_cancha' && (formData.tipo_cliente === 'abono' || formData.tipo_cliente === 'suelto') && (
             <div className="space-y-2">
               <Label>{formData.tipo_cliente === 'abono' ? 'Precio mensual *' : 'Precio por turno *'}</Label>
               <Input
                 type="number"
                 min="0"
                 step="100"
                 value={formData.precio}
                 onChange={(e) => setFormData({ ...formData, precio: parseFloat(e.target.value) || 0 })}
                 placeholder={formData.tipo_cliente === 'abono' ? 'Ej: 120000' : 'Ej: 50000'}
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