"use client";
import { useEffect, useState } from "react";
import MemoryConstellation from "./MemoryConstellation";
import CartoonStory from "./CartoonStory";
import Keepsake from "./Keepsake";
import YouTubeSoundtrack from "./YouTubeSoundtrack";
import {NextBirthday,MeetingClock} from "./MagicClocks";
import {worlds,nextWorld} from "@/lib/magic";
import Celebration from "./Celebration";
import { Site, safeMediaURL, isEmbed } from "@/lib/model";
export default function Experience({
  site,
  compact = false,
  theatrical = false,
  children,
}: {
  site: Site;
  compact?: boolean;
  theatrical?: boolean;
  children?: React.ReactNode;
}) {
  const [world,setWorld]=useState(0);
  useEffect(()=>{if(!theatrical||site.rotateThemes===false)return;const key='mm-world-'+site.id;let choice=Math.floor(Math.random()*worlds.length);try{const previous=localStorage.getItem(key);if(previous!==null)choice=nextWorld(Number(previous));localStorage.setItem(key,String(choice));}catch{}setWorld(choice);},[site.id,site.rotateThemes,theatrical]);
  const scenery=worlds[world];
  const [opened, setOpened] = useState(!theatrical);
  const [curtainGone, setCurtainGone] = useState(!theatrical);
  useEffect(() => {if(!opened)return;const timer=setTimeout(()=>setCurtainGone(true),1600);return()=>clearTimeout(timer);},[opened]);
  const [now, setNow] = useState(0);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = site.date ? Math.max(0, new Date(site.date).getTime() - now) : 0;
  return (
    <div
      className={"experience world-"+world+" " + (compact ? "compact" : "")}
      style={
        {
          "--accent": theatrical&&site.rotateThemes!==false?scenery.accent:site.color,
          "--world-bg":scenery.background,"--world-glow":scenery.glow,"--curtain-main":scenery.curtain,
          backgroundColor:theatrical?scenery.background:undefined,
          fontFamily:
            site.font === "serif" ? "Georgia, serif" : "Arial, sans-serif",
        } as React.CSSProperties
      }
    >
      {!curtainGone && <div role="dialog" aria-modal="true" aria-label="Birthday premiere" className={"curtain-stage "+(opened?"curtain-opening":"")}><div className="curtain-panel curtain-left" aria-hidden="true"/><div className="curtain-panel curtain-right" aria-hidden="true"/>{!opened && <div className="curtain-invitation"><span className="eyebrow">YOUR MIDNIGHT PREMIERE</span><div className="curtain-seal" aria-hidden="true">✦</div><h1>A whole universe,<br/>waiting for you.</h1><p>Some stories deserve a grand entrance.</p><button className="primary" onClick={()=>setOpened(true)}>Draw the curtains ✦</button><small>Take your time. This moment is yours.</small></div>}</div>}
      <div inert={!opened} aria-hidden={!opened}>
      {theatrical&&<div className="world-label"><span>{scenery.name}</span>{site.rotateThemes!==false&&<button onClick={()=>{const n=nextWorld(world);setWorld(n);try{localStorage.setItem("mm-world-"+site.id,String(n));}catch{}}}>Change scenery ✦</button>}</div>}
      {!compact&&!!site.youtubeSongs?.some(s=>s.trim())&&<YouTubeSoundtrack songs={site.youtubeSongs}/>}
      {!compact && !site.youtubeSongs?.some(s=>s.trim()) && site.music && (
        <audio
          controls
          loop
          src={safeMediaURL(site.music)}
          aria-label="Optional background music"
        />
      )}
      {site.chapters
        .filter((c) => !c.hidden)
        .map((c, i) => (
          <section className={"chapter chapter-" + c.id} key={c.id}>
            <span className="eyebrow">
              CHAPTER {String(i + 1).padStart(2, "0")} · {c.title}
            </span>
            {c.id === "0" ? (
              <>
                <div className="moon" />
                <p className="eyebrow">A LITTLE UNIVERSE, JUST FOR YOU</p>
                <h1>
                  {site.recipient
                    ? `For ${site.nickname || site.recipient}`
                    : "Someone extraordinary."}
                </h1>
                <p>
                  {c.text ||
                    "Some people make the world a little brighter. This is a celebration of one of them."}
                </p>
                <a className="pill" href="#chapter-1">
                  Begin the magic ↓
                </a>
              </>
            ) : (
              <>
                <h2 id={"chapter-" + i}>{c.title}</h2>
                {c.id === "1" && (
                  <div className="countdown">
                    {site.date ? (
                      diff > 0 ? (
                        <>
                          <strong>
                            {Math.floor(diff / 86400000)}
                            <small>days</small>
                          </strong>
                          <strong>
                            {Math.floor(diff / 3600000) % 24}
                            <small>hours</small>
                          </strong>
                          <strong>
                            {Math.floor(diff / 60000) % 60}
                            <small>minutes</small>
                          </strong>
                          <strong>
                            {Math.floor(diff / 1000) % 60}
                            <small>seconds</small>
                          </strong>
                        </>
                      ) : (
                        <p>It’s time to celebrate ✨</p>
                      )
                    ) : (
                      <p>
                        The anticipation is part of the magic. Add a birthday
                        date.
                      </p>
                    )}
                  </div>
                )}
                {c.id === "1" && <NextBirthday site={site} now={now}/>}
                {c.id === "4" && <CartoonStory site={site}/>}
                {c.id === "5" && <MemoryConstellation site={site}/>}
                {c.id === "10" ? (
                  <>
                    <button
                      className="primary"
                      onClick={() => setRevealed(!revealed)}
                    >
                      {revealed ? "Hide surprise" : "Open your surprise ✦"}
                    </button>
                    {revealed && (
                      <><p>{c.text || "A wonderful surprise is waiting here."}</p><MeetingClock site={site} now={now}/></>
                    )}
                  </>
                ) : c.id === "4" || c.id === "8" || c.id === "9" ? (
                  <div className="notes">
                    {(c.text || "Add a memory, reason or wish on each line.")
                      .split("\n")
                      .filter(Boolean)
                      .map((text, j) => (
                        <p key={j}>
                          <span>{String(j + 1).padStart(2, "0")}</span>
                          {text}
                        </p>
                      ))}
                  </div>
                ) : (
                  <p className={c.id === "7" ? "letter" : ""}>
                    {c.text ||
                      `Add your ${c.title.toLowerCase()} in the editor. Make this chapter your own.`}
                  </p>
                )}
                {c.id === "11" && (
                  <><Celebration name={site.nickname || site.recipient}/><Keepsake site={site} accent={theatrical&&site.rotateThemes!==false?scenery.accent:site.color}/></>
                )}
              </>
            )}
            {c.media.length > 0 && (
              <div className="media-grid">
                {c.media.map((m) => (
                  <figure key={m.id}>
                    {m.kind === "image" ? (
                      <div className="crop">
                        <img
                          src={safeMediaURL(m.src)}
                          alt={m.caption || "Birthday memory"}
                          style={{
                            objectPosition: `${m.x}% ${m.y}%`,
                            transform: `scale(${m.zoom})`,
                            transformOrigin: `${m.x}% ${m.y}%`,
                          }}
                        />
                      </div>
                    ) : m.kind === "video" ? (
                      isEmbed(m.src) ? (
                        <iframe
                          src={safeMediaURL(m.src)}
                          title={m.caption || "Video memory"}
                          allow="fullscreen; picture-in-picture"
                        />
                      ) : (
                        <video
                          controls
                          preload="metadata"
                          src={safeMediaURL(m.src)}
                        />
                      )
                    ) : (
                      <audio controls src={safeMediaURL(m.src)} />
                    )}
                    <figcaption>{m.caption}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>
        ))}
      {children}
      </div>
    </div>
  );
}
