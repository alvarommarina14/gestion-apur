import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, MapPin, User, DollarSign, Calendar, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function AgendaEmpleados() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const now = new Date();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const empleado = user;

  const { data: allTurnos = [], isLoading } = useQuery({
    queryKey: ['turnos-empleado', today],
    queryFn: () => base44.entities.TurnoCancha.filter({ 
      fecha: today,
      estado: 'activo',
    }),
    enabled: !!empleado?.id,
  });

  const turnos = useMemo(() => {
    if (!empleado?.id) return [];
    return allTurnos.filter(t => 
      t.empleados_asignados_ids && t.empleados_asignados_ids.includes(empleado.id)
    );
  }, [allTurnos, empleado?.id]);

  const turnoActual = useMemo(() => {
    return turnos.find(turno => {
      const [h, m] = turno.hora_inicio.split(':').map(Number);
      const inicio = new Date(turno.fecha);
      inicio.setHours(h, m);
      
      const [hFin, mFin] = turno.hora_fin.split(':').map(Number);
      const fin = new Date(turno.fecha);
      fin.setHours(hFin, mFin);
      
      return now >= inicio && now <= fin;
    });
  }, [turnos, now]);

  const proximosTurnos = useMemo(() => {
    return turnos
      .filter(turno => {
        const [h, m] = turno.hora_inicio.split(':').map(Number);
        const inicio = new Date(turno.fecha);
        inicio.setHours(h, m);
        return inicio > now;
      })
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
      .slice(0, 5);
  }, [turnos, now]);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 animate-spin mx-auto mb-4 text-slate-400" />
          <p className="text-slate-600">Cargando agenda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Mi Agenda</h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
          </p>
          {empleado && (
            <p className="text-emerald-600 text-sm font-medium mt-1">
              👤 {empleado.full_name}
            </p>
          )}
        </header>

        {/* Turno actual */}
        {turnoActual ? (
          <Card className="shadow-lg border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
            <CardHeader className="border-b border-emerald-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                Turno en curso
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 rounded-lg font-bold text-2xl bg-emerald-100 text-emerald-700">
                    {turnoActual.hora_inicio}
                  </div>
                  <div className="text-slate-400 text-lg">→</div>
                  <div className="px-4 py-2 rounded-lg font-bold text-2xl bg-slate-100 text-slate-600">
                    {turnoActual.hora_fin}
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white text-sm px-3 py-1">
                  En curso
                </Badge>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-slate-700">
                  <MapPin className="w-5 h-5 text-slate-400" />
                  <span className="font-semibold text-lg">Cancha {turnoActual.cancha}</span>
                </div>
                
                <div className="flex items-center gap-3 text-slate-700">
                  <User className="w-5 h-5 text-slate-400" />
                  <span>{turnoActual.cliente}</span>
                </div>

                {turnoActual.profesor && (
                  <div className="flex items-center gap-3 text-slate-600 text-sm">
                    <span className="w-5 h-5" />
                    <span>Profesor: {turnoActual.profesor}</span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Badge className={cn(
                    turnoActual.tipo_turno === 'clase' 
                      ? "bg-blue-100 text-blue-700" 
                      : "bg-purple-100 text-purple-700"
                  )}>
                    {turnoActual.tipo_turno === 'clase' ? '📚 Clase' : '🎾 Alquiler'}
                  </Badge>
                  {turnoActual.modalidad_alquiler && (
                    <Badge variant="outline">
                      {turnoActual.modalidad_alquiler}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <DollarSign className="w-5 h-5 text-slate-400" />
                  <span className="font-semibold text-slate-700">{formatMoney(turnoActual.monto)}</span>
                  {turnoActual.pagado && (
                    <CheckCircle className="w-5 h-5 text-emerald-600 ml-1" />
                  )}
                </div>

                {turnoActual.notas && (
                  <div className="pt-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                    <span className="font-medium">Notas: </span>
                    {turnoActual.notas}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm border-slate-200">
            <CardContent className="py-12 text-center text-slate-500">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No hay turno en curso</p>
            </CardContent>
          </Card>
        )}

        {/* Próximos turnos */}
        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Próximos turnos de hoy
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {proximosTurnos.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No hay más turnos programados</p>
              </div>
            ) : (
              <div className="divide-y">
                {proximosTurnos.map((turno) => (
                  <div key={turno.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="px-3 py-1 rounded-lg font-semibold text-lg bg-blue-100 text-blue-700">
                            {turno.hora_inicio}
                          </div>
                          <div className="text-slate-400">→</div>
                          <div className="px-3 py-1 rounded-lg font-semibold bg-slate-100 text-slate-600">
                            {turno.hora_fin}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-slate-800">Cancha {turno.cancha}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-600">{turno.cliente}</span>
                        </div>

                        {turno.profesor && (
                          <div className="text-sm text-slate-500 pl-7">
                            Profesor: {turno.profesor}
                          </div>
                        )}

                        <div className="flex items-center gap-2 flex-wrap pl-7">
                          <Badge className={cn(
                            "text-xs",
                            turno.tipo_turno === 'clase' 
                              ? "bg-blue-100 text-blue-700" 
                              : "bg-purple-100 text-purple-700"
                          )}>
                            {turno.tipo_turno === 'clase' ? '📚 Clase' : '🎾 Alquiler'}
                          </Badge>
                          {turno.modalidad_alquiler && (
                            <Badge variant="outline" className="text-xs">
                              {turno.modalidad_alquiler}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-600">{formatMoney(turno.monto)}</span>
                            {turno.pagado && (
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                            )}
                          </div>
                        </div>

                        {turno.notas && (
                          <div className="text-xs text-slate-500 pl-7 pt-1">
                            {turno.notas}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="shadow-sm bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <p className="text-sm text-blue-900">
              💡 <span className="font-medium">Tip:</span> Recibirás notificaciones automáticas antes del inicio de cada turno
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}