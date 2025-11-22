import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
  it: {
    translation: {
      // Navigation
      'nav.home': 'Home',
      'nav.history': 'Cronologia',
      'nav.settings': 'Impostazioni',

      // Common
      'common.copy': 'Copia',
      'common.copied': 'Copiato!',
      'common.clear': 'Cancella',
      'common.reset': 'Reset',
      'common.close': 'Chiudi',

      // Converters
      'converter.base': 'Basi Numeriche',
      'converter.ascii': 'ASCII',
      'converter.unicode': 'Unicode',
      'converter.floating': 'Virgola Mobile',
      'converter.base64': 'Base64',
      'converter.hash': 'Hash',
      'converter.color': 'Colori',
      'converter.timestamp': 'Timestamp',
      'converter.url': 'URL',
      'converter.jwt': 'JWT',
      'converter.json': 'JSON',
    },
  },
  en: {
    translation: {
      // Navigation
      'nav.home': 'Home',
      'nav.history': 'History',
      'nav.settings': 'Settings',

      // Common
      'common.copy': 'Copy',
      'common.copied': 'Copied!',
      'common.clear': 'Clear',
      'common.reset': 'Reset',
      'common.close': 'Close',

      // Converters
      'converter.base': 'Numeric Bases',
      'converter.ascii': 'ASCII',
      'converter.unicode': 'Unicode',
      'converter.floating': 'Floating Point',
      'converter.base64': 'Base64',
      'converter.hash': 'Hash',
      'converter.color': 'Colors',
      'converter.timestamp': 'Timestamp',
      'converter.url': 'URL',
      'converter.jwt': 'JWT',
      'converter.json': 'JSON',
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'it', // Default language
    fallbackLng: 'it',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
