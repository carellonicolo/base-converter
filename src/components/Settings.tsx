import React from 'react';
import {
  Settings as SettingsIcon,
  Palette,
  Globe,
  Bell,
  Volume2,
  Save,
  Download,
  Eye,
  Moon,
  Sun,
  Monitor,
  Accessibility,
} from 'lucide-react';
import Card from './ui/Card';
import Button from './ui/Button';
import Select from './ui/Select';
import { useSettingsStore } from '../store/useSettingsStore';
import { ThemeMode, Language } from '../types/settings';

const Settings: React.FC = () => {
  const {
    settings,
    setThemeMode,
    setThemePreset,
    setLanguage,
    updateSettings,
    resetSettings,
    toggleHighContrast,
    toggleReducedMotion,
    setFontSize,
  } = useSettingsStore();

  const themeModeOptions = [
    { value: 'dark', label: '🌙 Dark' },
    { value: 'light', label: '☀️ Light' },
    { value: 'auto', label: '🖥️ Auto' },
  ];

  const themePresetOptions = [
    { value: 'default', label: 'Default (Cyan)' },
    { value: 'midnight', label: 'Midnight (Purple)' },
    { value: 'sunset', label: 'Sunset (Orange)' },
    { value: 'forest', label: 'Forest (Green)' },
    { value: 'ocean', label: 'Ocean (Blue)' },
  ];

  const languageOptions = [
    { value: 'it', label: '🇮🇹 Italiano' },
    { value: 'en', label: '🇬🇧 English' },
    { value: 'es', label: '🇪🇸 Español' },
    { value: 'fr', label: '🇫🇷 Français' },
    { value: 'de', label: '🇩🇪 Deutsch' },
  ];

  const fontSizeOptions = [
    { value: 'small', label: 'Piccolo' },
    { value: 'medium', label: 'Medio' },
    { value: 'large', label: 'Grande' },
  ];

  const exportFormatOptions = [
    { value: 'json', label: 'JSON' },
    { value: 'csv', label: 'CSV' },
    { value: 'txt', label: 'TXT' },
  ];

  const ToggleSwitch: React.FC<{
    enabled: boolean;
    onChange: () => void;
    label: string;
    description?: string;
  }> = ({ enabled, onChange, label, description }) => (
    <div className="flex items-center justify-between p-3 glass-morphism rounded-lg">
      <div className="flex-1">
        <h4 className="text-white font-medium text-sm">{label}</h4>
        {description && <p className="text-slate-400 text-xs mt-0.5">{description}</p>}
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors flex-shrink-0 ml-3 ${
          enabled ? 'bg-liquid-400' : 'bg-slate-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-morphism rounded-xl p-4">
        <div className="flex items-center gap-3">
          <SettingsIcon className="w-5 h-5 text-liquid-300" />
          <div>
            <h2 className="text-xl font-bold text-white">Impostazioni</h2>
            <p className="text-slate-400 text-xs">
              Personalizza l'aspetto e il comportamento dell'applicazione
            </p>
          </div>
        </div>
      </div>

      {/* Appearance & Language Section - Combined */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Palette className="w-4 h-4 text-liquid-300" />
          <h3 className="text-base font-bold text-white">Aspetto e Lingua</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Modalità Tema
            </label>
            <Select
              options={themeModeOptions}
              value={settings.theme.mode}
              onChange={(value) => setThemeMode(value as ThemeMode)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Tema Colore
            </label>
            <Select
              options={themePresetOptions}
              value={settings.theme.preset}
              onChange={(value) => setThemePreset(value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Lingua
            </label>
            <Select
              options={languageOptions}
              value={settings.language}
              onChange={(value) => setLanguage(value as Language)}
            />
          </div>
        </div>
      </Card>

      {/* Accessibility & General - Combined */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Accessibility className="w-4 h-4 text-liquid-300" />
          <h3 className="text-base font-bold text-white">Accessibilità e Preferenze</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <ToggleSwitch
            enabled={settings.accessibility.highContrast}
            onChange={toggleHighContrast}
            label="Alto Contrasto"
          />

          <ToggleSwitch
            enabled={settings.accessibility.reducedMotion}
            onChange={toggleReducedMotion}
            label="Riduzione Movimento"
          />

          <ToggleSwitch
            enabled={settings.notifications}
            onChange={() =>
              updateSettings({ notifications: !settings.notifications })
            }
            label="Notifiche"
          />

          <ToggleSwitch
            enabled={settings.soundEffects}
            onChange={() =>
              updateSettings({ soundEffects: !settings.soundEffects })
            }
            label="Effetti Sonori"
          />

          <ToggleSwitch
            enabled={settings.autoSave}
            onChange={() => updateSettings({ autoSave: !settings.autoSave })}
            label="Salvataggio Auto"
          />

          <div className="p-3 glass-morphism rounded-lg">
            <label className="block text-xs font-medium text-white mb-1.5">
              Dimensione Testo
            </label>
            <Select
              options={fontSizeOptions}
              value={settings.accessibility.fontSize}
              onChange={(value) => setFontSize(value as 'small' | 'medium' | 'large')}
            />
          </div>
        </div>
      </Card>

      {/* Data & Storage */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Save className="w-4 h-4 text-liquid-300" />
          <h3 className="text-base font-bold text-white">Dati</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Formato Export
            </label>
            <Select
              options={exportFormatOptions}
              value={settings.defaultExportFormat}
              onChange={(value) =>
                updateSettings({
                  defaultExportFormat: value as 'json' | 'csv' | 'txt',
                })
              }
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Limite Cronologia
            </label>
            <input
              type="number"
              min="10"
              max="500"
              value={settings.historyLimit}
              onChange={(e) =>
                updateSettings({ historyLimit: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 text-sm bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-liquid-400"
            />
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card>
        <div className="border-l-4 border-red-500 pl-3 mb-3">
          <h3 className="text-base font-bold text-red-400">Zona Pericolosa</h3>
          <p className="text-slate-400 text-xs">Azioni irreversibili</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Button
            variant="danger"
            onClick={() => {
              if (
                window.confirm(
                  'Ripristinare le impostazioni predefinite?'
                )
              ) {
                resetSettings();
              }
            }}
            fullWidth
          >
            Ripristina
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              if (
                window.confirm(
                  'Eliminare tutta la cronologia?'
                )
              ) {
                localStorage.removeItem('history-storage');
                window.location.reload();
              }
            }}
            fullWidth
          >
            Cancella Cronologia
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              if (
                window.confirm(
                  'Eliminare tutti i dati? Questa azione è irreversibile.'
                )
              ) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            fullWidth
          >
            Elimina Tutti i Dati
          </Button>
        </div>
      </Card>

      {/* Info */}
      <div className="glass-morphism rounded-xl p-3 text-center">
        <p className="text-slate-400 text-xs">
          Base Converter Pro v2.0.0 - © 2025 Prof. Carello Nicolò
        </p>
      </div>
    </div>
  );
};

export default Settings;
