import Agenda from './pages/Agenda';
import Alumnos from './pages/Alumnos';
import Configuracion from './pages/Configuracion';
import Dashboard from './pages/Dashboard';
import Pagos from './pages/Pagos';
import Recordatorios from './pages/Recordatorios';
import RecordatoriosCanchaAdmin from './pages/RecordatoriosCanchaAdmin';
import RecordatoriosCanchaEmpleado from './pages/RecordatoriosCanchaEmpleado';
import Recuperos from './pages/Recuperos';
import Reportes from './pages/Reportes';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Agenda": Agenda,
    "Alumnos": Alumnos,
    "Configuracion": Configuracion,
    "Dashboard": Dashboard,
    "Pagos": Pagos,
    "Recordatorios": Recordatorios,
    "RecordatoriosCanchaAdmin": RecordatoriosCanchaAdmin,
    "RecordatoriosCanchaEmpleado": RecordatoriosCanchaEmpleado,
    "Recuperos": Recuperos,
    "Reportes": Reportes,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};