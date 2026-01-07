import Agenda from './pages/Agenda';
import Alumnos from './pages/Alumnos';
import Configuracion from './pages/Configuracion';
import Dashboard from './pages/Dashboard';
import Pagos from './pages/Pagos';
import Recordatorios from './pages/Recordatorios';
import Recuperos from './pages/Recuperos';
import Reportes from './pages/Reportes';
import OperacionesClub from './pages/OperacionesClub';
import RecordatoriosEmpleado from './pages/RecordatoriosEmpleado';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Agenda": Agenda,
    "Alumnos": Alumnos,
    "Configuracion": Configuracion,
    "Dashboard": Dashboard,
    "Pagos": Pagos,
    "Recordatorios": Recordatorios,
    "Recuperos": Recuperos,
    "Reportes": Reportes,
    "OperacionesClub": OperacionesClub,
    "RecordatoriosEmpleado": RecordatoriosEmpleado,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};