import type { Site } from './model';
import { validateFile } from './model';
import { preparePublicationMedia } from './publication-media';
export const onlineSharing = process.env.NEXT_PUBLIC_NATIVE_SHARING === '1';

// This capability permits editing this browser's publications; it is never
// included in visitor links or published content. This is not account login.
function ownerKey(id: string) {
  const key = 'mm-publication-key-' + id;
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID() + crypto.randomUUID();
    localStorage.setItem(key, value);
  }
  return value;
}
async function request(id: string, method: string, body?: BodyInit, suffix = '', type = 'application/json') {
  const send = () => fetch('/api/sharing/' + id + suffix, {
    method, headers: {Authorization: 'Bearer ' + ownerKey(id), 'Content-Type': type}, body,
  });
  let response = await send();
  // Reserve, snapshot replacement and unpublish are idempotent. A preview
  // Worker can restart after performing the write but before returning it.
  for(let retry=0; response.status===503 && retry<2; retry++) response=await send();
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as {error?: string};
    throw new Error(data.error || 'Online sharing failed. Your saved draft is still safe in this browser.');
  }
  return response;
}
export async function publishOnline(site: Site, onProgress?: (value: number) => void, onWarning?: (message: string) => void) {
  await request(site.id, 'POST'); // Reserve the stable slug under the editing capability.
  const snapshot = preparePublicationMedia(site, location.origin, true);
  const warnings = new Set<string>();
  const musicWarning = 'Published without background music because its saved address or file is unavailable. Your original draft is preserved.';
  if (site.music.trim() && !snapshot.music) warnings.add(musicWarning);
  const sources = [...new Set([snapshot.music, ...snapshot.chapters.flatMap(c => c.media.map(m => m.src))].filter(s => /^(local:|blob:|data:)/i.test(s)))];
  const uploaded = new Map<string, string>();
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const cacheId = source.startsWith('data:') ? [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source)))].map(v=>v.toString(16).padStart(2,'0')).join('') : source.slice(6);
    const cacheKey = 'mm-uploaded-' + site.id + '-' + cacheId;
    const existing = localStorage.getItem(cacheKey);
    if (existing) {
      const cached = new URL(existing, location.origin);
      if (cached.host === location.host && /^\/api\/sharing\/[a-f0-9-]{36}\/media\/[a-f0-9-]{36}$/.test(cached.pathname)) {
        uploaded.set(source, new URL(cached.pathname, location.origin).href); continue;
      }
    }
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('midnight-magic-media', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('media');
      r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    });
    const legacyMedia = snapshot.chapters.flatMap(c=>c.media).find(m=>m.src===source);
    let blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const id = source.startsWith('local:') ? source.slice(6) : legacyMedia?.id || (source === snapshot.music ? site.musicPath : undefined);
      if (!id) { resolve(undefined); return; }
      const r = db.transaction('media').objectStore('media').get(id);
      r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
    }).finally(() => db.close());
    if (!blob && /^(blob:|data:)/i.test(source)) {
      try { blob = await (await fetch(source)).blob(); } catch { /* The old object URL may have expired. */ }
    }
    if (!blob && source === snapshot.music && !legacyMedia) { snapshot.music = ''; warnings.add(musicWarning); continue; }
    if (!blob) throw new Error(`${legacyMedia?.caption || 'A saved media file'} is unavailable in this browser. Choose its original file again using Media before publishing. Your words and draft are preserved.`);
    validateFile(blob);
    const file = crypto.randomUUID();
    const { url } = await new Promise<{url:string}>((resolve,reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT','/api/sharing/'+site.id+'/media/'+file);
      xhr.setRequestHeader('Authorization','Bearer '+ownerKey(site.id));
      xhr.setRequestHeader('Content-Type',blob.type);
      xhr.upload.onprogress = e => { if(e.lengthComputable) onProgress?.(Math.round((i+e.loaded/e.total)/sources.length*90)); };
      xhr.onerror = () => reject(new Error('Upload interrupted. Your original files are safe; try publishing again.'));
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if(xhr.status>=200 && xhr.status<300) resolve(data);
          else reject(new Error(data.error || 'Upload failed. Try publishing again.'));
        } catch { reject(new Error('Upload failed. Try publishing again.')); }
      };
      xhr.send(blob);
    });
    const publicURL = new URL(url, location.origin);
    if (publicURL.host !== location.host || !publicURL.pathname.startsWith('/api/sharing/'+site.id+'/media/')) throw new Error('The upload returned an invalid media address. Your saved draft is still safe.');
    const canonicalURL = new URL(publicURL.pathname, location.origin).href;
    uploaded.set(source, canonicalURL);
    localStorage.setItem(cacheKey, canonicalURL);
    onProgress?.(Math.round((i + 1) / sources.length * 90));
  }
  snapshot.music = uploaded.get(snapshot.music) || snapshot.music;
  delete snapshot.musicPath;
  for (const chapter of snapshot.chapters) for (const media of chapter.media) {
    media.src = uploaded.get(media.src) || media.src;
    delete media.path;
  }
  const result = await (await request(site.id, 'PUT', JSON.stringify(snapshot))).json() as {warnings?:string[]};
  for (const warning of result.warnings || []) warnings.add(warning);
  if (warnings.size) onWarning?.([...warnings].join(' '));
  localStorage.setItem('mm-online-' + site.id, '1');
  onProgress?.(100);
  return site.id;
}
export async function removeOnline(id: string) {
  if (localStorage.getItem('mm-online-' + id)) await request(id, 'POST', undefined, '?action=unpublish');
  localStorage.removeItem('mm-online-' + id);
}
export async function readOnline(id: string): Promise<Site> {
  const response = await fetch('/api/sharing/' + id, {cache: 'no-store'});
  if (!response.ok) throw new Error('This story is not online yet, or its owner has unpublished it. If you created it before the sharing update, open your saved story in the original browser and choose Publish online once.');
  return response.json();
}
