"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRightIcon } from "lucide-react";
import { useVaultKey } from "@/components/auth/VaultKeyProvider";
import { supabase } from "@/lib/supabase";
import { getStrength } from "@/lib/passwordHealth";
import { type AvatarKind } from "@/components/PresetAvatar";
import { clearPlanIntentCookie, readPlanIntentCookie } from "@/lib/planIntent";
import {
  ONBOARDING_STEPS,
  FIRST_INTERACTIVE_INDEX,
  STEP_HEADINGS,
  INTRO_CONTENT,
  stepVariants,
  type OnboardingStepId,
} from "@/components/auth/onboarding-steps/onboardingSteps";
import { IntroScreen } from "@/components/auth/onboarding-steps/IntroScreen";
import { AvatarStep } from "@/components/auth/onboarding-steps/AvatarStep";
import { MasterKeyStep } from "@/components/auth/onboarding-steps/MasterKeyStep";
import { CompletionStep } from "@/components/auth/onboarding-steps/CompletionStep";
import shell from "@/components/auth/auth-shell.module.css";
import styles from "@/components/auth/onboarding.module.css";

export function OnboardingFlow({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { setMasterKey } = useVaultKey();

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [avatarKind, setAvatarKind] = useState<AvatarKind | null>(null);
  const [masterKey, setMasterKeyValue] = useState("");
  const [masterKeyConfirmation, setMasterKeyConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const step: OnboardingStepId = ONBOARDING_STEPS[index];
  const heading = STEP_HEADINGS[step];
  const masterKeyStrength = useMemo(() => getStrength(masterKey), [masterKey]);
  const variants = stepVariants(Boolean(reduceMotion));

  function goTo(nextIndex: number, dir: number) {
    setError("");
    setDirection(dir);
    setIndex(nextIndex);
  }
  const goNext = () => goTo(Math.min(index + 1, ONBOARDING_STEPS.length - 1), 1);
  const goBack = () => goTo(Math.max(index - 1, 0), -1);
  const skipIntro = () => goTo(FIRST_INTERACTIVE_INDEX, 1);

  async function completeOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!masterKey) {
      setError("Choose a vault master key.");
      return;
    }
    if (masterKeyStrength.level === "weak") {
      setError("Your master key is too weak. Use a longer key with a mix of letters, numbers, and symbols — it's the only thing protecting your vault.");
      return;
    }
    if (masterKey !== masterKeyConfirmation) {
      setError("The master key confirmation does not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: liveIdentity, error: liveIdentityError } = await supabase.auth.getUser();
      if (liveIdentityError || liveIdentity.user?.id !== userId) {
        throw new Error("Your secure session changed. Sign in again to continue.");
      }

      // Persist the avatar choice (skippable → initials fallback). Non-fatal.
      if (avatarKind) {
        const { error: metadataError } = await supabase.auth.updateUser({ data: { avatar_kind: avatarKind } });
        if (metadataError) console.error("Could not save avatar choice:", metadataError.message);
      }

      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true, expectedUserId: userId }),
      });
      if (!response.ok) throw new Error("Your account could not be activated. Please try again.");

      if (!setMasterKey(masterKey, userId)) {
        throw new Error("Your secure session changed. Sign in again to continue.");
      }

      setMasterKeyValue("");
      setMasterKeyConfirmation("");

      // Advance to the success state before navigating.
      setDirection(1);
      setIndex(ONBOARDING_STEPS.indexOf("done"));

      // If they picked a paid plan on the pricing page before signing up,
      // land straight in checkout instead of the plain dashboard.
      const intent = readPlanIntentCookie();
      clearPlanIntentCookie();
      router.replace(intent ? `/vault?upgrade=${intent.plan}&period=${intent.period}` : "/vault");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Setup could not be completed. Try again.");
      setSubmitting(false);
    }
  }

  const totalDots = ONBOARDING_STEPS.length - 1; // exclude the terminal "done" state

  return (
    <main className={shell.page}>
      <motion.section
        className={`${shell.stage} ${shell.compact}`}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
      >
        {step !== "done" && (
          <div className={styles.progress} role="progressbar" aria-valuemin={1} aria-valuemax={totalDots} aria-valuenow={index + 1}>
            {ONBOARDING_STEPS.slice(0, totalDots).map((id, dotIndex) => (
              <span key={id} className={styles.dotTrack}>
                {dotIndex === index && <motion.span layoutId="onboarding-dot" className={styles.dotActive} />}
                <span className={styles.dot} data-filled={dotIndex < index} />
              </span>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.header
            key={`heading-${step}`}
            className={shell.heading}
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
          >
            <p className={shell.eyebrow}>{heading.eyebrow}</p>
            <h1>{heading.title}</h1>
            <p>{heading.description}</p>
          </motion.header>
        </AnimatePresence>

        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={`content-${step}`}
            className={shell.content}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={reduceMotion ? { duration: 0.15 } : { type: "spring", stiffness: 420, damping: 34 }}
          >
            {step === "vault" && <IntroScreen icon={INTRO_CONTENT.vault.icon} bullets={INTRO_CONTENT.vault.bullets} />}
            {step === "security" && <IntroScreen icon={INTRO_CONTENT.security.icon} bullets={INTRO_CONTENT.security.bullets} />}

            {step === "avatar" && (
              <div className={shell.formStack}>
                <p className={shell.invitedEmail}>Signed up as <strong>{email}</strong></p>
                <AvatarStep selected={avatarKind} onSelect={setAvatarKind} />
                <button className={shell.primaryAction} type="button" onClick={goNext}>
                  <span>Continue</span>
                  <ArrowRightIcon width={17} height={17} aria-hidden="true" />
                </button>
                <div className={styles.stepFooter}>
                  <button type="button" className={shell.secondaryAction} onClick={goBack}>Back</button>
                  <button type="button" className={shell.textLink} onClick={() => { setAvatarKind(null); goNext(); }}>
                    Skip — use my initials
                  </button>
                </div>
              </div>
            )}

            {step === "master-key" && (
              <form className={shell.formStack} onSubmit={completeOnboarding} noValidate>
                <MasterKeyStep
                  masterKey={masterKey}
                  confirmation={masterKeyConfirmation}
                  onMasterKeyChange={setMasterKeyValue}
                  onConfirmationChange={setMasterKeyConfirmation}
                  strength={masterKeyStrength}
                  submitting={submitting}
                />
                {error && <p className={shell.alert} role="alert">{error}</p>}
                <button className={shell.primaryAction} type="submit" disabled={submitting}>
                  <span>{submitting ? "Setting up your vault…" : "Set master key"}</span>
                  <ArrowRightIcon width={17} height={17} aria-hidden="true" />
                </button>
                <div className={styles.stepFooter}>
                  <button type="button" className={shell.secondaryAction} onClick={goBack} disabled={submitting}>Back</button>
                </div>
                <p className={shell.securityNote}>The master key leaves this form only for local, in-memory vault access.</p>
              </form>
            )}

            {step === "done" && <CompletionStep />}
          </motion.div>
        </AnimatePresence>

        {(step === "vault" || step === "security") && (
          <div className={shell.formStack}>
            <button className={shell.primaryAction} type="button" onClick={goNext}>
              <span>Continue</span>
              <ArrowRightIcon width={17} height={17} aria-hidden="true" />
            </button>
            <div className={styles.stepFooter}>
              {step === "security"
                ? <button type="button" className={shell.secondaryAction} onClick={goBack}>Back</button>
                : <span />}
              <button type="button" className={shell.textLink} onClick={skipIntro}>Skip setup intro</button>
            </div>
          </div>
        )}
      </motion.section>
    </main>
  );
}
