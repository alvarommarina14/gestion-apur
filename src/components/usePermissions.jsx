import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useMemo } from 'react';

export function usePermissions() {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: permisos } = useQuery({
    queryKey: ['permisos_usuario', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Intentar obtener permisos específicos del usuario
      const usuarioPermisos = await base44.entities.PermisoUsuario.filter({ 
        usuario_id: user.id,
        activo: true 
      });
      
      // Si hay permisos de usuario específicos, usarlos
      if (usuarioPermisos.length > 0) {
        return {
          tipo: 'usuario',
          permisos: usuarioPermisos[0]
        };
      }
      
      // Si no, obtener permisos del rol
      if (user.rol) {
        const rolPermisos = await base44.entities.RolPermiso.filter({ 
          rol: user.rol,
          activo: true 
        });
        return {
          tipo: 'rol',
          permisos: rolPermisos
        };
      }
      
      return null;
    },
    enabled: !!user?.id,
  });

  const tieneAcceso = useMemo(() => {
    return (seccionId) => {
      if (!user) return false;
      if (user.rol === 'admin') return true; // Admin siempre tiene acceso
      
      if (!permisos) return false;
      
      if (permisos.tipo === 'usuario') {
        // Permisos específicos del usuario
        const seccion = permisos.permisos.secciones_acceso?.find(s => s.seccion === seccionId);
        return seccion?.ver || false;
      } else if (permisos.tipo === 'rol') {
        // Permisos del rol
        const seccion = permisos.permisos.find(p => p.seccion === seccionId);
        return seccion?.permisos?.ver || false;
      }
      
      return false;
    };
  }, [user, permisos]);

  const puedeCrear = useMemo(() => {
    return (seccionId) => {
      if (!user) return false;
      if (user.rol === 'admin') return true;
      
      if (!permisos) return false;
      
      if (permisos.tipo === 'usuario') {
        const seccion = permisos.permisos.secciones_acceso?.find(s => s.seccion === seccionId);
        return seccion?.crear || false;
      } else if (permisos.tipo === 'rol') {
        const seccion = permisos.permisos.find(p => p.seccion === seccionId);
        return seccion?.permisos?.crear || false;
      }
      
      return false;
    };
  }, [user, permisos]);

  const puedeEditar = useMemo(() => {
    return (seccionId) => {
      if (!user) return false;
      if (user.rol === 'admin') return true;
      
      if (!permisos) return false;
      
      if (permisos.tipo === 'usuario') {
        const seccion = permisos.permisos.secciones_acceso?.find(s => s.seccion === seccionId);
        return seccion?.editar || false;
      } else if (permisos.tipo === 'rol') {
        const seccion = permisos.permisos.find(p => p.seccion === seccionId);
        return seccion?.permisos?.editar || false;
      }
      
      return false;
    };
  }, [user, permisos]);

  const puedeEliminar = useMemo(() => {
    return (seccionId) => {
      if (!user) return false;
      if (user.rol === 'admin') return true;
      
      if (!permisos) return false;
      
      if (permisos.tipo === 'usuario') {
        const seccion = permisos.permisos.secciones_acceso?.find(s => s.seccion === seccionId);
        return seccion?.eliminar || false;
      } else if (permisos.tipo === 'rol') {
        const seccion = permisos.permisos.find(p => p.seccion === seccionId);
        return seccion?.permisos?.eliminar || false;
      }
      
      return false;
    };
  }, [user, permisos]);

  return {
    user,
    tieneAcceso,
    puedeCrear,
    puedeEditar,
    puedeEliminar,
    cargando: !user || permisos === undefined,
  };
}