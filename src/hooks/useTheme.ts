import { useEffect, useMemo } from 'react';
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
  const actualTheme = useMemo(() => {
    if (mode === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDark ? 'dark' : 'light';
    }
    return mode;
  }, [mode]);

  // If light mode is selected, always use light theme (ignore presets in light mode)
  // If dark mode, use the selected preset
  const theme = useMemo(() => {
    return actualTheme === 'light' ? themes.light : (themes[preset] || themes.default);
  }, [actualTheme, preset]);

  // Apply theme to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

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
    body.style.background = theme.colors.backgroundGradient;
    body.style.backgroundAttachment = 'fixed';

    // Add/remove light-theme class to disable animations in light mode
    if (actualTheme === 'light') {
      body.classList.add('light-theme');
    } else {
      body.classList.remove('light-theme');
    }

    // Apply accessibility settings
    const fontSize = {
      small: '14px',
      medium: '16px',
      large: '18px',
    }[settings.accessibility.fontSize];
    root.style.setProperty('--base-font-size', fontSize);
    root.style.fontSize = fontSize;

    // High contrast mode
    if (settings.accessibility.highContrast) {
      root.classList.add('high-contrast');
      root.style.setProperty('--glass-opacity', '0.15');
      root.style.setProperty('--glass-border-opacity', '0.5');
    } else {
      root.classList.remove('high-contrast');
    }

    // Reduced motion
    if (settings.accessibility.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
  }, [theme, settings.accessibility, actualTheme]);

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
