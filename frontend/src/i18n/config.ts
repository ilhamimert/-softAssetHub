import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import tr from './locales/tr.json';
import en from './locales/en.json';

i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources: {
      tr: { translation: tr },
      en: { translation: en }
    },
    fallbackLng: 'tr',
    interpolation: {
      escapeValue: false
    }
  });

export default i18next;
