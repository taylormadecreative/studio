export function clientSlug(name) {
  const s = (name ?? "").toString().toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "client";
}

export function safeFileName(name) {
  return (name ?? "file").toString().replace(/[^\w.\-]/g, "_");
}

function csvCell(v) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function ordersToCsv(orders) {
  const headers = ["order_no", "client", "product", "quantity", "size", "stock", "sides", "status", "signed_off", "prepped_at", "created_at"];
  const rows = orders.map((o) => {
    const s = o.specs || {};
    return [
      o.order_no, o.client_name, o.product, o.quantity,
      s.size || "", s.stock || "", s.sides || "",
      o.status, o.client_signed_off ? "yes" : "no",
      o.prepped_at || "", o.created_at || "",
    ].map(csvCell).join(",");
  });
  return [headers.join(","), ...rows].join("\n") + "\n";
}

export function buildManifest(entries, generatedAt) {
  return { generated_at: generatedAt, order_count: entries.length, orders: entries };
}
