import { Route, Routes } from 'react-router-dom';
import { AdminLayout } from '../components/layout/AdminLayout';
import { PublicLayout } from '../components/layout/PublicLayout';
import { ProtectedRoute } from '../components/admin/ProtectedRoute';
import { ROLES } from '../constants';
import Home from '../pages/public/Home';
import Team from '../pages/public/Team';
import Cyclists from '../pages/public/Cyclists';
import CyclistDetail from '../pages/public/CyclistDetail';
import Ranking from '../pages/public/Ranking';
import Races from '../pages/public/Races';
import RaceDetail from '../pages/public/RaceDetail';
import Results from '../pages/public/Results';
import Achievements from '../pages/public/Achievements';
import News from '../pages/public/News';
import NewsDetail from '../pages/public/NewsDetail';
import Gallery from '../pages/public/Gallery';
import Sponsors from '../pages/public/Sponsors';
import Transparency from '../pages/public/Transparency';
import Contact from '../pages/public/Contact';
import NotFound from '../pages/public/NotFound';
import AdminLogin from '../pages/admin/AdminLogin';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminCyclists from '../pages/admin/AdminCyclists';
import AdminMembers from '../pages/admin/AdminMembers';
import AdminMemberships from '../pages/admin/AdminMemberships';
import AdminDebtors from '../pages/admin/AdminDebtors';
import AdminContributions from '../pages/admin/AdminContributions';
import AdminCash from '../pages/admin/AdminCash';
import AdminExpenses from '../pages/admin/AdminExpenses';
import AdminRaces from '../pages/admin/AdminRaces';
import AdminBudgets from '../pages/admin/AdminBudgets';
import AdminResults from '../pages/admin/AdminResults';
import AdminNews from '../pages/admin/AdminNews';
import AdminGallery from '../pages/admin/AdminGallery';
import AdminBanners from '../pages/admin/AdminBanners';
import AdminSponsors from '../pages/admin/AdminSponsors';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminAudit from '../pages/admin/AdminAudit';
import AdminReports from '../pages/admin/AdminReports';
import AdminSettings from '../pages/admin/AdminSettings';

const ALL_ROLES = [...ROLES];

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/equipo" element={<Team />} />
        <Route path="/corredores" element={<Cyclists />} />
        <Route path="/corredores/:slug" element={<CyclistDetail />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/carreras" element={<Races />} />
        <Route path="/carreras/:slug" element={<RaceDetail />} />
        <Route path="/resultados" element={<Results />} />
        <Route path="/logros" element={<Achievements />} />
        <Route path="/noticias" element={<News />} />
        <Route path="/noticias/:slug" element={<NewsDetail />} />
        <Route path="/galeria" element={<Gallery />} />
        <Route path="/auspiciadores" element={<Sponsors />} />
        <Route path="/transparencia" element={<Transparency />} />
        <Route path="/contacto" element={<Contact />} />
      </Route>

      <Route path="/admin/login" element={<AdminLogin />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowed={ALL_ROLES}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route
          path="corredores"
          element={
            <ProtectedRoute allowed={['ADMIN', 'DIRECTIVA', 'EDITOR']}>
              <AdminCyclists />
            </ProtectedRoute>
          }
        />
        <Route
          path="miembros"
          element={
            <ProtectedRoute allowed={['ADMIN', 'DIRECTIVA', 'TESORERIA']}>
              <AdminMembers />
            </ProtectedRoute>
          }
        />
        <Route
          path="membresias"
          element={
            <ProtectedRoute allowed={['ADMIN', 'TESORERIA']}>
              <AdminMemberships />
            </ProtectedRoute>
          }
        />
        <Route
          path="deudores"
          element={
            <ProtectedRoute allowed={['ADMIN', 'DIRECTIVA', 'TESORERIA']}>
              <AdminDebtors />
            </ProtectedRoute>
          }
        />
        <Route
          path="aportes"
          element={
            <ProtectedRoute allowed={['ADMIN', 'TESORERIA']}>
              <AdminContributions />
            </ProtectedRoute>
          }
        />
        <Route
          path="caja"
          element={
            <ProtectedRoute allowed={['ADMIN', 'TESORERIA']}>
              <AdminCash />
            </ProtectedRoute>
          }
        />
        <Route
          path="gastos"
          element={
            <ProtectedRoute allowed={['ADMIN', 'DIRECTIVA', 'TESORERIA']}>
              <AdminExpenses />
            </ProtectedRoute>
          }
        />
        <Route
          path="carreras"
          element={
            <ProtectedRoute allowed={['ADMIN', 'DIRECTIVA', 'EDITOR']}>
              <AdminRaces />
            </ProtectedRoute>
          }
        />
        <Route
          path="presupuestos"
          element={
            <ProtectedRoute allowed={['ADMIN', 'DIRECTIVA', 'TESORERIA']}>
              <AdminBudgets />
            </ProtectedRoute>
          }
        />
        <Route
          path="resultados"
          element={
            <ProtectedRoute allowed={['ADMIN', 'DIRECTIVA', 'EDITOR']}>
              <AdminResults />
            </ProtectedRoute>
          }
        />
        <Route
          path="noticias"
          element={
            <ProtectedRoute allowed={['ADMIN', 'EDITOR']}>
              <AdminNews />
            </ProtectedRoute>
          }
        />
        <Route
          path="galeria"
          element={
            <ProtectedRoute allowed={['ADMIN', 'EDITOR']}>
              <AdminGallery />
            </ProtectedRoute>
          }
        />
        <Route
          path="banners"
          element={
            <ProtectedRoute allowed={['ADMIN', 'EDITOR']}>
              <AdminBanners />
            </ProtectedRoute>
          }
        />
        <Route
          path="auspiciadores"
          element={
            <ProtectedRoute allowed={['ADMIN', 'DIRECTIVA', 'EDITOR']}>
              <AdminSponsors />
            </ProtectedRoute>
          }
        />
        <Route
          path="usuarios"
          element={
            <ProtectedRoute allowed={['ADMIN']}>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="auditoria"
          element={
            <ProtectedRoute allowed={['ADMIN', 'DIRECTIVA']}>
              <AdminAudit />
            </ProtectedRoute>
          }
        />
        <Route
          path="reportes"
          element={
            <ProtectedRoute allowed={['ADMIN', 'DIRECTIVA', 'TESORERIA']}>
              <AdminReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="configuracion"
          element={
            <ProtectedRoute allowed={['ADMIN']}>
              <AdminSettings />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
