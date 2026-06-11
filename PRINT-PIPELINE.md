# Print Pipeline Runbook

How Claude turns submitted print orders into review-ready Google Drive packages.
Trigger phrase: **"run the print pipeline."**

## Guardrails (never violate)
- Never advance an order's status, send a proof, or place an order. Those are Nelson's
  manual actions in the portal / at the supplier.
- The supplier ("4over") is never named in any Drive folder, file, or client-facing text.
- Only orders the client has signed off on are "cleared to place" — the spec sheet states this.

## One-time setup
- `scripts/.env` must contain `SUPABASE_URL` and the real `SUPABASE_SERVICE_ROLE_KEY`
  (Supabase dashboard → Project Settings → API → `service_role`). The file is gitignored.
- The `prepped_at` / `drive_folder_url` / `drive_folder_id` columns must exist on
  `print_orders` (see `supabase/migrations/2026-06-08-print-prep-columns.sql`).

## Daily automation
A scheduled check runs `npm run check` every morning and pushes Nelson a notification
when orders need prepping or are signed off and ready to place. Sign-off is the trigger:
once a client signs off in the portal (status `approved_to_print`), the order shows as
`ready_to_place` and the full runbook below should be run.

## Steps

1. **Stage locally**
   `cd ~/taylormade-studio/scripts && npm run prep`
   Read the printed summary. Orders marked `★ SIGNED OFF` are cleared for the supplier.
   If an order shows `⚠`, surface it to Nelson and do NOT continue with that order
   (it stays un-prepped and re-runnable). Each staged order also gets an
   `INTERNAL-order-sheet.html` with the exact supplier configurator selections,
   wholesale anchors, and a cleared-to-place gate. **NEVER upload the INTERNAL sheet
   to any client-visible location** — it stays local / Nelson-only.

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

7. **Hand Nelson the placement package**
   For each SIGNED-OFF order: give him the Drive folder link AND the local
   `INTERNAL-order-sheet.html` path — it contains the supplier configurator link with
   every option pre-decided, so placing takes about a minute. List the rest (awaiting
   sign-off) separately. Nelson places the supplier order MANUALLY; nothing auto-charges.
