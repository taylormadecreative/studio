// Quick status check for the daily automation: what needs prepping, what's ready to place.
// Read-only; safe to run any time. Prints a human line + JSON for the agent.
import { adminClient } from "./lib/supabase-admin.mjs";

const sb = adminClient();

const { data, error } = await sb
  .from("print_orders")
  .select("order_no, status, client_signed_off, prepped_at, clients(name)")
  .not("status", "in", '("shipped","cancelled")');
if (error) { console.error("Check failed:", error.message); process.exit(1); }

const orders = data || [];
const needsPrep = orders.filter((o) => !o.prepped_at && ["submitted", "in_review", "client_signoff", "approved_to_print"].includes(o.status));
const readyToPlace = orders.filter((o) => o.status === "approved_to_print" && o.client_signed_off);
const inFlight = orders.filter((o) => ["sent_to_4over", "printing"].includes(o.status));

const line = (o) => `#${o.order_no} ${o.clients?.name || "?"} (${o.status})`;
console.log(`needs_prep: ${needsPrep.length}${needsPrep.length ? " — " + needsPrep.map(line).join(", ") : ""}`);
console.log(`ready_to_place: ${readyToPlace.length}${readyToPlace.length ? " — " + readyToPlace.map(line).join(", ") : ""}`);
console.log(`in_production: ${inFlight.length}${inFlight.length ? " — " + inFlight.map(line).join(", ") : ""}`);
console.log(JSON.stringify({
  needs_prep: needsPrep.map((o) => ({ order_no: o.order_no, client: o.clients?.name, status: o.status })),
  ready_to_place: readyToPlace.map((o) => ({ order_no: o.order_no, client: o.clients?.name })),
  in_production: inFlight.length,
  action_needed: needsPrep.length + readyToPlace.length > 0,
}));
