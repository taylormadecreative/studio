// INTERNAL 4over order sheet — never client-facing, never uploaded anywhere public.
// Maps a portal order to the exact 4over configurator selections so placing takes a minute.

export const PRODUCT_MAP = [
  {
    match: /business\s*card/i,
    name: "Standard Business Cards",
    url: "https://4over.com/standard-business-cards",
    options: ['Size: 2" x 3.5" (US Standard)', "Shape: Rectangle", "Stock: 16PT C2S", "Colorspec: 4/4 (4 color both sides)", "Coating: Matte", "Spot UV: No Spot UV"],
    wholesale: "100 = $5.08 · 250 = $12.70 · 500 = $25.40 · 1000 = $30.23",
    retail: "From $49 (500)",
  },
  {
    match: /flyer/i,
    name: "Flat Flyers & Brochures (no fold)",
    url: "https://4over.com/flat-flyers-brochures",
    options: ['Size: 8.5" x 11"', "Stock: 100LB Gloss Book", "Colorspec: 4/4", "Coating: Aqueous", "Folding: FLAT - No Folding"],
    wholesale: "100 = $36.65 · 250 = $57.07 · 500 = $95.05 · 1000 = $114.02",
    retail: "From $79 (100)",
  },
  {
    match: /postcard/i,
    name: "14pt Postcards",
    url: "https://4over.com/14pt-postcards",
    options: ['Size: 4" x 6"', "Shape: Rectangle", "Stock: 14PT C2S", "Colorspec: 4/4", "Coating: Matte", "Scoring: No Scoring", "Bundling: No Bundling Services"],
    wholesale: "250 = $35.81 · 500 = $49.08 · 1000 = $56.77",
    retail: "From $89 (500)",
  },
  {
    match: /poster/i,
    name: "Photo Gloss Posters",
    url: "https://4over.com/photo-gloss-posters",
    options: ['Size: 18 x 24 (set width/height dropdowns)', "Stock: 8mil Photo Poster - Gloss", "Colorspec: 4/0"],
    wholesale: "18x24 = $8.79 each",
    retail: 'From $35 (18x24")',
  },
  {
    match: /brochure|booklet/i,
    name: "Flyers & Brochures + folding (folded product)",
    url: "https://4over.com/marketing-products/flyers-brochures",
    options: ['Size: 8.5" x 11"', "Stock: 100LB Gloss Book", "Colorspec: 4/4", "Folding: Letter/Tri-fold (pick folded product)"],
    wholesale: "~$90 / 250 (flat 250 = $57.07 + fold; confirm in configurator)",
    retail: "From $179 (250)",
  },
  {
    match: /pop.?up|retractable|banner(?!.*yard)/i,
    name: "Standard Retractable Banner Stands",
    url: "https://4over.com/standard-retractable-banner-stands",
    options: ['Size: 33" x 80"', "Stock: 10mil Polypropylene - Indoor", "Colorspec: 4/0 (single-sided)"],
    wholesale: "$93.28 each (stand included)",
    retail: "From $169",
  },
  {
    match: /step.*repeat|backdrop/i,
    name: "Telescopic Backdrop Banner Stands",
    url: "https://4over.com/telescopic-backdrop-banner-stands",
    options: ['Size: 95" x 96" (8x8 ft)', "Stock: 13oz Scrim Vinyl - Outdoor", "Colorspec: 4/0"],
    wholesale: "$206.70 each",
    retail: "From $399 (8x8 ft)",
  },
  {
    match: /sticker|label/i,
    name: "Standard Stickers",
    url: "https://4over.com/standard-stickers",
    options: ['Size: 2" x 2" (adjust to request)', "Stock: 4MIL Matte Vinyl", "Colorspec: 4/0", "Coating: No Coating"],
    wholesale: "50 = $19.42 · 100 = $26.79 · 250 = $44.69 · 500 = $78.75",
    retail: "From $59 (100)",
  },
  {
    match: /yard\s*sign/i,
    name: "4mm Coroplast Signs",
    url: "https://4over.com/4coro-coroplast-signs",
    options: ['Size: 18 x 24 (set width/height dropdowns)', "Stock: 4mm White Coroplast", "Colorspec: 4/0"],
    wholesale: '18x24 = $4.95 each',
    retail: 'From $29 (18x24")',
  },
];

