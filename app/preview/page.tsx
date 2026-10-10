"use client";
import { useEffect, useState } from "react";
import { Site } from "@/lib/model";
import Experience from "@/components/Experience";
export default function Preview() {
  const [site, setSite] = useState<Site | null>(null);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        window.parent !== window &&
        event.source === window.parent &&
        event.origin === location.origin &&
        event.data?.type === "midnight-preview"
      )
        setSite(event.data.site);
    };
    window.addEventListener("message", receive);
    if (window.parent !== window)
      window.parent.postMessage(
        { type: "midnight-preview-ready" },
        location.origin,
      );
    return () => window.removeEventListener("message", receive);
  }, []);
  return site ? (
    <Experience site={site} />
  ) : (
    <main className="loading">Open a story in the editor to preview it.</main>
  );
}
