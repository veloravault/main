"use client";

import { useId, type ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import styles from "./SecurityVisuals.module.css";
import { VaultSeal } from "./VaultSeal";
import {
  APPLE_EASE,
  LANDING_VIEWPORT,
  revealVariants,
  staggerContainer,
} from "./motion";

type SecurityFlowMode = "encryption" | "authorization" | "unlock";

type SecurityFlowVisualProps = {
  mode: SecurityFlowMode;
};

const FLOW_COPY: Record<
  SecurityFlowMode,
  { title: string; description: string; steps: readonly string[] }
> = {
  encryption: {
    title: "Encrypted before storage",
    description: "Readable vault data becomes ciphertext before it leaves the browser.",
    steps: ["Vault data", "Encrypted payload", "Sealed storage"],
  },
  authorization: {
    title: "Account access is checked",
    description: "A signed-in account must pass authorization before vault data is returned.",
    steps: ["Signed-in account", "Authorization gate", "Authorized vault"],
  },
  unlock: {
    title: "Unlock stays on this device",
    description: "A local PIN or platform authenticator recovers the wrapped master key into memory.",
    steps: ["This device", "Local check", "Key in memory"],
  },
};

const settleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: APPLE_EASE },
  },
};

const traceVariants: Variants = {
  hidden: { opacity: 0, scaleX: 0 },
  show: {
    opacity: 1,
    scaleX: 1,
    transition: { duration: 0.7, delay: 0.12, ease: APPLE_EASE },
  },
};

const gateTopVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: -7,
    transition: { duration: 0.52, delay: 0.22, ease: APPLE_EASE },
  },
};

const gateBottomVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  show: {
    opacity: 1,
    y: 7,
    transition: { duration: 0.52, delay: 0.22, ease: APPLE_EASE },
  },
};

function Trace({ short = false }: { short?: boolean }) {
  return (
    <motion.span
      className={`${styles.trace} ${short ? styles.traceShort : ""}`}
      variants={traceVariants}
    >
      <span className={styles.traceNode} />
    </motion.span>
  );
}

function EncryptionDiagram() {
  return (
    <>
      <motion.div className={styles.sourceCard} variants={settleVariants}>
        <span className={styles.sourceHeader} />
        <span className={styles.sourceRow} />
        <span className={styles.sourceRowShort} />
        <span className={styles.sourceRow} />
      </motion.div>
      <Trace />
      <motion.div className={styles.cipherGrid} variants={staggerContainer}>
        {Array.from({ length: 9 }, (_, index) => (
          <motion.span key={index} variants={settleVariants} />
        ))}
      </motion.div>
      <Trace />
      <VaultSeal compact />
    </>
  );
}

function AuthorizationDiagram() {
  return (
    <>
      <motion.div className={styles.accountGlyph} variants={settleVariants}>
        <span className={styles.accountHead} />
        <span className={styles.accountBody} />
      </motion.div>
      <Trace />
      <motion.div className={styles.gate} variants={settleVariants}>
        <span className={styles.gateRail} />
        <motion.span className={styles.gateTop} variants={gateTopVariants} />
        <motion.span className={styles.gateBottom} variants={gateBottomVariants} />
        <span className={styles.gateCheck}>✓</span>
      </motion.div>
      <Trace />
      <VaultSeal compact />
    </>
  );
}

function UnlockDiagram() {
  return (
    <>
      <motion.div className={styles.device} variants={settleVariants}>
        <span className={styles.deviceSpeaker} />
        <span className={styles.deviceGlyph}>
          <i />
          <i />
          <i />
        </span>
        <span className={styles.deviceHome} />
      </motion.div>
      <Trace />
      <motion.div className={styles.localKey} variants={settleVariants}>
        <span className={styles.keyBow} />
        <span className={styles.keyShaft} />
      </motion.div>
      <Trace />
      <VaultSeal compact />
    </>
  );
}

function VisualFrame({
  labelId,
  title,
  description,
  steps,
  tone,
  layout,
  children,
}: {
  labelId: string;
  title: string;
  description: string;
  steps: readonly string[];
  tone?: "recovery";
  layout?: "hero";
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.figure
      className={`${styles.visual} ${tone === "recovery" ? styles.recoveryVisual : ""} ${layout === "hero" ? styles.heroVisual : ""}`}
      aria-labelledby={labelId}
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "show"}
      viewport={LANDING_VIEWPORT}
      variants={staggerContainer}
    >
      <motion.figcaption
        id={labelId}
        className={styles.caption}
        variants={revealVariants(10)}
      >
        <strong>{title}</strong>
        <span>{description}</span>
      </motion.figcaption>

      <motion.div
        className={`${styles.diagram} ${layout === "hero" ? styles.heroDiagram : ""}`}
        aria-hidden="true"
        variants={revealVariants(12, 0.04)}
      >
        {children}
      </motion.div>

      <motion.ol className={`${styles.steps} ${layout === "hero" ? styles.heroSteps : ""}`} variants={staggerContainer}>
        {steps.map((step) => (
          <motion.li key={step} variants={settleVariants}>
            {step}
          </motion.li>
        ))}
      </motion.ol>
    </motion.figure>
  );
}

export function SecurityFlowVisual({ mode }: SecurityFlowVisualProps) {
  const labelId = useId();
  const copy = FLOW_COPY[mode];

  return (
    <VisualFrame labelId={labelId} {...copy}>
      {mode === "encryption" ? <EncryptionDiagram /> : null}
      {mode === "authorization" ? <AuthorizationDiagram /> : null}
      {mode === "unlock" ? <UnlockDiagram /> : null}
    </VisualFrame>
  );
}

export function SecurityHeroVisual() {
  const labelId = useId();

  return (
    <VisualFrame
      labelId={labelId}
      title="Protected through four distinct stages"
      description="Vault data is encrypted locally, checked against account access, and returned only for local unlock."
      steps={["Readable input", "Ciphertext", "Access gate", "Sealed storage"]}
      layout="hero"
    >
      <motion.div className={styles.sourceCard} variants={settleVariants}>
        <span className={styles.sourceHeader} />
        <span className={styles.sourceRow} />
        <span className={styles.sourceRowShort} />
        <span className={styles.sourceRow} />
      </motion.div>
      <Trace />
      <motion.div className={styles.cipherGrid} variants={staggerContainer}>
        {Array.from({ length: 9 }, (_, index) => (
          <motion.span key={index} variants={settleVariants} />
        ))}
      </motion.div>
      <Trace />
      <motion.div className={styles.gate} variants={settleVariants}>
        <span className={styles.gateRail} />
        <motion.span className={styles.gateTop} variants={gateTopVariants} />
        <motion.span className={styles.gateBottom} variants={gateBottomVariants} />
        <span className={styles.gateCheck}>✓</span>
      </motion.div>
      <Trace />
      <VaultSeal compact />
    </VisualFrame>
  );
}

export function RecoveryVisual() {
  const labelId = useId();

  return (
    <VisualFrame
      labelId={labelId}
      title="No master-key recovery path"
      description="Velora cannot reveal or recover a lost master key."
      steps={["Master key", "Not recoverable", "Protected offline copy"]}
      tone="recovery"
    >
      <motion.div className={styles.recoveryKey} variants={settleVariants}>
        <span className={styles.keyBow} />
        <span className={styles.keyShaft} />
      </motion.div>
      <Trace short />
      <motion.div className={styles.breakMark} variants={settleVariants}>
        <span />
        <span />
      </motion.div>
      <Trace short />
      <VaultSeal compact />
    </VisualFrame>
  );
}
