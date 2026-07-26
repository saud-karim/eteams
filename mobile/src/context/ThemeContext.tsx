import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme, Platform } from 'react-native';
import { Colors } from '../constants/Colors';

type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: 'light' | 'dark';
  themeSetting: ThemeType;
  colors: typeof Colors.light;
  setThemeSetting: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeSetting, setThemeState] = useState<ThemeType>('dark'); // Default to dark as requested
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        let savedTheme = null;
        if (Platform.OS === 'web') {
          savedTheme = localStorage.getItem('themeSetting');
        } else {
          savedTheme = await AsyncStorage.getItem('themeSetting');
        }
        
        if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
          setThemeState(savedTheme);
        }
      } catch (err) {
        console.warn('Failed to load theme setting:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const setThemeSetting = async (newTheme: ThemeType) => {
    setThemeState(newTheme);
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem('themeSetting', newTheme);
      } else {
        await AsyncStorage.setItem('themeSetting', newTheme);
      }
    } catch (err) {
      console.warn('Failed to save theme setting:', err);
    }
  };

  const activeTheme = themeSetting === 'system' ? (systemColorScheme || 'dark') : themeSetting;
  const colors = activeTheme === 'light' ? Colors.light : Colors.dark;

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ theme: activeTheme, themeSetting, colors, setThemeSetting }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
