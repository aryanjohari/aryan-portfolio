"use client";

import { useEffect, useRef, useState } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * A project's silent loop, with the face as its poster. There is no autoplay attribute:
 * this component starts it once it is mostly on screen, so with JS off or reduced motion
 * the visitor sees the still. There is no playback bar; the video sits in a button, so a
 * tap or Enter/Space pauses and resumes it (WCAG 2.2.2). If they pause it, it stays paused.
 */
export function ProjectVideo({ src, poster, className = "" }: { src: string; poster: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    const video = ref.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }

  useEffect(() => {
    const video = ref.current;
    if (!video || matchMedia(REDUCED_MOTION_QUERY).matches) return;

    let pausedByScroll = false;
    let started = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (!started || pausedByScroll)) {
          started = true;
          pausedByScroll = false;
          // Muted video may autoplay; a browser that still refuses leaves the poster and controls.
          video.play().catch(() => {});
        } else if (!entry.isIntersecting && !video.paused) {
          pausedByScroll = true;
          video.pause();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <button type="button" className="video-toggle" aria-label={playing ? "Pause video" : "Play video"} onClick={toggle}>
      <video
        ref={ref}
        className={`photo-image ${className}`}
        src={src}
        poster={poster}
        width={1200}
        height={800}
        muted
        loop
        playsInline
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
    </button>
  );
}
