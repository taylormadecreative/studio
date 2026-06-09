# Print-Order Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a submitted print order in Supabase into a review-ready Google Drive package (art files + branded spec sheet) plus a refreshed orders log, with every human gate preserved.

**Architecture:** Two-part split. A deterministic local Node script (`scripts/print-prep.mjs`) reads pending orders with the Supabase service-role key, downloads art from the private `print-art` bucket, generates a one-page HTML spec sheet, mints 7-day signed URLs, and emits a `manifest.json` + CSV snapshot into `scripts/staging/`. Claude then follows `PRINT-PIPELINE.md` to push that staging output to Google Drive via the Drive MCP and stamp the rows via `scripts/print-stamp.mjs`. The script never advances status, sends a proof, or places an order.

**Tech Stack:** Node 25 (ESM, built-in `node --test`, `--env-file`), `@supabase/supabase-js` v2, Google Drive MCP, Supabase Storage + Postgres.

**Prerequisite (Nelson, one-time):** Get the **service-role** secret from the Supabase dashboard → Project `taylormade-studio` → Project Settings → API → `service_role` key. It will go into `scripts/.env` in Task 1. This key bypasses RLS and must never be committed.

---

## File structure

| File | Responsibility |
|---|---|
| `scripts/package.json` | ESM tooling manifest, deps, `test`/`prep`/`stamp` scripts |
| `scripts/.env.example` | Template for required env vars (committed) |
| `scripts/.env` | Real secrets (gitignored) |
| `scripts/lib/format.mjs` | Pure helpers: `clientSlug`, `safeFileName`, `ordersToCsv`, `buildManifest` |
| `scripts/lib/spec-sheet.mjs` | Pure `renderSpecSheet(order)` → branded HTML |
| `scripts/lib/supabase-admin.mjs` | `adminClient()` service-role factory |
| `scripts/print-prep.mjs` | Orchestrator: read pending → stage art + spec + signed URLs → manifest + CSV |
| `scripts/print-stamp.mjs` | Stamp `prepped_at` + Drive link after upload |
| `scripts/test/format.test.mjs` | Unit tests for format helpers |
| `scripts/test/spec-sheet.test.mjs` | Unit tests for spec sheet |
| `scripts/test/supabase-admin.test.mjs` | Unit test for the missing-env guard |
| `supabase/migrations/2026-06-08-print-prep-columns.sql` | Adds `prepped_at`, `drive_folder_url`, `drive_folder_id` |
| `PRINT-PIPELINE.md` | The runbook Claude follows for the Drive half |

---

## Task 1: Scaffolding

**Files:**
- Create: `scripts/package.json`
- Create: `scripts/.env.example`
- Create: `scripts/.env` (local, gitignored)
- Modify: `.gitignore`

- [ ] **Step 1: Write `scripts/package.json`**

```json
{
  "name": "tc-print-pipeline",
  "private": true,
  "type": "module",
  "version": "1.0.0",
  "scripts": {
    "test": "node --test test/",
    "prep": "node --env-file=.env print-prep.mjs",
    "stamp": "node --env-file=.env print-stamp.mjs"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0"
  }
}
```

- [ ] **Step 2: Write `scripts/.env.example`**

```
SUPABASE_URL=https://pgqdmnmessbbzyszjfvr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=replace-with-service-role-secret-from-dashboard
```

- [ ] **Step 3: Create `scripts/.env`** (Nelson pastes the real service-role key)

```
SUPABASE_URL=https://pgqdmnmessbbzyszjfvr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<paste real service_role secret>
```

- [ ] **Step 4: Update `.gitignore`** to append these lines (keep existing `node_modules/`):

```
scripts/.env
scripts/staging/
```

- [ ] **Step 5: Install deps**

Run: `cd ~/taylormade-studio/scripts && npm install`
Expected: `added N packages` with no errors; `node_modules/` present (already gitignored).

- [ ] **Step 6: Verify the test runner works (no tests yet)**

Run: `cd ~/taylormade-studio/scripts && node --test test/ 2>&1 | tail -3 || true`
Expected: it reports no test files found (directory empty) — confirms the command path is right. Proceed.

- [ ] **Step 7: Commit**

```bash
cd ~/taylormade-studio
git add scripts/package.json scripts/package-lock.json scripts/.env.example .gitignore
git commit -m "Print pipeline: scaffolding (package.json, env template, gitignore)"
```

