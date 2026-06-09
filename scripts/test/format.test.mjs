import { test } from "node:test";
import assert from "node:assert/strict";
import { clientSlug, safeFileName, ordersToCsv, buildManifest } from "../lib/format.mjs";

test("clientSlug lowercases and hyphenates", () => {
  assert.equal(clientSlug("Panty Cakes"), "panty-cakes");
  assert.equal(clientSlug("  Arena Group!! "), "arena-group");
  assert.equal(clientSlug(""), "client");
});

test("safeFileName strips unsafe chars but keeps dots and dashes", () => {
  assert.equal(safeFileName("my art (final).pdf"), "my_art__final_.pdf");
});

test("ordersToCsv writes header and escapes commas/quotes", () => {
  const csv = ordersToCsv([{
    order_no: 1, client_name: "A, B", product: 'C"D', quantity: 10,
    specs: { size: "3x2" }, status: "submitted", client_signed_off: false,
    prepped_at: null, created_at: "2026-01-01",
  }]);
  const lines = csv.trim().split("\n");
  assert.equal(lines[0], "order_no,client,product,quantity,size,stock,sides,status,signed_off,prepped_at,created_at");
  assert.match(lines[1], /"A, B"/);
  assert.match(lines[1], /"C""D"/);
  assert.match(lines[1], /,no,/);
});

test("buildManifest wraps entries with count and timestamp", () => {
  const m = buildManifest([{ order_no: 1 }, { order_no: 2 }], "2026-06-08T00:00:00Z");
  assert.equal(m.order_count, 2);
  assert.equal(m.generated_at, "2026-06-08T00:00:00Z");
  assert.equal(m.orders.length, 2);
});
