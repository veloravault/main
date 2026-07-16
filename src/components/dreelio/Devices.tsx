"use client";

import Image from "next/image";
import { useState } from "react";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./Devices.module.css";

export function Devices() {
  const [tab, setTab] = useState<"mobile" | "web">("mobile");

  return (
    <section id="benefits" className={`${shared.section} ${styles.section}`}>
      <div className={shared.container}>
        <div className={shared.sectionHead}>
          <p className={shared.eyebrow}>Seamless across devices</p>
          <h2 className={shared.h2}>
            Unlock from anywhere,
            <br />
            stay in sync
          </h2>
        </div>

        <div className={styles.frame}>
          <Image
            src={tab === "mobile" ? "/dreelio/img/mobile-app.png" : "/dreelio/img/devices.png"}
            alt={tab === "mobile" ? "A mockup of Velora Vault's mobile app" : "Velora Vault across devices"}
            width={1072}
            height={tab === "mobile" ? 870 : 806}
            sizes="(max-width: 1200px) 100vw, 1040px"
            className={styles.photo}
          />

          <div className={styles.toggle} role="tablist" aria-label="Platform">
            <button
              role="tab"
              aria-selected={tab === "mobile"}
              data-active={tab === "mobile"}
              onClick={() => setTab("mobile")}
            >
              Mobile App
            </button>
            <button
              role="tab"
              aria-selected={tab === "web"}
              data-active={tab === "web"}
              onClick={() => setTab("web")}
            >
              Web App
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
