import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import { colors, darkColors, type ThemeColors } from "@/src/lib/theme";

// ThemeProvider — light / dark / system app theme.
//   - "system" follows the OS colour scheme (useColorScheme).
//   - The choice persists in AsyncStorage.
//   - Components consume it via useTheme() → { colors, isDark, mode, setMode }.
// The colour tokens keep the same keys in both modes, so a screen only needs
// `const { colors } = useTheme()` instead of the static import to be dark-aware.

export type ThemeMode = "system" | "light" | "dark";

type ThemeContextValue = {
  colors: ThemeColors;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
};

const STORAGE_KEY = "nuvora_theme_mode";

const ThemeContext = createContext<ThemeContextValue>({
  colors,
  isDark: false,
  mode: "system",
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === "light" || v === "dark" || v === "system") setModeState(v);
      })
      .catch(() => {});
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  };

  const isDark = mode === "dark" || (mode === "system" && system === "dark");
  const value = useMemo<ThemeContextValue>(
    () => ({ colors: isDark ? darkColors : colors, isDark, mode, setMode }),
    [isDark, mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
