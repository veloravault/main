"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import shared from "@/app/velora/velora.module.css";
import styles from "./Devices.module.css";
import {
  LANDING_VIEWPORT,
  TAP_PRESS,
  fadeScaleVariants,
  revealVariants,
} from "./motion";
import { VeloraProductPreview } from "./VeloraProductPreview";

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
              id={`devices-panel-${tab}`}
              role="tabpanel"
              aria-labelledby={`devices-tab-${tab}`}
              tabIndex={0}
              initial={reduceMotion ? false : "hidden"}
              animate="show"
              exit={reduceMotion ? undefined : "exit"}
              variants={fadeScaleVariants}
            >
              <VeloraProductPreview variant={tab === "mobile" ? "mobile" : "overview"} />
            </motion.div>
          </AnimatePresence>

          <div className={styles.toggle} role="tablist" aria-label="Platform">
            <motion.button
              id="devices-tab-mobile"
              role="tab"
              aria-selected={tab === "mobile"}
              aria-controls="devices-panel-mobile"
              data-active={tab === "mobile"}
              onClick={() => setTab("mobile")}
              whileTap={reduceMotion ? undefined : TAP_PRESS}
            >
              Mobile App
            </motion.button>
            <motion.button
              id="devices-tab-web"
              role="tab"
              aria-selected={tab === "web"}
              aria-controls="devices-panel-web"
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
