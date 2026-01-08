import Alumnos from './pages/Alumnos';
import Dashboard from './pages/Dashboard';
import DashboardOcupacion from './pages/DashboardOcupacion';
import Pagos from './pages/Pagos';
import Recordatorios from './pages/Recordatorios';
import RecordatoriosCanchaEmpleado from './pages/RecordatoriosCanchaEmpleado';
import Recuperos from './pages/Recuperos';
import Reportes from './pages/Reportes';
import Agenda from './pages/Agenda';
import RecordatoriosCanchaAdmin from './pages/RecordatoriosCanchaAdmin';
import Configuracion from './pages/Configuracion';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Alumnos": Alumnos,
    "Dashboard": Dashboard,
    "DashboardOcupacion": DashboardOcupacion,
    "Pagos": Pagos,
    "Recordatorios": Recordatorios,
    "RecordatoriosCanchaEmpleado": RecordatoriosCanchaEmpleado,
    "Recuperos": Recuperos,
    "Reportes": Reportes,
    "Agenda": Agenda,
    "RecordatoriosCanchaAdmin": RecordatoriosCanchaAdmin,
    "Configuracion": Configuracion,
}

export const pagesConfig = {
    mainPage: "Agenda",
    Pages: PAGES,
    Layout: __Layout,
};