export type ThemeMode = 'dark' | 'light' | 'auto';
export type ThemePreset = 'default' | 'midnight' | 'sunset' | 'forest' | 'ocean';
export type Language = 'en' | 'it' | 'es' | 'fr' | 'de' | 'pt' | 'ja' | 'zh';

export interface ThemeConfig {
  mode: ThemeMode;
  preset: ThemePreset;
  customColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
  };
}

export interface Settings {
  theme: ThemeConfig;
  language: Language;
  notifications: boolean;
  soundEffects: boolean;
  autoSave: boolean;
  defaultExportFormat: 'json' | 'csv' | 'txt';
  historyLimit: number;
  shortcuts: Record<string, string>;
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
    fontSize: 'small' | 'medium' | 'large';
  };
}

export const defaultSettings: Settings = {
  theme: {
    mode: 'dark',
    preset: 'default',
  },
  language: 'it',
  notifications: true,
  soundEffects: false,
  autoSave: true,
  defaultExportFormat: 'json',
  historyLimit: 100,
  shortcuts: {
    'command-palette': 'ctrl+k',
    'new-conversion': 'ctrl+n',
    'save-favorite': 'ctrl+d',
    'export': 'ctrl+e',
  },
  accessibility: {
    highContrast: false,
    reducedMotion: false,
    fontSize: 'medium',
  },
};
