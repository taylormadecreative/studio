function escapeHtml(s) {
  return (s == null ? "" : String(s)).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// Only allow http(s) links; anything else (javascript:, data:, etc.) collapses to "#".
function safeUrl(u) {
  const s = (u == null ? "" : String(u)).trim();
  return /^https?:\/\//i.test(s) ? s : "#";
}

export function renderSpecSheet(order) {
  const s = order.specs || {};
  const files = order.art || [];
  const artItems = files.length
    ? files.map((a) => `<li><a href="${escapeHtml(safeUrl(a.signed_url))}">${escapeHtml(a.name)}</a></li>`).join("")
    : "<li>No files attached</li>";
  const row = (label, val) => `<tr><th>${label}</th><td>${escapeHtml(val ?? "") || "&mdash;"}</td></tr>`;
  const signed = !!order.client_signed_off;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Print Order #${escapeHtml(order.order_no)} &mdash; ${escapeHtml(order.client_name)}</title>
<style>
  :root{--gold:#c9a227;--ink:#111}
  *{box-sizing:border-box}
  body{font:15px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:var(--ink);background:#fff;margin:0;padding:48px}
  .sheet{max-width:720px;margin:0 auto}
  .top{display:flex;justify-content:space-between;align-items:baseline;border-bottom:3px solid var(--gold);padding-bottom:12px;margin-bottom:24px}
  .brand{font-weight:800;letter-spacing:.04em;text-transform:uppercase}
  .ono{font-weight:800;font-size:1.4rem}
  h2{font-size:.85rem;text-transform:uppercase;letter-spacing:.08em;color:#666;margin:24px 0 8px}
  table{width:100%;border-collapse:collapse}
  th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #eee;vertical-align:top}
  th{width:170px;color:#666;font-weight:600}
  .notes{background:#faf7ec;border-left:3px solid var(--gold);padding:12px 14px;white-space:pre-wrap}
  ul{margin:6px 0 0;padding-left:20px}
  .signoff{margin-top:24px;font-weight:700}
  .signoff.yes{color:#2e7d32}.signoff.no{color:#b26a00}
  @media print{body{padding:0}}
</style></head>
<body><div class="sheet">
  <div class="top">
    <span class="brand">Taylormade &middot; Print &amp; Production</span>
    <span class="ono">Order #${escapeHtml(order.order_no)}</span>
  </div>
  <table>
    ${row("Client", order.client_name)}
    ${row("Product", order.product)}
    ${row("Quantity", order.quantity)}
    ${row("Size", s.size)}
    ${row("Stock / finish", s.stock)}
    ${row("Sides &amp; color", s.sides)}
    ${row("Submitted", order.created_at ? new Date(order.created_at).toLocaleString() : "")}
  </table>
  ${order.notes ? `<h2>Client notes</h2><div class="notes">${escapeHtml(order.notes)}</div>` : ""}
  <h2>Artwork (${files.length} file${files.length === 1 ? "" : "s"})</h2>
  <ul>${artItems}</ul>
  <div class="signoff ${signed ? "yes" : "no"}">
    ${signed ? "&#10003; Client has signed off &mdash; cleared to place." : "&#9203; Awaiting client sign-off &mdash; do not place yet."}
  </div>
</div></body></html>`;
}
