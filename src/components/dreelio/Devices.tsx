"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./Devices.module.css";
import {
  LANDING_VIEWPORT,
  TAP_PRESS,
  fadeScaleVariants,
  revealVariants,
} from "./motion";

export function Devices() {
  const [tab, setTab] = useState<"mobile" | "web">("mobile");
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      id="benefits"
      className={`${shared.section} ${styles.section}`}
      initial={reduceMotion ? false : "hidden"}
      whileInView="show"
      viewport={LANDING_VIEWPORT}
    >
      <div className={shared.container}>
        <motion.div className={shared.sectionHead} variants={revealVariants()}>
          <p className={shared.eyebrow}>Seamless across devices</p>
          <h2 className={shared.h2}>
            Unlock from anywhere,
            <br />
            stay in sync
          </h2>
        </motion.div>

        <motion.div className={styles.frame} variants={fadeScaleVariants}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={reduceMotion ? false : "hidden"}
              animate="show"
              exit={reduceMotion ? undefined : "exit"}
              variants={fadeScaleVariants}
            >
              <Image
                src={tab === "mobile" ? "/dreelio/img/mobile-app.png" : "/dreelio/img/devices.png"}
                alt={tab === "mobile" ? "A mockup of Velora Vault's mobile app" : "Velora Vault across devices"}
                width={1072}
                height={tab === "mobile" ? 870 : 806}
                sizes="(max-width: 1200px) 100vw, 1040px"
                className={styles.photo}
              />
            </motion.div>
          </AnimatePresence>

          <div className={styles.toggle} role="tablist" aria-label="Platform">
            <motion.button
              role="tab"
              aria-selected={tab === "mobile"}
              data-active={tab === "mobile"}
              onClick={() => setTab("mobile")}
              whileTap={reduceMotion ? undefined : TAP_PRESS}
            >
              Mobile App
            </motion.button>
            <motion.button
              role="tab"
              aria-selected={tab === "web"}
              data-active={tab === "web"}
              onClick={() => setTab("web")}
              whileTap={reduceMotion ? undefined : TAP_PRESS}
            >
              Web App
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
