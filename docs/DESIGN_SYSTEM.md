# PahaadSaathi — Brand Design System Specification
**Version:** 1.0.0  
**Theme Philosophy:** Mountain-First, Emergency Clarity, High Contrast, Calm Reliability

---

## 1. Palette & Semantic Color Tokens

| Token | Hex Value | Semantic Usage |
|---|---|---|
| `alpineInk` | `#002116` | Deepest brand contrast, dark headers, dark mode surfaces |
| `pineForest` | `#003425` | Primary brand color, key actions, verified badges |
| `pineForestLight` | `#174B3A` | Hover / pressed state for primary elements |
| `pineForestMuted` | `#296A4E` | Secondary buttons, mountain topography accents |
| `pineForestContainer` | `#AEF1CE` | Subtle success container, online status indicator |
| `glacier` | `#F2FCF2` | Primary light surface and screen background |
| `glacierDark` | `#E6F1E7` | Secondary surface in light mode |
| `snow` | `#FFFFFF` | Clean white card surfaces |
| `slate` | `#404944` | High-contrast secondary text |
| `slateMuted` | `#707974` | Subtitle text, placeholder labels |
| `stone` | `#DDE5DF` | Card borders, dividers |
| `rescueRed` | `#BA1A1A` | SOS button, critical road closure, life-threat alerts |
| `rescueRedLight` | `#FFDAD6` | Critical incident alert background |
| `saffron` | `#D97706` | Cautionary advisories, unverified citizen reports |
| `verifiedGreen` | `#15803D` | Official government verification, open shelter status |

---

## 2. Typography System
- **Scale:**
  - `caption`: 11px (line height 14px, uppercase tracking 0.5px)
  - `labelSm`: 12px (line height 16px, font weight 600)
  - `bodySm`: 13px (line height 18px)
  - `bodyMd`: 14px (line height 20px)
  - `bodyLg`: 16px (line height 24px)
  - `subheading`: 18px (line height 24px, font weight 600)
  - `headingSm`: 20px (line height 28px, font weight 600)
  - `headingMd`: 24px (line height 32px, font weight 700)
  - `headingLg`: 28px (line height 36px, font weight 700)
  - `display`: 34px (line height 42px, font weight 800)
- **Rules:**
  - All numerical telemetry (GPS coordinates, altitude, distance, phone numbers) must use clear mono or tabular spacing.
  - No decorative script fonts for critical emergency data.

---

## 3. Spacing, Touch Targets & Layout Rules
- **Minimum Touch Target:** 48dp on secondary elements, 56dp on primary emergency actions.
- **Screen Margins:** 16dp horizontal gutter on mobile.
- **Card Radius:** 12dp standard (`Radii.md`).
- **Elevation:** Low elevation (`Shadows.sm` / `Shadows.md`) to avoid visual distraction under bright mountain daylight.
- **SOS Button:** Prominent 112dp circular trigger with high contrast ring and hold-to-activate interaction to prevent accidental pocket dispatch.
