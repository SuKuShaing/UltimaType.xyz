# Design System Specification: Kinetic Monospace

## 1. Overview & Creative North Star
**Creative North Star: "The Analog Velocity"**
This design system moves away from the sterile, rigid grids of traditional dashboard design. It embraces the "Tactile Digital"—an experience that feels as intentional as a mechanical keyboard click and as fluid as a professional typist's rhythm. By leveraging high-contrast typography and sophisticated tonal layering, we create a "High-End Editorial" atmosphere.

We break the "template" look through **intentional asymmetry** and **overlapping depth**. Components aren't just placed on a page; they are curated. Expect heavy use of whitespace, dramatic scale shifts in typography, and a "no-line" philosophy that relies on color depth rather than borders to define structure.

---

## 2. Colors & Surface Philosophy
The palette balances the professional weight of `#25343F` with the electric kinetic energy of `#FF9B51`.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to section content. Boundaries must be defined through background shifts or tonal transitions.
- Use `surface-container-low` for large section backgrounds.
- Use `surface-container-highest` or `surface-container-lowest` for nested cards to create contrast.
- Lines are a failure of layout; use white space from our spacing scale (`12` or `16` tokens) to create "invisible" divisions.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. 
- **Base Layer:** `surface` (#f5fafa)
- **Sectioning:** `surface-container` (#eaefef)
- **Interactive Elevated Elements:** `surface-container-lowest` (#ffffff) for a "lifted" feel or `primary-container` (#25343f) for high-impact focus areas.

### The "Glass & Gradient" Rule
To inject "soul" into the typing experience:
- **CTAs & Heroes:** Use a subtle linear gradient from `primary` (#0f1f29) to `primary-container` (#25343f) at a 135-degree angle.
- **Overlays:** Use Glassmorphism for floating modals or speed-stats. Use `surface_variant` with a 60% opacity and a `20px` backdrop-blur.

---

## 3. Typography: The Monospace Statement
We utilize **Space Grotesk** to bridge the gap between "typewriter" nostalgia and modern precision.

| Role | Token | Size | Weight | Character Spacing |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | 3.5rem | 700 | -0.02em |
| **Headline** | `headline-lg` | 2.0rem | 500 | -0.01em |
| **Title** | `title-lg` | 1.375rem | 600 | 0.02em |
| **Body** | `body-lg` | 1.0rem | 400 | Normal |
| **Label** | `label-md` | 0.75rem | 700 | 0.05em (All Caps) |

**Editorial Direction:** Use `display-lg` for real-time WPM (Words Per Minute) counters. The sheer scale of the type should make the user feel the "energy" of their speed.

---

## 4. Elevation & Depth
In this system, depth is felt, not seen through harsh shadows.

- **Tonal Layering:** Instead of a shadow, place a `surface-container-lowest` card on a `surface-container` background. The subtle shift from #ffffff to #eaefef provides a sophisticated, "quiet" elevation.
- **Ambient Shadows:** For floating elements (e.g., a "New Race" FAB), use: `box-shadow: 0 20px 40px rgba(15, 31, 41, 0.06);`. The shadow color is a tinted version of our `primary`, never pure black.
- **The Ghost Border:** If accessibility requires a stroke (e.g., input focus), use `outline-variant` (#c3c7cb) at **20% opacity**.

---

## 5. Components

### Buttons (Kinetic Triggers)
- **Primary:** Background: `secondary` (#954900) or `secondary-container` (#ff9b51); Text: `on-secondary` (#ffffff). Border-radius: `xl` (3rem). 
- **State:** On hover, apply a `primary` shadow with 8% opacity and shift the Y-axis by -2px.
- **Tertiary:** No background. Use `label-md` (All Caps) with a 2px underline in `secondary_fixed_dim`.

### Cards & Result Lists
- **Rule:** Forbid divider lines. 
- **Implementation:** Use a staggered layout. Every second list item uses `surface-container-low` while the primary items stay on `surface`. 
- **Corners:** Always use `lg` (2rem) or `md` (1.5rem) rounding. Sharp corners are prohibited.

### Input Fields (The Typing Area)
- **Style:** Minimalist. No containing box. Only a `surface-container-highest` bottom bar (4px height) that expands into a full container on focus.
- **Caret:** Use `secondary` (#FF9B51) for the typing cursor to create a high-energy focal point.

### Progress Gauges
- Use "pill" shapes (`full` rounding).
- Background: `surface-container-highest`.
- Fill: Linear gradient from `secondary` to `secondary_container`.

---

## 6. Do’s and Don’ts

### Do:
- **Use Dramatic Scale:** Make the WPM number massive. Let the typography do the heavy lifting.
- **Embrace White Space:** Use the `24` (6rem) spacing token between major sections to let the design breathe.
- **Color Transitions:** Use `secondary` exclusively for "success" and "kinetic energy"—actions that move the user forward.

### Don't:
- **No 1px Lines:** Do not use borders to separate the "User Profile" from the "Leaderboard." Use a background color shift.
- **No Default Shadows:** Never use `rgba(0,0,0,0.5)`. Shadows must be low-opacity and tinted with our `primary` blue-grey.
- **Don't Crowd:** If a screen feels busy, increase the corner radius and the internal padding (`spacing-8`).

---

## 7. Signature Interaction Pattern
**The "Focus Fade":** When the user begins typing, all UI elements except the typing area and the WPM counter should fade to 20% opacity. This reinforces the "Professional" and "Energetic" vibe by removing distractions and centering the user on their performance.