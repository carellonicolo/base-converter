import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../store/useSettingsStore';

/**
 * Hook to sync language between store and i18n
 */
export function useLanguage() {
  const { i18n } = useTranslation();
  const language = useSettingsStore((state) => state.settings.language);

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);

  return { language, changeLanguage: i18n.changeLanguage };
}
