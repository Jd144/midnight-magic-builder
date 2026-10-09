"use client";
import { use, useEffect, useState } from "react";
import { Site } from "@/lib/model";
import { supabase, resolveMedia } from "@/lib/backend";
import Experience from "@/components/Experience";
export default function Published({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [site, setSite] = useState<Site | null>(null);
  const [error, setError] = useState("");
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
  }, [slug]);
  return (
    <>
      {!supabase && (
        <div className="share">
          BROWSER-ONLY DEMO SNAPSHOT · Visible only in this browser · This birthday
          snapshot is not publicly shared.
        </div>
      )}
      {site ? (
        <Experience site={site} />
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
