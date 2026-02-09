/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Agenda from './pages/Agenda';
import Alumnos from './pages/Alumnos';
import Clientes from './pages/Clientes';
import Configuracion from './pages/Configuracion';
import Dashboard from './pages/Dashboard';
import DashboardAdmin from './pages/DashboardAdmin';
import Empleados from './pages/Empleados';
import GestionAccesoUnificada from './pages/GestionAccesoUnificada';
import GestionDisponibilidad from './pages/GestionDisponibilidad';
import GestionPermisosUsuarios from './pages/GestionPermisosUsuarios';
import GestionRoles from './pages/GestionRoles';
import Pagos from './pages/Pagos';
import PendienteAprobacion from './pages/PendienteAprobacion';
import ProfesorMenu from './pages/ProfesorMenu';
import ProfesorRegistro from './pages/ProfesorRegistro';
import Profesores from './pages/Profesores';
import Recordatorios from './pages/Recordatorios';
import RecordatoriosCanchaAdmin from './pages/RecordatoriosCanchaAdmin';
import RecordatoriosCanchaEmpleado from './pages/RecordatoriosCanchaEmpleado';
import RecuperoCanchas from './pages/RecuperoCanchas';
import Recuperos from './pages/Recuperos';
import Reportes from './pages/Reportes';
import SeleccionRol from './pages/SeleccionRol';
import Tareas from './pages/Tareas';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Agenda": Agenda,
    "Alumnos": Alumnos,
    "Clientes": Clientes,
    "Configuracion": Configuracion,
    "Dashboard": Dashboard,
    "DashboardAdmin": DashboardAdmin,
    "Empleados": Empleados,
    "GestionAccesoUnificada": GestionAccesoUnificada,
    "GestionDisponibilidad": GestionDisponibilidad,
    "GestionPermisosUsuarios": GestionPermisosUsuarios,
    "GestionRoles": GestionRoles,
    "Pagos": Pagos,
    "PendienteAprobacion": PendienteAprobacion,
    "ProfesorMenu": ProfesorMenu,
    "ProfesorRegistro": ProfesorRegistro,
    "Profesores": Profesores,
    "Recordatorios": Recordatorios,
    "RecordatoriosCanchaAdmin": RecordatoriosCanchaAdmin,
    "RecordatoriosCanchaEmpleado": RecordatoriosCanchaEmpleado,
    "RecuperoCanchas": RecuperoCanchas,
    "Recuperos": Recuperos,
    "Reportes": Reportes,
    "SeleccionRol": SeleccionRol,
    "Tareas": Tareas,
}

export const pagesConfig = {
    mainPage: "Agenda",
    Pages: PAGES,
    Layout: __Layout,
};