import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

const DIAS_SEMANA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

export default function NuevaListaEsperaModal({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    nivel: 'principiante',
    tipo_clase: 'individual',
    dias_disponibles: [],
    hora_inicio: '09:00',
    hora_fin: '17:00',
    notas: ''
  });

  const crearMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.ListaEspera.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lista-espera'] });
      setFormData({
        nombre: '',
        telefono: '',
        email: '',
        nivel: 'principiante',
        tipo_clase: 'individual',
        dias_disponibles: [],
        hora_inicio: '09:00',
        hora_fin: '17:00',
        notas: ''
      });
      onOpenChange(false);
    }
  });

  const toggleDia = (dia) => {
    setFormData(prev => ({
      ...prev,
      dias_disponibles: prev.dias_disponibles.includes(dia)
        ? prev.dias_disponibles.filter(d => d !== dia)
        : [...prev.dias_disponibles, dia]
    }));
  };

  const handleSubmit = () => {
    if (!formData.nombre || !formData.telefono || !formData.nivel || formData.dias_disponibles.length === 0) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }
    crearMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar a Lista de Espera</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nombre */}
          <div>
            <Label className="text-sm font-medium">Nombre *</Label>
            <Input
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Nombre completo"
            />
          </div>

          {/* Teléfono */}
          <div>
            <Label className="text-sm font-medium">Teléfono *</Label>
            <Input
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              placeholder="+549341234567"
            />
          </div>

          {/* Email */}
          <div>
            <Label className="text-sm font-medium">Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="ejemplo@mail.com"
            />
          </div>

          {/* Nivel */}
          <div>
            <Label className="text-sm font-medium">Nivel *</Label>
            <Select value={formData.nivel} onValueChange={(val) => setFormData({ ...formData, nivel: val })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="principiante">Principiante</SelectItem>
                <SelectItem value="intermedio">Intermedio</SelectItem>
                <SelectItem value="avanzado">Avanzado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de clase */}
          <div>
            <Label className="text-sm font-medium">Tipo de Clase *</Label>
            <Select value={formData.tipo_clase} onValueChange={(val) => setFormData({ ...formData, tipo_clase: val })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="grupal">Grupal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Días disponibles */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Días Disponibles *</Label>
            <div className="grid grid-cols-2 gap-3">
              {DIAS_SEMANA.map((dia) => (
                <div key={dia} className="flex items-center gap-2">
                  <Checkbox
                    id={dia}
                    checked={formData.dias_disponibles.includes(dia)}
                    onCheckedChange={() => toggleDia(dia)}
                  />
                  <Label htmlFor={dia} className="capitalize cursor-pointer text-sm">
                    {dia}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Horario */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">Desde</Label>
              <Input
                type="time"
                value={formData.hora_inicio}
                onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Hasta</Label>
              <Input
                type="time"
                value={formData.hora_fin}
                onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <Label className="text-sm font-medium">Notas</Label>
            <Textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Información adicional..."
              className="h-20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={crearMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {crearMutation.isPending ? 'Agregando...' : 'Agregar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}