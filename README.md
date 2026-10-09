# Midnight Magic

A reusable cinematic birthday website builder with Next.js 16, TypeScript, Tailwind CSS 4 and Supabase. No recipient is hardcoded. Includes twelve provisional chapters, a private studio, visual editing, crop and position controls, image/video/music uploads, YouTube/Vimeo links, optional music, mobile layouts and reduced-motion support.

## Run locally

Requires Node.js 20.9+ and npm.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. With both Supabase environment values absent, the application runs in **LOCAL DEMO** mode. Draft JSON is in localStorage; media blobs are in IndexedDB. No login is simulated. Demo snapshots are browser-only, never public, and cannot be opened on another device or browser profile. Clearing browser data removes demo content. Use Save draft before closing the tab; returning to the dashboard saves the active draft.

## Connect Supabase

1. Create a Supabase project. Run `supabase/migrations/202610090001_initial.sql` in its SQL editor (or use the Supabase CLI migration workflow).
2. Copy `.env.example` to `.env.local`. Supply `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the project's API settings. Use the public anon key, never a service-role key in the client.
3. Enable email/password sign-in in Supabase Auth. Set Site URL to `http://127.0.0.1:3000` for local work, configure email confirmation and SMTP as needed. Restart the local server.
4. Create two test accounts and validate authentication, confirmation, ownership, uploads and publishing against this backend before production use. Demo data does not automatically migrate into accounts.

The SQL migration creates `sites`, `published_sites` and a private `birthday-media` bucket. RLS enforces `owner_id = auth.uid()` for draft CRUD. Uploads require both the authenticated user's folder and an owned site's folder: `user-id/site-id/unique-file`. New file names are immutable: object updates have no policy. Duplicate stories copy their media into the new site's folder.

`publish_site` locks an owned draft and copies its content into a separate snapshot, removing hidden chapters. It rejects foreign media paths. Only authenticated owners can invoke publish/unpublish, and clients cannot write snapshots directly. Editing a draft never modifies its snapshot. Republishing updates the same link. Unpublish and site deletion remove the snapshot.

Published snapshots and their explicitly referenced files are public when connected to a backend. Links have random slugs but are not passwords; anyone can read published content. Draft media remains private. Signed media URLs last one hour, so a previously issued URL can continue working briefly after unpublish; removing the snapshot is immediate. Existing downloaded content cannot be revoked. Do not promise password protection or instant signed-URL revocation.

## Editing and media

- Create and manage multiple stories. Edit website title, recipient and nickname, birthday date/time, chapter headings and text. Reorder or hide any chapter.
- Timeline, reasons and notes accept one entry per line. Add media to any chapter. Use the preview to inspect every visible chapter; surprise content reveals on a button press.
- Theme options include accent color and serif/sans typography. Music uses a direct HTTPS URL or uploaded MP3/OGG/WAV. It starts only through visitor controls.
- JPG/PNG/WebP: 10 MB. MP4/WebM: 100 MB. Audio: 20 MB. The bucket additionally rejects unlisted MIME types and files above 100 MB. Client checks apply the smaller per-type limits; clients capable of bypassing the UI can upload other listed types up to the bucket limit. SVG and HTML uploads are excluded.
- Crop controls adjust visual zoom and horizontal/vertical positioning in a 4:3 frame. Original files remain intact. Replace a memory with its file picker; crop settings and captions are preserved. Past snapshots retain their original file until republished/unpublished. Video uploads use native playback controls. Supported external links are HTTPS YouTube watch/youtu.be and numeric Vimeo URLs.
- Birthday date/time is interpreted in the viewing device's local timezone. Placeholder text explains unfinished chapters. Empty names receive neutral placeholder content.
- The editor reports unsaved changes, saving and saved states. Save before closing the tab; a browser warning protects unsaved changes. Desktop and 390px mobile previews use the published-site renderer. The phone preview uses an isolated iframe viewport so responsive styles match a real phone.
- After creating a snapshot, copy its link or download a PNG QR encoding exactly that URL. Demo QR codes are marked as local-only. Connected-backend URLs use `NEXT_PUBLIC_SITE_URL` if supplied, otherwise the current origin. A localhost QR cannot be opened on another phone; public links require a later deployment.

Removed uploads are retained to protect published snapshots. After a site is deleted, its files become inaccessible through RLS. An administrator can periodically remove storage objects whose site folder no longer exists and unused files not referenced by any draft/snapshot. Demo blobs remain until browser data is cleared. This project does not include an automatic media garbage collector.

## Verification

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
# Keep npm run dev running in another terminal:
npx playwright test
```

The model tests check neutral independent stories, chapter reordering, file validation and video URL allowlists. QR tests decode the generated PNG back into its exact snapshot URL. The PGlite test executes the real migration and ownership assertions against embedded PostgreSQL with small test-only Auth/Storage schema stand-ins. It checks database rules and syntax without pretending to test Supabase network services. Browser tests cover save/reload, snapshot isolation, hide/reorder, unpublish, duplicate/delete, persistent media, replacement/cropping, all twelve chapters, countdown/surprise, theme, music/video playback controls, reduced motion, phone preview and QR downloads.

For a real disposable Supabase database, execute `supabase/tests/ownership.sql` with `psql -v ON_ERROR_STOP=1`. It rolls back fixtures. Connected Auth/Storage HTTP flows still require integration checks with real credentials. No public deployment is part of this implementation.

## Future deployment (not performed)

When deployment is explicitly requested, deploy this Next.js app to a Node.js host or Vercel. Set both Supabase environment values and `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin at build time. Run the migration once on that environment's Supabase project, configure Auth Site URL and confirmation redirect URLs to that origin, then build with `npm run build` and run with `npm start` on a Node host (configure its reverse proxy/port and HTTPS). Verify two-user ownership and anonymous visitor/media/QR flows before sharing links. Do not deploy a credentials-free demo as a multi-user service.

## Specification provenance

The full user message was recovered from the referenced conversation with an expanded read limit. It includes all ten feature requirements. The original chapter blueprint is unavailable, so the twelve supplied provisional chapters are used.
