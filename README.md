# Midnight Magic

A reusable cinematic birthday website builder with Next.js 16, TypeScript, Tailwind CSS 4 and Supabase. No recipient is hardcoded. Includes twelve provisional chapters, a private studio, visual editing, crop and position controls, image/video/music uploads, YouTube/Vimeo links, optional music, mobile layouts and reduced-motion support.

## Public app and cross-device birthday links

[Open Midnight Magic](https://midnight-magic-birthday-studio.awake-sky-0868.chatgpt.site). The hosted app has **ONLINE SHARING** backed by Sites D1/R2. Choose **Publish online** to upload a separate birthday snapshot and its photos, videos and music. Visitors can open its link or QR from another device without an account. Drafts and original files remain in the editor's browser; account login and cross-device draft editing still require Supabase.

**Preserving existing stories:** update/refresh the original browser, open the saved story, and choose Publish online once. The original draft, local media and previous demo snapshot are retained. The public URL keeps the original story UUID, so old birthday links and QR codes start working after activation. Existing demo snapshots are not silently exposed. Nothing can recover browser-only content after that browser's storage was already cleared.

Publishing also recovers legacy blob references from the retained media database, uploads inline media, trims empty media fields and rebases cached upload addresses to the public app origin. Invalid external/device file links identify the affected chapter and media in the error message. Files whose original blob is no longer available must be selected again; publishing never deletes the draft to repair a link.

Each publication is owned by a random editing capability generated in its original browser. Only its SHA-256 hash is stored server-side. Visitor links never contain the capability. Owners can replace/unpublish their own snapshot; other browsers cannot mutate it. Original drafts are never sent during visitor reads. Clearing the original browser's editing key removes its editing/unpublish access; this capability mode is explicitly **not account authentication**. HTTPS links are public to anyone who has them.

Published media is immutable, streamed from R2 and served only when referenced in the current public snapshot. Byte ranges support video seeking. Unpublish immediately blocks fresh snapshot and media requests; already downloaded files cannot be recalled. Server checks ownership, same-origin writes, UUIDs, snapshot structure, MIME/size limits and media references. Limits are 500 MB/160 uploaded objects per story and 20 new publications per IP/day. Uploaded files are reused during republishing; removed objects remain stored but cannot be read without a current snapshot reference. An administrator may clean up unreferenced objects later.

The hosted demonstration uses the Sites Vinext adapter for the same Next.js application files. The GitHub application retains its normal Next.js development/build commands. Hosting identity and the published version are recorded in `.openai/hosting.json` and `.openai/publication.json`; the hosted adapter source is managed separately in the Site source repository. Do not create another Site for future updates. Within this Codex workspace, use the existing `work/public-hosting` checkout; elsewhere obtain that Site's source using its recorded project ID.

## Run locally

Requires Node.js 20.9+ and npm.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. With both Supabase environment values absent, the application runs in **BROWSER DEMO** mode. Draft JSON is in localStorage; media blobs are in IndexedDB. No login is simulated. The app itself can be publicly hosted, but demo birthday snapshots are browser-only and cannot be opened on another device or browser profile. Clearing browser data removes demo content. Use Save draft before closing the tab; returning to the dashboard saves the active draft.

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

For a real disposable Supabase database, execute `supabase/tests/ownership.sql` with `psql -v ON_ERROR_STOP=1`. It rolls back fixtures. Connected Auth/Storage HTTP flows still require integration checks with real credentials. The hosted Sites adapter additionally runs `tests/browser/online.spec.ts` with `MIDNIGHT_ONLINE_TEST=1` and `MIDNIGHT_TEST_BASE_URL` pointing to its preview. It also checks that unavailable optional background music is omitted from the published snapshot with a warning, while the original draft is retained. The editor offers Remove background music to clear an unwanted saved attachment. Legacy clients with file, blob or HTTP music references can still publish without that music; photo/video validation and ownership checks remain enforced. It verifies legacy preservation, independent visitor storage, mobile rendering, uploaded media, byte ranges, denied foreign writes/media references, private draft edits, republishing and unpublish revocation.

## Connect a real backend or deploy Next.js elsewhere

Shared birthday pages already work on the existing public app using Sites storage. To enable accounts and drafts editable across devices, create a Supabase project, apply the included migration and configure email authentication. Rebuild the hosted adapter with both public Supabase environment values and `NEXT_PUBLIC_SITE_URL` set to the published origin. Verify two-user ownership and anonymous visitor/media/QR flows before presenting account features as live. Supabase data and Sites publications are separate; switching backends requires a deliberate migration of existing links and media.

For another host, deploy the original Next.js app to Node.js or Vercel. Set both Supabase environment values and `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin at build time. Run the migration once on that environment's Supabase project, configure Auth Site URL and confirmation redirect URLs to that origin, then build with `npm run build` and run with `npm start` on a Node host (configure its reverse proxy/port and HTTPS). A credentials-free deployment must remain clearly labeled as a browser-only demo.

## Specification provenance

The full user message was recovered from the referenced conversation with an expanded read limit. It includes all ten feature requirements. The original chapter blueprint is unavailable, so the twelve supplied provisional chapters are used.

## Private birthday gifts and recipient diary

In the hosted studio, open **Style → Password & private diary**. Set a birthday password of at least eight characters and the recipient’s ChatGPT account email, then save the access settings. The password gate applies immediately to existing published links and QR destinations. Share the password separately; it is never encoded in the QR or included in the snapshot. Leave the password empty to keep the current one; use the explicit checkbox to remove protection.

The gift opens with an accessible curtain reveal and finishes with an interactive candle wish and confetti. Reduced-motion preferences disable the animations. Existing text, chapter order and original media are preserved.

At the end, the recipient signs in with ChatGPT to open their private diary. Entries autosave after a one-second typing pause, receive a server timestamp and remain available to that account across devices. Keep the page open until Saved appears. Entries can be reopened and edited, with their original creation date retained. The diary supports 200 entries of 12,000 characters each. Diary contents never enter public snapshots or creator APIs. Once an entry is saved, its recipient account is bound and cannot be reassigned by the creator. No diary is enabled until the creator configures a recipient email.

The Sites adapter stores salted PBKDF2-SHA256 password hashes (100,000 iterations), hashes guest-session tokens and uses HttpOnly/SameSite cookies that expire after 24 hours. Changing the password invalidates existing guest sessions. Uploaded media requires the same gate; external media remains governed by its external host. Unlock attempts are limited per story/IP to ten in each fifteen-minute window. Recipient authorization uses Sites-verified identity headers and a server-side account binding. Password/diary settings and records use an additive Drizzle migration. Browser demo and standalone Supabase modes do not offer this hosted password/diary feature.

`tests/browser/gift.spec.ts` checks access settings, password and uploaded-media protection, curtain/candle interaction, mobile width, session invalidation and foreign-owner denial. Local identity fixtures exercise diary autosave, creation timestamps, cross-session retrieval, account isolation and recipient reassignment denial. Production tests reject forged identity headers; a real recipient must complete the platform-owned ChatGPT sign-in flow.
