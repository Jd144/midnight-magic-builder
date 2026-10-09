"use client";
import { useEffect, useRef } from "react";
import { Site } from "@/lib/model";
import Experience from "./Experience";
export default function DevicePreview({
  site,
  device,
}: {
  site: Site;
  device: "desktop" | "mobile";
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  function send() {
    frame.current?.contentWindow?.postMessage(
      { type: "midnight-preview", site },
      location.origin,
    );
  }
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.source === frame.current?.contentWindow &&
        event.origin === location.origin &&
        event.data?.type === "midnight-preview-ready"
      )
        send();
    };
    window.addEventListener("message", receive);
    send();
    return () => window.removeEventListener("message", receive);
  }, [site, device]);
  return device === "desktop" ? (
    <Experience site={site} />
  ) : (
    <div className="mobile-preview">
      <iframe
        ref={frame}
        title="Mobile birthday preview"
        src="/preview"
        onLoad={send}
      />
    </div>
  );
}
