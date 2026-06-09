-- Phase 3 print pipeline: idempotency + Drive package columns
alter table public.print_orders
  add column if not exists prepped_at timestamptz,
  add column if not exists drive_folder_url text,
  add column if not exists drive_folder_id text;
