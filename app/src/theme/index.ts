import { MD3LightTheme as DefaultTheme } from "react-native-paper";

import { colors } from "./tokens";

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    onPrimary: "#FFFFFF",
    secondary: colors.secondary,
    background: colors.background,
    surface: colors.surface,
    success: "#45B36B",
    warning: "#F2994A",
    error: "#EB5757"
  }
};

export type AppTheme = typeof theme;
