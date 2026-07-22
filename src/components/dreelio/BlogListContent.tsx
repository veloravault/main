"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRightIcon } from "lucide-react";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "@/app/blog/blog.module.css";
import { BLOG_POSTS, CATEGORY_COLORS } from "./blog-data";
import {
  HOVER_LIFT,
  LANDING_VIEWPORT,
  TAP_PRESS,
  revealVariants,
  staggerContainer,
  staggerItem,
} from "./motion";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function BlogListContent() {
  const reduceMotion = useReducedMotion();
  const [featured, ...rest] = BLOG_POSTS;

  return (
    <main className={styles.page}>
      <motion.div
        className={styles.hero}
        // Above-the-fold: skip the hidden→shown entrance so the H1 never
        // ships as `opacity:0` in the server HTML.
        initial={false}
        animate="show"
        variants={revealVariants(18)}
      >
        <p className={shared.eyebrow}>Blog</p>
        <h1>Notes on privacy, security, and building Velora Vault</h1>
        <p>
          Practical guidance on passwords, encryption, and staying ahead of
          the ways accounts actually get compromised - plus the occasional
          look at how the vault itself is built.
        </p>
        <Link href="/signup" className={`${shared.btn} ${shared.btnDark} ${styles.heroCta}`}>
          Sign up free
        </Link>
      </motion.div>

      {featured && (
        <motion.div
          initial={reduceMotion ? false : "hidden"}
          whileInView={reduceMotion ? undefined : "show"}
          viewport={LANDING_VIEWPORT}
          variants={revealVariants(18)}
        >
          <motion.div
            whileHover={reduceMotion ? undefined : HOVER_LIFT}
            whileTap={reduceMotion ? undefined : TAP_PRESS}
          >
            <Link href={`/blog/${featured.slug}`} className={styles.featured}>
              <div className={styles.tagRow}>
                <span
                  className={`${shared.tag} ${styles.tag}`}
                  style={{ background: CATEGORY_COLORS[featured.category] }}
                >
                  {featured.category}
                </span>
                <span className={styles.date}>
                  {formatDate(featured.date)} · {featured.readTime}
                </span>
              </div>
              <h2 className={styles.cardTitle}>{featured.title}</h2>
              <p className={styles.cardExcerpt}>{featured.excerpt}</p>
              <span className={styles.readMore}>
                Read the post <ArrowRightIcon aria-hidden="true" />
              </span>
            </Link>
          </motion.div>
        </motion.div>
      )}

      <motion.div
        className={styles.grid}
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "show"}
        viewport={LANDING_VIEWPORT}
        variants={staggerContainer}
      >
        {rest.map((post) => (
          <motion.div
            key={post.slug}
            variants={staggerItem}
            whileHover={reduceMotion ? undefined : HOVER_LIFT}
            whileTap={reduceMotion ? undefined : TAP_PRESS}
          >
            <Link href={`/blog/${post.slug}`} className={styles.card}>
              <div className={styles.tagRow}>
                <span
                  className={`${shared.tag} ${styles.tag}`}
                  style={{ background: CATEGORY_COLORS[post.category] }}
                >
                  {post.category}
                </span>
                <span className={styles.date}>{post.readTime}</span>
              </div>
              <h3 className={styles.cardTitle}>{post.title}</h3>
              <p className={styles.cardExcerpt}>{post.excerpt}</p>
              <span className={styles.readMore}>
                Read the post <ArrowRightIcon aria-hidden="true" />
              </span>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className={styles.finalCard}
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "show"}
        viewport={LANDING_VIEWPORT}
        variants={revealVariants(18)}
      >
        <div>
          <h2>Ready to put one vault behind everything?</h2>
          <p>No credit card required to get started.</p>
        </div>
        <div className={styles.actions}>
          <motion.div whileHover={reduceMotion ? undefined : HOVER_LIFT} whileTap={reduceMotion ? undefined : TAP_PRESS}>
            <Link href="/signup" className={styles.primaryAction}>Sign up free</Link>
          </motion.div>
          <Link href="/security" className={styles.secondaryAction}>How security works</Link>
        </div>
      </motion.div>
    </main>
  );
}
