# Premium Design Guide — School Management App

**Goal:** The app must feel **premium**, not ordinary. No generic black-on-white. Use premium typography, a refined color palette, and polished visuals.

---

## 1. Typography — Premium Fonts

**Do not use:** System default, Arial, Roboto (too common).  
**Use:** Distinctive, premium font families.

### Recommended font pairs (Flutter / Web)

| Use | Font | Why |
|-----|------|-----|
| **Headings** | **DM Sans** or **Plus Jakarta Sans** or **Outfit** | Modern, clean, slightly distinctive. Free on Google Fonts. |
| **Body** | **Inter** (refined) or **Source Sans 3** or **Nunito Sans** | Readable, warm, not generic. |
| **Accent / Display** | **Clash Display** (if available) or **Sora** or **Manrope** | For hero text, splash screen, key numbers. |

**Flutter:** Add via `google_fonts` package:
```yaml
# pubspec.yaml
dependencies:
  google_fonts: ^6.1.0
```
```dart
// Example
Text('Welcome', style: GoogleFonts.plusJakartaSans(fontSize: 24, fontWeight: FontWeight.w600));
Text('Homework', style: GoogleFonts.sourceSans3(fontSize: 16));
```

**Web (Admin):** Import from Google Fonts in CSS or `next/font`:
```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600&display=swap');
```

**Rule:** One heading font + one body font. No more than two font families. Consistent weights (400, 500, 600, 700).

---

## 2. Color Palette — Premium, Not Black

**Avoid:** Pure black (#000), flat gray (#808080), default Material purple.  
**Use:** A refined palette with a clear primary, soft backgrounds, and accent colors.

### Option A — Warm & Trustworthy (Education-friendly)

| Role | Color | Hex | Use |
|------|-------|-----|-----|
| **Primary** | Deep teal / navy | `#0F766E` or `#1E3A5F` | Buttons, links, headers, key actions |
| **Primary light** | Soft teal | `#14B8A6` or `#2D5A87` | Hover, secondary buttons |
| **Background** | Off-white / warm gray | `#F8FAFC` or `#F1F5F9` | Screen background |
| **Surface** | White / light | `#FFFFFF` | Cards, inputs |
| **Text primary** | Dark charcoal | `#1E293B` or `#0F172A` | Headings, main text |
| **Text secondary** | Muted | `#64748B` or `#475569` | Labels, hints |
| **Accent** | Amber / gold | `#D97706` or `#F59E0B` | Highlights, badges, “new” |
| **Success** | Green | `#059669` | Paid, present, success |
| **Error** | Soft red | `#DC2626` | Failed, absent, overdue |

### Option B — Cool & Modern

| Role | Color | Hex |
|------|-------|-----|
| **Primary** | Indigo / violet | `#4F46E5` or `#6366F1` |
| **Background** | Slate | `#F8FAFC` |
| **Text primary** | Slate 800 | `#1E293B` |
| **Text secondary** | Slate 500 | `#64748B` |
| **Accent** | Cyan | `#06B6D4` |

### Dark mode (optional for MVP)

| Role | Hex |
|------|-----|
| Background | `#0F172A` |
| Surface | `#1E293B` |
| Text | `#F8FAFC` |
| Primary | `#38BDF8` or `#14B8A6` |

**Rule:** Never use pure `#000000` for text. Use `#1E293B` or `#0F172A`. Never use pure `#FFFFFF` for large backgrounds; use `#F8FAFC` or `#F1F5F9` for a softer feel.

---

## 3. Visual Polish

| Element | Guideline |
|---------|-----------|
| **Shadows** | Soft, layered: `0 1px 3px rgba(0,0,0,0.08)`, `0 4px 12px rgba(0,0,0,0.06)` for cards. No harsh black shadows. |
| **Border radius** | Rounded: 12px for cards, 8px for buttons, 24px for modals. Consistent across app. |
| **Spacing** | Generous: 16px, 24px, 32px. Avoid cramped layouts. |
| **Buttons** | Primary: filled with primary color, rounded. Secondary: outline or subtle fill. Clear hover/press states. |
| **Icons** | Consistent set (e.g. Lucide, Phosphor, or Material Symbols). Same size (24px default). |
| **Animations** | Subtle: 200–300ms for transitions. List items: stagger or fade-in. Button: slight scale on press. |

---

## 4. App Icon & Splash Screen

- **Icon:** Simple, recognizable. 1–2 colors from your palette. No tiny details. Test at 48×48 and 192×192.
- **Splash:** Logo centered on background using your **primary** or **background** color. Optional: school name in your heading font. 1–2 seconds, then fade to login.

---

## 5. Checklist — Premium, Not Ordinary

- [ ] **Fonts:** Premium heading + body font (e.g. Plus Jakarta Sans + Source Sans 3). No system default.
- [ ] **Colors:** Refined palette with primary, background, text (no pure black). Consistent across all screens.
- [ ] **Shadows:** Soft, layered. No harsh black.
- [ ] **Spacing:** Generous. No cramped layouts.
- [ ] **Radius:** Consistent rounded corners (8–12px).
- [ ] **Icon + splash:** Branded, using palette colors.
- [ ] **Dark/light:** One polished theme; dark mode optional for later.

---

**Summary:** Premium font + premium colors + soft shadows + generous spacing = app that feels premium, not ordinary.
