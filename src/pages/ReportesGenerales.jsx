import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BarChart3, DollarSign, Users, TrendingUp, Ban } from 'lucide-react';
import ReportesIngresos from '@/components/reportes/ReportesIngresos';
import ReporteOcupacion from '@/components/reportes/ReporteOcupacion';
import ReporteProfesores from '@/components/reportes/ReporteProfesores';
import ReporteCobros from '@/components/reportes/ReporteCobros';
import ReporteClientesValiosos from '@/components/reportes/ReporteClientesValiosos';

export default function ReportesGeneralesPage() {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos-cancha-reportes'],
    queryFn: () => base44.entities.TurnoCancha.list('-fecha', 1000),
  });

  const { data: cobrosClientes = [] } = useQuery({
    queryKey: ['cobros-clientes-reportes'],
    queryFn: () => base44.entities.CobroCliente.list('-created_date', 1000),
  });

  const { data: pagos = [] } = useQuery({
    queryKey: ['pagos-reportes'],
    queryFn: () => base44.entities.Pago.list('-fecha', 1000),
  });

  const { data: clases = [] } = useQuery({
    queryKey: ['clases-reportes'],
    queryFn: () => base44.entities.Clase.list('-fecha', 1000),
  });

  const { data: profesores = [] } = useQuery({
    queryKey: ['profesores-reportes'],
    queryFn: () => base44.entities.Profesor.list('nombre'),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-reportes'],
    queryFn: () => base44.entities.Cliente.list('-total_gastado'),
  });

  if (user?.rol !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <Card className="max-w-md shadow-lg">
          <CardContent className="pt-6 text-center">
            <Ban className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Acceso Restringido</h2>
            <p className="text-slate-600">
              Esta sección está disponible solo para administradores.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold text-slate-900">Reportes & Análisis</h1>
          <p className="text-slate-500 text-sm">
            Métricas detalladas de ingresos, ocupación, profesores y clientes
          </p>
        </header>

        <Tabs defaultValue="ingresos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="ingresos">
              <DollarSign className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Ingresos</span>
            </TabsTrigger>
            <TabsTrigger value="ocupacion">
              <BarChart3 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Ocupación</span>
            </TabsTrigger>
            <TabsTrigger value="profesores">
              <Users className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Profesores</span>
            </TabsTrigger>
            <TabsTrigger value="cobros">
              <TrendingUp className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Cobros</span>
            </TabsTrigger>
            <TabsTrigger value="clientes">
              <Users className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Clientes</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ingresos">
            <ReportesIngresos 
              turnos={turnos} 
              cobrosClientes={cobrosClientes} 
              pagos={pagos} 
            />
          </TabsContent>

          <TabsContent value="ocupacion">
            <ReporteOcupacion turnos={turnos} />
          </TabsContent>

          <TabsContent value="profesores">
            <ReporteProfesores 
              clases={clases} 
              profesores={profesores} 
              pagos={pagos} 
            />
          </TabsContent>

          <TabsContent value="cobros">
            <ReporteCobros 
              turnos={turnos} 
              pagos={pagos} 
              cobrosClientes={cobrosClientes} 
            />
          </TabsContent>

          <TabsContent value="clientes">
            <ReporteClientesValiosos 
              clientes={clientes} 
              turnos={turnos} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}