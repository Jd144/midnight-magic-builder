import { createClient } from "@supabase/supabase-js";
import { Site } from "./model";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key) : null;
const dbName = "midnight-magic-media";
async function mediaDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(dbName, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("media");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function storeBlob(id: string, file: Blob) {
  const db = await mediaDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("media", "readwrite");
    tx.objectStore("media").put(file, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
const mediaCache = new Map<string, { url: string; expires: number }>();
async function mediaSource(src: string, path?: string): Promise<string> {
  const key = path || src;
  const cached = mediaCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.url;
  if (path && supabase) {
    const { data, error } = await supabase.storage
      .from("birthday-media")
      .createSignedUrl(path, 3600);
    if (error) throw error;
    mediaCache.set(key, {
      url: data.signedUrl,
      expires: Date.now() + 50 * 60000,
    });
    return data.signedUrl;
  }
  if (src.startsWith("local:")) {
    const db = await mediaDB();
    try {
      const blob = await new Promise<Blob | undefined>((resolve, reject) => {
        const r = db
          .transaction("media")
          .objectStore("media")
          .get(src.slice(6));
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      if (!blob)
        throw new Error(
          "A local media file is missing. Remove it or choose a replacement.",
        );
      const url = URL.createObjectURL(blob);
      mediaCache.set(key, { url, expires: Infinity });
      return url;
    } finally {
      db.close();
    }
  }
  return src;
}
export async function resolveMedia(site: Site): Promise<Site> {
  return {
    ...site,
    music: await mediaSource(site.music, site.musicPath),
    chapters: await Promise.all(
      site.chapters.map(async (c) => ({
        ...c,
        media: await Promise.all(
          c.media.map(async (m) => ({
            ...m,
            src: await mediaSource(m.src, m.path),
          })),
        ),
      })),
    ),
  };
}
export async function listSites(): Promise<Site[]> {
  if (!supabase)
    return (
      JSON.parse(localStorage.getItem("mm-drafts") || "[]") as Site[]
    ).map((site) => ({
      ...site,
      isPublished: !!localStorage.getItem("mm-published-" + site.id),
    }));
  const { data, error } = await supabase
    .from("sites")
    .select("id,draft,slug,published_sites(site_id)")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
    ...row.draft,
    id: row.id,
    slug: row.slug,
    isPublished: Array.isArray(row.published_sites)
      ? row.published_sites.length > 0
      : !!row.published_sites,
  }));
}
export async function saveSite(site: Site) {
  if (!supabase) {
    const sites = await listSites();
    localStorage.setItem(
      "mm-drafts",
      JSON.stringify([site, ...sites.filter((s) => s.id !== site.id)]),
    );
    return;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in.");
  const { error } = await supabase.from("sites").upsert({
    id: site.id,
    owner_id: user.id,
    draft: site,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
export async function deleteSite(id: string) {
  if (!supabase) {
    localStorage.setItem(
      "mm-drafts",
      JSON.stringify((await listSites()).filter((s) => s.id !== id)),
    );
    localStorage.removeItem("mm-published-" + id);
    return;
  }
  const { error } = await supabase.from("sites").delete().eq("id", id);
  if (error) throw error;
}
export async function publish(site: Site) {
  await saveSite(site);
  if (!supabase) {
    localStorage.setItem(
      "mm-published-" + site.id,
      JSON.stringify({
        ...structuredClone(site),
        chapters: site.chapters.filter((c) => !c.hidden),
      }),
    );
    return site.id;
  }
  const { data, error } = await supabase.rpc("publish_site", {
    site_id: site.id,
  });
  if (error) throw error;
  return data as string;
}
export async function unpublish(id: string) {
  if (!supabase) {
    localStorage.removeItem("mm-published-" + id);
    return;
  }
  const { error } = await supabase.rpc("unpublish_site", { site_id: id });
  if (error) throw error;
}
export async function duplicateSite(source: Site) {
  const copy: Site = {
    ...structuredClone(source),
    id: crypto.randomUUID(),
    title: source.title + " (copy)",
    slug: undefined,
    updated: new Date().toISOString(),
  };
  if (!supabase) {
    await saveSite(copy);
    return;
  }
  await saveSite(copy);
  const copyPath = async (path: string) => {
    const { data, error } = await supabase!.storage
      .from("birthday-media")
      .download(path);
    if (error) throw error;
    const next = path.split("/");
    next[1] = copy.id;
    next[2] = crypto.randomUUID() + "." + path.split(".").pop();
    const target = next.join("/");
    const uploaded = await supabase!.storage
      .from("birthday-media")
      .upload(target, data, { contentType: data.type });
    if (uploaded.error) throw uploaded.error;
    return target;
  };
  try {
    for (const chapter of copy.chapters)
      for (const media of chapter.media)
        if (media.path) {
          media.path = await copyPath(media.path);
          media.src = "";
        }
    if (copy.musicPath) {
      copy.musicPath = await copyPath(copy.musicPath);
      copy.music = "";
    }
    await saveSite(copy);
  } catch (e) {
    await deleteSite(copy.id);
    throw e;
  }
}
