"use client";

import { useEffect, useRef } from "react";
import styles from "@/app/landing.module.css";

export function VideoScene({
  src,
  poster,
  label,
}: {
  src: string;
  poster: string;
  label: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyMotionPreference = () => {
      if (reduceMotion.matches) {
        video.pause();
        video.removeAttribute("loop");
      } else {
        video.loop = true;
        void video.play().catch(() => {});
      }
    };

    applyMotionPreference();
    reduceMotion.addEventListener("change", applyMotionPreference);
    return () => reduceMotion.removeEventListener("change", applyMotionPreference);
  }, []);

  return (
    <div className={`${styles.sceneVisual} ${styles.demoVideoVisual}`}>
      <video
        ref={videoRef}
        className={styles.demoVideo}
        muted
        playsInline
        autoPlay
        loop
        controls
        poster={poster}
        aria-label={label}
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
}
