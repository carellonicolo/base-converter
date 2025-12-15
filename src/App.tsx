import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import {
  Calculator,
  Moon,
  Sun,
  Monitor,
  Languages,
  Palette,
  Accessibility,
  Check,
  Settings
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from './hooks/useTheme';
import { useLanguage } from './hooks/useLanguage';
import { useSettingsStore } from './store/useSettingsStore';
import { ThemeMode, ThemePreset, Language } from './types/settings';
import ErrorBoundary from './components/shared/ErrorBoundary';
import HeaderDropdown from './components/ui/HeaderDropdown';

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

function Header() {
  const { t } = useTranslation();
  const {
    settings,
    setThemeMode,
    setThemePreset,
    setLanguage,
    updateSettings,
    toggleHighContrast,
    toggleReducedMotion
  } = useSettingsStore();

  const themeModeOptions: { value: ThemeMode; label: string; icon: React.ElementType }[] = [
    { value: 'light', label: t('settings.appearance.themeModeLight'), icon: Sun },
    { value: 'dark', label: t('settings.appearance.themeModeDark'), icon: Moon },
    { value: 'auto', label: t('settings.appearance.themeModeAuto'), icon: Monitor },
  ];

  const themePresetOptions: { value: ThemePreset; label: string; color: string }[] = [
    { value: 'default', label: 'Default', color: 'bg-blue-500' },
    { value: 'midnight', label: 'Midnight', color: 'bg-indigo-500' },
    { value: 'sunset', label: 'Sunset', color: 'bg-orange-500' },
    { value: 'forest', label: 'Forest', color: 'bg-green-500' },
    { value: 'ocean', label: 'Ocean', color: 'bg-cyan-500' },
  ];

  const languageOptions: { value: Language; label: string; initials: string }[] = [
    { value: 'it', label: 'Italiano', initials: 'IT' },
    { value: 'en', label: 'English', initials: 'EN' },
    { value: 'es', label: 'Español', initials: 'ES' },
    { value: 'fr', label: 'Français', initials: 'FR' },
    { value: 'de', label: 'Deutsch', initials: 'DE' },
  ];

  return (
    <header className="mb-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 bg-liquid-400 blur-2xl opacity-30 animate-glow"></div>
            <Calculator className="w-12 h-12 text-liquid-300 relative z-10 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Base Converter</h1>
            <p className="text-xs text-slate-400">by Prof. Carello Nicolò</p>
          </div>
        </Link>

        <div className="flex items-center gap-2 glass-morphism p-1 rounded-2xl !overflow-visible relative z-50">
          {/* Language Dropdown */}
          <HeaderDropdown icon={Languages} label={languageOptions.find(l => l.value === settings.language)?.initials}>
            <div className="space-y-1">
              {languageOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setLanguage(option.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${settings.language === option.value
                    ? 'bg-liquid-500/20 text-liquid-300'
                    : 'text-slate-300 hover:bg-white/5 [.light-theme_&]:hover:bg-slate-100 hover:text-white'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono font-bold">{option.initials}</span>
                    <span>{option.label}</span>
                  </span>
                  {settings.language === option.value && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </HeaderDropdown>

          <div className="w-px h-6 bg-white/10 mx-1"></div>

          {/* Theme Mode Toggle (Dropdown for selection) */}
          <HeaderDropdown
            icon={themeModeOptions.find(m => m.value === settings.theme.mode)?.icon || Monitor}
          >
            <div className="space-y-1">
              {themeModeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setThemeMode(option.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${settings.theme.mode === option.value
                    ? 'bg-liquid-500/20 text-liquid-300'
                    : 'text-slate-300 hover:bg-white/5 [.light-theme_&]:hover:bg-slate-100 hover:text-white'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <option.icon className="w-4 h-4" />
                    <span>{option.label}</span>
                  </span>
                  {settings.theme.mode === option.value && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </HeaderDropdown>

          {/* Theme Preset Dropdown */}
          <HeaderDropdown icon={Palette}>
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {t('settings.appearance.themeColor')}
              </div>
              {themePresetOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setThemePreset(option.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${settings.theme.preset === option.value
                    ? 'bg-liquid-500/20 text-liquid-300'
                    : 'text-slate-300 hover:bg-white/5 [.light-theme_&]:hover:bg-slate-100 hover:text-white'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${option.color}`}></div>
                    <span>{option.label}</span>
                  </span>
                  {settings.theme.preset === option.value && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </HeaderDropdown>

          <div className="w-px h-6 bg-white/10 mx-1"></div>

          {/* Accessibility Dropdown */}
          <HeaderDropdown icon={Settings}>
            <div className="space-y-2 p-1">
              <div className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {t('settings.accessibility.title')}
              </div>

              {/* High Contrast */}
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-sm text-slate-300">{t('settings.accessibility.highContrast')}</span>
                <button
                  onClick={toggleHighContrast}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings.accessibility.highContrast ? 'bg-liquid-400' : 'bg-slate-700'
                    }`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${settings.accessibility.highContrast ? 'translate-x-5' : 'translate-x-1'
                    }`} />
                </button>
              </div>

              {/* Reduced Motion */}
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-sm text-slate-300">{t('settings.accessibility.reducedMotion')}</span>
                <button
                  onClick={toggleReducedMotion}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings.accessibility.reducedMotion ? 'bg-liquid-400' : 'bg-slate-700'
                    }`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${settings.accessibility.reducedMotion ? 'translate-x-5' : 'translate-x-1'
                    }`} />
                </button>
              </div>

              {/* Notifications */}
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-sm text-slate-300">{t('settings.accessibility.notifications')}</span>
                <button
                  onClick={() => updateSettings({ notifications: !settings.notifications })}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings.notifications ? 'bg-liquid-400' : 'bg-slate-700'
                    }`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${settings.notifications ? 'translate-x-5' : 'translate-x-1'
                    }`} />
                </button>
              </div>

              {/* Sound */}
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-sm text-slate-300">{t('settings.accessibility.soundEffects')}</span>
                <button
                  onClick={() => updateSettings({ soundEffects: !settings.soundEffects })}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings.soundEffects ? 'bg-liquid-400' : 'bg-slate-700'
                    }`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${settings.soundEffects ? 'translate-x-5' : 'translate-x-1'
                    }`} />
                </button>
              </div>

            </div>
          </HeaderDropdown>

        </div>
      </div>
    </header>
  );
}

function AppContent() {
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
          <p>© 2025 Base Converter - Powered by Prof. Carello Nicolò</p>
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
