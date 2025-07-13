import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import zh from './locales/zh.json';

const resources = {
  en: {
    translation: en
  },
  zh: {
    translation: zh
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh', // 默认语言
    fallbackLng: 'en',
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React已经默认转义
    },

    // 命名空间
    defaultNS: 'translation',
    ns: ['translation'],

    // 开发模式配置
    debug: import.meta.env.DEV,
    
    // 后端选项
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    // 更新缺失的键
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: (lng, ns, key) => {
      if (import.meta.env.DEV) {
        console.warn(`Missing translation key: ${key} for language: ${lng}`);
      }
    },
  });

export default i18n;