---

## Task 2: DB migration — prep columns

**Files:**
- Create: `supabase/migrations/2026-06-08-print-prep-columns.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Phase 3 print pipeline: idempotency + Drive package columns
alter table public.print_orders
  add column if not exists prepped_at timestamptz,
  add column if not exists drive_folder_url text,
  add column if not exists drive_folder_id text;
```

- [ ] **Step 2: Apply it**

Open the Supabase dashboard → project `taylormade-studio` → SQL Editor → paste the SQL above → Run.
Expected: "Success. No rows returned."

- [ ] **Step 3: Verify the columns exist**

In the SQL Editor run:

```sql
select column_name from information_schema.columns
where table_name = 'print_orders'
  and column_name in ('prepped_at','drive_folder_url','drive_folder_id')
order by column_name;
```

Expected: three rows — `drive_folder_id`, `drive_folder_url`, `prepped_at`.

- [ ] **Step 4: Commit**

```bash
cd ~/taylormade-studio
git add supabase/migrations/2026-06-08-print-prep-columns.sql
git commit -m "Print pipeline: add prepped_at + drive_folder columns to print_orders"
```

---

## Task 3: `format.mjs` helpers (TDD)

**Files:**
- Create: `scripts/test/format.test.mjs`
- Create: `scripts/lib/format.mjs`

- [ ] **Step 1: Write the failing tests**

`scripts/test/format.test.mjs`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/taylormade-studio/scripts && node --test test/format.test.mjs`
Expected: FAIL — cannot find module `../lib/format.mjs`.

- [ ] **Step 3: Write `scripts/lib/format.mjs`**

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/taylormade-studio/scripts && node --test test/format.test.mjs`
Expected: PASS — 4 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
cd ~/taylormade-studio
git add scripts/lib/format.mjs scripts/test/format.test.mjs
git commit -m "Print pipeline: format helpers (slug, filename, csv, manifest)"
```

---

## Task 4: `spec-sheet.mjs` renderer (TDD)

**Files:**
- Create: `scripts/test/spec-sheet.test.mjs`
- Create: `scripts/lib/spec-sheet.mjs`

- [ ] **Step 1: Write the failing tests**

`scripts/test/spec-sheet.test.mjs`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/taylormade-studio/scripts && node --test test/spec-sheet.test.mjs`
Expected: FAIL — cannot find module `../lib/spec-sheet.mjs`.

- [ ] **Step 3: Write `scripts/lib/spec-sheet.mjs`**

```js
function escapeHtml(s) {
  return (s == null ? "" : String(s)).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export function renderSpecSheet(order) {
  const s = order.specs || {};
  const files = order.art || [];
  const artItems = files.length
    ? files.map((a) => `<li><a href="${escapeHtml(a.signed_url || "#")}">${escapeHtml(a.name)}</a></li>`).join("")
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/taylormade-studio/scripts && node --test test/spec-sheet.test.mjs`
Expected: PASS — 6 tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
cd ~/taylormade-studio
git add scripts/lib/spec-sheet.mjs scripts/test/spec-sheet.test.mjs
git commit -m "Print pipeline: branded HTML spec sheet renderer"
```

---

## Task 5: `supabase-admin.mjs` factory (TDD on the guard)

**Files:**
- Create: `scripts/test/supabase-admin.test.mjs`
- Create: `scripts/lib/supabase-admin.mjs`

- [ ] **Step 1: Write the failing test**

`scripts/test/supabase-admin.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { adminClient } from "../lib/supabase-admin.mjs";

test("adminClient throws a clear error when env is missing", () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    assert.throws(() => adminClient(), /Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/);
  } finally {
    if (url) process.env.SUPABASE_URL = url;
    if (key) process.env.SUPABASE_SERVICE_ROLE_KEY = key;
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/taylormade-studio/scripts && node --test test/supabase-admin.test.mjs`
Expected: FAIL — cannot find module `../lib/supabase-admin.mjs`.

- [ ] **Step 3: Write `scripts/lib/supabase-admin.mjs`**

```js
import { createClient } from "@supabase/supabase-js";

export function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (set scripts/.env)");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/taylormade-studio/scripts && node --test test/supabase-admin.test.mjs`
Expected: PASS — 1 test, 0 failures.

