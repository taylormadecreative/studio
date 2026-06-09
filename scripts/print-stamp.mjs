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
