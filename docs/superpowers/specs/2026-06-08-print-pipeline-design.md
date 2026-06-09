# Phase 3 — Print-Order Pipeline Design

**Date:** 2026-06-08
**Project:** Taylormade Studio (`~/taylormade-studio/`)
**Status:** Approved design, pre-implementation

## Context

Phase 2 shipped the print **intake**: a client picks a product + specs + quantity in the
portal, uploads artwork to the Supabase `print-art` bucket, and a `print_orders` row is
created. The portal also has an admin status pipeline
(`submitted → in_review → client_signoff → approved_to_print → sent_to_4over → printing → shipped`)
and a client sign-off step.

Phase 3 is the **backend pipeline** that moves a submitted order *out* of Supabase into a
ready-to-order package Nelson can hand to the print supplier, with every human gate preserved.

### Hard constraints

- The portal is a **static site on GitHub Pages** — it cannot run server code.
- There are **no Dropbox credentials** on the machine (`dbxcli`/`rclone` absent). Dropbox is
  **dropped for v1**; Google Drive covers the same need with zero new credentials.
- The **Google Drive MCP is already connected**, but only Claude can call it — not a standalone
  cron job.
- **4over is the supplier and is NEVER named** in any folder name, file name, or client-facing
  field (supply-chain rule).
- **Nothing sends or prints** without Nelson's review AND the client's sign-off. Nelson places
  the 4over order **manually**.

## Architecture

A **two-part split**, triggered when Nelson says *"run the print pipeline"*:

1. A deterministic local **Node script** does the Supabase work (read orders, download art,
   build spec sheet + CSV, emit a manifest).
2. **Claude follows a runbook** to do the Drive work on top of the script's output (create
   folders, upload, refresh the log Sheet, stamp the rows).

This is the "Claude-driven runbook" orchestration model — chosen over a cron script (needs new
Google credentials, loses the in-the-loop review) and a Supabase Edge Function (adds always-on
infra + secrets, and fires before Nelson can review, violating the review-before-send rule).

## Components

### 1. DB migration

Add three columns to `print_orders` (admin-written; existing RLS covers the table):

| Column | Type | Purpose |
|---|---|---|
| `prepped_at` | `timestamptz` | Idempotency gate — only un-prepped orders get processed |
| `drive_folder_url` | `text` | Link to the assembled Drive package |
| `drive_folder_id` | `text` | Drive folder id, for search-before-create |

### 2. `scripts/print-prep.mjs` (deterministic half)

Runs locally with the Supabase **service-role key** (bypasses RLS for a trusted admin script;
key is gitignored). Steps:

1. `SELECT * FROM print_orders WHERE prepped_at IS NULL AND status IN ('submitted','in_review')`.
2. For each order: download every art file from the private `print-art` bucket into
   `staging/<order_no>_<client_slug>/`, renamed cleanly.
3. Generate a branded one-page **`spec-sheet.html`** per order: product, quantity, size,
   stock/finish, sides/color, client notes, order #, client name, and sign-off status —
   laid out to map onto the supplier's order fields. HTML chosen to avoid heavy PDF deps;
   Nelson prints-to-PDF if a PDF is needed.
4. Write a full-snapshot **`print-orders-log.csv`** (all orders, current state).
5. Emit **`manifest.json`** describing each staged order (paths, files, any errors).

The script **never** advances status, sends a proof, or places an order.

### 3. `PRINT-PIPELINE.md` (the runbook Claude follows)

After the script runs, Claude:

1. Reads `manifest.json`.
2. For each staged order, ensures a Drive folder
   `Taylormade Print Orders / <client> / <order_no>/` (search-before-create to avoid dupes).
3. Uploads the art files + `spec-sheet.html` into that folder.
4. Refreshes the orders-log in Drive (Google Sheet via MCP `create_file` conversion, or CSV
   the user opens as a Sheet — whichever the MCP handles cleanly).
5. Hands Nelson the Drive links and a summary.
6. Stamps `prepped_at` + `drive_folder_url` + `drive_folder_id` back on each row.

## Data flow

```
Client submits (portal) → print_orders row + art in print-art bucket
   ↓  Nelson: "run the print pipeline"
print-prep.mjs → downloads art + builds spec-sheet.html + CSV → manifest.json
   ↓  Claude (runbook)
Drive: per-client/per-order folder → upload art + spec sheet → refresh orders-log Sheet
   ↓  stamp prepped_at + drive_folder_url + drive_folder_id
Nelson reviews art + spec → sends proof (portal) → client signs off (portal)
   ↓
Nelson places the 4over order MANUALLY from the Drive package
   ↓
Nelson advances status in the portal (sent_to_4over → printing → shipped)
```

## Guarantees & guardrails

- **Idempotent:** `prepped_at` gate skips prepped orders; Drive folders searched-before-created;
  the log is a full overwrite snapshot (no append drift).
- **Human gates preserved:** the script never advances status, sends a proof, or places an
  order. Nothing leaves without Nelson's review and the client's sign-off.
- **Supply-chain rule:** "4over" appears in no folder name, file name, or client-facing field.
  The package is internal-only.
- **Secrets:** service-role key in `scripts/.env` (gitignored). The public anon key in
  `portal/config.js` is unchanged.

## Error handling

- Failed art download → flagged in manifest, `prepped_at` NOT stamped, surfaced to Nelson
  (order remains re-runnable on the next pass).
- Missing/zero art files on an order → flagged, not silently prepped.
- Drive upload failure mid-order → row not stamped, so the next run retries cleanly.

## Testing

1. Seed a test `print_orders` row with a small art file in the `print-art` bucket.
2. Run `print-prep.mjs` → verify `staging/<order>/` contains art + `spec-sheet.html`, and
   `manifest.json` is correct.
3. Run the runbook → verify Drive folder created with art + spec sheet, orders-log refreshed.
4. Verify `prepped_at` / `drive_folder_url` / `drive_folder_id` stamped on the row.
5. **Re-run** → confirm the order is skipped (idempotency).
6. Confirm per-client Drive folder isolation (a client's package never lands in another's
   folder).

## Out of scope (v1, YAGNI)

- Preflight checklist (print-res / dimensions / CMYK / bleed checks).
- 4over product mapping note.
- Dropbox sync.
- Auto status advancement or auto-ordering.
- Wrapping the runbook as a `/print-pipeline` slash command (easy later if wanted).
