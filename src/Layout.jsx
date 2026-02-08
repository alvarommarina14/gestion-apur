import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
        LayoutDashboard, 
        Users, 
        Calendar, 
        DollarSign, 
        RefreshCw,
        FileText,
        Menu,
        X,
        ChevronRight,
        Settings,
        LogOut,
        Shield,
        CheckCircle
      } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import NotificationPermissionModal from '@/components/NotificationPermissionModal';
import NotificationManager from '@/components/NotificationManager';
import PushNotificationManager from '@/components/PushNotificationManager';
import BottomTabNavigation from '@/components/BottomTabNavigation';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const navigationGestionClases = [
  { name: 'Profesores', href: 'Profesores', icon: Users },
];

const navigationAgenda = [
  { name: 'Agenda', href: 'Agenda', icon: Calendar },
  { name: 'Dashboard de Ocupación', href: 'DashboardOcupacion', icon: LayoutDashboard, adminOnly: true },
  { name: 'Canchas Admin', href: 'RecordatoriosCanchaAdmin', icon: Calendar, adminOnly: true },
  { name: 'Mis Recordatorios', href: 'RecordatoriosCanchaEmpleado', icon: Calendar, empleadoOnly: true },
];

const navigationEmpleados = [
  { name: 'Tareas', href: 'Tareas', icon: CheckCircle },
];

const navigationProfesor = [
  { name: 'Dashboard', href: 'Dashboard', icon: LayoutDashboard },
  { name: 'Alumnos', href: 'Alumnos', icon: Users },
  { name: 'Pagos', href: 'Pagos', icon: DollarSign },
  { name: 'Recordatorios', href: 'Recordatorios', icon: RefreshCw },
  { name: 'Reportes', href: 'Reportes', icon: FileText },
];

const navigationClientes = [
  { name: 'Clientes', href: 'Clientes', icon: Users },
];

