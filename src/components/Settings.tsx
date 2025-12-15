import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Settings as SettingsIcon,
  Palette,
  Accessibility,
} from 'lucide-react';
import Card from './ui/Card';
import Select from './ui/Select';
import { useSettingsStore } from '../store/useSettingsStore';
import { ThemeMode, Language } from '../types/settings';

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const {
    settings,
    setThemeMode,
    setThemePreset,
    setLanguage,
    updateSettings,
    toggleHighContrast,
    toggleReducedMotion,
    setFontSize,
  } = useSettingsStore();

  const themeModeOptions = [
    { value: 'dark', label: `🌙 ${t('settings.appearance.themeModeDark')}` },
    { value: 'light', label: `☀️ ${t('settings.appearance.themeModeLight')}` },
    { value: 'auto', label: `🖥️ ${t('settings.appearance.themeModeAuto')}` },
  ];

  const themePresetOptions = [
    { value: 'default', label: t('settings.appearance.themeDefault') },
    { value: 'midnight', label: t('settings.appearance.themeMidnight') },
    { value: 'sunset', label: t('settings.appearance.themeSunset') },
    { value: 'forest', label: t('settings.appearance.themeForest') },
    { value: 'ocean', label: t('settings.appearance.themeOcean') },
  ];

  const languageOptions = [
    { value: 'it', label: '🇮🇹 Italiano' },
    { value: 'en', label: '🇬🇧 English' },
    { value: 'es', label: '🇪🇸 Español' },
    { value: 'fr', label: '🇫🇷 Français' },
    { value: 'de', label: '🇩🇪 Deutsch' },
  ];

  const fontSizeOptions = [
    { value: 'small', label: t('settings.accessibility.fontSizeSmall') },
    { value: 'medium', label: t('settings.accessibility.fontSizeMedium') },
    { value: 'large', label: t('settings.accessibility.fontSizeLarge') },
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
        className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors flex-shrink-0 ml-3 ${enabled ? 'bg-liquid-400' : 'bg-slate-700'
          }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-7' : 'translate-x-1'
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
            <h2 className="text-xl font-bold text-white">{t('settings.title')}</h2>
            <p className="text-slate-400 text-xs">
              {t('settings.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Appearance & Language Section - Combined */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Palette className="w-4 h-4 text-liquid-300" />
          <h3 className="text-base font-bold text-white">{t('settings.appearance.title')}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {t('settings.appearance.themeMode')}
            </label>
            <Select
              options={themeModeOptions}
              value={settings.theme.mode}
              onChange={(value) => setThemeMode(value as ThemeMode)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {t('settings.appearance.themeColor')}
            </label>
            <Select
              options={themePresetOptions}
              value={settings.theme.preset}
              onChange={(value) => setThemePreset(value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {t('settings.appearance.language')}
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
          <h3 className="text-base font-bold text-white">{t('settings.accessibility.title')}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <ToggleSwitch
            enabled={settings.accessibility.highContrast}
            onChange={toggleHighContrast}
            label={t('settings.accessibility.highContrast')}
          />

          <ToggleSwitch
            enabled={settings.accessibility.reducedMotion}
            onChange={toggleReducedMotion}
            label={t('settings.accessibility.reducedMotion')}
          />

          <ToggleSwitch
            enabled={settings.notifications}
            onChange={() =>
              updateSettings({ notifications: !settings.notifications })
            }
            label={t('settings.accessibility.notifications')}
          />

          <ToggleSwitch
            enabled={settings.soundEffects}
            onChange={() =>
              updateSettings({ soundEffects: !settings.soundEffects })
            }
            label={t('settings.accessibility.soundEffects')}
          />

          <ToggleSwitch
            enabled={settings.autoSave}
            onChange={() => updateSettings({ autoSave: !settings.autoSave })}
            label={t('settings.accessibility.autoSave')}
          />

          <div className="p-3 glass-morphism rounded-lg">
            <label className="block text-xs font-medium text-white mb-1.5">
              {t('settings.accessibility.fontSize')}
            </label>
            <Select
              options={fontSizeOptions}
              value={settings.accessibility.fontSize}
              onChange={(value) => setFontSize(value as 'small' | 'medium' | 'large')}
            />
          </div>
        </div>
      </Card>



      {/* Info */}
      <div className="glass-morphism rounded-xl p-3 text-center">
        <p className="text-slate-400 text-xs">
          Base Converter v2.0.0 - {t('app.footer')}
        </p>
      </div>
    </div>
  );
};

export default Settings;