export function findMapping(product) {
  return PRODUCT_MAP.find((m) => m.match.test(product || "")) || null;
}

function escapeHtml(s) {
  return (s == null ? "" : String(s)).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export function renderOrderSheet(order) {
  const s = order.specs || {};
  const map = findMapping(order.product);
  const signed = !!order.client_signed_off;
  const files = order.art || [];
  const li = (t) => `<li>${escapeHtml(t)}</li>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>INTERNAL Order Sheet #${escapeHtml(order.order_no)}</title>
<style>
  body{font:15px/1.55 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#121318;background:#fff;margin:0;padding:40px}
  .sheet{max-width:680px;margin:0 auto}
  .internal{background:#121318;color:#FFD23F;font-weight:800;letter-spacing:.06em;text-transform:uppercase;font-size:.8rem;padding:.55rem .9rem;border-radius:8px;display:inline-block;margin-bottom:18px}
  h1{font-size:1.5rem;margin:.2rem 0 1rem}
  h2{font-size:.82rem;text-transform:uppercase;letter-spacing:.08em;color:#666;margin:22px 0 6px}
  table{width:100%;border-collapse:collapse}
  th,td{text-align:left;padding:7px 9px;border-bottom:1px solid #eee;vertical-align:top}
  th{width:160px;color:#666;font-weight:600}
  ul{margin:6px 0 0;padding-left:20px}
  a{color:#2E5BFF}
  .go{display:inline-block;background:#2E5BFF;color:#fff;font-weight:700;padding:.6rem 1rem;border-radius:999px;text-decoration:none;margin-top:8px}
  .gate{margin-top:20px;font-weight:700;padding:.8rem 1rem;border-radius:10px}
  .gate.ok{background:#e7f6ec;color:#2e7d32}
  .gate.no{background:#fdf1e3;color:#b26a00}
</style></head>
<body><div class="sheet">
  <span class="internal">Internal &middot; supplier sheet &middot; do not send to client</span>
  <h1>Order #${escapeHtml(order.order_no)} &mdash; ${escapeHtml(order.product)} (${escapeHtml(order.client_name)})</h1>
  <table>
    <tr><th>Quantity</th><td>${escapeHtml(order.quantity)}</td></tr>
    <tr><th>Requested size</th><td>${escapeHtml(s.size ?? "") || "&mdash;"}</td></tr>
    <tr><th>Requested stock</th><td>${escapeHtml(s.stock ?? "") || "&mdash;"}</td></tr>
    <tr><th>Sides &amp; color</th><td>${escapeHtml(s.sides ?? "") || "&mdash;"}</td></tr>
    <tr><th>Client notes</th><td>${escapeHtml(order.notes ?? "") || "&mdash;"}</td></tr>
  </table>
  ${map ? `
  <h2>4over preset &mdash; ${escapeHtml(map.name)}</h2>
  <ul>${map.options.map(li).join("")}</ul>
  <h2>Wholesale anchor (verified Jun 2026)</h2>
  <p>${escapeHtml(map.wholesale)}<br>Site retail: <b>${escapeHtml(map.retail)}</b></p>
  <a class="go" href="${escapeHtml(map.url)}">Open configurator &rarr;</a>
  ` : `
  <h2>No preset mapping</h2>
  <p>Configure manually at <a href="https://4over.com">4over.com</a>. Adjust to the requested specs above.</p>
  `}
  <h2>Art files (${files.length})</h2>
  <ul>${files.length ? files.map((a) => li(a.name)).join("") : "<li>None attached</li>"}</ul>
  <div class="gate ${signed ? "ok" : "no"}">
    ${signed ? "&#10003; Client signed off — CLEARED TO PLACE." : "&#9203; NOT signed off yet — do NOT place this order."}
  </div>
</div></body></html>`;
}
