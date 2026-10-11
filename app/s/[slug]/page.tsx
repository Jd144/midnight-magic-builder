"use client";
import { use, useEffect, useState } from "react";
import { Site } from "@/lib/model";
import { supabase, resolveMedia } from "@/lib/backend";
import RecipientDiary from "@/components/RecipientDiary";
import Experience from "@/components/Experience";
import { onlineSharing, readOnline } from '@/lib/online';
import {legacyGiftId,readLegacyGift,originalStudio} from '@/lib/legacy-gifts';
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
  const [earlier,setEarlier]=useState(false);
  async function unlock(e:React.FormEvent){e.preventDefault();setUnlocking(true);setUnlockError("");try{const r=await fetch((earlier?"/api/legacy-gifts/":"/api/sharing/")+slug+"/unlock",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});const d=await r.json() as {error:string};if(!r.ok)throw new Error(d.error);setPassword("");setError("");setAttempt(a=>a+1);}catch(e){setUnlockError((e as Error).message);}finally{setUnlocking(false);}}
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        let draft: Site;
        const requestedEarlier=new URLSearchParams(location.search).get('source')==='earlier';
        if(requestedEarlier&&legacyGiftId(slug)){setEarlier(true);draft=await readLegacyGift(slug);}
        else if (supabase) {
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
          if(stored)draft=JSON.parse(stored);
          else if(legacyGiftId(slug)){setEarlier(true);draft=await readLegacyGift(slug);}
          else throw new Error("Local demo snapshot not found. Demo links work only in the browser that created them.");
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
      {!supabase && !onlineSharing && !earlier && (
        <div className="share">
          BROWSER-ONLY DEMO SNAPSHOT · Visible only in this browser · This birthday
          snapshot is not publicly shared.
        </div>
      )}
      {site ? (
        <Experience site={site} theatrical>{earlier?<section className="diary chapter"><span className="eyebrow">YOUR ORIGINAL GIFT, PRESERVED</span><h2>Your private diary stays with you.</h2><p>If a private diary or wish capsule is enabled, open it in the original gift.</p><a className="primary pill" target="_top" href={originalStudio+'/s/'+slug+'#personal-diary'}>Open the original gift and private diary ↗</a></section>:onlineSharing&&<RecipientDiary id={slug}/>}</Experience>
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
