import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, Calendar, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomTabNavigation({ currentPageName, userRole }) {
  const tabs = [
    { 
      name: 'Dashboard', 
      href: userRole === 'profesor' ? 'ProfesorMenu' : 'Dashboard', 
      icon: LayoutDashboard 
    },
    { name: 'Alumnos', href: 'Alumnos', icon: Users },
  ];

  // Filtrar tabs según el rol (Alumnos solo para profesor)
  const visibleTabs = tabs.filter(tab => {
    if (tab.href === 'Alumnos' && userRole !== 'profesor') return false;
    if ((tab.href === 'Dashboard' || tab.href === 'Alumnos') && userRole === 'admin') return false;
    return true;
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 lg:hidden"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex justify-around items-center h-16">
        {visibleTabs.map((tab) => {
          const isActive = currentPageName === tab.href || 
            (tab.href === 'ProfesorMenu' && currentPageName === 'Dashboard');
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              to={createPageUrl(tab.href)}
              className={cn(
                'flex flex-col items-center justify-center w-full h-16 transition-colors user-select-none',
                isActive 
                  ? 'text-emerald-600' 
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}