"use client";

import { useEffect, useRef } from "react";
import styles from "@/app/landing.module.css";

export function PasswordVideoScene() {
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
    <div className={`${styles.sceneVisual} ${styles.passwordVideoVisual}`}>
      <video
        ref={videoRef}
        className={styles.passwordVideo}
        muted
        playsInline
        autoPlay
        loop
        controls
        poster="/videos/add-password-poster.png"
        aria-label="Walkthrough: adding a new password to Velora Vault"
      >
        <source src="/videos/add-password.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
