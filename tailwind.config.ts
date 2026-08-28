import type { Config } from "tailwindcss";

import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        /* ── SportO brand navy palette — built around logo navy #002e7c ── */
        blue: {
          50:  "var(--color-primary-light, #eff4fc)",
          100: "var(--color-accent, #d6e2f7)",
          150: "#b8cdfa",
          200: "#80a5e6",
          300: "#3d6dc9",
          400: "#1a4fb0",
          450: "#0b3c94",
          500: "var(--color-primary, #003999)",
          600: "var(--color-primary, #002e7c)",  /* ← SportO primary navy mapped to globals.css */
          650: "var(--color-primary-hover, #00276a)",
          700: "var(--color-primary-hover, #002461)",  /* ← hover: deeper navy mapped to globals.css */
          800: "#001a45",
          900: "#00112e",
          950: "#000a1c",
        },
        slate: {
          50:  "#f8fafc",
          100: "#f1f5f9",
          150: "#e9edf3",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          450: "#7b8ea5",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        "surface-container-high": "#e6e8ea",
        "on-error-container": "#93000a",
        "tertiary": "#46566c",
        "secondary-fixed-dim": "#89ceff",
        "secondary-fixed": "#c9e6ff",
        "primary-container": "#002e7c",
        "surface-tint": "#002e7c",
        "error": "#ba1a1a",
        "tertiary-fixed": "#d3e4fe",
        "on-tertiary-container": "#e9f0ff",
        "on-error": "#ffffff",
        "on-surface-variant": "#434655",
        "secondary": "#006591",
        "on-background": "#191c1e",
        "surface-container": "#eceef0",
        "surface-bright": "#f7f9fb",
        "on-tertiary-fixed-variant": "#38485d",
        "inverse-primary": "#b4c5ff",
        "inverse-on-surface": "#eff1f3",
        "surface-dim": "#d8dadc",
        "on-tertiary": "#ffffff",
        "tertiary-fixed-dim": "#b7c8e1",
        "on-secondary-container": "#004666",
        "outline-variant": "#c3c6d7",
        "secondary-container": "#39b8fd",
        "on-primary": "#ffffff",
        "on-primary-fixed": "#00174b",
        "surface-variant": "#e0e3e5",
        "on-secondary": "#ffffff",
        "primary-fixed": "#e8f5ff",
        "primary-fixed-dim": "#b4c5ff",
        "on-secondary-fixed-variant": "#004c6e",
        "on-surface": "#191c1e",
        "on-secondary-fixed": "#001e2f",
        "on-primary-fixed-variant": "#07549a",
        "surface-container-highest": "#e0e3e5",
        "error-container": "#ffdad6",
        "surface-container-low": "#f2f4f6",
        "on-primary-container": "#eeefff",
        "tertiary-container": "#5e6e85",
        "on-tertiary-fixed": "#0b1c30",
        "surface-container-lowest": "#ffffff",
        "inverse-surface": "#2d3133",
        border: "var(--color-border)",
        input: "var(--color-input)",
        ring: "var(--color-ring)",
        background: "#ffffff",
        foreground: "var(--color-foreground)",
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "var(--color-primary-foreground)",
          light: "var(--color-primary-light)",
        },

        danger: {
          DEFAULT: "var(--color-danger)",
          foreground: "var(--color-primary-foreground)",
        },
        warning: {
            DEFAULT: "var(--color-warning)",
            foreground: "var(--color-primary-foreground)",
        },
        success: {
            DEFAULT: "var(--color-success)",
            foreground: "var(--color-primary-foreground)",
        },
        muted: {
          DEFAULT: "var(--color-muted)",
          foreground: "var(--color-muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-accent-foreground)",
        },
        card: {
          DEFAULT: "var(--color-card)",
          foreground: "var(--color-card-foreground)",
        },
        surface: {
          canvas: "var(--color-surface-canvas)",
          raised: "var(--color-surface-raised)",
          subtle: "var(--color-surface-subtle)",
          hover: "var(--color-surface-hover)",
        },
        content: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
          disabled: "var(--color-text-disabled)",
          link: "var(--color-text-link)",
        },
        outline: {
          DEFAULT: "var(--color-border-default)",
          subtle: "var(--color-border-subtle)",
          strong: "var(--color-border-strong)",
        },
        action: {
          primary: "var(--color-action-primary)",
          "primary-hover": "var(--color-action-primary-hover)",
          foreground: "var(--color-action-primary-foreground)",
        },
        focus: {
          ring: "var(--color-focus-ring)",
        },

        /* ── Dashboard design-system tokens ── */
        ds: {
          surface: "var(--ds-surface)",
          "surface-hover": "var(--ds-surface-hover)",
          "surface-subtle": "var(--ds-surface-subtle)",
          "surface-elevated": "var(--ds-surface-elevated)",
          "text-primary": "var(--ds-text-primary)",
          "text-secondary": "var(--ds-text-secondary)",
          "text-muted": "var(--ds-text-muted)",
          border: "var(--ds-border)",
          "border-subtle": "var(--ds-border-subtle)",
          ring: "var(--ds-ring)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      spacing: {
        "margin-desktop": "32px",
        "gutter": "24px",
        "container-max-width": "1200px",
        "unit": "4px",
        "section-padding": "64px",
        "margin-mobile": "16px"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        display: ["var(--font-sans)"],
        "label-sm": ["var(--font-sans)"],
        "headline-md": ["var(--font-sans)"],
        "headline-lg-mobile": ["var(--font-sans)"],
        "body-md": ["var(--font-sans)"],
        "headline-lg": ["var(--font-sans)"],
        "body-sm": ["var(--font-sans)"],
        "label-md": ["var(--font-sans)"],
        "body-lg": ["var(--font-sans)"]
      },
      fontSize: {
        "display": ["36px", {"lineHeight": "44px", "letterSpacing": "-0.02em", "fontWeight": "700"}],
        "label-sm": ["12px", {"lineHeight": "16px", "fontWeight": "500"}],
        "headline-md": ["20px", {"lineHeight": "28px", "fontWeight": "600"}],
        "headline-lg-mobile": ["24px", {"lineHeight": "32px", "fontWeight": "700"}],
        "body-md": ["16px", {"lineHeight": "24px", "fontWeight": "400"}],
        "headline-lg": ["28px", {"lineHeight": "36px", "letterSpacing": "-0.01em", "fontWeight": "700"}],
        "body-sm": ["14px", {"lineHeight": "20px", "fontWeight": "400"}],
        "label-md": ["14px", {"lineHeight": "20px", "letterSpacing": "0.05em", "fontWeight": "600"}],
        "body-lg": ["18px", {"lineHeight": "28px", "fontWeight": "400"}]
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
