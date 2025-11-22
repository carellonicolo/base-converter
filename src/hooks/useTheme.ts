import { useEffect } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { themes } from '../types/theme';

/**
 * Hook to manage theme
 * @returns Theme utilities
 */
export function useTheme() {
  const { settings, setThemeMode, setThemePreset } = useSettingsStore();
  const { mode, preset } = settings.theme;

  // Determine actual theme based on mode
  const getActualTheme = () => {
    if (mode === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDark ? 'dark' : 'light';
    }
    return mode;
  };

  const actualTheme = getActualTheme();
  const theme = themes[preset] || themes[actualTheme];

  // Apply theme to CSS variables
  useEffect(() => {
    const root = document.documentElement;

    // Apply colors
    root.style.setProperty('--color-background', theme.colors.background);
    root.style.setProperty('--color-glass', theme.colors.glass);
    root.style.setProperty('--color-glass-border', theme.colors.glassBorder);
    root.style.setProperty('--color-text-primary', theme.colors.text.primary);
    root.style.setProperty('--color-text-secondary', theme.colors.text.secondary);
    root.style.setProperty('--color-text-tertiary', theme.colors.text.tertiary);
    root.style.setProperty('--color-accent-primary', theme.colors.accent.primary);
    root.style.setProperty('--color-accent-secondary', theme.colors.accent.secondary);
    root.style.setProperty('--color-accent-light', theme.colors.accent.light);
    root.style.setProperty('--color-accent-dark', theme.colors.accent.dark);
    root.style.setProperty('--color-success', theme.colors.status.success);
    root.style.setProperty('--color-error', theme.colors.status.error);
    root.style.setProperty('--color-warning', theme.colors.status.warning);
    root.style.setProperty('--color-info', theme.colors.status.info);

    // Apply effects
    root.style.setProperty('--glass-blur', theme.effects.blur);
    root.style.setProperty('--glass-opacity', theme.effects.opacity.toString());
    root.style.setProperty('--glass-border-opacity', theme.effects.borderOpacity.toString());

    // Apply background gradient
    document.body.style.background = theme.colors.backgroundGradient;
  }, [theme]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (mode !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // Force re-render by toggling a temporary state
      setThemeMode('auto');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode, setThemeMode]);

  return {
    theme,
    mode,
    preset,
    actualTheme,
    setMode: setThemeMode,
    setPreset: setThemePreset,
    availableThemes: Object.keys(themes),
  };
}
