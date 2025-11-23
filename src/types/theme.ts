export interface Theme {
  name: string;
  colors: {
    background: string;
    backgroundGradient: string;
    glass: string;
    glassBorder: string;
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    accent: {
      primary: string;
      secondary: string;
      light: string;
      dark: string;
    };
    status: {
      success: string;
      error: string;
      warning: string;
      info: string;
    };
  };
  effects: {
    blur: string;
    opacity: number;
    borderOpacity: number;
  };
}

export const themes: Record<string, Theme> = {
  default: {
    name: 'Default',
    colors: {
      background: '#0f172a',
      backgroundGradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e293b 100%)',
      glass: 'rgba(255, 255, 255, 0.05)',
      glassBorder: 'rgba(255, 255, 255, 0.18)',
      text: {
        primary: '#ffffff',
        secondary: '#cbd5e1',
        tertiary: '#94a3b8',
      },
      accent: {
        primary: '#38bdf8',
        secondary: '#0ea5e9',
        light: '#7dd3fc',
        dark: '#0284c7',
      },
      status: {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
      },
    },
    effects: {
      blur: '24px',
      opacity: 0.05,
      borderOpacity: 0.18,
    },
  },
  dark: {
    name: 'Dark',
    colors: {
      background: '#0f172a',
      backgroundGradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e293b 100%)',
      glass: 'rgba(255, 255, 255, 0.05)',
      glassBorder: 'rgba(255, 255, 255, 0.18)',
      text: {
        primary: '#ffffff',
        secondary: '#cbd5e1',
        tertiary: '#94a3b8',
      },
      accent: {
        primary: '#38bdf8',
        secondary: '#0ea5e9',
        light: '#7dd3fc',
        dark: '#0284c7',
      },
      status: {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
      },
    },
    effects: {
      blur: '24px',
      opacity: 0.05,
      borderOpacity: 0.18,
    },
  },
  light: {
    name: 'Light',
    colors: {
      background: '#e2e8f0',
      backgroundGradient: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #cbd5e1 100%)',
      glass: 'rgba(255, 255, 255, 0.7)',
      glassBorder: 'rgba(71, 85, 105, 0.2)',
      text: {
        primary: '#0f172a',
        secondary: '#334155',
        tertiary: '#475569',
      },
      accent: {
        primary: '#0ea5e9',
        secondary: '#0284c7',
        light: '#38bdf8',
        dark: '#075985',
      },
      status: {
        success: '#059669',
        error: '#dc2626',
        warning: '#d97706',
        info: '#2563eb',
      },
    },
    effects: {
      blur: '16px',
      opacity: 0.7,
      borderOpacity: 0.2,
    },
  },
  midnight: {
    name: 'Midnight',
    colors: {
      background: '#030712',
      backgroundGradient: 'linear-gradient(135deg, #111827 0%, #030712 50%, #111827 100%)',
      glass: 'rgba(255, 255, 255, 0.03)',
      glassBorder: 'rgba(255, 255, 255, 0.1)',
      text: {
        primary: '#f9fafb',
        secondary: '#d1d5db',
        tertiary: '#9ca3af',
      },
      accent: {
        primary: '#8b5cf6',
        secondary: '#7c3aed',
        light: '#a78bfa',
        dark: '#6d28d9',
      },
      status: {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
      },
    },
    effects: {
      blur: '32px',
      opacity: 0.03,
      borderOpacity: 0.1,
    },
  },
  sunset: {
    name: 'Sunset',
    colors: {
      background: '#1e1b4b',
      backgroundGradient: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 50%, #312e81 100%)',
      glass: 'rgba(255, 255, 255, 0.05)',
      glassBorder: 'rgba(255, 255, 255, 0.15)',
      text: {
        primary: '#fef3c7',
        secondary: '#fcd34d',
        tertiary: '#fbbf24',
      },
      accent: {
        primary: '#f97316',
        secondary: '#ea580c',
        light: '#fb923c',
        dark: '#c2410c',
      },
      status: {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
      },
    },
    effects: {
      blur: '24px',
      opacity: 0.05,
      borderOpacity: 0.15,
    },
  },
  forest: {
    name: 'Forest',
    colors: {
      background: '#064e3b',
      backgroundGradient: 'linear-gradient(135deg, #065f46 0%, #064e3b 50%, #065f46 100%)',
      glass: 'rgba(255, 255, 255, 0.05)',
      glassBorder: 'rgba(255, 255, 255, 0.15)',
      text: {
        primary: '#ecfdf5',
        secondary: '#d1fae5',
        tertiary: '#a7f3d0',
      },
      accent: {
        primary: '#10b981',
        secondary: '#059669',
        light: '#34d399',
        dark: '#047857',
      },
      status: {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
      },
    },
    effects: {
      blur: '24px',
      opacity: 0.05,
      borderOpacity: 0.15,
    },
  },
  ocean: {
    name: 'Ocean',
    colors: {
      background: '#164e63',
      backgroundGradient: 'linear-gradient(135deg, #155e75 0%, #164e63 50%, #155e75 100%)',
      glass: 'rgba(255, 255, 255, 0.05)',
      glassBorder: 'rgba(255, 255, 255, 0.15)',
      text: {
        primary: '#f0f9ff',
        secondary: '#e0f2fe',
        tertiary: '#bae6fd',
      },
      accent: {
        primary: '#06b6d4',
        secondary: '#0891b2',
        light: '#22d3ee',
        dark: '#0e7490',
      },
      status: {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
      },
    },
    effects: {
      blur: '24px',
      opacity: 0.05,
      borderOpacity: 0.15,
    },
  },
};
