import { createTheme } from "@mui/material/styles";
import { color, fontSans, radius } from "./tokens";

export const theme = createTheme({
  palette: {
    background: { default: color.page, paper: color.surface },
    primary: { main: color.primary },
    success: { main: color.success },
    warning: { main: color.warning },
    error: { main: color.danger },
    text: {
      primary: color.textPrimary,
      secondary: color.textMuted,
    },
  },
  typography: {
    fontFamily: fontSans,
    fontSize: 13,
  },
  shape: { borderRadius: radius.input },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: radius.button,
          fontWeight: 500,
          boxShadow: "none",
        },
      },
      defaultProps: { disableElevation: true },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          boxShadow: "none",
          border: `1px solid ${color.border}`,
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small" },
    },
  },
});

export * from "./tokens";
