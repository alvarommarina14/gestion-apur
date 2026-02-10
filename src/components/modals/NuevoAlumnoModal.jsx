import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
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
import { User, CheckCircle, Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function NuevoAlumnoModal({ open, onOpenChange, alumno = null, profesorId = null }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const isEditing = !!alumno;
  
  const [formData, setFormData] = useState({
    nombre: '',
    whatsapp: '',
    observaciones: '',
    estado: 'activo',
    precio_mensual: '',
    clases_por_mes: '4',
    sede_preferida: '',
    horario_preferido: '',
    dia_preferido: '',
    tipo_asistencia: 'un_dia',
    dias_semana: [],
  });

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

  useEffect(() => {
    if (alumno) {
      setFormData({
        nombre: alumno.nombre || '',
        whatsapp: alumno.whatsapp || '',
        observaciones: alumno.observaciones || '',
        estado: alumno.estado || 'activo',
        precio_mensual: alumno.precio_mensual?.toString() || '',
        clases_por_mes: alumno.clases_por_mes?.toString() || '4',
        sede_preferida: alumno.sede_preferida || '',
        horario_preferido: alumno.horario_preferido || '',
        dia_preferido: alumno.dia_preferido || '',
        tipo_asistencia: alumno.tipo_asistencia || 'un_dia',
        dias_semana: alumno.dias_semana || [],
      });
    } else {
      setFormData({
        nombre: '',
        whatsapp: '',
        observaciones: '',
        estado: 'activo',
        precio_mensual: '',
        clases_por_mes: '4',
        sede_preferida: '',
        horario_preferido: '',
        dia_preferido: '',
        tipo_asistencia: 'un_dia',
        dias_semana: [],
      });
    }
  }, [alumno, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const user = await base44.auth.me();
      
      const data = {
        nombre: formData.nombre,
        whatsapp: formData.whatsapp,
        observaciones: formData.observaciones,
        estado: formData.estado,
        precio_mensual: Number(formData.precio_mensual),
        clases_por_mes: Number(formData.clases_por_mes),
        sede_preferida: formData.sede_preferida,
        horario_preferido: formData.horario_preferido,
        dia_preferido: formData.tipo_asistencia === 'un_dia' ? formData.dia_preferido : '',
        tipo_asistencia: formData.tipo_asistencia,
        dias_semana: formData.tipo_asistencia === 'varios_dias' ? formData.dias_semana : [],
      };
      
      if (isEditing) {
        // Log de auditoría para cambios importantes
        if (alumno.precio_mensual !== data.precio_mensual) {
          await base44.entities.LogAuditoria.create({
            entidad: 'Alumno',
            entidad_id: alumno.id,
            entidad_nombre: alumno.nombre,
            accion: 'editar',
            campo_modificado: 'precio_mensual',
            valor_anterior: alumno.precio_mensual?.toString(),
            valor_nuevo: data.precio_mensual.toString(),
            motivo: 'Actualización de precio mensual',
            fecha: new Date().toISOString(),
          });
        }
        
        await base44.entities.Alumno.update(alumno.id, data);
      } else {
      data.fecha_inicio = format(new Date(), 'yyyy-MM-dd');
      data.clases_a_recuperar = 0;
      data.deuda_total = 0;
      data.estado_mes_actual = 'pendiente';
      data.total_clases_asistidas = 0;

      // Buscar profesor_id en orden: prop > localStorage > user
      let idProfesor = profesorId;
      if (!idProfesor) {
        const profesorGuardado = localStorage.getItem('profesor_seleccionado');
        if (profesorGuardado) {
          try {
            const profesorObj = JSON.parse(profesorGuardado);
            idProfesor = profesorObj.id;
          } catch (e) {
            console.error('Error parsing profesor', e);
          }
        }
      }
      if (!idProfesor && user?.rol === 'profesor' && user?.profesor_id) {
        idProfesor = user.profesor_id;
      }

      if (idProfesor) {
         data.profesor_id = idProfesor;
         // Obtener nombre del profesor
         try {
           const profesor = await base44.entities.Profesor.read(idProfesor);
           if (profesor?.nombre) {
             data.profesor_nombre = profesor.nombre;
           }
         } catch (err) {
           console.log('Error obteniendo profesor:', err);
           data.profesor_nombre = 'Sin asignar';
         }
       }

        const alumnoCreado = await base44.entities.Alumno.create(data);

        // Sincronizar alumno con gestión de clientes
        if (data.profesor_id && data.profesor_nombre) {
          try {
            await base44.entities.Cliente.create({
              nombre: data.nombre,
              telefono: data.whatsapp || '',
              email: '',
              precio: data.precio_mensual,
              clasificacion: 'recurrente',
              tipo_cliente: 'clase',
              es_alumno: true,
              profesor_id: data.profesor_id,
              profesor_nombre: data.profesor_nombre,
              notas: `Alumno sincronizado - Profesor: ${data.profesor_nombre}`,
              activo: true,
            });
          } catch (err) {
            console.log('Error sincronizando alumno con clientes:', err);
          }
        }
      }
      
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['alumnos'] });
      
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
      }, 1500);
      
    } catch (error) {
      console.error('Error guardando alumno:', error);
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
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              {isEditing ? '¡Alumno actualizado!' : '¡Alumno creado!'}
            </h3>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {isEditing ? 'Editar alumno' : 'Nuevo alumno'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Nombre completo *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Juan Pérez"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>WhatsApp *</Label>
              <Input
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="+54 11 1234-5678"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={formData.estado}
                onValueChange={(v) => setFormData({ ...formData, estado: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="moroso">Moroso</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Precio mensual *</Label>
              <Input
                type="number"
                value={formData.precio_mensual}
                onChange={(e) => setFormData({ ...formData, precio_mensual: e.target.value })}
                placeholder="50000"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Clases por mes *</Label>
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

          {/* Tipo de asistencia */}
          <div className="space-y-2">
            <Label>Tipo de asistencia</Label>
            <Select
              value={formData.tipo_asistencia}
              onValueChange={(v) => {
                setFormData({ 
                  ...formData, 
                  tipo_asistencia: v,
                  dias_semana: v === 'un_dia' ? [] : formData.dias_semana,
                  dia_preferido: v === 'un_dia' ? formData.dia_preferido : ''
                });
              }}
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

          {/* Si es un día */}
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

          {/* Si son varios días */}
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
          
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              placeholder="Notas sobre el alumno..."
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear alumno'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}