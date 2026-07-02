# PRODUCT.md — Taylormade Creative Print

**Register:** brand. This is the marketing landing page at print.taylormadecreative.net that Nelson sends to prospective print clients. The design *is* the product.

## What it is
A premium print + event-branding studio site with one job: make a prospect think "this operates at a higher level than any printer or freelancer I've talked to" and start an order. It is print-only. The studio's social-media service lives on a separate site (social.taylormadecreative.net); this page links to it once, in passing, and never sells it.

The centerpiece is a **public order desk** (no login required): a new client picks a product, enters specs, uploads their artwork, and submits. The submission (files + details) lands in Supabase and pings Nelson by email. Existing clients use the separate portal (`/portal/`) to reorder, approve proofs, and track jobs.

## Who it's for
Brands and operators **with budget who want to look premium**: small businesses, realtors, founders, beauty/DTC, home-services, event/vendor brands, anywhere (remote studio, nationwide shipping). They are almost always on a phone. They win on proof, taste, and ease, not on price or claims.

## Voice
First person, warm, confident, partnership-not-vendor. "I design it right, print it on premium stocks, and make sure it lands looking like a brand." Never corporate, never salesy. Soft closes. Not a personal-brand page: the work and the two print services (products + event branding) are the subject, not the founder.

## Hard rules (do not violate)
- **Print + event branding only.** No social/video/AI/web/app services sold on this page.
- **Never name the supply chain.** The print supplier ("4over") is never named in any client-facing text.
- **Pricing:** only the approved "From $X" starting points already in the price list. No other pricing. Every job is "quoted to your exact size and quantity."
- **No Dallas / Fort Worth / DFW / location framing.** Remote studio, nationwide shipping.
- **No photos of Nelson and no About/founder section.**
- **Banned words:** cheap, discount, budget-friendly, "it's easy," quick turnaround. **No em dashes.**
- **Real work only.** Genuine clients named in the trust strip: World of Baths, Arena Group, Panty Cakes.

## The order flow (functional spec)
- Public form posts to Supabase project `pgqdmnmessbbzyszjfvr`:
  - Files upload to the private `quote-art` bucket (insert-only for anon; no public read).
  - A row inserts into `public.print_quotes` (anon insert-only, status `new`; admins read/manage). Human-readable `ref` like `TC-XXXXXX`.
  - Best-effort email notification via FormSubmit to taylormademd@gmail.com.
- The publishable/anon Supabase key in `js/site.js` is intentionally public; it is RLS-protected and can only insert, never read others' submissions.
- `scripts/print-check.mjs` surfaces new quote requests to Nelson in the daily automation alongside portal orders.

## Conversion psychology (build for the money client)
- Outcome-framed headline ("Print people keep").
- Social proof + authority via the trust strip and the 14-years promise.
- One clear primary CTA throughout: "Start your order."
- Low-friction upload flow so a phone user can finish in about a minute.

## Anti-references (do not look like these)
Generic SaaS landing pages. Fiverr/Upwork freelancer pages. Templated agency/Squarespace print sites. Vistaprint-style bargain print. Navy-and-gold cliche. Anything that reads "AI made that."
