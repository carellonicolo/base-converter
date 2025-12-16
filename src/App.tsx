import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from './hooks/useTheme';
import { useLanguage } from './hooks/useLanguage';
import ErrorBoundary from './components/shared/ErrorBoundary';
import Header from './components/layout/Header';

// Lazy load components
const Dashboard = lazy(() => import('./components/Dashboard'));
const BaseConverter = lazy(() => import('./components/BaseConverter'));
const AsciiConverter = lazy(() => import('./components/AsciiConverter'));
const UnicodeConverter = lazy(() => import('./components/UnicodeConverter'));
const FloatingPointConverter = lazy(() => import('./components/FloatingPointConverter'));
const Base64Converter = lazy(() => import('./components/converters/Base64Converter'));
const HashGenerator = lazy(() => import('./components/converters/HashGenerator'));
const ColorConverter = lazy(() => import('./components/converters/ColorConverter'));
const TimestampConverter = lazy(() => import('./components/converters/TimestampConverter'));
const URLConverter = lazy(() => import('./components/converters/URLConverter'));
const JWTDecoder = lazy(() => import('./components/converters/JWTDecoder'));
const RegexTester = lazy(() => import('./components/converters/RegexTester'));
const JSONFormatter = lazy(() => import('./components/converters/JSONFormatter'));
const SettingsPage = lazy(() => import('./components/Settings'));

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="glass-morphism rounded-2xl p-8">
        <div className="animate-spin h-12 w-12 border-4 border-liquid-400 border-t-transparent rounded-full"></div>
      </div>
    </div>
  );
}



function AppContent() {
  const { t } = useTranslation();
  useTheme(); // Initialize theme
  useLanguage(); // Initialize language

  return (
    <div className="min-h-screen liquid-gradient-bg">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Header />

        {/* Main content */}
        <main>
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <div className="glass-morphism rounded-3xl shadow-glass-lg overflow-hidden glass-reflection p-8">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/base" element={<BaseConverter />} />
                  <Route path="/ascii" element={<AsciiConverter />} />
                  <Route path="/unicode" element={<UnicodeConverter />} />
                  <Route path="/floating" element={<FloatingPointConverter />} />
                  <Route path="/base64" element={<Base64Converter />} />
                  <Route path="/hash" element={<HashGenerator />} />
                  <Route path="/color" element={<ColorConverter />} />
                  <Route path="/timestamp" element={<TimestampConverter />} />
                  <Route path="/url" element={<URLConverter />} />
                  <Route path="/jwt" element={<JWTDecoder />} />
                  <Route path="/regex" element={<RegexTester />} />
                  <Route path="/json" element={<JSONFormatter />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<div className="text-white text-center py-12">Pagina non trovata</div>} />
                </Routes>
              </div>
            </Suspense>
          </ErrorBoundary>
        </main>

        {/* Footer */}
        <footer className="text-center mt-8 text-slate-400 text-sm opacity-70">
          <p>{t('app.footer')}</p>
          <p className="mt-1">
            <a href="mailto:info@nicolocarello.it" className="hover:text-liquid-300 transition-colors">
              info@nicolocarello.it
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
