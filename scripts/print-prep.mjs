import { mkdir, writeFile, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { adminClient } from "./lib/supabase-admin.mjs";
import { clientSlug, safeFileName, ordersToCsv, buildManifest } from "./lib/format.mjs";
import { renderSpecSheet } from "./lib/spec-sheet.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const STAGING = join(__dir, "staging");
const ART_BUCKET = "print-art";
const SIGNED_TTL = 60 * 60 * 24 * 7; // 7 days

const generatedAt = new Date().toISOString();
const sb = adminClient();

// 1. pending orders, with client name joined
const { data: pending, error: pErr } = await sb
  .from("print_orders")
  .select("*, clients(name)")
  .is("prepped_at", null)
  .in("status", ["submitted", "in_review"])
  .order("created_at", { ascending: true });
if (pErr) { console.error("Query failed:", pErr.message); process.exit(1); }

await mkdir(STAGING, { recursive: true });

const entries = [];
for (const o of (pending || [])) {
  if (o.clients == null && o.client_id != null) {
    console.warn(`⚠ Order #${o.order_no}: client ${o.client_id} did not resolve (check FK / RLS) — labeling "Unknown client".`);
  }
  const clientName = o.clients?.name || "Unknown client";
  const slug = clientSlug(clientName);
  const dir = join(STAGING, `${o.order_no}_${slug}`);
  const entry = {
    id: o.id, order_no: o.order_no, client_name: clientName, client_id: o.client_id,
    product: o.product, status: o.status, client_signed_off: !!o.client_signed_off,
    staging_dir: dir, art: [], errors: [],
  };
  try {
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    for (const path of (o.art_paths || [])) {
      const base = safeFileName(path.split("/").pop() || "file");
      try {
        const { data: blob, error: dErr } = await sb.storage.from(ART_BUCKET).download(path);
        if (dErr) throw dErr;
        const buf = Buffer.from(await blob.arrayBuffer());
        await writeFile(join(dir, base), buf);
        const { data: signed } = await sb.storage.from(ART_BUCKET).createSignedUrl(path, SIGNED_TTL);
        entry.art.push({ name: base, storage_path: path, signed_url: signed?.signedUrl || null });
      } catch (e) {
        entry.errors.push(`art ${base}: ${e.message || e}`);
      }
    }
    await writeFile(join(dir, "spec-sheet.html"), renderSpecSheet({ ...o, client_name: clientName, art: entry.art }));
    entry.spec_sheet = join(dir, "spec-sheet.html");
  } catch (e) {
    entry.errors.push(`order: ${e.message || e}`);
  }
  entries.push(entry);
}

// 2. full snapshot CSV of all orders
const { data: all, error: aErr } = await sb
  .from("print_orders").select("*, clients(name)").order("order_no", { ascending: true });
if (aErr) { console.error("Snapshot query failed:", aErr.message); process.exit(1); }
const flat = (all || []).map((o) => ({ ...o, client_name: o.clients?.name || "" }));
await writeFile(join(STAGING, "print-orders-log.csv"), ordersToCsv(flat));

// 3. manifest
await writeFile(join(STAGING, "manifest.json"), JSON.stringify(buildManifest(entries, generatedAt), null, 2));

// 4. summary
const ok = entries.filter((e) => e.errors.length === 0).length;
console.log(`Prepped ${ok}/${entries.length} order(s). Staging: ${STAGING}`);
for (const e of entries) {
  console.log(` #${e.order_no} ${e.client_name} — ${e.art.length} file(s)${e.errors.length ? " ⚠ " + e.errors.join("; ") : ""}`);
}
console.log(`Log snapshot: ${join(STAGING, "print-orders-log.csv")}`);
console.log(`Manifest:     ${join(STAGING, "manifest.json")}`);
