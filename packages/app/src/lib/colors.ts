import type { Theme } from "./theme";

export interface ThemeColors {
	neutral50: string;
	neutral100: string;
	neutral200: string;
	neutral300: string;
	neutral400: string;
	neutral500: string;
	neutral600: string;
	neutral700: string;
	neutral800: string;
	neutral900: string;
	neutral950: string;
	foreground: string;
	foregroundMuted: string;
	primary: string;
	black: string;
	white: string;
	red: string;
	redForeground: string;
	pink: string;
	pinkForeground: string;
	pinkDark: string;
	orange: string;
	orangeForeground: string;
	orangeDark: string;
	yellow: string;
	yellowForeground: string;
	yellowDark: string;
	green: string;
	greenForeground: string;
	greenDark: string;
	lime: string;
	limeForeground: string;
	limeDark: string;
	cyan: string;
	cyanForeground: string;
	blue: string;
	blueForeground: string;
	blueDark: string;
	purple: string;
	purpleForeground: string;
	purpleDark: string;
}

const NEUTRAL = {
	50: "oklch(98.5% 0 0)",
	100: "oklch(97% 0 0)",
	200: "oklch(92.2% 0 0)",
	300: "oklch(87% 0 0)",
	400: "oklch(70.8% 0 0)",
	500: "oklch(55.6% 0 0)",
	600: "oklch(43.9% 0 0)",
	700: "oklch(37.1% 0 0)",
	800: "oklch(26.9% 0 0)",
	900: "oklch(20.5% 0 0)",
	950: "oklch(14.5% 0 0)",
};

// Theme colors used by the DAW UI (mix of hex/rgba + OKLCH neutrals)
const LIGHT: ThemeColors = {
	neutral50: NEUTRAL[50],
	neutral100: NEUTRAL[100],
	neutral200: NEUTRAL[200],
	neutral300: NEUTRAL[300],
	neutral400: NEUTRAL[400],
	neutral500: NEUTRAL[500],
	neutral600: NEUTRAL[600],
	neutral700: NEUTRAL[700],
	neutral800: NEUTRAL[800],
	neutral900: NEUTRAL[900],
	neutral950: NEUTRAL[950],
	foreground: NEUTRAL[900],
	foregroundMuted: NEUTRAL[800],
	primary: "#f28d45",
	black: "#000000",
	white: "#ffffff",
	red: "#f23655",
	redForeground: "#fde7eb",
	pink: "#ff75dd",
	pinkForeground: "#fde7f8",
	pinkDark: "#d40268",
	orange: "#FA470A",
	orangeForeground: "#fdeee7",
	orangeDark: "#d85c03",
	yellow: "#efbf2e",
	yellowForeground: "#fdf8e7",
	yellowDark: "#eb910a",
	green: "#13bd76",
	greenForeground: "#ebfaf5",
	greenDark: "#007a56",
	lime: "#97dc41",
	limeForeground: "#f3fbe9",
	limeDark: "#5fa904",
	cyan: "#7CCEB7",
	cyanForeground: "#e6fbff",
	blue: "#328170",
	blueForeground: "#e7effe",
	blueDark: "#033dab",
	purple: "#7662f9",
	purpleForeground: "#e9e7fe",
	purpleDark: "#100075",
};

const DARK: ThemeColors = {
	...LIGHT,
	foreground: "#eceff5",
	foregroundMuted: "rgba(236,239,245,0.7)",
	// green is overridden in dark theme
	green: "#2eefb5",
	greenForeground: "#e2fff6",
	greenDark: "#149e83",
};

export function getCurrentThemeColors(theme: Theme): ThemeColors {
	return theme === "dark" ? DARK : LIGHT;
}
