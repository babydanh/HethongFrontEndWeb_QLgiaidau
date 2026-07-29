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
        "surface-container-high": "#e6e8ea",
        "on-error-container": "#93000a",
        "tertiary": "#46566c",
        "secondary-fixed-dim": "#89ceff",
        "secondary-fixed": "#c9e6ff",
        "primary-container": "#2563eb",
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
        "surface-tint": "#0053db",
        "outline-variant": "#c3c6d7",
        "secondary-container": "#39b8fd",
        "outline": "#737686",
        "on-primary": "#ffffff",
        "on-primary-fixed": "#00174b",
        "surface-variant": "#e0e3e5",
        "on-secondary": "#ffffff",
        "primary-fixed": "#dbe1ff",
        "surface": "#f7f9fb",
        "primary-fixed-dim": "#b4c5ff",
        "on-secondary-fixed-variant": "#004c6e",
        "on-surface": "#191c1e",
        "on-secondary-fixed": "#001e2f",
        "on-primary-fixed-variant": "#003ea8",
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
        background: "#f7f9fb", // "var(--color-background)"
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
