import { create } from 'zustand';

type Theme = 'orange' | 'purple' | 'blue';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (localStorage.getItem('app-theme') as Theme) || 'purple',
  setTheme: (theme) => {
    localStorage.setItem('app-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
}));

// Initialize theme on load
const currentTheme = localStorage.getItem('app-theme') || 'purple';
document.documentElement.setAttribute('data-theme', currentTheme);