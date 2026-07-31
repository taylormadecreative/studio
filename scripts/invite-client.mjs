#!/usr/bin/env node
// Pre-authorize a Google account for a client portal login.
//
//   node scripts/invite-client.mjs <email> <client-slug> [full name]
//   node scripts/invite-client.mjs --list
//
// After this, the client just clicks "Continue with Google" on the portal and
// their profile is created automatically on first sign-in.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(join(here, ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in scripts/.env"); process.exit(1); }

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const api = async (path, init = {}) => {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
  const body = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${body}`);
  return body ? JSON.parse(body) : null;
};

const [, , email, slug, ...nameParts] = process.argv;

if (email === "--list") {
  const rows = await api("client_invites?select=email,role,full_name,clients(name)&order=created_at");
  if (!rows.length) console.log("No invites yet.");
  else for (const r of rows) console.log(`${r.email.padEnd(34)} ${r.clients?.name ?? "?"}  (${r.role})`);
  process.exit(0);
}

if (!email || !slug) {
  console.error("usage: node scripts/invite-client.mjs <email> <client-slug> [full name]");
  console.error("       node scripts/invite-client.mjs --list");
  process.exit(1);
}

const [client] = await api(`clients?slug=eq.${encodeURIComponent(slug)}&select=id,name`);
if (!client) {
  const all = await api("clients?select=slug&order=slug");
  console.error(`No client with slug "${slug}". Known: ${all.map(c => c.slug).join(", ")}`);
  process.exit(1);
}

await api("client_invites?on_conflict=email", {
  method: "POST",
  headers: { Prefer: "resolution=merge-duplicates" },
  body: JSON.stringify({
    email: email.toLowerCase(),
    client_id: client.id,
    role: "client",
    full_name: nameParts.join(" ") || null,
  }),
});

console.log(`✅ ${email} pre-authorized for ${client.name}.`);
console.log(`   Send them: https://social.taylormadecreative.net/portal/`);
console.log(`   They click "Continue with Google" and they're in.`);
