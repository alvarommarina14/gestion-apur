import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Shield, UserCog, GraduationCap, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const roles = [
  {
    value: 'admin',
    label: 'Administrador',
    icon: Shield,
    description: 'Acceso completo al sistema, gestión de clases, profesores, alumnos y canchas',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    iconColor: 'text-purple-600',
  },
  {
    value: 'empleado',
    label: 'Canchero',
    icon: UserCog,
    description: 'Gestión de agenda de canchas, recordatorios y turnos',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
  },
  {
    value: 'profesor',
    label: 'Profesor',
    icon: GraduationCap,
    description: 'Gestión de tus alumnos, clases y pagos',
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    iconColor: 'text-emerald-600',
  },
];

export default function SeleccionRol() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedRol, setSelectedRol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Si ya tiene rol definido, redirigir
        if (currentUser.role && currentUser.role !== 'user') {
          navigate(createPageUrl('Agenda'));
        }
      } catch (error) {
        console.error('Error al obtener usuario:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkUser();
  }, [navigate]);

  const handleSelectRol = async () => {
    if (!selectedRol) return;
    
    setSaving(true);
    try {
      await base44.auth.updateMe({ role: selectedRol });
      
      // Recargar la página para que el Layout detecte el nuevo rol
      window.location.reload();
    } catch (error) {
      console.error('Error al actualizar rol:', error);
      alert('Error al guardar el rol. Por favor, intenta de nuevo.');
      setSaving(false);
    }
  };

  if (loading) {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl shadow-lg mb-4">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Bienvenido a APUR
          </h1>
          <p className="text-slate-600">
            Selecciona tu rol para comenzar a usar la aplicación
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {roles.map((rol) => {
            const Icon = rol.icon;
            const isSelected = selectedRol === rol.value;

            return (
              <Card
                key={rol.value}
                onClick={() => setSelectedRol(rol.value)}
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:shadow-xl border-2',
                  isSelected 
                    ? `${rol.borderColor} shadow-lg scale-105` 
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <CardContent className="p-6 text-center">
                  <div className={cn(
                    'w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center',
                    isSelected ? `bg-gradient-to-br ${rol.color}` : rol.bgColor
                  )}>
                    <Icon className={cn(
                      'w-8 h-8',
                      isSelected ? 'text-white' : rol.iconColor
                    )} />
                  </div>
                  
                  <h3 className="font-semibold text-lg text-slate-900 mb-2">
                    {rol.label}
                  </h3>
                  
                  <p className="text-sm text-slate-600 mb-4">
                    {rol.description}
                  </p>

                  {isSelected && (
                    <div className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-600">
                      <Check className="w-5 h-5" />
                      <span>Seleccionado</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <Button
            onClick={handleSelectRol}
            disabled={!selectedRol || saving}
            size="lg"
            className={cn(
              'px-8 h-12 text-base font-semibold shadow-lg transition-all',
              selectedRol 
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700' 
                : 'bg-slate-300'
            )}
          >
            {saving ? 'Guardando...' : 'Continuar'}
          </Button>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Podrás cambiar tu rol más adelante desde la configuración
        </p>
      </div>
    </div>
  );
}