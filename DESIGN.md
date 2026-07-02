# DESIGN.md — Taylormade Creative Print

## Register & strategy
Brand register, print-atelier direction. The page reads like a **specimen sheet / print order ticket**: warm paper surface, editorial Fraunces display, tactile detailing (perforated ticket edge, dotted price leaders, rotated print-piece "polaroids", paper grain). Color strategy is **committed**: paper carries most of the surface, one rubine magenta does the accent and CTA work, with an ink near-black for the order desk and a magenta-deep drench for the events + closing sections. Not the old Bold-Pop three-color version; not a template; not a deck.

## Color (OKLCH-tinted; never #000/#fff)
- `--paper`        #FAF5EC  /* warm off-white, page surface */
- `--paper-2`      #F2EADB  /* raised warm panels (how-it-works) */
- `--paper-bright` #FFFDF6  /* photo frames, inputs */
- `--ink`          #221419  /* warm near-black: order desk, footer, text */
- `--ink-2`        #3A2530  /* hover on ink */
- `--ink-soft`     #6E5C63  /* secondary text */
- `--magenta`      #C42463  /* accent, CTA, eyebrows */
- `--magenta-deep` #99164A  /* events + closing CTA drench, hover */
- `--blue`         #2E5BFF  /* logo dot + registration-mark ghost only */
- `--yellow`       #FFD23F  /* on-magenta eyebrow/ticks + closing accent word */
- `--on-magenta`   #FFF7EE  /* text on magenta surfaces */
Magenta owns the accent role; don't flood it. On the magenta-deep sections, eyebrows/ticks/accent word go yellow, body goes warm-white.

## Type
- **Display:** Fraunces (soft, wonky optical axis), ~580 weight, italic for accent words ("keep.", "they can't miss."). Hero clamp(2.9rem, 9.4vw, 6.4rem), section heads clamp(1.9rem, 4.4vw, 3rem).
- **Body / UI:** Space Grotesk (400–700). Body capped ~56ch. Eyebrows are uppercase Space Grotesk with letter-spacing.
- Weight + color + the display/sans contrast do the hierarchy work.

## Motion (Emil + taste)
- Transform/opacity only, custom ease-out `cubic-bezier(.23,1,.32,1)`. No bounce, no elastic. UI transitions < 320ms.
- Hero: staggered load-in rise + a one-shot "registration mark" reveal (blue/magenta misprint ghosts converge into the headline), reduced-motion guarded.
- Scroll reveals via IntersectionObserver, staggered. Marquee is a linear infinite band. Buttons scale 0.97 on press; nav underline wipes; sticky mobile CTA slides up after the hero and hides over the order desk.
- `prefers-reduced-motion`: all of it collapses to static.

## Layout
- Mobile-first, one column under ~720–1000px. Sticky slim nav, animated hamburger full-sheet menu.
- Hero: asymmetric split, copy left, stacked rotated print pieces right (hidden on mobile).
- Price list is a **specimen list** (photo thumb + name + dotted leader + "From $X"), grouped by category, rows link into the order form and preselect the product. Not a card grid.
- Order desk is a **ticket**: perforated top, numbered fieldsets (01/02/03), product photos as a scroll-snapping chip row (grid on desktop), a dropzone with per-file progress, and a success ticket with a `TC-XXXX` ref.

## Banned (in addition to impeccable's)
Photos of Nelson, any About/founder section, any service beyond print + event branding. The old Bold-Pop / black-gold registers. Side-stripe borders, gradient text, decorative glass, hero-metric template, identical card grids, modals, em dashes, pricing beyond the approved "From $X" list, any named supplier.
