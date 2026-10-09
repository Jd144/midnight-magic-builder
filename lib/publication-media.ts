import type { Site } from './model';

export function preparePublicationMedia(site: Site, origin: string): Site {
  const snapshot = structuredClone(site);
  snapshot.chapters = snapshot.chapters.filter(c => !c.hidden);
  const normalize = (source: string, label: string) => {
    const value = source.trim();
    if (!value || /^(local:|blob:|data:)/i.test(value)) return value;
    let url: URL;
    try { url = new URL(value, origin); }
    catch { throw new Error(`${label}: this media link is incomplete. Upload the file in Media or enter its full HTTPS link.`); }
    const own = new URL(origin);
    // Previously cached upload URLs can carry a preview/proxy HTTP scheme.
    // Keep only this app's media paths and rebase them to its public origin.
    if (url.host === own.host && /^\/api\/sharing\/[a-f0-9-]{36}\/media\/[a-f0-9-]{36}$/.test(url.pathname)) return new URL(url.pathname, origin).href;
    if (url.protocol !== 'https:') throw new Error(`${label}: this is a device-only or HTTP link. Upload that file using Media, or replace it with a full HTTPS link. Your draft has not been removed.`);
    return url.href;
  };
  snapshot.music = normalize(snapshot.music, 'Background music');
  for (const chapter of snapshot.chapters) for (const [index, media] of chapter.media.entries()) {
    media.src = normalize(media.src, `${chapter.title} · ${media.kind} ${index + 1}`);
  }
  return snapshot;
}
