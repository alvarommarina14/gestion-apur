import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Settings,
  Bell,
  MessageCircle,
  Mail,
  Save,
  Plus,
  Edit,
  Trash2,
  Power,
  PowerOff,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function Configuracion() {
  const queryClient = useQueryClient();
  const [editModal, setEditModal] = useState({ open: false, config: null });
  
  const { data: configuraciones = [], isLoading } = useQuery({
    queryKey: ['configuraciones'],
    queryFn: () => base44.entities.ConfiguracionRecordatorios.list(),
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ConfiguracionRecordatorios.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuraciones'] });
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ConfiguracionRecordatorios.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuraciones'] });
    },
  });
  
  const toggleActivo = async (config) => {
    await updateMutation.mutateAsync({
      id: config.id,
      data: { ...config, activo: !config.activo }
    });
  };
  
  const handleDelete = async (config) => {
    if (!confirm(`¿Eliminar configuración de recordatorio ${config.tipo}?`)) return;
    await deleteMutation.mutateAsync(config.id);
  };
  
  const tipoLabels = {
    pre_cobro: 'Pre-cobro',
    moroso: 'Moroso',
    manual: 'Manual',
  };
  
  const canalIcons = {
    whatsapp: MessageCircle,
    sms: MessageCircle,
    email: Mail,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
            <p className="text-slate-500 text-sm">
              Gestión de recordatorios automáticos de pago
            </p>
          </div>
          <Button 
            onClick={() => setEditModal({ open: true, config: null })}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva configuración
          </Button>
        </header>
        
        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-900 font-medium mb-1">
                  Cómo funcionan los recordatorios
                </p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>Pre-cobro:</strong> Configuración para recordatorios antes del día 5</li>
                  <li>• <strong>Moroso:</strong> Configuración para alumnos sin pago después del día 15</li>
                  <li>• <strong>Envío manual:</strong> Los recordatorios se generan automáticamente pero se envían manualmente desde la sección de Recordatorios</li>
                  <li>• Variables disponibles: {'{nombre}'}, {'{monto}'}, {'{mes}'}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Lista de configuraciones */}
        <div className="grid gap-4">
          {isLoading ? (
            [...Array(2)].map((_, i) => (
              <Card key={i} className="shadow-sm animate-pulse">
                <CardContent className="p-6 h-32" />
              </Card>
            ))
          ) : configuraciones.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-12 text-center text-slate-500">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium mb-2">No hay configuraciones de recordatorios</p>
                <p className="text-sm mb-4">Crea tu primera configuración para empezar</p>
                <Button 
                  variant="outline"
                  onClick={() => setEditModal({ open: true, config: null })}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear configuración
                </Button>
              </CardContent>
            </Card>
          ) : (
            configuraciones.map((config) => {
              const CanalIcon = canalIcons[config.canal] || MessageCircle;
              
              return (
                <Card key={config.id} className={cn(
                  'shadow-sm transition-all',
                  !config.activo && 'opacity-60'
                )}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant={config.activo ? 'default' : 'secondary'} className="font-medium">
                            {tipoLabels[config.tipo]}
                          </Badge>
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <CanalIcon className="w-4 h-4" />
                            <span className="capitalize">{config.canal}</span>
                          </div>
                          {config.dias_anticipacion && (
                            <span className="text-sm text-slate-500">
                              {config.dias_anticipacion} días antes
                            </span>
                          )}
                          {config.dias_despues && (
                            <span className="text-sm text-slate-500">
                              {config.dias_despues} días después del 15
                            </span>
                          )}
                        </div>
                        
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-sm text-slate-700 font-mono">
                            {config.mensaje_template}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActivo(config)}
                          className={cn(
                            config.activo ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-400'
                          )}
                        >
                          {config.activo ? (
                            <Power className="w-4 h-4" />
                          ) : (
                            <PowerOff className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditModal({ open: true, config })}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(config)}
                          className="text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

      </div>
      
      {/* Modal edición */}
      <ConfiguracionModal 
        open={editModal.open}
        onOpenChange={(open) => setEditModal({ ...editModal, open })}
        config={editModal.config}
      />
    </div>
  );
}

function ConfiguracionModal({ open, onOpenChange, config }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const isEditing = !!config;
  
  const [formData, setFormData] = useState({
    tipo: config?.tipo || 'pre_cobro',
    activo: config?.activo ?? true,
    dias_anticipacion: config?.dias_anticipacion || 3,
    dias_despues: config?.dias_despues || 1,
    mensaje_template: config?.mensaje_template || '',
    canal: config?.canal || 'whatsapp',
  });
  
  React.useEffect(() => {
    if (config) {
      setFormData({
        tipo: config.tipo,
        activo: config.activo ?? true,
        dias_anticipacion: config.dias_anticipacion || 3,
        dias_despues: config.dias_despues || 1,
        mensaje_template: config.mensaje_template,
        canal: config.canal || 'whatsapp',
      });
    } else {
      setFormData({
        tipo: 'pre_cobro',
        activo: true,
        dias_anticipacion: 3,
        dias_despues: 1,
        mensaje_template: '',
        canal: 'whatsapp',
      });
    }
  }, [config, open]);
  
  const templates = {
    pre_cobro: 'Hola {nombre}, te recordamos que el {dia} del mes se abre el período de cobro. Tu cuota es de {monto}. ¡Gracias!',
    moroso: 'Hola {nombre}, notamos que aún no registramos tu pago del mes {mes} por {monto}. Por favor, contactanos para regularizar. Gracias.',
    manual: 'Hola {nombre}, te enviamos este recordatorio sobre tu cuota de {monto}.',
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isEditing) {
        await base44.entities.ConfiguracionRecordatorios.update(config.id, formData);
      } else {
        await base44.entities.ConfiguracionRecordatorios.create(formData);
      }
      
      queryClient.invalidateQueries({ queryKey: ['configuraciones'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Error guardando configuración:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar configuración' : 'Nueva configuración'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de recordatorio</Label>
              <Select
                value={formData.tipo}
                onValueChange={(v) => {
                  setFormData({ 
                    ...formData, 
                    tipo: v,
                    mensaje_template: templates[v] 
                  });
                }}
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre_cobro">Pre-cobro</SelectItem>
                  <SelectItem value="moroso">Moroso</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select
                value={formData.canal}
                onValueChange={(v) => setFormData({ ...formData, canal: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {formData.tipo === 'pre_cobro' && (
            <div className="space-y-2">
              <Label>Días de anticipación (antes del día 5)</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={formData.dias_anticipacion}
                onChange={(e) => setFormData({ ...formData, dias_anticipacion: Number(e.target.value) })}
              />
              <p className="text-xs text-slate-500">
                El recordatorio se enviará {formData.dias_anticipacion} días antes del día 5
              </p>
            </div>
          )}
          
          {formData.tipo === 'moroso' && (
            <div className="space-y-2">
              <Label>Días después del día 15</Label>
              <Input
                type="number"
                min="1"
                max="15"
                value={formData.dias_despues}
                onChange={(e) => setFormData({ ...formData, dias_despues: Number(e.target.value) })}
              />
              <p className="text-xs text-slate-500">
                Los recordatorios se generarán automáticamente {formData.dias_despues} días después del día 15 para envío manual
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Mensaje del recordatorio</Label>
            <Textarea
              value={formData.mensaje_template}
              onChange={(e) => setFormData({ ...formData, mensaje_template: e.target.value })}
              rows={4}
              placeholder="Escribe el mensaje..."
            />
            <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded p-2">
              <AlertTriangle className="w-3 h-3 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Variables disponibles:</p>
                <p><code className="bg-slate-200 px-1 rounded">{'{nombre}'}</code> - Nombre del alumno</p>
                <p><code className="bg-slate-200 px-1 rounded">{'{monto}'}</code> - Monto a pagar</p>
                <p><code className="bg-slate-200 px-1 rounded">{'{mes}'}</code> - Mes correspondiente</p>
                <p><code className="bg-slate-200 px-1 rounded">{'{dia}'}</code> - Día del mes</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <Label className="text-sm font-medium">Estado</Label>
              <p className="text-xs text-slate-500">
                {formData.activo ? 'Recordatorio activo' : 'Recordatorio pausado'}
              </p>
            </div>
            <Switch
              checked={formData.activo}
              onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.mensaje_template}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}