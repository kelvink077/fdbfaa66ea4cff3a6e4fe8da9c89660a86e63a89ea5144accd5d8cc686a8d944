---
name: dala-design-system
description: Refero Design Style Reference for Dala (e5f5f8cf-e68d-4ed1-bbf5-6b67569af648) - Dark-stage void aesthetic with monolithic weight-400 typography, electric iris (#8052ff) pill actions, saffron spark (#ffb829) accents, and generative particle constellations.
---

# Dala Design System — Refero Style Reference

> Source: [Refero Styles](https://styles.refero.design/style/e5f5f8cf-e68d-4ed1-bbf5-6b67569af648)
> Core concept: **Constellation floating on black velvet**
> Theme: **Dark**

Dala operates as a dark-stage environment where pure black voids meet a single vivid violet accent, punctuated by amber sparks. Typography is monolithic and weightless — PPNeueMontreal at weight 400 dominates every heading at outsized scales with aggressive negative tracking, so headlines feel sculptural rather than informational. 

Components are intentionally reduced to their most essential form: one violet pill button, ghost text links, and large-format text blocks.

## Design Tokens

### Colors

| Name | Hex | Token | Role |
|------|-----|-------|------|
| **Void** | `#000000` | `--color-void` | Page canvas, section backgrounds, negative space — pure black is the dominant surface |
| **Bone White** | `#ffffff` | `--color-bone-white` | Headlines, body text, icon fills, active navigation |
| **Ash Gray** | `#9a9a9a` | `--color-ash-gray` | Muted nav text, ghost link color, secondary labels |
| **Silver Mist** | `#bdbdbd` | `--color-silver-mist` | Tertiary body text, caption-level information |
| **Electric Iris** | `#8052ff` | `--color-electric-iris` | Primary action buttons, logo mark, brand accents |
| **Saffron Spark** | `#ffb829` | `--color-saffron-spark` | Highlight emphasis text, accent links, attention badges |
| **Deep Verdant** | `#15846e` | `--color-deep-verdant` | Secondary surface tint, subtle accent washes |

### Typography

- **Font Family:** `PPNeueMontreal`, fallback to `Inter`, `system-ui`, sans-serif.
- **Headlines:** Set at weight `400` (never bold) with negative letter-spacing (`-0.04em`). Hierarchy is achieved through massive scale contrast, not font weight.
- **Body Copy:** Set at weight `200` (ultra-light) at `18px` with `1.5` line-height.
- **Labels & Navigation:** Set at weight `600` at `14px` uppercase with `0.025em` letter-spacing.

### Spacing & Shapes

- **Base unit:** `6px`
- **Border Radius:** `24px` for cards, buttons, and navigation containers. Pill radius (`9999px` or `22.5px`) for interactive buttons.
- **Section Gap:** `60px` to `120px`

## Component Patterns

### 1. Primary Action Button (Electric Iris Pill)
- Background: `#8052ff`
- Text: `#ffffff`, 14px, weight 600, uppercase, letter-spacing `0.025em`
- Border-radius: `24px` (pill)
- Padding: `14px` vertical × `24px` horizontal

### 2. Ghost Text Link / Action
- Background: none, border: none
- Color: `#ffffff` (hover) / `#9a9a9a` (default)
- Typography: 14px, weight 400

### 3. Mobile Responsive Navigation & Clean Icons
- On mobile devices (< 768px), navigation actions must never crowd or overflow horizontally.
- Use clean floating action pills, responsive drawers, or compact icon-badges.
- Keep touch targets at least 44px with balanced padding.

### 4. Void Surface Philosophy
- Elements float directly on pure `#000000` canvas separated by generous whitespace.
- Avoid multi-layered nested cards, heavy dropshadows, or dark gray containers.
