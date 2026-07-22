import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './components/screens/HomePage';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/Confirm';
import { useI18n } from './i18n';

const ConverterPage = lazy(() => import('./components/screens/ConverterPage').then((m) => ({ default: m.ConverterPage })));
const ArithmeticPage = lazy(() => import('./components/screens/ArithmeticPage').then((m) => ({ default: m.ArithmeticPage })));
const SignedPage = lazy(() => import('./components/screens/SignedPage').then((m) => ({ default: m.SignedPage })));
const IeeePage = lazy(() => import('./components/screens/IeeePage').then((m) => ({ default: m.IeeePage })));
const TextPage = lazy(() => import('./components/screens/TextPage').then((m) => ({ default: m.TextPage })));
const GymPage = lazy(() => import('./components/screens/GymPage').then((m) => ({ default: m.GymPage })));
const DashboardPage = lazy(() => import('./components/screens/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ExamPage = lazy(() => import('./components/screens/ExamPage').then((m) => ({ default: m.ExamPage })));
const AdminPage = lazy(() => import('./components/screens/AdminPage').then((m) => ({ default: m.AdminPage })));

function RouteFallback() {
  const { t } = useI18n();
  return (
    <div className="shell">
      <div className="card">{t('common.loading')}</div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/convertitore" element={<ConverterPage />} />
                <Route path="/aritmetica" element={<ArithmeticPage />} />
                <Route path="/segno" element={<SignedPage />} />
                <Route path="/ieee754" element={<IeeePage />} />
                <Route path="/testo" element={<TextPage />} />
                <Route path="/palestra" element={<GymPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/verifica" element={<ExamPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
