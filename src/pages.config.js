import Dashboard from './pages/Dashboard';
import Alumnos from './pages/Alumnos';
import Agenda from './pages/Agenda';
import Pagos from './pages/Pagos';
import Recuperos from './pages/Recuperos';
import Reportes from './pages/Reportes';


export const PAGES = {
    "Dashboard": Dashboard,
    "Alumnos": Alumnos,
    "Agenda": Agenda,
    "Pagos": Pagos,
    "Recuperos": Recuperos,
    "Reportes": Reportes,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
};