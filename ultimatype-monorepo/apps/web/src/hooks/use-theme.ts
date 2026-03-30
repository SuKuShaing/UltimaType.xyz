import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import React from 'react';

type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemePreference) => void;
  cycleTheme: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'dark',
  setTheme: noop,
  cycleTheme: noop,
});

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') return getSystemTheme();
  return preference;
}

function applyThemeClass(resolved: 'light' | 'dark') {
  if (resolved === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    const stored = localStorage.getItem('theme') as ThemePreference | null;
    return stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    resolveTheme(theme),
  );

  const setTheme = useCallback((newTheme: ThemePreference) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    const resolved = resolveTheme(newTheme);
    setResolvedTheme(resolved);
    applyThemeClass(resolved);
  }, []);

  const cycleTheme = useCallback(() => {
    const order: ThemePreference[] = ['light', 'dark', 'system'];
    const idx = order.indexOf(theme);
    const next = order[(idx + 1) % order.length];
    setTheme(next);
  }, [theme, setTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const resolved = resolveTheme('system');
      setResolvedTheme(resolved);
      applyThemeClass(resolved);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // Apply on mount
  useEffect(() => {
    applyThemeClass(resolvedTheme);
  }, [resolvedTheme]);

  return React.createElement(
    ThemeContext.Provider,
    { value: { theme, resolvedTheme, setTheme, cycleTheme } },
    children,
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
