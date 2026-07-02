// Quick status check for the daily automation: what needs prepping, what's ready to place.
// Read-only; safe to run any time. Prints a human line + JSON for the agent.
import { adminClient } from "./lib/supabase-admin.mjs";

const sb = adminClient();

const { data, error } = await sb
  .from("print_orders")
  .select("order_no, status, client_signed_off, prepped_at, clients(name)")
  .not("status", "in", '("shipped","cancelled")');
if (error) { console.error("Check failed:", error.message); process.exit(1); }

const { data: quoteData, error: quoteError } = await sb
  .from("print_quotes")
  .select("quote_no, ref, name, business, email, product, quantity, deadline, art_paths, created_at")
  .eq("status", "new")
  .order("created_at", { ascending: false });
if (quoteError) { console.error("Quote check failed:", quoteError.message); process.exit(1); }
const newQuotes = quoteData || [];

const orders = data || [];
const needsPrep = orders.filter((o) => !o.prepped_at && ["submitted", "in_review", "client_signoff", "approved_to_print"].includes(o.status));
const readyToPlace = orders.filter((o) => o.status === "approved_to_print" && o.client_signed_off);
const inFlight = orders.filter((o) => ["sent_to_4over", "printing"].includes(o.status));

const line = (o) => `#${o.order_no} ${o.clients?.name || "?"} (${o.status})`;
const quoteLine = (q) => `${q.ref || "#" + q.quote_no} ${q.name}${q.business ? " (" + q.business + ")" : ""} · ${q.product}${q.quantity ? " x" + q.quantity : ""}${(q.art_paths || []).length ? " · " + q.art_paths.length + " file(s)" : ""}`;
console.log(`needs_prep: ${needsPrep.length}${needsPrep.length ? " — " + needsPrep.map(line).join(", ") : ""}`);
console.log(`ready_to_place: ${readyToPlace.length}${readyToPlace.length ? " — " + readyToPlace.map(line).join(", ") : ""}`);
console.log(`in_production: ${inFlight.length}${inFlight.length ? " — " + inFlight.map(line).join(", ") : ""}`);
console.log(`new_quote_requests: ${newQuotes.length}${newQuotes.length ? " — " + newQuotes.map(quoteLine).join(", ") : ""}`);
console.log(JSON.stringify({
  needs_prep: needsPrep.map((o) => ({ order_no: o.order_no, client: o.clients?.name, status: o.status })),
  ready_to_place: readyToPlace.map((o) => ({ order_no: o.order_no, client: o.clients?.name })),
  in_production: inFlight.length,
  new_quotes: newQuotes.map((q) => ({ quote_no: q.quote_no, ref: q.ref, name: q.name, email: q.email, product: q.product, files: (q.art_paths || []).length })),
  action_needed: needsPrep.length + readyToPlace.length + newQuotes.length > 0,
}));
