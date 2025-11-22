import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Settings, defaultSettings, ThemeMode, Language } from '../types/settings';

interface SettingsStore {
  settings: Settings;

  // Theme actions
  setThemeMode: (mode: ThemeMode) => void;
  setThemePreset: (preset: string) => void;
  setCustomColors: (colors: Partial<Settings['theme']['customColors']>) => void;

  // Language actions
  setLanguage: (language: Language) => void;

  // General settings
  updateSettings: (settings: Partial<Settings>) => void;
  resetSettings: () => void;

  // Accessibility
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,

      setThemeMode: (mode) => {
        set((state) => ({
          settings: {
            ...state.settings,
            theme: { ...state.settings.theme, mode },
          },
        }));
      },

      setThemePreset: (preset) => {
        set((state) => ({
          settings: {
            ...state.settings,
            theme: { ...state.settings.theme, preset: preset as any },
          },
        }));
      },

      setCustomColors: (colors) => {
        set((state) => ({
          settings: {
            ...state.settings,
            theme: {
              ...state.settings.theme,
              customColors: { ...state.settings.theme.customColors, ...colors },
            },
          },
        }));
      },

      setLanguage: (language) => {
        set((state) => ({
          settings: { ...state.settings, language },
        }));
      },

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      resetSettings: () => {
        set({ settings: defaultSettings });
      },

      toggleHighContrast: () => {
        set((state) => ({
          settings: {
            ...state.settings,
            accessibility: {
              ...state.settings.accessibility,
              highContrast: !state.settings.accessibility.highContrast,
            },
          },
        }));
      },

      toggleReducedMotion: () => {
        set((state) => ({
          settings: {
            ...state.settings,
            accessibility: {
              ...state.settings.accessibility,
              reducedMotion: !state.settings.accessibility.reducedMotion,
            },
          },
        }));
      },

      setFontSize: (fontSize) => {
        set((state) => ({
          settings: {
            ...state.settings,
            accessibility: {
              ...state.settings.accessibility,
              fontSize,
            },
          },
        }));
      },
    }),
    {
      name: 'settings-storage',
    }
  )
);
