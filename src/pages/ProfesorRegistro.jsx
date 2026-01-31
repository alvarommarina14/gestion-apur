import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Plus } from 'lucide-react';

export default function ProfesorRegistro() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    especialidad: '',
    notas: ''
  });
  const [selectedProfesor, setSelectedProfesor] = useState(null);

  const { data: profesores = [], isLoading } = useQuery({
    queryKey: ['profesores'],
    queryFn: () => base44.entities.Profesor.list(),
  });

  const createProfesorMutation = useMutation({
    mutationFn: (data) => base44.entities.Profesor.create(data),
    onSuccess: (newProfesor) => {
      localStorage.setItem('profesor_seleccionado', JSON.stringify(newProfesor));
      navigate(createPageUrl('ProfesorMenu'));
    },
  });

  const handleCreateProfesor = async (e) => {
    e.preventDefault();
    if (!formData.nombre) return;
    await createProfesorMutation.mutateAsync(formData);
  };

  const handleSelectProfesor = (profesor) => {
    localStorage.setItem('profesor_seleccionado', JSON.stringify(profesor));
    navigate(createPageUrl('ProfesorMenu'));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Bienvenido Profesor</h1>
          <p className="text-slate-600">Selecciona tu perfil o crea uno nuevo</p>
        </div>

        {/* Profesores existentes */}
        {profesores.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Mis Perfiles</h2>
            <div className="grid gap-3">
              {profesores.map((profesor) => (
                <Card
                  key={profesor.id}
                  className="cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => handleSelectProfesor(profesor)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">{profesor.nombre}</h3>
                        {profesor.especialidad && (
                          <p className="text-sm text-slate-600">{profesor.especialidad}</p>
                        )}
                      </div>
                      <Button variant="ghost" size="sm">
                        Seleccionar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Crear nuevo profesor */}
        <div className="mb-8">
          <Button
            onClick={() => setShowForm(!showForm)}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            {showForm ? 'Cancelar' : 'Crear Nuevo Perfil'}
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Nuevo Perfil de Profesor</CardTitle>
              <CardDescription>Completa tus datos</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateProfesor} className="space-y-4">
                <div>
                  <Label htmlFor="nombre">Nombre Completo *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Tu nombre"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="tu@email.com"
                  />
                </div>

                <div>
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="Teléfono de contacto"
                  />
                </div>

                <div>
                  <Label htmlFor="especialidad">Especialidad</Label>
                  <Input
                    id="especialidad"
                    value={formData.especialidad}
                    onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
                    placeholder="Tu especialidad"
                  />
                </div>

                <div>
                  <Label htmlFor="notas">Notas</Label>
                  <Textarea
                    id="notas"
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    placeholder="Notas adicionales"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={createProfesorMutation.isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {createProfesorMutation.isPending ? 'Guardando...' : 'Crear Perfil'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}