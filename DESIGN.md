# DESIGN.md — Taylormade Creative

## Register & strategy
Brand register. Color strategy: **Bold Pop, full palette** — a warm off-white surface carries the page, and three saturated pops (electric blue, hot pink, sunny yellow) each play a deliberate role. Colorful and fun, but disciplined and spacious so it reads premium, not chaotic. Color-blocked full-bleed sections for the two services (blue = social, pink = print), near-black for the portal and closing CTA. Big confident display type, generous negative space, playful rotated cards/chips and soft blobs. Not a deck, not a template, not the old black/gold version.

## Color (hex are the approved brand swatches; never #000/#fff)
- `--paper`   #FAF7F2   /* warm off-white, page surface */
- `--paper-2` #F1EBDF   /* raised warm panels */
- `--ink`     #121318   /* near-black: text, portal, CTA */
- `--ink-soft`#4A4C56   /* secondary text */
- `--blue`    #2E5BFF (deep #1E42D6)   /* social block, primary CTA, links */
- `--pink`    #FF4FA3 (deep #E23A8B)   /* print block, accents */
- `--yellow`  #FFD23F (deep #EFBC1C)   /* highlights, CTA-on-dark, energy */
Each color owns a role; don't flood. On the blue block use white text; on the pink block use ink text (contrast). Accent words use a soft same-color underline highlight (`.hl`).

## Type
- **Display:** Bricolage Grotesque (700/800). Hero + section headers, tight tracking.
- **Body / UI:** Space Grotesk (400–700). Body capped ~54ch.
- **Serif accent:** Fraunces (italic) for the occasional emphasis word only.
- Scale ratio ≥ 1.25. Hero display clamp(2.7rem, 7.2vw, 6.2rem). Weight + color do the hierarchy work.

## Motion (Emil + taste)
- Transitions on transform/opacity only. Custom ease-out `cubic-bezier(.23,1,.32,1)`. No bounce, no elastic. < 320ms for UI.
- Entrances: subtle rise + fade on scroll (IntersectionObserver), staggered, `prefers-reduced-motion` guarded.
- Micro: scale-on-press 0.97 for buttons, underline wipes on nav links, kinetic marquee, soft pulse on the scarcity dot. Hardware-accelerated.

## Layout
- Full-bleed color-blocked sections; asymmetric service rows (zig-zag, copy + floating-image/chip art). Vary spacing for rhythm. No reflex card grids; work gallery is a masonry (CSS columns).
- Real client photos only, shown as rotated bordered cards on the social block and in the work gallery (lightbox on click).
- Mobile-first. Sticky slim nav with animated hamburger sheet. One-column stacks under 860px; hero side-cards hidden on mobile.

## Banned (in addition to impeccable's)
Photos of Nelson, any About/founder section, any service beyond social + print. Black/gold (the old register). Side-stripe borders, gradient text, decorative glass, hero-metric template, identical card grids, modals, em dashes, pricing.
