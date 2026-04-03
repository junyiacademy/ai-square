# AI Square Design System

## Brand Identity

**Vision**: 用 AI 學 AI 素養 (Learn AI literacy with AI)
**Tone**: Professional, approachable, modern — NOT childish, NOT generic SaaS

## Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#0363A7` | Brand blue, primary actions, links |
| `primary-light` | `#E8F4FD` | Blue tinted backgrounds, hover states |
| `accent` | `#EC6C1F` | CTA buttons, highlights, emphasis |
| `accent-light` | `#FEF3EC` | Orange tinted backgrounds |
| `bg` | `#FAFBFC` | Page background |
| `bg-section` | `#F1F5F9` | Alternating section background |
| `text` | `#1E293B` | Primary text (slate-800) |
| `text-muted` | `#64748B` | Secondary text (slate-500) |
| `border` | `#E2E8F0` | Borders, dividers (slate-200) |

## Typography

- **Headings**: Geist Sans (already loaded via Next.js)
- **Body**: Geist Sans
- **Mono**: Geist Mono (code blocks only)
- **CJK fallback**: system-ui, "PingFang SC", "Noto Sans CJK SC"

### Scale
| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| H1 (Hero) | 48-64px | 700 | 1.1 |
| H2 (Section) | 32-40px | 700 | 1.2 |
| H3 (Card) | 20-24px | 600 | 1.3 |
| Body | 16-18px | 400 | 1.6 |
| Caption | 14px | 400 | 1.5 |

## Layout

- **Max width**: 1280px (`max-w-7xl`)
- **Section padding**: `py-24` (desktop), `py-16` (mobile)
- **Container padding**: `px-6` (mobile), `px-8` (desktop)
- **Card border-radius**: `rounded-2xl` (16px)
- **Card shadow**: `shadow-sm` default, `shadow-md` hover

## Interaction

- **Hover**: `transition-colors duration-200` — NO `scale` transforms on cards
- **Buttons**: `transition-all duration-200` with shadow change
- **Focus**: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`
- **Reduced motion**: Respect `prefers-reduced-motion`

## Icons

- **Library**: Lucide React (`lucide-react`)
- **Size**: 24x24 default, 20x20 small, 32x32 large
- **NO emojis as icons** — use Lucide SVG exclusively

## Anti-Patterns

- No emoji icons in UI
- No `hover:scale-*` on cards (causes layout shift)
- No dark mode (education context, light is better)
- No glassmorphism/blur effects (performance + a11y)
- No Canvas for interactive elements (use CSS/SVG for SSR + a11y)

## Homepage Sections

1. **Hero** — Clean headline + single CTA + abstract visual
2. **Stats Bar** — Key numbers (14 languages, 4 domains, 20+ competencies)
3. **Three Modes** — Assessment / PBL / Discovery cards with icons
4. **How It Works** — 3 steps simplified flow
5. **Knowledge Domains** — CSS/SVG based domain visualization
6. **CTA** — Bottom conversion section
