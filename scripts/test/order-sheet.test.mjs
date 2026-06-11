import { test } from "node:test";
import assert from "node:assert/strict";
import { renderOrderSheet, findMapping } from "../lib/order-sheet.mjs";

const base = {
  order_no: 3, client_name: "Panty Cakes", product: "Business cards",
  quantity: 500, specs: { size: "3.5 x 2 in", stock: "16pt matte", sides: "double-sided" },
  notes: "Match brand pink", client_signed_off: true,
  art: [{ name: "card.pdf" }],
};

test("findMapping matches portal product names", () => {
  assert.equal(findMapping("Business cards").name, "Standard Business Cards");
  assert.equal(findMapping("Stickers / labels").name, "Standard Stickers");
  assert.equal(findMapping("Yard signs").name, "4mm Coroplast Signs");
  assert.equal(findMapping("Door hangers"), null);
});

test("is clearly marked internal", () => {
  assert.match(renderOrderSheet(base), /do not send to client/i);
});

test("includes the 4over preset options and configurator link", () => {
  const html = renderOrderSheet(base);
  assert.match(html, /16PT C2S/);
  assert.match(html, /4over\.com\/standard-business-cards/);
});

test("shows cleared-to-place only when signed off", () => {
  assert.match(renderOrderSheet({ ...base, client_signed_off: true }), /CLEARED TO PLACE/);
  assert.match(renderOrderSheet({ ...base, client_signed_off: false }), /do NOT place/);
});

test("escapes html in client-supplied fields", () => {
  const html = renderOrderSheet({ ...base, notes: "<script>x</script>" });
  assert.doesNotMatch(html, /<script>x<\/script>/);
});

test("unmapped products get manual-configure fallback", () => {
  assert.match(renderOrderSheet({ ...base, product: "Door hangers" }), /No preset mapping/);
});