- [ ] **Step 5: Run the full suite**

Run: `cd ~/taylormade-studio/scripts && npm test`
Expected: PASS — all tests across the three files (11 total), 0 failures.

- [ ] **Step 6: Commit**

```bash
cd ~/taylormade-studio
git add scripts/lib/supabase-admin.mjs scripts/test/supabase-admin.test.mjs
git commit -m "Print pipeline: service-role Supabase client factory"
```

---

## Task 6: `print-prep.mjs` orchestrator

**Files:**
- Create: `scripts/print-prep.mjs`

This task is integration code (it talks to live Supabase). It is verified in Task 8 against a seeded order. Here we just write it.

- [ ] **Step 1: Write `scripts/print-prep.mjs`**

```js
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

const entries = [];
for (const o of pending) {
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
      const base = safeFileName(path.split("/").pop());
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
await mkdir(STAGING, { recursive: true });
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
```

- [ ] **Step 2: Syntax-check it loads**

Run: `cd ~/taylormade-studio/scripts && node --check print-prep.mjs`
Expected: no output (valid syntax). Full run happens in Task 8.

- [ ] **Step 3: Commit**

```bash
cd ~/taylormade-studio
git add scripts/print-prep.mjs
git commit -m "Print pipeline: print-prep orchestrator (stage art, spec sheet, csv, manifest)"
```

---

## Task 7: `print-stamp.mjs` stamper

**Files:**
- Create: `scripts/print-stamp.mjs`

- [ ] **Step 1: Write `scripts/print-stamp.mjs`**

```js
import { adminClient } from "./lib/supabase-admin.mjs";

const [id, url, folderId] = process.argv.slice(2);
if (!id) {
  console.error("Usage: node --env-file=.env print-stamp.mjs <order_id> <drive_url> <drive_folder_id>");
  process.exit(1);
}

const sb = adminClient();
const { error } = await sb.from("print_orders").update({
  prepped_at: new Date().toISOString(),
  drive_folder_url: url || null,
  drive_folder_id: folderId || null,
}).eq("id", id);
if (error) { console.error("Stamp failed:", error.message); process.exit(1); }
console.log(`Stamped order ${id}: prepped_at set, drive link saved.`);
```

- [ ] **Step 2: Syntax-check it loads**

Run: `cd ~/taylormade-studio/scripts && node --check print-stamp.mjs`
Expected: no output (valid syntax).

- [ ] **Step 3: Commit**

```bash
cd ~/taylormade-studio
git add scripts/print-stamp.mjs
git commit -m "Print pipeline: print-stamp (set prepped_at + drive link after upload)"
```

---

## Task 8: Seed a test order and run the prep integration

**Files:** none (verification task). Requires Task 1 `.env` populated and Task 2 migration applied.

- [ ] **Step 1: Create a tiny test art file**

Run:
```bash
cd ~/taylormade-studio/scripts
printf '%%PDF-1.4 test artwork for print pipeline\n' > /tmp/test-card.pdf
echo "made /tmp/test-card.pdf"
```
Expected: `made /tmp/test-card.pdf`.

- [ ] **Step 2: Seed an order + upload the art via a one-off script**

Create `scripts/seed-test-order.mjs` (temporary, deleted in Step 6):

```js
import { readFile } from "node:fs/promises";
import { adminClient } from "./lib/supabase-admin.mjs";

const sb = adminClient();
// pick any existing client (Kenitha / Panty Cakes was seeded in Phase 2)
const { data: clients, error: cErr } = await sb.from("clients").select("id,name").limit(1);
if (cErr || !clients?.length) { console.error("No clients found:", cErr?.message); process.exit(1); }
const client = clients[0];

const buf = await readFile("/tmp/test-card.pdf");
const path = `${client.id}/${Date.now()}-test-card.pdf`;
const up = await sb.storage.from("print-art").upload(path, buf, { contentType: "application/pdf" });
if (up.error) { console.error("Upload failed:", up.error.message); process.exit(1); }

const { data: order, error: oErr } = await sb.from("print_orders").insert({
  client_id: client.id,
  product: "Business cards", quantity: 250,
  specs: { size: "3.5 x 2 in", stock: "16pt matte", sides: "double-sided, full color" },
  notes: "PIPELINE TEST ORDER — safe to delete.", art_paths: [path], status: "submitted",
}).select("id,order_no").single();
if (oErr) { console.error("Insert failed:", oErr.message); process.exit(1); }
console.log(`Seeded test order #${order.order_no} (id ${order.id}) for client ${client.name}.`);
```

Run: `cd ~/taylormade-studio/scripts && node --env-file=.env seed-test-order.mjs`
Expected: `Seeded test order #N (id ...) for client ...`. Note the order id and number.

