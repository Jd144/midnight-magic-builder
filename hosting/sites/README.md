# Sites publication adapter

These files are the server/storage extension for the existing Sites Vinext checkout. The normal root Next.js app continues to use Supabase or a local demo; do not enable native sharing on a host without these API routes and D1/R2 bindings.

In the existing Site source checkout:

1. Copy root `app`, `components`, and client `lib` application files, preserving starter integration. Overlay this directory's `app/api`, `db`, `lib/sharing-server.ts`, `drizzle`, and `drizzle.config.ts`.
2. Add `drizzle-orm` and development dependency `drizzle-kit`. Use `drizzle-kit generate` for future schema changes; never rewrite applied migrations.
3. Preserve the existing Site project ID and set logical bindings `d1: "DB"`, `r2: "BUCKET"` in `.openai/hosting.json`.
4. In Vite config set `define: { "process.env.NEXT_PUBLIC_NATIVE_SHARING": JSON.stringify("1") }`. Keep the starter's `sites()` and Cloudflare integrations.
5. Build the adapter. For a new local preview database apply each pending SQL file using the starter's local D1 migration command against `dist/server/wrangler.json` and `.wrangler/state`. Production migrations are applied by Sites publication, not request handlers.
6. Run the online integration test from the root repo with `MIDNIGHT_ONLINE_TEST=1`, `MIDNIGHT_TEST_BASE_URL=<adapter-preview-origin>` and `npx playwright test online.spec.ts`. Existing demo tests target the normal root app.
7. Publish through the Sites source/package/version workflow using the existing project ID. Source provenance lives in `.openai/publication.json`.

The API stores public snapshots, capability hashes and upload metadata in D1. R2 objects use `<story UUID>/<immutable file UUID>`. D1 ownership is checked before every write; published JSON contains no editing keys or private draft content. Only media referenced by a current snapshot can be served publicly. Local draft/media keys from the previous version are never renamed or removed during activation.
