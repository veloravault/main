"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CheckIcon } from "lucide-react";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "@/app/pricing/pricing.module.css";
import { supabase } from "@/lib/supabase";
import { setPlanIntentCookie } from "@/lib/planIntent";
import { PRICING_COMPARISON, PRICING_FAQ, PRICING_TIERS, type PricingTier } from "./pricing-data";
import { APPLE_EASE, HOVER_LIFT, LANDING_VIEWPORT, TAP_PRESS, revealVariants, staggerContainer, staggerItem } from "./motion";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

type Billing = "monthly" | "annual";

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Real annual discount vs. paying monthly all year, rounded to a whole percent. */
function annualSavingsPercent(monthlyPrice: number, annualPrice: number): number {
  if (monthlyPrice <= 0) return 0;
  return Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100);
}

const priceDigits = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: APPLE_EASE } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.18, ease: APPLE_EASE } },
};

export function PricingPageContent() {
  const reduceMotion = useReducedMotion();
  const [billing, setBilling] = useState<Billing>("monthly");
  const [signedIn, setSignedIn] = useState(false);
  const { openAuth } = useAuthModal();
  const router = useRouter();

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) setSignedIn(data.session != null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setSignedIn(session != null);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const selectPlan = (tier: PricingTier) => {
    if (signedIn) {
      // Already signed in — skip the auth modal entirely and land straight on
      // the plan, checkout auto-triggered (see VaultApp's `upgrade` param).
      if (tier.id === "free") { router.push("/vault"); return; }
      router.push(`/vault?upgrade=${tier.id}&period=${billing === "annual" ? "yearly" : "monthly"}`);
      return;
    }
    if (tier.id !== "free") {
      // Remembered through signup + email confirmation + onboarding, so
      // checkout opens automatically the moment onboarding finishes.
      setPlanIntentCookie({ plan: tier.id, period: billing === "annual" ? "yearly" : "monthly" });
    }
    openAuth("sign-up");
  };

  return (
    <main className={styles.page}>
      <motion.div
        className={styles.hero}
        initial={reduceMotion ? false : "hidden"}
        animate="show"
        variants={revealVariants(18)}
      >
        <p className={shared.eyebrow}>Pricing</p>
        <h1>Simple, upfront pricing</h1>
        <p>
          Start free, no credit card required. Upgrade to Plus or Family
          whenever you need more storage or AI-assisted imports.
        </p>
        <div className={styles.betaNote}>
          <i aria-hidden="true" /> No credit card required to sign up
        </div>
      </motion.div>

      <div className={styles.toggle} role="group" aria-label="Billing period">
        <button type="button" aria-pressed={billing === "monthly"} onClick={() => setBilling("monthly")}>
          Monthly
        </button>
        <button type="button" aria-pressed={billing === "annual"} onClick={() => setBilling("annual")}>
          Annual
        </button>
      </div>

      <motion.div
        className={styles.grid}
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "show"}
        viewport={LANDING_VIEWPORT}
        variants={staggerContainer}
      >
        {PRICING_TIERS.map((tier) => {
          const isFree = tier.monthlyPrice === 0;
          const price = billing === "monthly" ? tier.monthlyPrice : Math.round(tier.annualPrice / 12);
          const displayPrice = INR.format(isFree ? 0 : price);
          const savings = annualSavingsPercent(tier.monthlyPrice, tier.annualPrice);

          return (
            <motion.article
              key={tier.name}
              className={`${styles.card} ${tier.featured ? styles.cardFeatured : ""}`}
              variants={staggerItem}
              whileHover={reduceMotion ? undefined : HOVER_LIFT}
            >
              {tier.featured && <span className={styles.badge}>Most popular</span>}
              <h2 className={styles.tierName}>{tier.name}</h2>
              <p className={styles.tagline}>{tier.tagline}</p>

              <div className={styles.priceRow}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={`${tier.name}-${billing}`}
                    className={styles.price}
                    {...(reduceMotion ? {} : priceDigits)}
                  >
                    {displayPrice}
                  </motion.span>
                </AnimatePresence>
                {!isFree && <span className={styles.period}>/month</span>}
              </div>
              <p className={styles.billingNote}>
                {isFree
                  ? "Forever"
                  : billing === "annual"
                    ? `${INR.format(tier.annualPrice)}/year · Save ${savings}%`
                    : "Billed monthly"}
              </p>

              <motion.div whileTap={reduceMotion ? undefined : TAP_PRESS}>
                <button
                  type="button"
                  onClick={() => selectPlan(tier)}
                  className={`${styles.cta} ${tier.featured ? styles.ctaFeatured : styles.ctaPlain}`}
                >
                  {signedIn && tier.id !== "free" ? `Upgrade to ${tier.name}` : tier.cta}
                </button>
              </motion.div>

              <ul className={styles.features}>
                {tier.features.map((feature) => (
                  <li key={feature}>
                    <CheckIcon aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.article>
          );
        })}
      </motion.div>

      <div className={styles.compare}>
        <motion.div
          className={styles.compareHead}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "show"}
          viewport={LANDING_VIEWPORT}
          variants={revealVariants(18)}
        >
          <p className={shared.eyebrow}>Every detail</p>
          <h2 className={shared.h2}>Compare plans exactly</h2>
        </motion.div>

        <motion.div
          className={styles.compareTableWrap}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "show"}
          viewport={LANDING_VIEWPORT}
          variants={revealVariants(18, 0.05)}
        >
          <table className={styles.compareTable}>
            <thead>
              <tr>
                <th scope="col" className={styles.compareRowLabel}><span className="sr-only">Feature</span></th>
                {PRICING_TIERS.map((tier) => (
                  <th key={tier.name} scope="col" className={tier.featured ? styles.compareFeaturedCol : undefined}>
                    {tier.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PRICING_COMPARISON.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className={styles.compareRowLabel}>{row.label}</th>
                  {row.values.map((value, index) => (
                    <td key={index} className={PRICING_TIERS[index].featured ? styles.compareFeaturedCol : undefined}>
                      {typeof value === "boolean" ? (
                        value ? <CheckIcon aria-label="Included" className={styles.compareCheck} /> : <span aria-hidden="true" className={styles.compareDash}>—</span>
                      ) : (
                        value
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
        <p className={styles.compareHint}>Swipe to see all plans →</p>
      </div>

      <div className={styles.faq}>
        <motion.div
          className={styles.faqHead}
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "show"}
          viewport={LANDING_VIEWPORT}
          variants={revealVariants(18)}
        >
          <p className={shared.eyebrow}>Questions</p>
          <h2 className={shared.h2}>Pricing, answered</h2>
        </motion.div>

        <motion.div initial={reduceMotion ? false : "hidden"} whileInView={reduceMotion ? undefined : "show"} viewport={LANDING_VIEWPORT} variants={staggerContainer}>
          {PRICING_FAQ.map((item) => (
            <motion.div key={item.question} className={styles.faqItem} variants={staggerItem}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <motion.div
        className={styles.finalCard}
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "show"}
        viewport={LANDING_VIEWPORT}
        variants={revealVariants(18)}
      >
        <div>
          <h2>{signedIn ? "Continue to your vault" : "Get started for free"}</h2>
          <p>
            {signedIn
              ? "Manage your plan, storage, and vault from one place."
              : "Create your account in under a minute. No credit card required."}
          </p>
        </div>
        <motion.div whileHover={reduceMotion ? undefined : HOVER_LIFT} whileTap={reduceMotion ? undefined : TAP_PRESS}>
          <button
            type="button"
            onClick={() => signedIn ? router.push("/vault") : openAuth("sign-up")}
            className={styles.primaryAction}
          >
            {signedIn ? "Open vault" : "Sign up free"}
          </button>
        </motion.div>
      </motion.div>
    </main>
  );
}
