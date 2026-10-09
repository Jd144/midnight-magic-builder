"use client";
import { useEffect, useState } from "react";
import {
  Plus,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Sparkles,
  LayoutGrid,
  BookOpen,
  Palette,
  Image as ImageIcon,
  Check,
  Copy,
  Trash2,
  ExternalLink,
  Music,
} from "lucide-react";
import {
  Chapter,
  Media,
  Site,
  newSite,
  moveChapter,
  validateFile,
  videoEmbed,
} from "@/lib/model";
import {
  supabase,
  listSites,
  saveSite,
  deleteSite,
  publish,
  unpublish,
  storeBlob,
  resolveMedia,
  duplicateSite,
} from "@/lib/backend";
import Experience from "@/components/Experience";
import DevicePreview from "@/components/DevicePreview";
import { generateQR, snapshotURL } from "@/lib/qr";
export default function Home() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [site, setSite] = useState<Site | null>(null);
  const [selected, setSelected] = useState("0");
  const [tab, setTab] = useState("story");
  const [preview, setPreview] = useState(false);
  const [resolved, setResolved] = useState<Site | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [auth, setAuth] = useState(false);
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [link, setLink] = useState("");
  const [share, setShare] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [qr, setQR] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const dirty = !!site && JSON.stringify(site) !== savedContent;
  useEffect(() => {
    setSavedContent(
      sites.some((s) => s.id === site?.id) ? JSON.stringify(site) : "",
    );
  }, [site?.id]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    let active = true;
    setQR("");
    if (share)
      generateQR(share)
        .then((value) => {
          if (active) setQR(value);
        })
        .catch((e) => setMessage(e.message));
    return () => {
      active = false;
    };
  }, [share]);
  function openStory(value: Site) {
    setSite(value);
    setSelected("0");
    setTab("story");
    setPreview(false);
    setShare(
      value.isPublished
        ? snapshotURL(
            process.env.NEXT_PUBLIC_SITE_URL || location.origin,
            value.slug || value.id,
          )
        : "",
    );
  }
  async function refresh() {
    try {
      setSites(await listSites());
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  useEffect(() => {
    if (!supabase) {
      setReady(true);
      void refresh();
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user.email || null);
      setReady(true);
      if (data.session) void refresh();
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user.email || null);
      if (session) setTimeout(() => void refresh(), 0);
      else setSites([]);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    let cancelled = false;
    if (site)
      resolveMedia(site)
        .then((value) => {
          if (!cancelled) setResolved(value);
        })
        .catch((e) => setMessage(e.message));
    return () => {
      cancelled = true;
    };
  }, [site]);
  function update(patch: Partial<Site>) {
    if (site)
      setSite((current) =>
        current && current.id === site.id
          ? { ...current, ...patch, updated: new Date().toISOString() }
          : current,
      );
  }
  const chapter = site?.chapters.find((c) => c.id === selected);
  function updateChapter(patch: Partial<Chapter>) {
    if (site)
      setSite((current) =>
        current && current.id === site.id
          ? {
              ...current,
              updated: new Date().toISOString(),
              chapters: current.chapters.map((c) =>
                c.id === selected ? { ...c, ...patch } : c,
              ),
            }
          : current,
      );
  }
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!site) return;
    await saveSite(site);
    setSavedContent(JSON.stringify(site));
    await refresh();
    setMessage(
      supabase ? "Saved to your account." : "Saved on this browser. Demo mode.",
    );
  }
  async function upload(file: File, replaceId?: string) {
    if (!site || !chapter) return;
    setProgress(0);
    try {
      const kind = validateFile(file);
      const id = crypto.randomUUID();
      let src = "local:" + id;
      let path: string | undefined;
      if (supabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Sign in before uploading.");
        await saveSite(site);
        path = `${session.user.id}/${site.id}/${id}.${file.name.split(".").pop()?.toLowerCase()}`;
        const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `${base}/storage/v1/object/birthday-media/${path}`);
          xhr.setRequestHeader("apikey", key);
          xhr.setRequestHeader(
            "Authorization",
            `Bearer ${session.access_token}`,
          );
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable)
              setProgress(Math.round((e.loaded / e.total) * 100));
          };
          xhr.onload = () =>
            xhr.status < 300
              ? resolve()
              : reject(
                  new Error(
                    "Upload failed. Check storage configuration and file limits.",
                  ),
                );
          xhr.onerror = () => reject(new Error("Upload connection failed."));
          xhr.send(file);
        });
        src = "";
      } else {
        await storeBlob(id, file);
        setProgress(100);
      }
      if (kind === "audio") {
        update({ music: src, musicPath: path });
      } else {
        const previous = chapter.media.find((m) => m.id === replaceId);
        const media: Media = {
          id,
          kind,
          src,
          path,
          caption: previous?.caption || "",
          x: previous?.x ?? 50,
          y: previous?.y ?? 50,
          zoom: previous?.zoom ?? 1,
        };
        updateChapter({
          media: replaceId
            ? chapter.media.map((m) => (m.id === replaceId ? media : m))
            : [...chapter.media, media],
        });
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setProgress(null);
    }
  }
  function editMedia(id: string, patch: Partial<Media>) {
    if (chapter)
      updateChapter({
        media: chapter.media.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      });
  }
  if (!ready) return <main className="loading">Opening your universe…</main>;
  return (
    <>
      <header>
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            if (site) {
              e.preventDefault();
              void action(async () => {
                await save();
                setSite(null);
                setPreview(false);
              });
            }
          }}
        >
          <span>✦</span> midnight<span className="brand-light">magic</span>
        </a>
        <div className="header-right">
          <span className="mode">
            {supabase ? "CONNECTED BACKEND" : "LOCAL DEMO"}
          </span>
          {supabase ? (
            <button
              onClick={() =>
                user
                  ? void action(async () => {
                      await supabase!.auth.signOut();
                      setSite(null);
                    })
                  : setAuth(true)
              }
            >
              {user ? "Log out" : "Sign in"}
            </button>
          ) : (
            <span className="muted desktop-only">
              No account needed to explore
            </span>
          )}
        </div>
      </header>
      {message && (
        <div className="toast" role="status">
          {message}
          <button aria-label="Dismiss message" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}
      {site ? (
        <>
          <div className="editor-bar">
            <button
              onClick={() => {
                void action(async () => {
                  await save();
                  setSite(null);
                  setPreview(false);
                  setShare("");
                });
              }}
            >
              <ArrowLeft size={16} /> Dashboard
            </button>
            <strong>{site.title}</strong>
            <span className="save-status" aria-live="polite">
              {busy
                ? "Saving…"
                : dirty
                  ? "Unsaved changes"
                  : "All changes saved"}
            </span>
            <div>
              <button onClick={() => setPreview(!preview)}>
                <Eye size={16} />
                {preview ? "Edit" : "Preview"}
              </button>
              <button disabled={busy} onClick={() => void action(save)}>
                Save draft
              </button>
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    const slug = await publish(site);
                    setSavedContent(JSON.stringify(site));
                    setShare(
                      snapshotURL(
                        process.env.NEXT_PUBLIC_SITE_URL || location.origin,
                        slug,
                      ),
                    );
                    setMessage(
                      supabase
                        ? "Published snapshot created. Draft changes stay private until you publish again."
                        : "Local demo snapshot created. This link works only in this browser.",
                    );
                    await refresh();
                  })
                }
              >
                <Sparkles size={16} />
                {supabase ? "Publish snapshot" : "Create demo snapshot"}
              </button>
            </div>
          </div>
          {share && (
            <div className="share">
              <span>
                {supabase ? "Snapshot link" : "Browser-only demo link"}
              </span>
              <a href={share} target="_blank" rel="noreferrer">
                {share}
              </a>
              <button
                onClick={() =>
                  void navigator.clipboard
                    .writeText(share)
                    .then(() => setMessage("Link copied."))
                    .catch(() =>
                      setMessage("Copy the displayed link manually."),
                    )
                }
              >
                <Copy size={15} />
                Copy
              </button>
              {qr && (
                <div className="qr-download">
                  <img src={qr} alt="QR code for this snapshot link" />
                  <a href={qr} download={`midnight-magic-${site.id}-qr.png`}>
                    Download QR code
                  </a>
                  {!supabase && <small>Demo QR · same browser only</small>}
                </div>
              )}
              <button
                onClick={() =>
                  void action(async () => {
                    await unpublish(site.id);
                    setShare("");
                    setMessage("Snapshot removed.");
                    await refresh();
                  })
                }
              >
                Unpublish
              </button>
            </div>
          )}
          {preview ? (
            <>
              <div className="preview-toolbar">
                <span>
                  Draft preview ·{" "}
                  {device === "mobile"
                    ? "390px phone viewport"
                    : "Desktop viewport"}
                </span>
                <div>
                  <button
                    aria-pressed={device === "desktop"}
                    onClick={() => setDevice("desktop")}
                  >
                    Desktop preview
                  </button>
                  <button
                    aria-pressed={device === "mobile"}
                    onClick={() => setDevice("mobile")}
                  >
                    Mobile preview
                  </button>
                </div>
              </div>
              {resolved && <DevicePreview site={resolved} device={device} />}
            </>
          ) : (
            <div className="editor">
              <aside className="chapter-list">
                <div className="eyebrow">YOUR 12 CHAPTERS</div>
                <p className="muted">Every great gift tells a story.</p>
                {site.chapters.map((c, i) => (
                  <div
                    className={
                      "chapter-row " + (selected === c.id ? "active" : "")
                    }
                    key={c.id}
                  >
                    <button onClick={() => setSelected(c.id)}>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      {c.title}
                      {c.hidden && <EyeOff size={13} />}
                    </button>
                    <div>
                      <button
                        aria-label={"Move " + c.title + " up"}
                        disabled={i === 0}
                        onClick={() => setSite(moveChapter(site, c.id, -1))}
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        aria-label={"Move " + c.title + " down"}
                        disabled={i === 11}
                        onClick={() => setSite(moveChapter(site, c.id, 1))}
                      >
                        <ArrowDown size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="aside-tip">
                  ✧ A little thought goes a long way.
                  <br />
                  <span>Start with words. Add memories. Make it theirs.</span>
                </div>
              </aside>
              <main className="controls">
                <nav className="tabs">
                  {[
                    ["story", "Story", BookOpen],
                    ["style", "Style", Palette],
                    ["media", "Media", ImageIcon],
                  ].map(([id, label, Icon]) => (
                    <button
                      key={id as string}
                      className={tab === id ? "active" : ""}
                      onClick={() => setTab(id as string)}
                    >
                      {typeof Icon !== "string" && <Icon size={16} />}{" "}
                      {label as string}
                    </button>
                  ))}
                </nav>
                {tab === "story" && chapter && (
                  <>
                    <div className="eyebrow">MAKE IT PERSONAL</div>
                    <h2>{chapter.title}</h2>
                    <p className="muted">The best words are your own.</p>
                    <label>
                      Website title
                      <input
                        value={site.title}
                        maxLength={100}
                        onChange={(e) => update({ title: e.target.value })}
                      />
                    </label>
                    <div className="two">
                      <label>
                        Recipient name
                        <input
                          placeholder="Who are we celebrating?"
                          value={site.recipient}
                          maxLength={100}
                          onChange={(e) =>
                            update({ recipient: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Nickname
                        <input
                          placeholder="Optional"
                          value={site.nickname}
                          maxLength={100}
                          onChange={(e) => update({ nickname: e.target.value })}
                        />
                      </label>
                    </div>
                    <label>
                      Birthday date and time
                      <input
                        aria-label="Birthday date and time"
                        type="datetime-local"
                        value={site.date}
                        onChange={(e) => update({ date: e.target.value })}
                      />
                      <small>Uses the visitor’s local timezone.</small>
                    </label>
                    <label>
                      Chapter heading
                      <input
                        value={chapter.title}
                        maxLength={150}
                        onChange={(e) =>
                          updateChapter({ title: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Your words
                      <textarea
                        aria-label="Your words"
                        rows={7}
                        value={chapter.text}
                        maxLength={10000}
                        placeholder={
                          ["4", "8", "9"].includes(chapter.id)
                            ? "Add one memory, reason or wish per line…"
                            : "Write something they’ll want to read again…"
                        }
                        onChange={(e) =>
                          updateChapter({ text: e.target.value })
                        }
                      />
                    </label>
                    <button
                      onClick={() => updateChapter({ hidden: !chapter.hidden })}
                    >
                      {chapter.hidden ? (
                        <Eye size={16} />
                      ) : (
                        <EyeOff size={16} />
                      )}{" "}
                      {chapter.hidden
                        ? "Show this chapter"
                        : "Hide this chapter"}
                    </button>
                  </>
                )}
                {tab === "style" && (
                  <>
                    <div className="eyebrow">SET THE MOOD</div>
                    <h2>A universe of your own.</h2>
                    <label>
                      Accent color
                      <input
                        type="color"
                        value={site.color}
                        onChange={(e) => update({ color: e.target.value })}
                      />
                    </label>
                    <div className="swatches">
                      {[
                        "#cab5ff",
                        "#ffb9ca",
                        "#eacb88",
                        "#91ddd3",
                        "#a3c5ff",
                      ].map((color) => (
                        <button
                          key={color}
                          aria-label={"Choose " + color}
                          style={{ background: color }}
                          onClick={() => update({ color })}
                        />
                      ))}
                    </div>
                    <label>
                      Typography
                      <select
                        value={site.font}
                        onChange={(e) => update({ font: e.target.value })}
                      >
                        <option value="serif">Timeless serif</option>
                        <option value="sans">Modern sans</option>
                      </select>
                    </label>
                    <label>
                      Optional music URL
                      <input
                        type="url"
                        placeholder="https://…/your-song.mp3"
                        value={
                          site.musicPath || site.music.startsWith("local:")
                            ? ""
                            : site.music
                        }
                        onChange={(e) =>
                          update({
                            music: e.target.value,
                            musicPath: undefined,
                          })
                        }
                      />
                      <small>
                        Use a direct HTTPS audio file you have permission to
                        share. Visitors start playback themselves.
                      </small>
                    </label>
                    <p className="muted">
                      <Music size={18} /> Music never plays automatically.
                      Animation follows the visitor’s reduced motion preference.
                    </p>
                  </>
                )}
                {tab === "media" && chapter && (
                  <>
                    <div className="eyebrow">COLLECT THE LITTLE MOMENTS</div>
                    <h2>Memories, brought to life.</h2>
                    <p className="muted">Add media to “{chapter.title}”.</p>
                    <label className="upload">
                      {" "}
                      <Plus /> Choose photos, video or music
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,audio/mpeg,audio/ogg,audio/wav"
                        onChange={(e) => {
                          if (e.target.files?.[0])
                            void upload(e.target.files[0]);
                          e.target.value = "";
                        }}
                      />
                      <small>Images 10 MB · Videos 100 MB · Music 20 MB</small>
                    </label>
                    {progress !== null && (
                      <label>
                        Uploading {progress}%
                        <progress value={progress} max={100} />
                      </label>
                    )}
                    <label>
                      YouTube or Vimeo link
                      <input
                        placeholder="https://www.youtube.com/watch?v=…"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                      />
                    </label>
                    <button
                      onClick={() => {
                        const src = videoEmbed(link);
                        if (!src) {
                          setMessage(
                            "Enter a valid HTTPS YouTube watch link, youtu.be link or Vimeo video link.",
                          );
                          return;
                        }
                        updateChapter({
                          media: [
                            ...chapter.media,
                            {
                              id: crypto.randomUUID(),
                              kind: "video",
                              src,
                              caption: "",
                              x: 50,
                              y: 50,
                              zoom: 1,
                            },
                          ],
                        });
                        setLink("");
                      }}
                    >
                      Add video link
                    </button>
                    {chapter.media.map((m, i) => (
                      <div className="media-edit" key={m.id}>
                        {m.kind === "image" && (
                          <div className="crop">
                            <img
                              alt={m.caption || "Selected image"}
                              src={
                                resolved?.chapters.find(
                                  (c) => c.id === chapter.id,
                                )?.media[i]?.src
                              }
                              style={{
                                objectPosition: `${m.x}% ${m.y}%`,
                                transform: `scale(${m.zoom})`,
                                transformOrigin: `${m.x}% ${m.y}%`,
                              }}
                            />
                          </div>
                        )}
                        <label>
                          Caption / image description
                          <input
                            value={m.caption}
                            onChange={(e) =>
                              editMedia(m.id, { caption: e.target.value })
                            }
                          />
                        </label>
                        {m.kind === "image" && (
                          <>
                            {(["x", "y", "zoom"] as const).map((field) => (
                              <label key={field}>
                                {field === "zoom"
                                  ? "Crop zoom"
                                  : field === "x"
                                    ? "Horizontal position"
                                    : "Vertical position"}
                                <input
                                  type="range"
                                  min={field === "zoom" ? 1 : 0}
                                  max={field === "zoom" ? 3 : 100}
                                  step={field === "zoom" ? 0.05 : 1}
                                  value={m[field]}
                                  onChange={(e) =>
                                    editMedia(m.id, {
                                      [field]: Number(e.target.value),
                                    })
                                  }
                                />
                              </label>
                            ))}
                          </>
                        )}
                        <label>
                          Replace this memory
                          <input
                            type="file"
                            accept={
                              m.kind === "image"
                                ? "image/jpeg,image/png,image/webp"
                                : "video/mp4,video/webm"
                            }
                            onChange={(e) => {
                              if (e.target.files?.[0])
                                void upload(e.target.files[0], m.id);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <button
                          onClick={() =>
                            updateChapter({
                              media: chapter.media.filter((v) => v.id !== m.id),
                            })
                          }
                        >
                          <Trash2 size={14} />
                          Remove memory
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </main>
              <aside className="live-preview">
                <div className="preview-label">
                  <span>
                    <span className="dot" /> LIVE PREVIEW
                  </span>
                  <span>Changes appear as you type</span>
                </div>
                <div className="preview-window">
                  {resolved && (
                    <Experience
                      compact
                      site={{
                        ...resolved,
                        chapters: resolved.chapters.filter(
                          (c) => c.id === selected,
                        ),
                      }}
                    />
                  )}
                </div>
              </aside>
            </div>
          )}
        </>
      ) : (
        <main className="dashboard">
          <div className="dashboard-nav">
            <span>
              <LayoutGrid size={18} /> Your studio
            </span>
            <span className="muted">A thoughtful gift starts here.</span>
          </div>
          <section className="hero">
            <div className="hero-content">
              <p className="eyebrow">FOR THE PEOPLE WHO LIGHT UP YOUR WORLD</p>
              <h1>
                Some gifts are opened.
                <br />
                <em>This one is felt.</em>
              </h1>
              <p>
                Turn your words, memories, and little moments into
                <br className="desktop-only" /> a birthday experience they’ll
                never forget.
              </p>
              <button
                className="primary"
                onClick={() => {
                  if (supabase && !user) {
                    setAuth(true);
                    return;
                  }
                  openStory(newSite());
                  setSelected("0");
                  setShare("");
                }}
              >
                <Plus size={18} />
                Create a birthday website
              </button>
              <span className="hero-note">
                12 beautiful chapters. Endless ways to say you care.
              </span>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="art-moon" />
              <span className="star s1">✦</span>
              <span className="star s2">✧</span>
              <span className="star s3">✦</span>
              <div className="art-card">
                <span>MADE OF MEMORIES & A LITTLE MAGIC</span>
                <h3>
                  One person.
                  <br />A whole universe.
                </h3>
                <p>A birthday story, told by you.</p>
                <span>✧ ─────── ✧</span>
              </div>
            </div>
          </section>
          <div className="collection-heading">
            <div>
              <h2>
                Your birthday stories <span>{sites.length}</span>
              </h2>
              <p className="muted">A little magic in the making.</p>
            </div>
            <span className="muted">
              <Check size={15} />{" "}
              {supabase ? "Private drafts" : "Saved in this browser"}
            </span>
          </div>
          {sites.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">✦</div>
              <h3>Your first story is waiting.</h3>
              <p>
                Start with a name. Fill it with memories.
                <br />
                Watch something beautiful come together.
              </p>
              <button
                onClick={() => {
                  if (supabase && !user) {
                    setAuth(true);
                    return;
                  }
                  openStory(newSite());
                  setSelected("0");
                }}
              >
                <Plus size={16} />
                Start creating
              </button>
            </div>
          ) : (
            <div className="site-grid">
              {sites.map((s) => (
                <article className="site-card" key={s.id}>
                  <button
                    className="card-cover"
                    style={{ "--accent": s.color } as React.CSSProperties}
                    onClick={() => {
                      openStory(s);
                    }}
                  >
                    <span>✧</span>
                    <h3>{s.recipient || "A story in the making"}</h3>
                    <small>
                      {s.chapters.filter((c) => !c.hidden).length} chapters of
                      magic
                    </small>
                  </button>
                  <div className="card-info">
                    <h3>{s.title}</h3>
                    <p>
                      Updated {new Date(s.updated).toLocaleDateString()} ·{" "}
                      {s.isPublished
                        ? supabase
                          ? "Published"
                          : "Demo snapshot"
                        : "Draft"}
                    </p>
                    <div>
                      <button
                        onClick={() => {
                          openStory(s);
                        }}
                      >
                        Open editor <ExternalLink size={13} />
                      </button>
                      <button
                        aria-label={"Duplicate " + s.title}
                        onClick={() =>
                          void action(async () => {
                            await duplicateSite(s);
                            await refresh();
                          })
                        }
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        aria-label={"Delete " + s.title}
                        onClick={() => setDeleteId(s.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="bottom-note">
            <span>✧</span>
            <div>
              <strong>Meaningful by design.</strong>
              <p>Your words. Your memories. Their unforgettable moment.</p>
            </div>
            <span className="muted">Crafted for every kind of connection.</span>
          </div>
          {!supabase && (
            <p className="demo-disclaimer">
              Local demo: drafts and media stay in this browser. No real
              authentication or public publishing. Clear browser data to remove
              them.
            </p>
          )}
        </main>
      )}
      <footer>
        midnight magic <span>A little love, beautifully told.</span>
      </footer>
      {auth && (
        <div className="modal">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action(async () => {
                const { error } = signup
                  ? await supabase!.auth.signUp({ email, password })
                  : await supabase!.auth.signInWithPassword({
                      email,
                      password,
                    });
                if (error) throw error;
                setMessage(
                  signup
                    ? "Check your email if confirmation is required."
                    : "Signed in.",
                );
                setAuth(false);
              });
            }}
          >
            <button
              type="button"
              className="close"
              aria-label="Close sign in"
              onClick={() => setAuth(false)}
            >
              ×
            </button>
            <p className="eyebrow">YOUR PRIVATE STUDIO</p>
            <h2>{signup ? "Create an account" : "Welcome back."}</h2>
            <label>
              Email
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                required
                type="password"
                minLength={8}
                autoComplete={signup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button disabled={busy} className="primary">
              {signup ? "Sign up" : "Log in"}
            </button>
            <button type="button" onClick={() => setSignup(!signup)}>
              {signup
                ? "Already have an account? Log in"
                : "New here? Create an account"}
            </button>
          </form>
        </div>
      )}
      {deleteId && (
        <div className="modal">
          <div>
            <h2>Delete this birthday story?</h2>
            <p>This removes the draft and published snapshot.</p>
            <button onClick={() => setDeleteId(null)}>Keep story</button>
            <button
              className="danger"
              onClick={() =>
                void action(async () => {
                  await deleteSite(deleteId);
                  setDeleteId(null);
                  await refresh();
                })
              }
            >
              Delete story
            </button>
          </div>
        </div>
      )}
    </>
  );
}
