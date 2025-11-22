import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Calculator, Home, History, Settings, Menu, X } from 'lucide-react';
import { useTheme } from './hooks/useTheme';
import ErrorBoundary from './components/shared/ErrorBoundary';

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

function Navigation() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/base', label: 'Basi', icon: Calculator },
    { path: '/history', label: 'Cronologia', icon: History },
    { path: '/settings', label: 'Impostazioni', icon: Settings },
  ];

  return (
    <>
      {/* Desktop navigation */}
      <nav className="hidden md:flex items-center gap-1 glass-morphism rounded-2xl p-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
              isActive(item.path)
                ? 'bg-liquid-500/20 text-liquid-300'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <item.icon className="w-4 h-4" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Mobile navigation */}
      <div className="md:hidden">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="glass-morphism p-3 rounded-xl"
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Menu className="w-6 h-6 text-white" />
          )}
        </button>

        {mobileMenuOpen && (
          <div className="absolute top-20 left-0 right-0 mx-4 glass-morphism rounded-2xl p-4 z-50 animate-slideDown">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all ${
                  isActive(item.path)
                    ? 'bg-liquid-500/20 text-liquid-300'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function AppContent() {
  useTheme(); // Initialize theme

  return (
    <div className="min-h-screen liquid-gradient-bg">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-liquid-400 blur-2xl opacity-30 animate-glow"></div>
                <Calculator className="w-12 h-12 text-liquid-300 relative z-10 group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Base Converter Pro</h1>
                <p className="text-xs text-slate-400">by Prof. Carello Nicolò</p>
              </div>
            </Link>
            <Navigation />
          </div>
        </header>

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
                  <Route path="/json" element={<JSONFormatter />} />
                  <Route path="/history" element={<div className="text-white text-center py-12">Cronologia - Coming Soon</div>} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<div className="text-white text-center py-12">Pagina non trovata</div>} />
                </Routes>
              </div>
            </Suspense>
          </ErrorBoundary>
        </main>

        {/* Footer */}
        <footer className="text-center mt-8 text-slate-400 text-sm opacity-70">
          <p>© 2025 Base Converter Pro - Powered by Prof. Carello Nicolò</p>
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
