import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("Postgres migration: ownership, snapshot isolation and anonymous publication", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,storage to anon,authenticated;
 grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant select,insert,update,delete on storage.objects to anon,authenticated;`);
    await db.exec(
      await readFile("supabase/migrations/202610090001_initial.sql", "utf8"),
    );
    await db.exec(await readFile("supabase/tests/ownership.sql", "utf8"));
    const result = await db.query<{ count: number }>(
      "select count(*)::int as count from public.sites",
    );
    assert.equal(result.rows[0].count, 0);
  } finally {
    await db.close();
  }
});
