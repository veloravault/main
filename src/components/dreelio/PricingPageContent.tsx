"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { CheckIcon } from "lucide-react";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "@/app/pricing/pricing.module.css";
import { PRICING_FAQ, PRICING_TIERS } from "./pricing-data";
import { HOVER_LIFT, LANDING_VIEWPORT, TAP_PRESS, revealVariants, staggerContainer, staggerItem } from "./motion";

type Billing = "monthly" | "annual";

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function PricingPageContent() {
  const reduceMotion = useReducedMotion();
  const [billing, setBilling] = useState<Billing>("monthly");

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
          Annual <span className={styles.saveTag}>Save 35%</span>
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
                <span className={styles.price}>{displayPrice}</span>
                {!isFree && <span className={styles.period}>/month</span>}
              </div>
              <p className={styles.billingNote}>
                {isFree ? "Forever" : billing === "annual" ? `Billed ${INR.format(tier.annualPrice)}/year` : "Billed monthly"}
              </p>

              <motion.div whileTap={reduceMotion ? undefined : TAP_PRESS}>
                <Link
                  href="/signup"
                  className={`${styles.cta} ${tier.featured ? styles.ctaFeatured : styles.ctaPlain}`}
                >
                  {tier.cta}
                </Link>
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
          <h2>Get started for free</h2>
          <p>Create your account in under a minute. No credit card required.</p>
        </div>
        <motion.div whileHover={reduceMotion ? undefined : HOVER_LIFT} whileTap={reduceMotion ? undefined : TAP_PRESS}>
          <Link href="/signup" className={styles.primaryAction}>Sign up free</Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
