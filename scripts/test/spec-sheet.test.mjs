import { test } from "node:test";
import assert from "node:assert/strict";
import { renderSpecSheet } from "../lib/spec-sheet.mjs";

const base = {
  order_no: 7, client_name: "Panty Cakes", product: "Business cards",
  quantity: 250, specs: { size: "3.5 x 2 in", stock: "16pt matte", sides: "double-sided" },
  notes: "Pink foil if possible", created_at: "2026-06-08T12:00:00Z",
  art: [{ name: "card.pdf", signed_url: "https://example.com/card.pdf" }],
};

test("includes product, quantity, and client name", () => {
  const html = renderSpecSheet(base);
  assert.match(html, /Business cards/);
  assert.match(html, /250/);
  assert.match(html, /Panty Cakes/);
});

test("never names the supplier", () => {
  assert.doesNotMatch(renderSpecSheet(base).toLowerCase(), /4over|fourover/);
});

test("shows awaiting sign-off when not signed", () => {
  assert.match(renderSpecSheet({ ...base, client_signed_off: false }), /Awaiting client sign-off/);
});

test("shows cleared to place when signed off", () => {
  assert.match(renderSpecSheet({ ...base, client_signed_off: true }), /cleared to place/i);
});

test("escapes html in client notes", () => {
  const html = renderSpecSheet({ ...base, notes: "<script>x</script>" });
  assert.doesNotMatch(html, /<script>x<\/script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("links each art file by signed url", () => {
  assert.match(renderSpecSheet(base), /href="https:\/\/example\.com\/card\.pdf"/);
});

test("blocks non-http(s) art urls (no javascript: scheme)", () => {
  const html = renderSpecSheet({ ...base, art: [{ name: "x.pdf", signed_url: "javascript:alert(1)" }] });
  assert.doesNotMatch(html, /javascript:/i);
  assert.match(html, /href="#"/);
});
