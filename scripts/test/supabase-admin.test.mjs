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
