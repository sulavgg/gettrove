import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { profile, updateProfile, user } = useAuth();
  const [theme, setThemeState] = useState<Theme>('light');
  const [initialized, setInitialized] = useState(false);

  // Initialize theme from profile or localStorage fallback
  useEffect(() => {
    if (profile?.theme) {
      setThemeState(profile.theme as Theme);
      setInitialized(true);
    } else if (!initialized) {
      const stored = localStorage.getItem('trove-theme') as Theme | null;
      setThemeState(stored || 'light');
    }
  }, [profile?.theme]);

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    localStorage.setItem('trove-theme', theme);
  }, [theme]);

  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    if (user) {
      try {
        await updateProfile({ theme: newTheme } as any);
      } catch (err) {
        console.error('Failed to save theme preference:', err);
      }
    }
  }, [user, updateProfile]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
