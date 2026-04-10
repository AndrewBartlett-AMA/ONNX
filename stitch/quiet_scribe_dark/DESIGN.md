# Design System Specification: The Digital Sanctuary (Dark Mode)

## 1. Overview & Creative North Star: "The Obsidian Library"
The creative direction for this design system is **"The Obsidian Library."** Unlike standard dark modes that feel like inverted light themes, this system is a curated environment designed for deep focus and cognitive ease. It moves away from the "neon-on-black" trope of tech interfaces, opting instead for an editorial, high-end experience.

We break the "template" look through **Tonal Layering**. By utilizing the Material Design surface tiers, we create a sense of architectural depth. The layout should feel intentional and asymmetric—using generous whitespace (negative space) as a structural element rather than relying on rigid lines. This is a sanctuary for the mind: quiet, professional, and sophisticated.

---

## 2. Colors: Tonal Depth over Borders
This palette is rooted in deep charcoal and slate, avoiding the harshness of `#000000` to maintain a premium, "ink-like" quality.

### Primary Palette
- **Background (`#0c0e10`):** The foundation. A rich, matte slate that grounds the experience.
- **Primary (`#adc6ff`):** Our signature blue, softened for dark mode to ensure AA/AAA accessibility while maintaining its intellectual character.
- **Surface Tiers:** Use `surface-container-lowest` to `surface-container-highest` to define hierarchy.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to separate sections. Boundaries must be defined through background color shifts.
*   *Example:* Place a `surface-container-high` card on a `surface` background. The shift in tone provides the boundary, creating a cleaner, more modern aesthetic.

### The "Glass & Gradient" Rule
To inject "soul" into the interface:
- **Main CTAs:** Use a subtle linear gradient from `primary` (#adc6ff) to `primary-container` (#004395) at 135 degrees.
- **Floating Elements:** For overlays or navigation bars, use `surface-container` with a 70% opacity and a `20px` backdrop-blur. This creates a "frosted obsidian" effect that allows background colors to bleed through softly.

---

## 3. Typography: Editorial Authority
The type system pairs the geometric precision of **Manrope** for headers with the highly legible, humanist qualities of **Inter** for utility and body text.

- **Display & Headlines (Manrope):** Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) for a bold, editorial feel. These should be `on-surface` (high contrast).
- **Body Text (Inter):** Use `body-lg` (1rem) for long-form reading. Set the line-height to 1.6 for maximum "Digital Sanctuary" comfort.
- **Labels (Inter):** Use `label-md` (0.75rem) in `on-surface-variant` (#a6acb2) for metadata. The lower contrast indicates secondary importance without losing readability.

---

## 4. Elevation & Depth
In this system, elevation is an optical illusion created by light and tone, not just shadows.

### The Layering Principle
Hierarchy is achieved by "stacking" surface tiers. 
- **Base Level:** `surface`
- **In-Page Sections:** `surface-container-low`
- **Interactive Cards:** `surface-container-highest`

### Ambient Shadows
When an element must float (e.g., a Modal or Popover):
- **Shadow:** `0 20px 40px rgba(0, 0, 0, 0.4)`
- **The "Ghost Border" Fallback:** If accessibility requires a stroke, use `outline-variant` (#42494e) at **20% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary-container`), white text, 8px (`DEFAULT`) corner radius.
- **Secondary:** Surface-tinted. Background: `surface-container-high`. No border.
- **States:** 
    - *Hover:* Increase brightness by 10% via a white overlay at 8% opacity.
    - *Active:* Scale down to 98% for a tactile "press" sensation.

### Cards
- **Construction:** Use `surface-container-low`. 
- **Constraint:** Forbidden to use divider lines. Separate header from body using a `24px` vertical gap (Spacing Scale) or a subtle shift to `surface-container-highest` for the header background.

### Input Fields
- **Background:** `surface-container-highest` (#20262c).
- **Indicator:** Instead of a full border, use a 2px bottom-border in `primary` that animates from the center outward on focus.
- **Error State:** Use `error` (#ee7d77) for text and helper icons.

### Selection Chips
- **Unselected:** `surface-container-high` with `on-surface-variant` text.
- **Selected:** `primary-container` background with `on-primary-container` text. 

---

## 6. Do's and Don'ts

### Do
- **Do** use asymmetric margins (e.g., wider left margins for headlines) to create an editorial, non-template look.
- **Do** use `surface-bright` for hover states on list items to create a "glow" from within the dark surface.
- **Do** ensure all primary actions use the signature blue (#3b82f6) to guide the user's eye through the "sanctuary."

### Don't
- **Don't** use pure white (#FFFFFF) for body text; use `on-background` (#e0e6ed) to reduce eye strain in dark environments.
- **Don't** use standard 1px grey dividers. If you need a separator, use a `12px` or `24px` gap of empty space.
- **Don't** use sharp corners. Every element must adhere to the `8px` (0.5rem) roundedness scale to maintain the "soft" minimalist persona.