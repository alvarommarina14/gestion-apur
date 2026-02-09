import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Users, 
  Calendar, 
  CheckCircle, 
  Clock,
  CreditCard
} from 'lucide-react';
import RegistrarCobroEmpleadoModal from './RegistrarCobroEmpleadoModal';

export default function CobrosDelDia() {
  const [cobroModal, setCobroModal] = useState({ open: false, item: null, tipo: null });
  
  const hoy = format(new Date(), 'yyyy-MM-dd');
  
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });
  
  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos-cancha'],
    queryFn: () => base44.entities.TurnoCancha.list('-hora_inicio', 500),
  });
  
  const { data: clases = [] } = useQuery({
    queryKey: ['clases'],
    queryFn: () => base44.entities.Clase.list('-hora_inicio', 500),
  });
  
  const { data: cobrosClientes = [] } = useQuery({
    queryKey: ['cobros-clientes'],
    queryFn: () => base44.entities.CobroCliente.list('-created_date', 500),
  });

  const turnosHoy = useMemo(() => {
    return turnos.filter(t => t.fecha === hoy && t.estado === 'activo');
  }, [turnos, hoy]);

  const clasesHoy = useMemo(() => {
    return clases.filter(c => c.fecha === hoy && c.estado !== 'cancelada_anticipada');
  }, [clases, hoy]);

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const totalTurnos = turnosHoy.reduce((sum, t) => sum + (t.monto || 0), 0);
  const totalClases = clasesHoy.reduce((sum, c) => sum + (c.precio || 0), 0);
  const turnosPagados = turnosHoy.filter(t => t.pagado).length;
  const clasesPagadas = clasesHoy.filter(c => c.estado === 'realizada').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Cobros del Día</h2>
        <p className="text-slate-500 text-sm">
          {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Turnos Hoy</p>
                <p className="text-2xl font-bold text-blue-600">{turnosHoy.length}</p>
                <p className="text-xs text-slate-400">{turnosPagados} pagados</p>
              </div>
              <Calendar className="w-10 h-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Clases Hoy</p>
                <p className="text-2xl font-bold text-emerald-600">{clasesHoy.length}</p>
                <p className="text-xs text-slate-400">{clasesPagadas} realizadas</p>
              </div>
              <Users className="w-10 h-10 text-emerald-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Turnos</p>
                <p className="text-2xl font-bold text-slate-900">{formatMoney(totalTurnos)}</p>
              </div>
              <DollarSign className="w-10 h-10 text-slate-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Clases</p>
                <p className="text-2xl font-bold text-slate-900">{formatMoney(totalClases)}</p>
              </div>
              <DollarSign className="w-10 h-10 text-slate-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Turnos de Cancha */}
      <Card className="shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Turnos de Cancha - Hoy
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-2">
            {turnosHoy.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No hay turnos de cancha hoy</p>
              </div>
            ) : (
              turnosHoy.map((turno) => (
                <div 
                  key={turno.id}
                  className="p-4 rounded-lg border bg-white hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Cancha {turno.cancha}
                        </Badge>
                        <Badge variant="outline" className={turno.tipo_turno === 'clase' ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-50 text-purple-700'}>
                          {turno.tipo_turno === 'clase' ? 'Clase' : 'Alquiler'}
                        </Badge>
                        {turno.pagado && (
                          <Badge className="bg-emerald-100 text-emerald-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Pagado
                          </Badge>
                        )}
                      </div>
                      
                      <p className="font-semibold text-slate-900">{turno.cliente}</p>
                      {turno.profesor && (
                        <p className="text-sm text-slate-600">Profesor: {turno.profesor}</p>
                      )}
                      <p className="text-sm text-slate-500">
                        {turno.hora_inicio} - {turno.duracion} min
                      </p>
                      
                      {turno.notas_pago && (
                        <div className="mt-2 p-2 bg-slate-50 rounded text-xs">
                          <p className="text-slate-600">{turno.notas_pago}</p>
                          {turno.cobrado_por && (
                            <p className="text-slate-400 mt-1">
                              Por: {turno.cobrado_por} - {turno.hora_cobro && format(parseISO(turno.hora_cobro), "HH:mm", { locale: es })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xl font-bold text-blue-600">
                        {formatMoney(turno.monto)}
                      </p>
                      {!turno.pagado && (
                        <Button
                          size="sm"
                          className="mt-2 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => setCobroModal({ open: true, item: turno, tipo: 'turno' })}
                        >
                          <CreditCard className="w-4 h-4 mr-1" />
                          Cobrar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Clases de Alumnos */}
      <Card className="shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Clases de Alumnos - Hoy
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-2">
            {clasesHoy.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No hay clases programadas hoy</p>
              </div>
            ) : (
              clasesHoy.map((clase) => {
                const precioIndividual = clase.tipo === 'grupal' 
                  ? (clase.precio || 0) / (clase.alumnos_nombres?.length || 1)
                  : (clase.precio || 0);
                
                return (
                  <div 
                    key={clase.id}
                    className="p-4 rounded-lg border bg-white hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={clase.tipo === 'grupal' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}>
                            {clase.tipo === 'grupal' ? 'Grupal' : 'Individual'}
                          </Badge>
                          {clase.sede && (
                            <Badge variant="outline" className="text-slate-600">
                              {clase.sede}
                            </Badge>
                          )}
                          {clase.estado === 'realizada' && (
                            <Badge className="bg-emerald-100 text-emerald-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Realizada
                            </Badge>
                          )}
                        </div>
                        
                        <p className="font-semibold text-slate-900">
                          {clase.alumnos_nombres?.join(', ') || 'Sin alumnos'}
                        </p>
                        <p className="text-sm text-slate-500">
                          {clase.hora_inicio} - {clase.duracion || 50} min
                        </p>
                        
                        {clase.tipo === 'grupal' && (
                          <p className="text-sm text-slate-600 mt-1">
                            {formatMoney(precioIndividual)} por alumno
                          </p>
                        )}

                        {clase.notas_pago && (
                          <div className="mt-2 p-2 bg-slate-50 rounded text-xs">
                            <p className="text-slate-600">{clase.notas_pago}</p>
                            {clase.cobrado_por && (
                              <p className="text-slate-400 mt-1">
                                Por: {clase.cobrado_por} - {clase.hora_cobro && format(parseISO(clase.hora_cobro), "HH:mm", { locale: es })}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xl font-bold text-emerald-600">
                          {formatMoney(clase.precio)}
                        </p>
                        {clase.estado !== 'realizada' && (
                          <Button
                            size="sm"
                            className="mt-2 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => setCobroModal({ open: true, item: clase, tipo: 'clase' })}
                          >
                            <CreditCard className="w-4 h-4 mr-1" />
                            Cobrar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      <RegistrarCobroEmpleadoModal
        open={cobroModal.open}
        onOpenChange={(open) => setCobroModal({ ...cobroModal, open })}
        item={cobroModal.item}
        tipo={cobroModal.tipo}
        empleado={user}
      />
    </div>
  );
}