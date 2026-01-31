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
import AgendaEmpleados from './pages/AgendaEmpleados';
import Alumnos from './pages/Alumnos';
import Clientes from './pages/Clientes';
import Configuracion from './pages/Configuracion';
import Dashboard from './pages/Dashboard';
import DashboardOcupacion from './pages/DashboardOcupacion';
import Empleados from './pages/Empleados';
import Pagos from './pages/Pagos';
import Recordatorios from './pages/Recordatorios';
import RecordatoriosCanchaAdmin from './pages/RecordatoriosCanchaAdmin';
import RecordatoriosCanchaEmpleado from './pages/RecordatoriosCanchaEmpleado';
import Recuperos from './pages/Recuperos';
import Reportes from './pages/Reportes';
import Profesores from './pages/Profesores';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Agenda": Agenda,
    "AgendaEmpleados": AgendaEmpleados,
    "Alumnos": Alumnos,
    "Clientes": Clientes,
    "Configuracion": Configuracion,
    "Dashboard": Dashboard,
    "DashboardOcupacion": DashboardOcupacion,
    "Empleados": Empleados,
    "Pagos": Pagos,
    "Recordatorios": Recordatorios,
    "RecordatoriosCanchaAdmin": RecordatoriosCanchaAdmin,
    "RecordatoriosCanchaEmpleado": RecordatoriosCanchaEmpleado,
    "Recuperos": Recuperos,
    "Reportes": Reportes,
    "Profesores": Profesores,
}

export const pagesConfig = {
    mainPage: "Agenda",
    Pages: PAGES,
    Layout: __Layout,
};