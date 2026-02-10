import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function EditarClienteForm({ cliente, onSave }) {
  const [formData, setFormData] = useState({
    nombre: cliente.nombre || '',
    telefono: cliente.telefono || '',
    email: cliente.email || '',
    precio: cliente.precio || 0,
    clasificacion: cliente.clasificacion || 'ocasional',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'precio' ? parseFloat(value) || 0 : value,
    }));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium mb-2 block">Nombre</Label>
        <Input
          value={formData.nombre}
          onChange={(e) => handleChange('nombre', e.target.value)}
          placeholder="Nombre del cliente"
        />
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Teléfono</Label>
        <Input
          value={formData.telefono}
          onChange={(e) => handleChange('telefono', e.target.value)}
          placeholder="Teléfono"
        />
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Email</Label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="Email (opcional)"
        />
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Precio</Label>
        <Input
          type="number"
          value={formData.precio}
          onChange={(e) => handleChange('precio', e.target.value)}
          placeholder="0"
        />
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Clasificación</Label>
        <Select value={formData.clasificacion} onValueChange={(value) => handleChange('clasificacion', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ocasional">Ocasional</SelectItem>
            <SelectItem value="recurrente">Recurrente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={() => onSave(formData)} className="w-full">
        Guardar cambios
      </Button>
    </div>
  );
}