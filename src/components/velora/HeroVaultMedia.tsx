"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import styles from "./HeroVaultMedia.module.css";

const VIDEO = "/videos/velora-vault-walkthrough.mp4";
const POSTER = "/videos/velora-vault-walkthrough-poster.png";

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
    addEventListener?: (type: "change", listener: () => void) => void;
    removeEventListener?: (type: "change", listener: () => void) => void;
  };
};

export function HeroVaultMedia() {
  const [preferenceReady, setPreferenceReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [saveData, setSaveData] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as NavigatorWithConnection).connection;
    const update = () => {
      setReduceMotion(media.matches);
      setSaveData(Boolean(connection?.saveData));
      setPreferenceReady(true);
    };

    update();
    media.addEventListener("change", update);
    connection?.addEventListener?.("change", update);
    return () => {
      media.removeEventListener("change", update);
      connection?.removeEventListener?.("change", update);
    };
  }, []);

  const shouldUsePoster = !preferenceReady || reduceMotion || saveData || failed;

  return (
    <div className={styles.media} data-playing={playing && !shouldUsePoster}>
      <Image
        src={POSTER}
        alt="Velora Vault overview showing protected passwords, documents, wallet records, and credentials"
        fill
        priority
        sizes="(max-width: 760px) 100vw, 1040px"
        className={styles.poster}
      />
      {!shouldUsePoster && (
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={POSTER}
          preload="metadata"
          aria-label="Velora Vault product walkthrough"
          className={styles.video}
          onCanPlay={() => setPlaying(true)}
          onError={() => setFailed(true)}
        >
          <source src={VIDEO} type="video/mp4" />
          Your browser does not support inline video playback.
        </video>
      )}
    </div>
  );
}

