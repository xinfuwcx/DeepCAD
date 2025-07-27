import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

/**
 * 自定义 i18n Hook
 * 提供翻译功能和语言切换
 */
export const useI18n = () => {
  const { t, i18n } = useTranslation();

  const changeLanguage = useCallback((lng: string) => {
    i18n.changeLanguage(lng);
  }, [i18n]);

  const getCurrentLanguage = useCallback(() => {
    return i18n.language;
  }, [i18n]);

  const getAvailableLanguages = useCallback(() => {
    return Object.keys(i18n.store.data);
  }, [i18n]);

  const isLanguageLoaded = useCallback((lng: string) => {
    const defaultNS = Array.isArray(i18n.options.defaultNS) ? i18n.options.defaultNS[0] : (i18n.options.defaultNS || 'translation');
    return i18n.hasResourceBundle(lng, defaultNS);
  }, [i18n]);

  // 格式化带参数的翻译
  const tf = useCallback((key: string, options?: any) => {
    return t(key, options);
  }, [t]);

  // 获取当前语言的显示名称
  const getLanguageDisplayName = useCallback((lng: string) => {
    const languageNames: Record<string, string> = {
      'zh': '中文',
      'en': 'English',
      'zh-CN': '简体中文',
      'zh-TW': '繁體中文',
      'en-US': 'English (US)',
      'en-GB': 'English (UK)'
    };
    return languageNames[lng] || lng;
  }, []);

  // 检查是否为RTL语言
  const isRTL = useCallback(() => {
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    return rtlLanguages.includes(i18n.language);
  }, [i18n]);

  return {
    t,
    tf,
    i18n,
    changeLanguage,
    getCurrentLanguage,
    getAvailableLanguages,
    getLanguageDisplayName,
    isLanguageLoaded,
    isRTL,
    currentLanguage: i18n.language,
    isReady: i18n.isInitialized
  };
};

/**
 * 专用于表单验证的 i18n Hook
 */
export const useFormI18n = () => {
  const { t } = useTranslation();

  return {
    required: (field?: string) => t('forms.required', { field }),
    invalidEmail: () => t('forms.invalidEmail'),
    passwordTooShort: (min: number = 8) => t('forms.passwordTooShort', { min }),
    passwordMismatch: () => t('forms.passwordMismatch'),
    numberRange: (min: number, max: number) => t('forms.numberRange', { min, max }),
    selectOption: () => t('forms.selectOption')
  };
};

/**
 * 专用于单位显示的 i18n Hook
 */
export const useUnitsI18n = () => {
  const { t } = useTranslation();

  return {
    length: {
      m: t('units.length.m'),
      mm: t('units.length.mm'),
      km: t('units.length.km')
    },
    area: {
      m2: t('units.area.m2'),
      km2: t('units.area.km2')
    },
    volume: {
      m3: t('units.volume.m3'),
      km3: t('units.volume.km3')
    },
    angle: {
      deg: t('units.angle.deg'),
      rad: t('units.angle.rad')
    },
    force: {
      n: t('units.force.n'),
      kn: t('units.force.kn'),
      mn: t('units.force.mn')
    }
  };
};

export default useI18n;