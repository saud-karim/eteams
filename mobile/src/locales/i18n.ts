import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

import en from './en.json';
import ar from './ar.json';

const LANGUAGE_KEY = 'app_language';

const resources = {
  en: en,
  ar: ar,
};

export const initI18n = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    const deviceLanguage = getLocales()[0]?.languageCode || 'en';
    const defaultLanguage = savedLanguage || deviceLanguage;

    // Set initial RTL state
    const isRTL = defaultLanguage === 'ar';
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
      // Changes to I18nManager require an app reload to take full effect on Native
      // Expo router doesn't automatically reload layout on RTL change, 
      // but it will apply on next restart or in Web via CSS.
    }

    await i18n
      .use(initReactI18next)
      .init({
        compatibilityJSON: 'v3',
        resources,
        lng: defaultLanguage,
        fallbackLng: 'en',
        interpolation: {
          escapeValue: false,
        },
      });
  } catch (error) {
    console.error('Error initializing i18n:', error);
  }
};

export const changeLanguage = async (lng: string) => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lng);
  await i18n.changeLanguage(lng);
  
  const isRTL = lng === 'ar';
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
  }
};

export default i18n;
