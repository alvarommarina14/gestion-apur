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
  LogOut
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import NotificationPermissionModal from '@/components/NotificationPermissionModal';
import NotificationManager from '@/components/NotificationManager';

const navigationGestionClases = [
  { name: 'Dashboard', href: 'Dashboard', icon: LayoutDashboard },
  { name: 'Reportes', href: 'Reportes', icon: FileText },
  { name: 'Alumnos', href: 'Alumnos', icon: Users },
  { name: 'Recordatorios', href: 'Recordatorios', icon: RefreshCw },
  { name: 'Pagos', href: 'Pagos', icon: DollarSign },
];

const navigationAgenda = [
  { name: 'Agenda', href: 'Agenda', icon: Calendar },
  { name: 'Dashboard de Ocupación', href: 'DashboardOcupacion', icon: LayoutDashboard },
];

const navigationCancha = [
  { name: 'Canchas Admin', href: 'RecordatoriosCanchaAdmin', icon: Calendar, adminOnly: true },
  { name: 'Mis Recordatorios', href: 'RecordatoriosCanchaEmpleado', icon: Calendar },
];

const navigationConfiguracion = [
  { name: 'Configuración', href: 'Configuracion', icon: Settings },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

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
      
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695d6dfcd27b13c53e363146/fd5853c43_WhatsAppImage2026-01-06at155639.jpeg" 
                alt="APUR Logo" 
                className="h-10 w-auto"
              />
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {/* Gestión de Clases - Solo Administradores */}
            {user?.role === 'admin' && (
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

            {/* Agenda - Todos */}
            <div className={cn(user?.role === 'admin' && 'pt-4 mt-4 border-t border-slate-200')}>
              <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Booking de Canchas
              </p>
              {navigationAgenda.map((item) => {
                // Empleados solo ven Agenda, no Dashboard de Ocupación
                if (user?.role !== 'admin' && item.href === 'DashboardOcupacion') return null;

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

            {/* Recordatorios Cancha - Todos */}
            <div className="pt-4 mt-4 border-t border-slate-200">
              <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Recordatorios Cancha
              </p>
              {navigationCancha.map((item) => {
                if (item.adminOnly && user?.role !== 'admin') return null;

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

            {/* Configuración - Solo Administradores */}
            {user?.role === 'admin' && (
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
              className="w-full justify-start text-slate-600 hover:text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Cerrar sesión
            </Button>
            <div className="text-xs text-slate-400 text-center">
              Sistema de Gestión de Clases
            </div>
          </div>
        </div>
      </aside>
      
      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-sm border-b border-slate-200 flex items-center px-4 lg:px-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="lg:hidden mr-3"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <h1 className="text-lg font-semibold text-slate-800">
            {[...navigationGestionClases, ...navigationAgenda, ...navigationCancha, ...navigationConfiguracion]
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