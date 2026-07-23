"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  BanknoteIcon,
  CalendarClockIcon,
  CreditCardIcon,
  IdCardIcon,
  KeyRoundIcon,
  LockKeyholeIcon,
  NotebookPenIcon,
  SearchIcon,
  ShieldCheckIcon,
  TimerIcon,
  UploadCloudIcon,
  Wand2Icon,
} from "lucide-react";
import shared from "@/app/velora/velora.module.css";
import styles from "./FeatureSplit.module.css";
import { ParallaxMedia } from "./ParallaxMedia";
import {
  HOVER_LIFT,
  LANDING_VIEWPORT,
  TAP_PRESS,
  revealVariants,
  staggerContainer,
  staggerItem,
} from "./motion";
import { VeloraProductPreview, type VeloraPreviewVariant } from "./VeloraProductPreview";

// Keys must match the actual pill labels passed in from data.ts
// (PROJECT_PILLS/DOCUMENT_PILLS/FINANCE_PILLS).
const PILL_ICONS = {
  "Saved logins": KeyRoundIcon,
  "Auto-lock timer": TimerIcon,
  "Secure notes": NotebookPenIcon,
  "Password health": ShieldCheckIcon,
  "Identity files": IdCardIcon,
  "Protected uploads": UploadCloudIcon,
  "Expiry details": CalendarClockIcon,
  "Fast search": SearchIcon,
  Cards: CreditCardIcon,
  "Bank details": BanknoteIcon,
  "Encrypted CVV": LockKeyholeIcon,
  "Magic import": Wand2Icon,
} as const;

type Props = {
  id?: string;
  eyebrow: string;
  title: React.ReactNode;
  body: React.ReactNode;
  pills: readonly string[];
  preview: Extract<VeloraPreviewVariant, "passwords" | "documents" | "wallet">;
  reverse?: boolean;
};

export function FeatureSplit({ id, eyebrow, title, body, pills, preview, reverse }: Props) {
  const reduceMotion = useReducedMotion();
  const media = (
    <ParallaxMedia className={styles.frame} distance={12}>
      <div className={styles.card}>
        <VeloraProductPreview variant={preview} />
      </div>
    </ParallaxMedia>
  );

  const copy = (
    <motion.div
      className={styles.copy}
      variants={revealVariants(20)}
    >
      <motion.p className={shared.eyebrow} variants={staggerItem}>{eyebrow}</motion.p>
      <motion.h2 className={`${shared.h2} ${styles.title}`} variants={staggerItem}>{title}</motion.h2>
      <motion.p className={`${shared.lead} ${styles.body}`} variants={staggerItem}>{body}</motion.p>
      <motion.a
        href="#pricing"
        className={`${shared.btn} ${shared.btnDark} ${styles.cta}`}
        variants={staggerItem}
        whileHover={reduceMotion ? undefined : HOVER_LIFT}
        whileTap={reduceMotion ? undefined : TAP_PRESS}
      >
        Try Velora Vault free
      </motion.a>
      <motion.div className={styles.pills} variants={staggerContainer}>
        {pills.map((label) => {
          const Icon = PILL_ICONS[label as keyof typeof PILL_ICONS];
          return (
            <motion.span
              key={label}
              className={shared.featurePill}
              variants={staggerItem}
              whileHover={reduceMotion ? undefined : { y: -3 }}
            >
              {Icon && (
                <span className={shared.featurePillIcon}>
                  <Icon aria-hidden="true" />
                </span>
              )}
              <span>{label}</span>
            </motion.span>
          );
        })}
      </motion.div>
    </motion.div>
  );

  return (
    <motion.section
      id={id}
      className={`${shared.section} ${styles.section}`}
      initial={reduceMotion ? false : "hidden"}
      whileInView="show"
      viewport={LANDING_VIEWPORT}
    >
      <motion.div
        className={`${shared.container} ${styles.grid}`}
        data-reverse={reverse}
        variants={staggerContainer}
      >
        {reverse ? (
          <>
            {copy}
            {media}
          </>
        ) : (
          <>
            {media}
            {copy}
          </>
        )}
      </motion.div>
    </motion.section>
  );
}
