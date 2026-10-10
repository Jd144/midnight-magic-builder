"use client";
import { use, useEffect, useState } from "react";
import { Site } from "@/lib/model";
import { supabase, resolveMedia } from "@/lib/backend";
import RecipientDiary from "@/components/RecipientDiary";
import Experience from "@/components/Experience";
import { onlineSharing, readOnline } from '@/lib/online';
export default function Published({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [site, setSite] = useState<Site | null>(null);
  const [error, setError] = useState("");
  const [password,setPassword]=useState("");
  const [unlocking,setUnlocking]=useState(false);
  const [unlockError,setUnlockError]=useState("");
  const [attempt,setAttempt]=useState(0);
  async function unlock(e:React.FormEvent){e.preventDefault();setUnlocking(true);setUnlockError("");try{const r=await fetch("/api/sharing/"+slug+"/unlock",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});const d=await r.json() as {error:string};if(!r.ok)throw new Error(d.error);setPassword("");setError("");setAttempt(a=>a+1);}catch(e){setUnlockError((e as Error).message);}finally{setUnlocking(false);}}
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        let draft: Site;
        if (supabase) {
          const { data, error } = await supabase
            .from("published_sites")
            .select("snapshot")
            .eq("slug", slug)
            .single();
          if (error || !data)
            throw new Error(
              "This birthday story is unavailable. It may have been unpublished.",
            );
          draft = data.snapshot;
        } else if (onlineSharing) {
          draft = await readOnline(slug);
        } else {
          const stored = localStorage.getItem("mm-published-" + slug);
          if (!stored)
            throw new Error(
              "Local demo snapshot not found. Demo links work only in the browser that created them.",
            );
          draft = JSON.parse(stored);
        }
        const resolved = await resolveMedia(draft);
        if (active) setSite(resolved);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [slug,attempt]);
  return (
    <>
      {!supabase && !onlineSharing && (
        <div className="share">
          BROWSER-ONLY DEMO SNAPSHOT · Visible only in this browser · This birthday
          snapshot is not publicly shared.
        </div>
      )}
      {site ? (
        <Experience site={site} theatrical>{onlineSharing&&<RecipientDiary id={slug}/>}</Experience>
      ) : error === "PASSWORD_REQUIRED" ? (
        <main className="gift-lock"><div className="lock-stars" aria-hidden="true">✧ ✦ ✧</div><span className="eyebrow">A PRIVATE MIDNIGHT SURPRISE</span><h1>Some magic is<br/>just for you.</h1><p>Enter the password sent with your birthday gift.</p><form onSubmit={unlock}><label>Birthday password<input type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="primary" disabled={unlocking}>{unlocking?"Unlocking…":"Unlock my surprise ✦"}</button>{unlockError&&<p role="alert">{unlockError}</p>}</form><small>Your password stays out of the QR and link.</small></main>
      ) : (
        <main className="loading">
          {error || "Gathering a little magic…"}
          {error && (
            <p>
              <a href="/">Return to the studio</a>
            </p>
          )}
        </main>
      )}
    </>
  );
}
