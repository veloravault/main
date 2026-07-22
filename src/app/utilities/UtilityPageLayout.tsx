"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  LANDING_VIEWPORT,
  revealVariants,
  staggerContainer,
  staggerItem,
} from "@/components/velora/motion";
import { relatedUtilities, type UtilitySlug } from "./utilityData";
import styles from "./utilities.module.css";

export type UtilityBenefit = {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
};

export type UtilityEducationSection = {
  eyebrow: string;
  title: string;
  body: ReactNode;
  aside: ReactNode;
};

export function UtilityPageLayout(props: {
  slug: UtilitySlug;
  title: string;
  description: string;
  workbench: ReactNode;
  benefits: UtilityBenefit[];
  education: UtilityEducationSection[];
  ctaTitle: string;
  ctaDescription: string;
}) {
  const reduceMotion = useReducedMotion();
  const reveal = reduceMotion ? undefined : revealVariants(22);
  const related = relatedUtilities(props.slug);

  return (
    <main className={styles.page}>
      <motion.section
        className={styles.hero}
        initial={false}
        animate="show"
        variants={staggerContainer}
      >
        <motion.div className={styles.heroCopy} variants={staggerItem}>
          <p className={styles.eyebrow}>Free · Private · Local</p>
          <h1>{props.title}</h1>
          <p>{props.description}</p>
          <a className={styles.jumpLink} href="#utility-workbench-title">
            Use the tool <ArrowRightIcon aria-hidden="true" />
          </a>
        </motion.div>
        <motion.div
          className={styles.heroVisual}
          variants={staggerItem}
          aria-hidden="true"
        >
          <div className={styles.heroVisualFrame}>
            <div className={styles.heroVisualInset} />
            <div className={styles.heroVisualResult}>
              <span />
              <span />
              <span />
            </div>
          </div>
        </motion.div>
      </motion.section>

      <section className={styles.workbenchSection}>
        {props.workbench}
      </section>

      <section className={styles.benefitGrid} aria-label={`${props.title} benefits`}>
        {props.benefits.map((benefit) => (
          <article className={styles.benefitCard} key={benefit.title}>
            <span className={styles.benefitIcon}>{benefit.icon}</span>
            <p>{benefit.eyebrow}</p>
            <h2>{benefit.title}</h2>
            <p>{benefit.description}</p>
          </article>
        ))}
      </section>

      <div className={styles.education}>
        {props.education.map((section, index) => (
          <motion.section
            className={styles.educationRow}
            key={section.title}
            initial={reduceMotion ? false : "hidden"}
            whileInView={reduceMotion ? undefined : "show"}
            viewport={LANDING_VIEWPORT}
            variants={reveal}
          >
            <div className={styles.educationCopy}>
              <p className={styles.sectionIndex}>{section.eyebrow}</p>
              <h2>{section.title}</h2>
              {section.body}
            </div>
            <aside className={styles.educationAside} aria-label={`Example ${index + 1}`}>
              {section.aside}
            </aside>
          </motion.section>
        ))}
      </div>

      <section className={styles.relatedSection} aria-labelledby="related-tools-title">
        <p className={styles.sectionIndex}>More local tools</p>
        <h2 id="related-tools-title">Continue your security check.</h2>
        <div className={styles.relatedGrid}>
          {related.map((utility) => (
            <Link className={styles.relatedCard} href={utility.href} key={utility.slug}>
              <span>
                <strong>{utility.label}</strong>
                <small>{utility.description}</small>
              </span>
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.finalCard}>
        <div>
          <p className={styles.eyebrow}>Keep it protected</p>
          <h2>{props.ctaTitle}</h2>
          <p>{props.ctaDescription}</p>
        </div>
        <Link href="/signup" className={styles.primaryAction}>
          Get started free <ArrowRightIcon aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
