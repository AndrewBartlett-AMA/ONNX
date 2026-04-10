# Design System Specification: The Digital Sanctuary

## 1. Overview & Creative North Star
The "Creative North Star" for this design system is **The Digital Sanctuary**. We are moving away from the loud, cluttered, and grid-locked interfaces of the past decade. This system is designed to feel like a high-end, physical workspace—think of a bespoke oak desk in a sun-drenched, minimalist studio. 

To break the "template" look, we utilize **Intentional Asymmetry** and **Tonal Depth**. We prioritize the user’s focus by using extreme whitespace and editorial-grade typography. Elements are not "contained" by boxes; they are "positioned" in space. This creates an environment that feels calm, intelligent, and profoundly distraction-free.

---

## 2. Colors & Surface Philosophy
The palette is rooted in soft neutrals to reduce eye strain, accented by high-end blues and oranges that provide functional cues without breaking the serenity.

### Tonal Hierarchy
- **Primary Canvas:** Use `surface` (`#f8f9fa`) as your global background.
- **The "No-Line" Rule:** Explicitly prohibit the use of 1px solid borders for sectioning or layout. Boundaries must be defined solely through background color shifts. For example, a side navigation should use `surface_container_low` (`#f3f4f5`) against the `surface` main content area.
- **Surface Hierarchy & Nesting:** Treat the UI as a series of physical layers. 
    - **Base:** `surface` (`#f8f9fa`)
    - **Low Impact Areas:** `surface_container_low` (`#f3f4f5`)
    - **Floating Content/Cards:** `surface_container_lowest` (`#ffffff`) to create a soft, natural lift.
    - **Interactive Elements:** `surface_container_high` (`#e7e8e9`) for subtle hover states.

### Accent & Soul
- **Primary CTAs:** Use a subtle gradient transitioning from `primary` (`#0058be`) to `primary_container` (`#2170e4`) at a 135-degree angle. This provides a "jewel-like" depth that flat colors lack.
- **Attention Points:** Use `secondary` (`#9d4300`) sparingly for notifications or high-priority warnings to maintain the "Quiet" nature of the interface.
- **The Glass Rule:** For top navigation bars or floating toolbars, use `surface_container_lowest` at 80% opacity with a `20px` backdrop-blur. This makes the UI feel integrated and premium.

---

## 3. Typography
We utilize a dual-font strategy to balance editorial authority with functional clarity.

- **The Voice (Plus Jakarta Sans):** Used for `display` and `headline` scales. This font’s geometric yet warm nature provides the "Quiet Scribe" personality. Increase tracking (letter-spacing) by `-0.02em` for headlines to feel more compact and intentional.
- **The Engine (Inter):** Used for `title`, `body`, and `label` scales. Inter is the gold standard for readability. For `body-md`, ensure a generous line-height (1.6) to facilitate long-form reading without fatigue.

**Hierarchy Usage:**
- **Display-lg:** Reserved for hero moments and welcome states.
- **Headline-sm:** Used for primary section headers.
- **Label-sm:** Set in `on_surface_variant` (`#424754`) for secondary metadata to ensure it recedes into the background.

---

## 4. Elevation & Depth
In this system, depth is a functional tool, not a stylistic flourish.

- **The Layering Principle:** Avoid shadows for static elements. Create depth by stacking. A `surface_container_lowest` card placed on a `surface_container_low` background creates a "Ghost Lift" that is cleaner than any shadow.
- **Ambient Shadows:** When an element must float (e.g., a dropdown or a modal), use a highly diffused shadow:
    - **X: 0, Y: 8px, Blur: 32px, Spread: 0**
    - **Color:** `on_surface` (`#191c1d`) at **4% opacity**. This mimics natural light rather than digital "glow."
- **The "Ghost Border":** If a border is required for accessibility (e.g., in high-contrast needs), use `outline_variant` (`#c2c6d6`) at **20% opacity**. Never use 100% opaque lines.

---

## 5. Components

### Buttons
- **Primary:** `rounded-md` (0.75rem). Background: `primary` to `primary_container` gradient. Text: `on_primary`. 
- **Secondary:** Background: `surface_container_high`. Text: `primary`. No border.
- **Tertiary:** No background. Text: `on_surface_variant`. Use `primary_fixed_dim` for the hover state background.

### Input Fields
- Avoid the "box" look. Use `surface_container_low` as the background with a `surface_container_highest` bottom indicator (2px). On focus, the indicator transitions to `primary`.
- **Corner Radius:** `sm` (0.25rem) for a more professional, "tool-like" feel compared to rounded buttons.

### Cards & Lists
- **Rule:** Forbid divider lines. 
- Use `spacing.xl` (1.5rem) between list items. For separation, use a subtle background shift on hover (`surface_container_low`).
- **Cards:** Use `rounded-lg` (1.0rem) and `surface_container_lowest`.

### The "Scribe" Toolbar (Unique Component)
A floating, glassmorphic bar located at the bottom center of the screen. 
- **Style:** `surface_container_lowest` @ 85% opacity, `blur-xl`, `rounded-full`.
- **Shadow:** Ambient shadow (see Elevation section).
- **Function:** Contains primary writing actions (Formatting, Focus Mode, Share).

---

## 6. Do's and Don'ts

### Do:
- **Do** use negative space as a first-class citizen. If a layout feels cramped, double the padding.
- **Do** use `on_surface_variant` for helper text to keep the visual noise low.
- **Do** align items to an asymmetrical 12-column grid, but allow hero elements to break the margins for an editorial feel.

### Don't:
- **Don't** use 1px solid borders to separate content. It breaks the "Sanctuary" vibe.
- **Don't** use pure black (`#000000`) for text. Use `on_background` (`#191c1d`).
- **Don't** use "Pop" animations. Use "Ease-in-out" transitions with durations between 200ms-300ms to mimic organic movement.
- **Don't** use standard icons. Use thin-stroke (1.5pt) custom iconography that matches the weight of the Inter typeface.