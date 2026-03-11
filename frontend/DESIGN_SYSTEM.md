# PropFlow Design System

## Color Palette

### Background Colors
| Token | Hex/Class | Usage |
|-------|-----------|-------|
| `bg-cream` | `#F7F5F2` | Landing page backgrounds, marketing sections |
| `bg-white` | `#FFFFFF` | CRM app interior, main content area, modals |
| `bg-zinc-50` | `zinc-50` | App shell background (behind sidebar) |
| `bg-dark` | `zinc-900` | Dark cards, footer, CTA sections, nav elements |
| `bg-dark-card` | `zinc-800` | Dark card interiors, code blocks |

### Text Colors
| Token | Class | Usage |
|-------|-------|-------|
| `text-primary` | `zinc-900` | Headings, primary text |
| `text-secondary` | `zinc-600` | Body text, descriptions |
| `text-muted` | `zinc-500` | Helper text, captions |
| `text-subtle` | `zinc-400` | Placeholder text, disabled states |
| `text-inverted` | `white` | Text on dark backgrounds |
| `text-inverted-muted` | `zinc-300` / `zinc-400` | Secondary text on dark backgrounds |

### Border Colors
| Token | Class | Usage |
|-------|-------|-------|
| `border-default` | `zinc-200` | Card borders, dividers |
| `border-light` | `zinc-100` | Subtle dividers |
| `border-dark` | `zinc-800` | Dividers on dark backgrounds |

### Accent Colors
| Token | Class | Usage |
|-------|-------|-------|
| `accent-success` | `emerald-100` / `emerald-700` | Success states, positive badges |
| `accent-warning` | `amber-100` / `amber-700` | Warnings, trial badges |
| `accent-popular` | `amber-500` / `amber-400` | "Popular" highlights |
| `accent-info` | `blue-100` / `blue-700` | Info badges |

---

## Typography

### Headings
- **Hero/Section Titles**: `text-5xl md:text-6xl font-light` with key word in `font-semibold`
- **Card Titles**: `text-xl font-semibold` or `text-2xl font-semibold`
- **Subsection**: `text-lg font-semibold`

### Body Text
- **Primary**: `text-base` or `text-lg` with `text-zinc-600`
- **Small**: `text-sm` with `text-zinc-500` or `text-zinc-600`
- **Extra Small**: `text-xs` with `text-zinc-400` or `text-zinc-500`

---

## Components

### Buttons

#### Primary Button (Dark)
```jsx
<Button className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-full px-6 h-11 text-sm font-medium">
  Label <ArrowRight className="ml-2 h-4 w-4" />
</Button>
```

#### Primary Button (Light - on dark bg)
```jsx
<Button className="bg-white hover:bg-zinc-100 text-zinc-900 rounded-full px-6 h-11 text-sm font-medium">
  Label <ArrowRight className="ml-2 h-4 w-4" />
</Button>
```

#### Secondary/Outline Button
```jsx
<Button variant="outline" className="rounded-full border-zinc-300 h-11 px-6 text-sm font-medium">
  Label
</Button>
```

### Cards

#### Light Card
```jsx
<div className="bg-white rounded-3xl p-8 border border-zinc-200">
  {/* Content */}
</div>
```

#### Cream Card
```jsx
<div className="bg-[#F7F5F2] rounded-3xl p-8">
  {/* Content */}
</div>
```

#### Dark Card
```jsx
<div className="bg-zinc-900 rounded-3xl p-8 text-white">
  {/* Content */}
</div>
```

### Badges

#### Success Badge
```jsx
<span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
  Label
</span>
```

#### Warning/Trial Badge
```jsx
<span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
  Label
</span>
```

#### Popular Badge (on dark)
```jsx
<span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
  Most Popular
</span>
```

#### Info Badge
```jsx
<span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
  Label
</span>
```

### Inputs
```jsx
<Input className="h-11 rounded-xl border-zinc-200 focus:border-zinc-400 focus:ring-zinc-400" />
```

### Icons
- Icon containers: `h-12 w-12 rounded-2xl` with appropriate bg
- Light bg icons: `bg-white` or `bg-zinc-100`
- Dark bg icons: `bg-white/10` or `bg-zinc-800`

---

## Spacing & Layout

### Section Padding
- Vertical: `py-24`
- Horizontal: `px-4 sm:px-6 lg:px-8`

### Container Width
- Standard: `max-w-6xl mx-auto`
- Wide: `max-w-7xl mx-auto`

### Card Padding
- Large cards: `p-8`
- Medium cards: `p-6`
- Small cards: `p-4`

### Border Radius
- Large (cards, modals): `rounded-3xl`
- Medium (buttons, inputs): `rounded-xl` or `rounded-full`
- Small (badges, icons): `rounded-full` or `rounded-xl`

---

## Shadows
- Cards: default or `shadow-xl`
- Floating elements: `shadow-2xl`
- Subtle: No shadow, rely on border

---

## CSS Custom Properties (add to index.css)

```css
:root {
  --color-cream: #F7F5F2;
  --color-dark: #18181b; /* zinc-900 */
  --color-dark-card: #27272a; /* zinc-800 */
}
```

---

## Usage Guidelines

1. **Landing page**: Use `bg-cream` (`#F7F5F2`) for marketing backgrounds
2. **CRM interior**: Use `bg-white` for main content area, `bg-zinc-50` for shell
3. **Dark sections**: Use `bg-zinc-900` with white/light text
4. **Cards**: Alternate between light and dark for visual interest
5. **CTAs**: Use `bg-zinc-900` buttons for primary actions
6. **Typography**: Use `font-light` for large headings with `font-semibold` for emphasis
7. **Borders**: Keep borders subtle (`zinc-200`) on light, (`zinc-800`) on dark
8. **Layout**: Sidebar fixed width (240-256px), main content fluid with max-width 1600px
