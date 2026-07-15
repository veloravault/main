"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme | undefined;
  setTheme: (theme: Theme) => void;
};

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: Theme;
  attribute?: "class";
  enableSystem?: boolean;
};

const STORAGE_KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: string | null): value is Theme {
  return value === "system" || value === "light" || value === "dark";
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== "system") return theme;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  enableSystem = true,
}: ThemeProviderProps) {
  // Keep the server and first client render identical. Browser preferences are
  // synchronized after hydration; the root-layout bootstrap prevents a flash.
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>();

  const syncTheme = useCallback((nextTheme: Theme) => {
    const normalizedTheme = !enableSystem && nextTheme === "system" ? "light" : nextTheme;
    const nextResolvedTheme = resolveTheme(normalizedTheme);
    applyTheme(nextResolvedTheme);
    setThemeState(normalizedTheme);
    setResolvedTheme(nextResolvedTheme);
  }, [enableSystem]);

  const setTheme = useCallback((nextTheme: Theme) => {
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    syncTheme(nextTheme);
  }, [syncTheme]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    const frame = window.requestAnimationFrame(() => {
      syncTheme(isTheme(storedTheme) ? storedTheme : defaultTheme);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [defaultTheme, syncTheme]);

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const handleSystemThemeChange = () => {
      if (theme === "system") syncTheme("system");
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && isTheme(event.newValue)) syncTheme(event.newValue);
    };

    media.addEventListener("change", handleSystemThemeChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      media.removeEventListener("change", handleSystemThemeChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [syncTheme, theme]);

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [resolvedTheme, setTheme, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
