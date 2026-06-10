---
name: Athletic Synergy
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434655'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006591'
  on-secondary: '#ffffff'
  secondary-container: '#39b8fd'
  on-secondary-container: '#004666'
  tertiary: '#46566c'
  on-tertiary: '#ffffff'
  tertiary-container: '#5e6e85'
  on-tertiary-container: '#e9f0ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#c9e6ff'
  secondary-fixed-dim: '#89ceff'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#004c6e'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-max-width: 1200px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  section-padding: 64px
---

## Brand & Style
The brand personality is professional, community-driven, and highly functional. It targets sports organizers and players in Vietnam who value efficiency and clarity over visual flair. The design evokes a sense of organized energy and reliability, similar to high-utility platforms like Facebook Groups or Baseline.vn.

The style is **Modern Minimalism**. It relies on generous whitespace, a strict color palette, and high-quality typography to create a "breathable" interface. There are no heavy gradients or decorative elements; instead, the design uses subtle borders and light shadows to define hierarchy, ensuring the focus remains entirely on tournament data and community interactions.

## Colors
This design system utilizes a high-clarity light mode palette. The primary blue is used for core actions and brand presence, while the sky-blue secondary color provides subtle accents for status indicators or less critical interactive elements.

- **Primary (#2563eb):** Call-to-actions, active states, and primary navigation.
- **Secondary (#0ea5e9):** Secondary actions, information badges, and accents.
- **Neutral/Surface (#f8fafc):** Used for background layers to separate content sections from the pure white (#ffffff) main workspace.
- **Text:** Slate-800 (#1e293b) for primary headings to ensure high legibility, and Slate-500 (#64748b) for secondary information and metadata.

## Typography
Inter is used exclusively to maintain a systematic and utilitarian feel. The type hierarchy is strictly controlled through weight and color rather than size alone. 

Headlines use **Slate-800** with tighter letter-spacing to appear more cohesive. Body text defaults to **Slate-800** for readability, while secondary labels and captions move to **Slate-500**. For mobile devices, the largest headlines scale down to prevent excessive line-breaking, ensuring tournament brackets and player lists remain readable.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy for desktop to maintain a "contained" feel similar to a community feed, centered on the screen with a maximum width of 1200px.

A 12-column system is used with a generous 24px gutter. Padding within components (cards, sections) should be large to emphasize the "clean and airy" aesthetic. For example, a standard content card should use at least 24px (1.5rem) of internal padding. On mobile, margins reduce to 16px, and complex data layouts (like tournament brackets) should transition to horizontal scrolling or list views.

## Elevation & Depth
Depth is achieved through **Low-contrast outlines** combined with very soft ambient shadows. 

The background should primarily be `#ffffff`. To create separation, use the neutral background `#f8fafc` for the page body and place pure white cards on top. Cards must have a 1px border of `slate-200` (#e2e8f0). The shadow should be barely perceptible—using a low-opacity slate tint (e.g., `0px 1px 3px rgba(15, 23, 42, 0.05)`) to provide just enough lift to signify interactivity without cluttering the visual field.

## Shapes
The design system uses a mixed rounding strategy to balance friendliness with professional structure:

- **Cards & Containers:** `rounded-xl` (1rem/16px) to create a soft, modern frame for content.
- **Buttons & Inputs:** `rounded-lg` (0.5rem/8px) to feel precise and clickable.
- **Avatars & Status Tags:** Circular (full rounding) to contrast against the structured grid.

## Components
- **Buttons:** Use `rounded-lg` with a solid primary fill for main actions. Secondary buttons should use a white background with a `slate-200` border and `slate-800` text.
- **Cards:** The core of the UI. White background, `rounded-xl`, `slate-200` border, and a `shadow-sm`. Use large internal padding (24px).
- **Inputs:** `slate-200` border, `rounded-lg`, and a focus state using a 2px `primary-blue` ring with offset.
- **Chips/Badges:** Small, `rounded-full`, using light tinted backgrounds (e.g., Sky-100) with darkened text for status indicators (e.g., "Registration Open").
- **Icons:** Use **Lucide React** style exclusively. Keep a consistent 1.5px stroke width. Icons should be sized at 20px for buttons/labels and 24px for section headers.
- **Lists:** Use clean dividers (`slate-100`) with no outer borders when inside a card. Each list item should have a hover state with a subtle `#f8fafc` background change.