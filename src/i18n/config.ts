import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import it from './locales/it.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';

// Get saved language from localStorage or use default
const getSavedLanguage = () => {
  try {
    const savedSettings = localStorage.getItem('settings-storage');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      return parsed?.state?.settings?.language || 'it';
    }
  } catch (e) {
    console.error('Error reading saved language:', e);
  }
  return 'it';
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      it: { translation: it },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
    },
    lng: getSavedLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
