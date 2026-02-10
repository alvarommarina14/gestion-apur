import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  FileText,
  ArrowLeft
} from 'lucide-react';

const menuOptions = [
  {
    title: 'Dashboard',
    description: 'Vista general y métricas del profesor',
    icon: LayoutDashboard,
    href: 'Dashboard',
    color: 'emerald'
  },
  {
    title: 'Alumnos',
    description: 'Gestión de alumnos y pagos',
    icon: Users,
    href: 'Alumnos',
    color: 'purple'
  },
  {
    title: 'Pagos',
    description: 'Registro y seguimiento de pagos',
    icon: DollarSign,
    href: 'Pagos',
    color: 'amber'
  },
  {
    title: 'Reportes',
    description: 'Informes y estadísticas',
    icon: FileText,
    href: 'Reportes',
    color: 'indigo'
  },
];

const colorClasses = {
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100',
  blue: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100',
  rose: 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100',
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100',
};

export default function ProfesorMenuPage() {
  const navigate = useNavigate();
  const [profesor, setProfesor] = useState(null);

  useEffect(() => {
    const profesorGuardado = localStorage.getItem('profesor_seleccionado');
    if (profesorGuardado) {
      try {
        setProfesor(JSON.parse(profesorGuardado));
      } catch (e) {
        navigate(createPageUrl('Profesores'));
      }
    } else {
      navigate(createPageUrl('Profesores'));
    }
  }, [navigate]);

  const { data: alumnos = [] } = useQuery({
    queryKey: ['alumnos'],
    queryFn: () => base44.entities.Alumno.list(),
    enabled: !!profesor,
  });

  const { data: clases = [] } = useQuery({
    queryKey: ['clases'],
    queryFn: () => base44.entities.Clase.list(),
    enabled: !!profesor,
  });

  const alumnosProfesor = alumnos.filter(a => a.profesor_id === profesor?.id);
  const alumnosActivos = alumnosProfesor.filter(a => a.estado === 'activo');
  const alumnosMorosos = alumnosProfesor.filter(a => a.estado === 'moroso');
  
  const alumnosIds = alumnosProfesor.map(a => a.id);
  const clasesProfesor = clases.filter(c => 
    c.alumnos_ids?.some(id => alumnosIds.includes(id))
  );
  
  // Clases del mes actual
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const nombreMes = format(today, 'MMMM', { locale: es });
  
  // Total de clases programadas del mes
  const clasesMesTotal = clasesProfesor.filter(c => 
    c.fecha?.startsWith(currentMonth) && c.estado === 'programada'
  ).length;
  
  // Clases que quedan por hacer (solo futuras, no del pasado)
  const clasesPorHacer = clasesProfesor.filter(c => 
    c.fecha?.startsWith(currentMonth) && 
    c.estado === 'programada' &&
    c.fecha > todayStr
  ).length;

  const deudaTotal = alumnosProfesor
    .filter(a => a.estado === 'activo' || a.estado === 'moroso')
    .reduce((sum, a) => sum + (a.deuda_total || 0), 0);

  if (!profesor) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => {
              localStorage.removeItem('profesor_seleccionado');
              navigate(createPageUrl('Profesores'));
            }}
            className="text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a profesores
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{profesor.nombre}</h1>
            <p className="text-slate-500 mt-1">Selecciona una sección para gestionar</p>
          </div>
        </header>

        {/* Resumen rápido */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <CardDescription>Alumnos activos</CardDescription>
              <CardTitle className="text-2xl">{alumnosActivos.length}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardDescription>Clases programadas - {nombreMes}</CardDescription>
              <CardTitle className="text-2xl">{clasesPorHacer} de {clasesMesTotal}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-l-4 border-l-rose-500">
            <CardHeader className="pb-2">
              <CardDescription>Alumnos morosos</CardDescription>
              <CardTitle className="text-2xl">{alumnosMorosos.length}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardDescription>Deuda total</CardDescription>
              <CardTitle className="text-2xl">${deudaTotal.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Opciones del menú */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Card
                key={option.href}
                className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
                onClick={() => navigate(createPageUrl(option.href))}
              >
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl ${colorClasses[option.color]} flex items-center justify-center mb-3 border-2`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-xl">{option.title}</CardTitle>
                  <CardDescription>{option.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}