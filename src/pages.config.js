import Dashboard from './pages/Dashboard';
import Alumnos from './pages/Alumnos';
import Agenda from './pages/Agenda';
import Pagos from './pages/Pagos';
import Recuperos from './pages/Recuperos';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';
import Recordatorios from './pages/Recordatorios';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Alumnos": Alumnos,
    "Agenda": Agenda,
    "Pagos": Pagos,
    "Recuperos": Recuperos,
    "Reportes": Reportes,
    "Configuracion": Configuracion,
    "Recordatorios": Recordatorios,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};