const navigationConfiguracion = [
  { name: 'Gestión de Acceso', href: 'GestionAccesoUnificada', icon: Shield },
  { name: 'Aprobación Usuarios', href: 'AprobacionUsuarios', icon: Shield },
  { name: 'Aprobación de Clases', href: 'AprobacionClases', icon: Calendar },
  { name: 'Configuración', href: 'Configuracion', icon: Settings },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = React.useState(null);
  const [profesorSeleccionado, setProfesorSeleccionado] = React.useState(null);

  React.useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // No verificar rol si estamos en las páginas especiales
        if (currentPageName !== 'SeleccionRol' && currentPageName !== 'PendienteAprobacion' && currentPageName !== 'ProfesorRegistro' && currentPageName !== 'ProfesorMenu') {
          // Si el usuario no tiene rol definido, redirigir a selección de rol
          if (!currentUser.rol) {
            window.location.href = createPageUrl('SeleccionRol');
            return;
          }
          
          // Si tiene rol admin pero está pendiente de aprobación, redirigir
          if (currentUser.rol === 'admin' && currentUser.estado_aprobacion === 'pendiente') {
            window.location.href = createPageUrl('PendienteAprobacion');
            return;
          }
          
          // Si es profesor, verificar si tiene profesor seleccionado
          if (currentUser.rol === 'profesor') {
            if (!currentUser.profesor_id) {
              window.location.href = createPageUrl('ProfesorRegistro');
              return;
            } else if (currentPageName === 'SeleccionRol' || currentPageName === 'ProfesorRegistro' || currentPageName === 'ProfesorMenu') {
              // Si ya tiene profesor seleccionado, ir directo al Dashboard
              window.location.href = createPageUrl('Dashboard');
              return;
            }
          }
        }
        
        // Cargar profesor seleccionado
        if (user?.profesor_id) {
          // Si está en base de datos, usar ese
          try {
            const profesor = await base44.entities.Profesor.read(user.profesor_id);
            setProfesorSeleccionado(profesor);
            localStorage.setItem('profesor_seleccionado', JSON.stringify(profesor));
          } catch (e) {
            console.error('Error al cargar profesor:', e);
          }
        } else if (localStorage.getItem('profesor_seleccionado')) {
          // Fallback a localStorage si existe
          try {
            setProfesorSeleccionado(JSON.parse(localStorage.getItem('profesor_seleccionado')));
          } catch (e) {
            console.error('Error parsing profesor seleccionado', e);
          }
        }
      } catch (error) {
        console.error('Error al verificar usuario:', error);
      }
    };
    
    checkUser();
  }, [currentPageName]);

  const handleLogout = () => {
    if (confirm('¿Querés cerrar sesión?')) {
      base44.auth.logout();
    }
  };
  
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Notificaciones Push */}
      <NotificationPermissionModal />
      <NotificationManager />
      <PushNotificationManager />
      
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-out shadow-2xl lg:w-64 lg:shadow-none lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 bg-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <span className="font-bold text-slate-800 text-lg lg:hidden">APUR</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="lg:hidden h-10 w-10 hover:bg-slate-100"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4 lg:p-4 space-y-1 overflow-y-auto touch-pan-y">
            {/* Gestión de Clases - Solo Administradores */}
            {user?.rol === 'admin' && (
              <div>
                <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Gestión de Clases
                </p>
                {navigationGestionClases.map((item) => {
                  const isActive = currentPageName === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      to={createPageUrl(item.href)}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                        isActive 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )}
                    >
                      <Icon className={cn(
                        'w-5 h-5',
                        isActive ? 'text-emerald-600' : 'text-slate-400'
                      )} />
                      {item.name}
                      {isActive && (
                        <ChevronRight className="w-4 h-4 ml-auto text-emerald-400" />
                      )}
                    </Link>
                  );
                })}


              </div>
            )}

            {/* Menú Profesor */}
            {user?.rol === 'profesor' && (
              <div>
                <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Gestión de Clases
                </p>
                {navigationProfesor.map((item) => {
                  const isActive = currentPageName === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      to={createPageUrl(item.href)}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                        isActive 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )}
                    >
                      <Icon className={cn(
                        'w-5 h-5',
                        isActive ? 'text-emerald-600' : 'text-slate-400'
                      )} />
                      {item.name}
                      {isActive && (
                        <ChevronRight className="w-4 h-4 ml-auto text-emerald-400" />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Tareas - Empleados y Admin */}
            {user?.rol !== 'profesor' && (
              <div className="pt-4 mt-4 border-t border-slate-200">
                <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Tareas
                </p>
                {navigationEmpleados.map((item) => {
                  const isActive = currentPageName === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      to={createPageUrl(item.href)}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                        isActive 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )}
                    >
                      <Icon className={cn(
                        'w-5 h-5',
                        isActive ? 'text-emerald-600' : 'text-slate-400'
                      )} />
                      {item.name}
                      {isActive && (
                        <ChevronRight className="w-4 h-4 ml-auto text-emerald-400" />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Booking de Canchas - Admin y Empleados */}
            {user?.rol !== 'profesor' && (
              <div className={cn(user?.rol === 'admin' && 'pt-4 mt-4 border-t border-slate-200')}>
                <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Booking de Canchas
                </p>
                {navigationAgenda.map((item) => {
                  // Filtrar por rol
                  if (item.adminOnly && user?.rol !== 'admin') return null;
                  if (item.empleadoOnly && user?.rol === 'admin') return null;

                  const isActive = currentPageName === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      to={createPageUrl(item.href)}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                        isActive 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )}
                    >
                      <Icon className={cn(
                        'w-5 h-5',
                        isActive ? 'text-emerald-600' : 'text-slate-400'
                      )} />
                      {item.name}
                      {isActive && (
                        <ChevronRight className="w-4 h-4 ml-auto text-emerald-400" />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}

              {/* Gestión de Clientes - Solo Administradores */}
              {user?.rol === 'admin' && (
                <div className="pt-4 mt-4 border-t border-slate-200">
                <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Gestión de Clientes
                </p>
                {navigationClientes.map((item) => {
                  const isActive = currentPageName === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      to={createPageUrl(item.href)}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                        isActive 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )}
                    >
                      <Icon className={cn(
                        'w-5 h-5',
                        isActive ? 'text-emerald-600' : 'text-slate-400'
                      )} />
                      {item.name}
                      {isActive && (
                        <ChevronRight className="w-4 h-4 ml-auto text-emerald-400" />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}



            {/* Configuración - Solo Administradores */}
            {user?.rol === 'admin' && (
              <div className="pt-4 mt-4 border-t border-slate-200">
                {navigationConfiguracion.map((item) => {
                  const isActive = currentPageName === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      to={createPageUrl(item.href)}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                        isActive 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )}
                    >
                      <Icon className={cn(
                        'w-5 h-5',
                        isActive ? 'text-emerald-600' : 'text-slate-400'
                      )} />
                      {item.name}
                      {isActive && (
                        <ChevronRight className="w-4 h-4 ml-auto text-emerald-400" />
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 space-y-3">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-slate-600 hover:text-rose-600 hover:bg-rose-50 h-12 lg:h-10 text-base lg:text-sm active:scale-95"
            >
              <LogOut className="w-6 h-6 lg:w-5 lg:h-5 mr-3" />
              Cerrar sesión
            </Button>
            <div className="text-xs text-slate-400 text-center lg:block hidden">
              Sistema de Gestión de Clases
            </div>
          </div>
        </div>
      </aside>
      
      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 lg:h-16 bg-white/80 backdrop-blur-sm border-b border-slate-200 flex items-center px-3 lg:px-6">
          <Button 
            variant="ghost" 
            size="icon"
            className="lg:hidden mr-2 h-10 w-10 active:scale-95"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </Button>

          <h1 className="text-base lg:text-lg font-semibold text-slate-800 truncate">
            {[...navigationGestionClases, ...navigationProfesor, ...navigationAgenda, ...navigationClientes, ...navigationConfiguracion]
              .find(n => n.href === currentPageName)?.name || currentPageName}
          </h1>
        </header>
        
        {/* Page content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}