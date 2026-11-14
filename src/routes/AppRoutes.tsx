import { Suspense, lazy, type ReactNode } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { Compass, LayoutDashboard } from 'lucide-react';
import { PublicLayout } from '../components/layout/PublicLayout';
import { AdminLayout } from '../components/layout/AdminLayout';
import { RequireAuth, RequireRole } from '../components/layout/RequireAuth';
import { buttonStyles } from '../components/ui/Button';
import { Spinner } from '../components/ui/States';

const HomePage = lazy(() =>
  import('../pages/public/HomePage').then((module) => ({ default: module.HomePage })),
);
const TeamPage = lazy(() =>
  import('../pages/public/TeamPage').then((module) => ({ default: module.TeamPage })),
);
const CyclistsPage = lazy(() =>
  import('../pages/public/CyclistsPage').then((module) => ({
    default: module.CyclistsPage,
  })),
);
const CyclistDetailPage = lazy(() =>
  import('../pages/public/CyclistDetailPage').then((module) => ({
    default: module.CyclistDetailPage,
  })),
);
const RankingPage = lazy(() =>
  import('../pages/public/RankingPage').then((module) => ({
    default: module.RankingPage,
  })),
);
const RacesPage = lazy(() =>
  import('../pages/public/RacesPage').then((module) => ({ default: module.RacesPage })),
);
const RaceDetailPage = lazy(() =>
  import('../pages/public/RaceDetailPage').then((module) => ({
    default: module.RaceDetailPage,
  })),
);
const ResultsPage = lazy(() =>
  import('../pages/public/ResultsPage').then((module) => ({
    default: module.ResultsPage,
  })),
);
const NewsPage = lazy(() =>
  import('../pages/public/NewsPage').then((module) => ({ default: module.NewsPage })),
);
const NewsDetailPage = lazy(() =>
  import('../pages/public/NewsDetailPage').then((module) => ({
    default: module.NewsDetailPage,
  })),
);
const GalleryPage = lazy(() =>
  import('../pages/public/GalleryPage').then((module) => ({
    default: module.GalleryPage,
  })),
);
const SponsorsPage = lazy(() =>
  import('../pages/public/SponsorsPage').then((module) => ({
    default: module.SponsorsPage,
  })),
);
const ContactPage = lazy(() =>
  import('../pages/public/ContactPage').then((module) => ({
    default: module.ContactPage,
  })),
);
const NotFoundPage = lazy(() =>
  import('../pages/public/NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  })),
);

const LoginPage = lazy(() =>
  import('../pages/admin/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const DashboardPage = lazy(() =>
  import('../pages/admin/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
);
const AdminCyclistsPage = lazy(() =>
  import('../pages/admin/AdminCyclistsPage').then((module) => ({
    default: module.AdminCyclistsPage,
  })),
);
const AdminCategoriesPage = lazy(() =>
  import('../pages/admin/AdminCategoriesPage').then((module) => ({
    default: module.AdminCategoriesPage,
  })),
);
const AdminRacesPage = lazy(() =>
  import('../pages/admin/AdminRacesPage').then((module) => ({
    default: module.AdminRacesPage,
  })),
);
const AdminResultsPage = lazy(() =>
  import('../pages/admin/AdminResultsPage').then((module) => ({
    default: module.AdminResultsPage,
  })),
);
const AdminScoringPage = lazy(() =>
  import('../pages/admin/AdminScoringPage').then((module) => ({
    default: module.AdminScoringPage,
  })),
);
const AdminNewsPage = lazy(() =>
  import('../pages/admin/AdminNewsPage').then((module) => ({
    default: module.AdminNewsPage,
  })),
);
const AdminGalleryPage = lazy(() =>
  import('../pages/admin/AdminGalleryPage').then((module) => ({
    default: module.AdminGalleryPage,
  })),
);
const AdminBannersPage = lazy(() =>
  import('../pages/admin/AdminBannersPage').then((module) => ({
    default: module.AdminBannersPage,
  })),
);
const AdminSponsorsPage = lazy(() =>
  import('../pages/admin/AdminSponsorsPage').then((module) => ({
    default: module.AdminSponsorsPage,
  })),
);
const AdminMembersPage = lazy(() =>
  import('../pages/admin/AdminMembersPage').then((module) => ({
    default: module.AdminMembersPage,
  })),
);
const AdminMembershipsPage = lazy(() =>
  import('../pages/admin/AdminMembershipsPage').then((module) => ({
    default: module.AdminMembershipsPage,
  })),
);
const AdminContributionsPage = lazy(() =>
  import('../pages/admin/AdminContributionsPage').then((module) => ({
    default: module.AdminContributionsPage,
  })),
);
const AdminFinancePage = lazy(() =>
  import('../pages/admin/AdminFinancePage').then((module) => ({
    default: module.AdminFinancePage,
  })),
);
const AdminReportsPage = lazy(() =>
  import('../pages/admin/AdminReportsPage').then((module) => ({
    default: module.AdminReportsPage,
  })),
);
const AdminUsersPage = lazy(() =>
  import('../pages/admin/AdminUsersPage').then((module) => ({
    default: module.AdminUsersPage,
  })),
);
const AdminAuditPage = lazy(() =>
  import('../pages/admin/AdminAuditPage').then((module) => ({
    default: module.AdminAuditPage,
  })),
);
const AdminSettingsPage = lazy(() =>
  import('../pages/admin/AdminSettingsPage').then((module) => ({
    default: module.AdminSettingsPage,
  })),
);

const FINANCE_READERS = ['ADMIN', 'DIRECTIVA', 'TESORERIA'] as const;
const CONTENT_EDITORS = ['ADMIN', 'EDITOR'] as const;

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Spinner className="h-7 w-7" />
      <p className="text-sm text-slate-500">Cargando sección…</p>
    </div>
  );
}

function RoleRoute({
  roles,
  children,
}: {
  roles: readonly ('ADMIN' | 'DIRECTIVA' | 'TESORERIA' | 'EDITOR' | 'CONSULTA')[];
  children: ReactNode;
}) {
  return <RequireRole roles={roles}>{children}</RequireRole>;
}

function AdminNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Compass className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="mt-4 text-lg font-bold text-slate-950">Sección no encontrada</h1>
      <p className="mt-1 max-w-md text-sm text-slate-500">
        La dirección administrativa no existe o cambió de nombre.
      </p>
      <Link to="/admin" className={`${buttonStyles('primary', 'md')} mt-5`}>
        <LayoutDashboard className="h-4 w-4" aria-hidden />
        Volver al dashboard
      </Link>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="equipo" element={<TeamPage />} />
          <Route path="corredores" element={<CyclistsPage />} />
          <Route path="corredores/:slug" element={<CyclistDetailPage />} />
          <Route path="ranking" element={<RankingPage />} />
          <Route path="carreras" element={<RacesPage />} />
          <Route path="carreras/:slug" element={<RaceDetailPage />} />
          <Route path="resultados" element={<ResultsPage />} />
          <Route path="noticias" element={<NewsPage />} />
          <Route path="noticias/:slug" element={<NewsDetailPage />} />
          <Route path="galeria" element={<GalleryPage />} />
          <Route path="auspiciadores" element={<SponsorsPage />} />
          <Route path="contacto" element={<ContactPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="/admin/login" element={<LoginPage />} />

        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />

          <Route
            path="corredores"
            element={
              <RoleRoute roles={CONTENT_EDITORS}>
                <AdminCyclistsPage />
              </RoleRoute>
            }
          />
          <Route
            path="categorias"
            element={
              <RoleRoute roles={CONTENT_EDITORS}>
                <AdminCategoriesPage />
              </RoleRoute>
            }
          />
          <Route
            path="carreras"
            element={
              <RoleRoute roles={CONTENT_EDITORS}>
                <AdminRacesPage />
              </RoleRoute>
            }
          />
          <Route
            path="resultados"
            element={
              <RoleRoute roles={CONTENT_EDITORS}>
                <AdminResultsPage />
              </RoleRoute>
            }
          />
          <Route
            path="puntuacion"
            element={
              <RoleRoute roles={CONTENT_EDITORS}>
                <AdminScoringPage />
              </RoleRoute>
            }
          />
          <Route
            path="noticias"
            element={
              <RoleRoute roles={CONTENT_EDITORS}>
                <AdminNewsPage />
              </RoleRoute>
            }
          />
          <Route
            path="galeria"
            element={
              <RoleRoute roles={CONTENT_EDITORS}>
                <AdminGalleryPage />
              </RoleRoute>
            }
          />
          <Route
            path="banners"
            element={
              <RoleRoute roles={CONTENT_EDITORS}>
                <AdminBannersPage />
              </RoleRoute>
            }
          />
          <Route
            path="auspiciadores"
            element={
              <RoleRoute roles={CONTENT_EDITORS}>
                <AdminSponsorsPage />
              </RoleRoute>
            }
          />

          <Route
            path="miembros"
            element={
              <RoleRoute roles={FINANCE_READERS}>
                <AdminMembersPage />
              </RoleRoute>
            }
          />
          <Route
            path="membresias"
            element={
              <RoleRoute roles={FINANCE_READERS}>
                <AdminMembershipsPage />
              </RoleRoute>
            }
          />
          <Route
            path="aportes"
            element={
              <RoleRoute roles={FINANCE_READERS}>
                <AdminContributionsPage />
              </RoleRoute>
            }
          />
          <Route
            path="finanzas"
            element={
              <RoleRoute roles={FINANCE_READERS}>
                <AdminFinancePage />
              </RoleRoute>
            }
          />
          <Route
            path="reportes"
            element={
              <RoleRoute roles={FINANCE_READERS}>
                <AdminReportsPage />
              </RoleRoute>
            }
          />

          <Route
            path="usuarios"
            element={
              <RoleRoute roles={['ADMIN']}>
                <AdminUsersPage />
              </RoleRoute>
            }
          />
          <Route
            path="auditoria"
            element={
              <RoleRoute roles={['ADMIN']}>
                <AdminAuditPage />
              </RoleRoute>
            }
          />
          <Route
            path="configuracion"
            element={
              <RoleRoute roles={['ADMIN']}>
                <AdminSettingsPage />
              </RoleRoute>
            }
          />

          <Route path="*" element={<AdminNotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
