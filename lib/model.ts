export const chapterNames = [
  "Welcome and opening reveal",
  "Birthday countdown",
  "Birthday greeting",
  "About the recipient",
  "Our story timeline",
  "Photo gallery",
  "Video memories",
  "Personal letter",
  "Reasons you are special",
  "Wishes and notes",
  "Surprise reveal",
  "Final celebration",
];
export type Media = {
  id: string;
  kind: "image" | "video" | "audio";
  src: string;
  path?: string;
  caption: string;
  x: number;
  y: number;
  zoom: number;
};
export type Chapter = {
  id: string;
  title: string;
  text: string;
  hidden: boolean;
  media: Media[];
};
export type Site = {
  id: string;
  title: string;
  recipient: string;
  nickname: string;
  date: string;
  color: string;
  font: string;
  music: string;
  musicPath?: string;
  chapters: Chapter[];
  updated: string;
  slug?: string;
  isPublished?: boolean;
};
export function newSite(): Site {
  return {
    id: crypto.randomUUID(),
    title: "An unforgettable birthday",
    recipient: "",
    nickname: "",
    date: "",
    color: "#cab5ff",
    font: "serif",
    music: "",
    updated: new Date().toISOString(),
    chapters: chapterNames.map((title, i) => ({
      id: String(i),
      title,
      text: "",
      hidden: false,
      media: [],
    })),
  };
}
export function moveChapter(site: Site, id: string, direction: number): Site {
  const chapters = [...site.chapters];
  const index = chapters.findIndex((c) => c.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= chapters.length) return site;
  [chapters[index], chapters[target]] = [chapters[target], chapters[index]];
  return { ...site, chapters };
}
export function validateFile(file: Pick<File, "size" | "type">): Media["kind"] {
  const kind = file.type.startsWith("image/")
    ? "image"
    : file.type.startsWith("video/")
      ? "video"
      : file.type.startsWith("audio/")
        ? "audio"
        : null;
  if (
    !kind ||
    ![
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/webm",
      "audio/mpeg",
      "audio/ogg",
      "audio/wav",
    ].includes(file.type)
  )
    throw new Error("Use JPG, PNG, WebP, MP4, WebM, MP3, OGG or WAV.");
  if (
    file.size >
    (kind === "image" ? 10 : kind === "audio" ? 20 : 100) * 1024 * 1024
  )
    throw new Error("Maximum size: images 10 MB, music 20 MB, videos 100 MB.");
  return kind;
}
export function videoEmbed(value: string): string | null {
  try {
    const u = new URL(value);
    if (u.protocol !== "https:") return null;
    if (["youtube.com", "www.youtube.com", "youtu.be"].includes(u.hostname)) {
      const id =
        u.hostname === "youtu.be"
          ? u.pathname.slice(1)
          : u.searchParams.get("v");
      return id && /^[\w-]{11}$/.test(id)
        ? `https://www.youtube-nocookie.com/embed/${id}`
        : null;
    }
    if (u.hostname === "vimeo.com" && /^\/\d+$/.test(u.pathname))
      return `https://player.vimeo.com/video${u.pathname}`;
    return null;
  } catch {
    return null;
  }
}
export function safeMediaURL(value: string): string {
  try {
    const u = new URL(value);
    return ["https:", "blob:"].includes(u.protocol) ? value : "";
  } catch {
    return "";
  }
}
export function isEmbed(value: string): boolean {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      ((u.hostname === "www.youtube-nocookie.com" &&
        /^\/embed\/[\w-]{11}$/.test(u.pathname)) ||
        (u.hostname === "player.vimeo.com" &&
          /^\/video\/\d+$/.test(u.pathname)))
    );
  } catch {
    return false;
  }
}
