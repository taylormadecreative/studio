# DESIGN.md — Taylormade Creative

## Register & strategy
Brand register. Color strategy: **Drenched dark** — a near-black paper surface dominates, **gold** is the single committed accent, warm off-white carries type. Creator-editorial zine energy (think editorial fashion zine, not SaaS): real photos of Nelson as hero, big confident type, generous negative space, occasional mixed-media texture. Not a deck. Not a template.

## Color (OKLCH, never #000/#fff)
- `--ink`     oklch(0.17 0.012 75)   /* warm near-black, page surface */
- `--ink-2`   oklch(0.22 0.012 75)   /* raised panels */
- `--paper`   oklch(0.95 0.010 85)   /* warm off-white, primary type */
- `--paper-dim` oklch(0.74 0.012 85) /* secondary type */
- `--gold`    oklch(0.80 0.125 80)   /* the accent — real metallic gold, not yellow */
- `--gold-deep` oklch(0.68 0.12 70)  /* gold hover/press */
- `--line`    oklch(0.30 0.012 75)   /* hairlines */
Gold appears on ≤ ~20% of any view (it's the committed accent, not a flood). Tint every neutral toward hue 75–85.

## Type
- **Display:** Bricolage Grotesque (700/800) — modern editorial grotesque with character. Hero + section headers.
- **Serif accent:** Fraunces (italic, optical) — for emphasis words and pull quotes only. The zine "voice."
- **UI / body:** Inter (variable). Body capped 65–72ch.
- Scale ratio ≥ 1.25. Hero display is huge (clamp to ~clamp(3rem, 9vw, 8rem)). Weight contrast does the hierarchy work.

## Motion (Emil + taste)
- Transitions on transform/opacity only. Ease-out-expo / quint. No bounce, no elastic. < 320ms.
- Entrances: subtle rise + fade on scroll (IntersectionObserver), staggered. Always `prefers-reduced-motion` guarded.
- Micro: scale-on-press 0.97 for buttons, gold underline wipes on links. Hardware-accelerated (`transform`, `will-change` sparingly).

## Layout
- Full-bleed editorial sections; vary spacing for rhythm (no uniform padding). Avoid card grids as a reflex.
- Real photos graded into the black/gold register via duotone/contrast where needed for cohesion.
- Mobile-first. Sticky slim nav. One-column stacks under 760px.

## Banned (in addition to impeccable's)
Side-stripe borders, gradient text, decorative glass, hero-metric template, identical card grids, modals. Decorative circles (a specific client hate). Stock-photo energy.
