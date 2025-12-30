---
name: coinbox-brand
description: Applies Coinbox's official brand colors, typography, and design system to any UI components or pages. Use this skill when building frontend interfaces for the Coinbox portfolio intelligence platform.
license: MIT
---

# Coinbox Brand Styling

## Overview

To access Coinbox's official brand identity and style resources, use this skill when building any UI components, pages, or design artifacts for the Coinbox platform.

**Keywords**: branding, design system, visual identity, crypto wallet, fintech, portfolio tracker, colors, typography, Coinbox brand, UI components

## Brand Identity

**Product Name**: Coinbox
**Tagline**: Portfolio Intelligence, Not Just Tracking
**Category**: Multi-chain Cryptocurrency Portfolio Intelligence Platform

**Brand Personality**:
- Trustworthy - Handles financial data with care
- Intelligent - AI-powered insights, not just raw data
- Professional - Suitable for serious portfolio management
- Modern - Cutting-edge tech with refined aesthetics

**Aesthetic Direction**: Refined Fintech with Subtle Edge
- Avoid: Neon gradients, excessive glow, "Web3" clichés, purple everything
- Embrace: Clean confidence, purposeful accents, data-forward design

## Brand Guidelines

### Colors

**Primary Colors (Indigo):**

- Primary Light: `#C7D2FE` (Indigo-200) - Hover states, subtle highlights
- Primary Default: `#6366F1` (Indigo-500) - Main brand color, CTAs
- Primary Dark: `#4F46E5` (Indigo-600) - Active states, emphasis
- Primary Darker: `#4338CA` (Indigo-700) - Dark mode accents

**Accent Colors (Teal):**

- Accent Light: `#5EEAD4` (Teal-300) - Highlights on dark
- Accent Default: `#2DD4BF` (Teal-400) - Secondary CTAs, special features
- Accent Dark: `#14B8A6` (Teal-500) - Dark mode accent

**Semantic Colors:**

- Success: `#22C55E` (Green-500) - Positive gains, confirmations
- Warning: `#F59E0B` (Amber-500) - Uncategorized, needs attention
- Destructive: `#EF4444` (Red-500) - Losses, errors, deletions

**Neutral Colors:**

- Background Light: `#F8FAFC` (Slate-50) - Light theme background
- Background Dark: `#0F172A` (Slate-900) - Dark theme background
- Card Light: `#FFFFFF` - Light theme cards
- Card Dark: `#1E293B` (Slate-800) - Dark theme cards
- Border Light: `#E2E8F0` (Slate-200) - Light theme borders
- Border Dark: `#334155` (Slate-700) - Dark theme borders
- Muted Foreground: `#64748B` (Slate-500) - Secondary text

**Chain-Specific Colors:**

- Bitcoin: `#F7931A` - Bitcoin orange
- Ethereum: `#627EEA` - Ethereum blue
- Arbitrum: `#28A0F0` - Arbitrum blue
- Optimism: `#FF0420` - Optimism red
- Base: `#0052FF` - Coinbase blue
- Polygon: `#8247E5` - Polygon purple

### Typography

**Font Stack:**

- Headings: `Geist` (with Plus Jakarta Sans fallback)
- Body Text: `Geist` (with system-ui fallback)
- Monospace: `Geist Mono` (with JetBrains Mono fallback)

**Typography Rules:**

- All financial numbers use `tabular-nums` for aligned columns
- Wallet addresses and transaction hashes use monospace
- Price changes use semantic colors (green positive, red negative)

**Font Sizes:**

- Display (Hero numbers): 48px / 3rem
- Page Title: 36px / 2.25rem
- Section Header: 24px / 1.5rem
- Card Title: 20px / 1.25rem
- Body Large: 18px / 1.125rem
- Body: 16px / 1rem
- Body Small: 14px / 0.875rem
- Caption: 12px / 0.75rem

### Motion & Animation

**Timing:**

- Fast (hover, micro-interactions): 150ms
- Normal (state changes): 200ms
- Slow (page transitions, modals): 300ms

**Easing:**

- Default: `cubic-bezier(0.22, 1, 0.36, 1)` - Quick start, smooth end
- Spring: `type: spring, stiffness: 400, damping: 24`

**Key Animations:**

- Page enter: Fade in + slide up 12px
- Card hover: Scale 1.01 + subtle shadow increase
- List items: Stagger reveal with 50ms delay between items
- Number changes: Animated counting with spring physics

### Spacing & Layout

**Spacing Scale (4px base):**

- 4px (0.25rem) - Tight spacing within elements
- 8px (0.5rem) - Default gap between inline items
- 12px (0.75rem) - Compact padding
- 16px (1rem) - Standard padding
- 24px (1.5rem) - Card padding, section gaps
- 32px (2rem) - Large section margins
- 48px (3rem) - Page section spacing

**Border Radius:**

- Small: 4px - Buttons, inputs, chips
- Medium: 8px - Cards, panels
- Large: 12px - Modals, large containers
- XL: 16px - Hero elements
- Full: 9999px - Pills, avatars, circular elements

### Elevation (Shadows)

- sm: `0 1px 2px rgba(0, 0, 0, 0.05)` - Subtle lift
- md: `0 4px 6px -1px rgba(0, 0, 0, 0.1)` - Default card shadow
- lg: `0 10px 15px -3px rgba(0, 0, 0, 0.1)` - Hover state
- xl: `0 20px 25px -5px rgba(0, 0, 0, 0.1)` - Modal, dropdown

### Visual Effects

**Glass Effect:**
```css
.glass {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

## Component Guidelines

### Cards

- Default shadow: sm, increases to lg on hover
- Padding: 24px (space-6)
- Border radius: 8px (medium)
- Subtle border in light mode, no border in dark mode

### Buttons

- Primary: Indigo background, white text
- Secondary: Ghost/outline with indigo text
- Destructive: Red, use sparingly
- All buttons have subtle scale transform on tap (0.97)

### Data Display

- Numbers right-aligned in tables
- Monospace font for all numeric values
- Green (↑) for positive, Red (↓) for negative
- Neutral gray for zero or no change

### Forms

- Labels above inputs
- Inline validation with colored borders
- Clear disabled states (reduced opacity)

## Technical Details

### CSS Variables

All colors are defined as HSL values in CSS custom properties:

```css
:root {
  --primary: 239 84% 67%;      /* Indigo-500 */
  --accent: 174 72% 56%;        /* Teal-400 */
  --success: 142 71% 45%;       /* Green-500 */
  --warning: 38 92% 50%;        /* Amber-500 */
  --destructive: 0 84% 60%;     /* Red-500 */
}
```

### Font Loading

```css
@import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap");
@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap");
```

### Implementation Files

- CSS Variables: `desktop/src/index.css`
- Tailwind Config: `desktop/tailwind.config.js`
- Animation Presets: `desktop/src/lib/animations.ts`
