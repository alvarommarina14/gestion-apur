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
import AgendaCanchas from './pages/AgendaCanchas';
import Alumnos from './pages/Alumnos';
import Clientes from './pages/Clientes';
import Configuracion from './pages/Configuracion';
import PendienteAprobacion from './pages/PendienteAprobacion';
import ProfesorMenu from './pages/ProfesorMenu';
import ProfesorRegistro from './pages/ProfesorRegistro';
import Profesores from './pages/Profesores';
import RecordatoriosCanchaEmpleado from './pages/RecordatoriosCanchaEmpleado';
import RecordatoriosCanchaHoy from './pages/RecordatoriosCanchaHoy';
import RecordatoriosTurnosHoy from './pages/RecordatoriosTurnosHoy';
import RecuperoCanchas from './pages/RecuperoCanchas';
import SeleccionRol from './pages/SeleccionRol';
import Tareas from './pages/Tareas';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AgendaCanchas": AgendaCanchas,
    "Alumnos": Alumnos,
    "Clientes": Clientes,
    "Configuracion": Configuracion,
    "PendienteAprobacion": PendienteAprobacion,
    "ProfesorMenu": ProfesorMenu,
    "ProfesorRegistro": ProfesorRegistro,
    "Profesores": Profesores,
    "RecordatoriosCanchaEmpleado": RecordatoriosCanchaEmpleado,
    "RecordatoriosCanchaHoy": RecordatoriosCanchaHoy,
    "RecordatoriosTurnosHoy": RecordatoriosTurnosHoy,
    "RecuperoCanchas": RecuperoCanchas,
    "SeleccionRol": SeleccionRol,
    "Tareas": Tareas,
}

export const pagesConfig = {
    mainPage: "AgendaCanchas",
    Pages: PAGES,
    Layout: __Layout,
};