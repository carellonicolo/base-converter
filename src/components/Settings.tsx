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
    <div className="flex items-center justify-between p-4 glass-morphism rounded-xl">
      <div className="flex-1">
        <h4 className="text-white font-medium">{label}</h4>
        {description && <p className="text-slate-400 text-sm mt-1">{description}</p>}
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
          enabled ? 'bg-liquid-400' : 'bg-slate-700'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-8' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-morphism rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <SettingsIcon className="w-6 h-6 text-liquid-300 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Impostazioni</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Personalizza l'aspetto, il comportamento e le preferenze dell'applicazione.
            </p>
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <Palette className="w-5 h-5 text-liquid-300" />
          <h3 className="text-xl font-bold text-white">Aspetto</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Modalità Tema
            </label>
            <Select
              options={themeModeOptions}
              value={settings.theme.mode}
              onChange={(value) => setThemeMode(value as ThemeMode)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tema Colore
            </label>
            <Select
              options={themePresetOptions}
              value={settings.theme.preset}
              onChange={(value) => setThemePreset(value)}
            />
          </div>
        </div>
      </Card>

      {/* Language Section */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <Globe className="w-5 h-5 text-liquid-300" />
          <h3 className="text-xl font-bold text-white">Lingua</h3>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Lingua dell'Interfaccia
          </label>
          <Select
            options={languageOptions}
            value={settings.language}
            onChange={(value) => setLanguage(value as Language)}
          />
          <p className="text-xs text-slate-400 mt-2">
            ℹ️ Funzionalità multilingua in fase di implementazione
          </p>
        </div>
      </Card>

      {/* Accessibility Section */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <Accessibility className="w-5 h-5 text-liquid-300" />
          <h3 className="text-xl font-bold text-white">Accessibilità</h3>
        </div>

        <div className="space-y-3">
          <ToggleSwitch
            enabled={settings.accessibility.highContrast}
            onChange={toggleHighContrast}
            label="Alto Contrasto"
            description="Aumenta il contrasto per migliorare la leggibilità"
          />

          <ToggleSwitch
            enabled={settings.accessibility.reducedMotion}
            onChange={toggleReducedMotion}
            label="Riduzione Movimento"
            description="Riduce le animazioni per utenti sensibili al movimento"
          />

          <div className="p-4 glass-morphism rounded-xl">
            <label className="block text-sm font-medium text-white mb-2">
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

      {/* General Settings */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="w-5 h-5 text-liquid-300" />
          <h3 className="text-xl font-bold text-white">Generale</h3>
        </div>

        <div className="space-y-3">
          <ToggleSwitch
            enabled={settings.notifications}
            onChange={() =>
              updateSettings({ notifications: !settings.notifications })
            }
            label="Notifiche"
            description="Mostra notifiche per azioni completate"
          />

          <ToggleSwitch
            enabled={settings.soundEffects}
            onChange={() =>
              updateSettings({ soundEffects: !settings.soundEffects })
            }
            label="Effetti Sonori"
            description="Riproduci suoni per feedback interattivo"
          />

          <ToggleSwitch
            enabled={settings.autoSave}
            onChange={() => updateSettings({ autoSave: !settings.autoSave })}
            label="Salvataggio Automatico"
            description="Salva automaticamente le conversioni nella cronologia"
          />
        </div>
      </Card>

      {/* Data & Storage */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <Save className="w-5 h-5 text-liquid-300" />
          <h3 className="text-xl font-bold text-white">Dati e Archiviazione</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Formato Export Predefinito
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
            <label className="block text-sm font-medium text-slate-300 mb-2">
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
              className="w-full px-4 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-liquid-400"
            />
            <p className="text-xs text-slate-400 mt-2">
              Numero massimo di conversioni da salvare nella cronologia
            </p>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card>
        <div className="border-l-4 border-red-500 pl-4 mb-4">
          <h3 className="text-xl font-bold text-red-400">Zona Pericolosa</h3>
          <p className="text-slate-400 text-sm mt-1">
            Azioni irreversibili - procedere con cautela
          </p>
        </div>

        <div className="space-y-3">
          <Button
            variant="danger"
            onClick={() => {
              if (
                window.confirm(
                  'Sei sicuro di voler ripristinare tutte le impostazioni ai valori predefiniti?'
                )
              ) {
                resetSettings();
              }
            }}
            fullWidth
          >
            Ripristina Impostazioni Predefinite
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              if (
                window.confirm(
                  'Sei sicuro di voler eliminare tutta la cronologia delle conversioni?'
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
                  'Sei sicuro di voler eliminare tutti i dati salvati? Questa azione è irreversibile.'
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
      <div className="glass-morphism rounded-2xl p-6 text-center">
        <p className="text-slate-400 text-sm">
          Base Converter Pro v2.0.0
        </p>
        <p className="text-slate-500 text-xs mt-2">
          Sviluppato con ❤️ da Prof. Carello Nicolò
        </p>
        <p className="text-slate-500 text-xs mt-1">
          © 2025 - Tutti i diritti riservati
        </p>
      </div>
    </div>
  );
};

export default Settings;