- [ ] **Step 3: Run the prep**

Run: `cd ~/taylormade-studio/scripts && npm run prep`
Expected output includes `Prepped 1/1 order(s).` and a line ` #N <client> — 1 file(s)` with no `⚠`.

- [ ] **Step 4: Verify the staging output**

Run:
```bash
cd ~/taylormade-studio/scripts
ls -R staging | head -30
echo "--- manifest ---"; cat staging/manifest.json
echo "--- spec sheet head ---"; head -5 staging/*_*/spec-sheet.html
echo "--- supplier leak check (want NO matches) ---"; grep -ri "4over\|fourover" staging || echo "clean"
```
Expected: a `staging/<order_no>_<slug>/` folder containing `test-card.pdf` + `spec-sheet.html`; `manifest.json` with `order_count: 1` and a populated `art[0].signed_url`; `print-orders-log.csv` present; supplier check prints `clean`.

- [ ] **Step 5: Verify the signed URL actually serves the file**

Run: `cd ~/taylormade-studio/scripts && curl -sS -o /dev/null -w "%{http_code}\n" "$(node -e "const m=require('./staging/manifest.json');process.stdout.write(m.orders[0].art[0].signed_url)")"`
Expected: `200`.

- [ ] **Step 6: Remove the temporary seed script (keep the seeded order for Task 9)**

Run: `cd ~/taylormade-studio/scripts && rm seed-test-order.mjs && echo removed`
Expected: `removed`. (No commit — staging is gitignored and the seed script is deleted.)

---

## Task 9: Runbook + end-to-end Drive run + idempotency

**Files:**
- Create: `PRINT-PIPELINE.md`

- [ ] **Step 1: Write `PRINT-PIPELINE.md`**

````markdown
# Print Pipeline Runbook

How Claude turns submitted print orders into review-ready Google Drive packages.
Trigger phrase: **"run the print pipeline."**

## Guardrails (never violate)
- Never advance an order's status, send a proof, or place an order. Those are Nelson's
  manual actions in the portal / at the supplier.
- The supplier ("4over") is never named in any Drive folder, file, or client-facing text.
- Only orders the client has signed off on are "cleared to place" — the spec sheet states this.

## Steps

1. **Stage locally**
   `cd ~/taylormade-studio/scripts && npm run prep`
   Read the printed summary. If an order shows `⚠`, surface it to Nelson and do NOT
   continue with that order (it stays un-prepped and re-runnable).

2. **Read the manifest**
   Read `scripts/staging/manifest.json`. For each order with `errors: []`:

3. **Ensure Drive folders** (search-before-create, via Google Drive MCP)
   - `search_files` for a folder named `Taylormade Print Orders`; create with
     `create_file` (mimeType `application/vnd.google-apps.folder`) if absent. Record its id.
   - Under it, ensure a folder named `<client_name>`; record its id.
   - Under that, ensure a folder named `<order_no>` (the order folder). Record its id + URL
     (`https://drive.google.com/drive/folders/<id>`).

4. **Upload the package into the order folder** (via `create_file`, `parentId` = order folder id)
   - Spec sheet: read `staging/<order>/spec-sheet.html`, upload with `textContent`,
     `contentMimeType: text/html`, `disableConversionToGoogleType: true`.
   - Each art file: read the local file, base64-encode, upload with `base64Content` and the
     correct `contentMimeType` (e.g. `application/pdf`, `image/png`). If a file is too large
     to base64 through the MCP, skip the binary upload and tell Nelson the signed URL in the
     spec sheet is the fallback for that file.

5. **Refresh the orders log**
   Read `staging/print-orders-log.csv`, upload to the top `Taylormade Print Orders` folder
   with `textContent`, `contentMimeType: text/csv`, title
   `Print Orders Log <YYYY-MM-DD>` (auto-converts to a Google Sheet). One dated snapshot per run.

6. **Stamp the row** (per order, after its upload succeeds)
   `cd ~/taylormade-studio/scripts && node --env-file=.env print-stamp.mjs <order_id> "<folder_url>" "<folder_id>"`

7. **Report to Nelson**
   List each order, its Drive folder link, file count, and sign-off state. Remind him which
   orders are cleared to place vs awaiting client sign-off.
````

- [ ] **Step 2: Execute the runbook against the seeded order**

Perform Steps 1–6 of the runbook for the order seeded in Task 8 (use the real Drive MCP).
Expected: a Drive folder `Taylormade Print Orders / <client> / <order_no>/` containing
`test-card.pdf` + `spec-sheet.html`; a `Print Orders Log <date>` Sheet in the top folder;
`print-stamp.mjs` prints `Stamped order ...`.

- [ ] **Step 3: Verify the stamp landed**

Run:
```bash
cd ~/taylormade-studio/scripts
node --env-file=.env -e "import('./lib/supabase-admin.mjs').then(async ({adminClient})=>{const sb=adminClient();const {data}=await sb.from('print_orders').select('order_no,prepped_at,drive_folder_url').not('prepped_at','is',null).order('order_no');console.log(JSON.stringify(data,null,2));})"
```
Expected: the seeded order appears with a non-null `prepped_at` and a `drive_folder_url`.

- [ ] **Step 4: Verify idempotency**

Run: `cd ~/taylormade-studio/scripts && npm run prep`
Expected: `Prepped 0/0 order(s).` — the already-stamped order is skipped (no new staging folder for it).

- [ ] **Step 5: Clean up the test order**

Delete the seeded test order + its art so it doesn't clutter the portal:
```bash
cd ~/taylormade-studio/scripts
node --env-file=.env -e "import('./lib/supabase-admin.mjs').then(async ({adminClient})=>{const sb=adminClient();const {data:o}=await sb.from('print_orders').select('id,art_paths').eq('notes','PIPELINE TEST ORDER — safe to delete.');for(const r of o){if(r.art_paths?.length)await sb.storage.from('print-art').remove(r.art_paths);await sb.from('print_orders').delete().eq('id',r.id);console.log('deleted',r.id);}})"
```
Expected: `deleted <id>`. (Optionally delete the test Drive folder + Sheet via the Drive UI.)

- [ ] **Step 6: Commit**

```bash
cd ~/taylormade-studio
git add PRINT-PIPELINE.md
git commit -m "Print pipeline: runbook for Drive packaging + stamping"
```

---

## Task 10: Update project memory

**Files:**
- Modify: `/Users/nelsontaylor/.claude/projects/-Users-nelsontaylor/memory/taylormade-studio-site.md`

- [ ] **Step 1: Mark Phase 3 DONE in the memory file**

Change the `## PHASE 3 — Print-order pipeline (NEW): NEXT` heading to `DONE ✅`, and append a short status line noting: Claude-driven runbook (`PRINT-PIPELINE.md`) + `scripts/print-prep.mjs`/`print-stamp.mjs`, Google Drive destination (no Dropbox), `prepped_at`/`drive_folder_url`/`drive_folder_id` columns added, supplier never named, all human gates preserved.

- [ ] **Step 2: Verify the edit reads correctly** (Read the file back; no commit — memory dir is outside the repo).

---

## Self-review notes
- **Spec coverage:** two-part split (Tasks 6/9) · DB columns (Task 2) · service-role script + gitignored key (Tasks 1/5) · art download + signed-URL fallback + spec sheet (Tasks 4/6) · Drive folders/upload/log via MCP (Task 9) · idempotency via `prepped_at` (Tasks 6/9 Step 4) · human gates preserved (script never advances status; runbook guardrails) · supplier never named (Task 4 test + Task 8 grep) · CSV snapshot (Task 6) · testing incl. re-run idempotency (Tasks 8/9). All spec sections map to a task.
- **Type consistency:** `clientSlug`/`safeFileName`/`ordersToCsv`/`buildManifest`/`renderSpecSheet`/`adminClient` names match across lib, tests, and orchestrator. Manifest shape (`generated_at`/`order_count`/`orders[]` with `id`,`order_no`,`client_name`,`art[].signed_url`,`errors`) is consistent between `print-prep.mjs` and the runbook's reads.
- **No placeholders:** every code step shows complete code; every run step shows the command + expected output.
