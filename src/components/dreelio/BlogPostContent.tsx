"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeftIcon } from "lucide-react";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "@/app/blog/[slug]/blog-post.module.css";
import { CATEGORY_COLORS, type BlogPost } from "./blog-data";
import { HOVER_LIFT, TAP_PRESS, revealVariants, staggerContainer, staggerItem } from "./motion";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function BlogPostContent({
  post,
  prev,
  next,
}: {
  post: BlogPost;
  prev: BlogPost | null;
  next: BlogPost | null;
}) {
  const reduceMotion = useReducedMotion();
  const { openAuth } = useAuthModal();

  return (
    <main className={styles.page}>
      <motion.div initial={reduceMotion ? false : "hidden"} animate="show" variants={staggerContainer}>
        <motion.div variants={staggerItem}>
          <Link href="/blog" className={styles.backLink}>
            <ArrowLeftIcon aria-hidden="true" /> Back to the blog
          </Link>
        </motion.div>

        <motion.div className={styles.meta} variants={staggerItem}>
          <span className={`${shared.tag} ${styles.tag}`} style={{ background: CATEGORY_COLORS[post.category] }}>
            {post.category}
          </span>
          <span className={styles.metaText}>
            {formatDate(post.date)} · {post.readTime}
          </span>
        </motion.div>

        <motion.div className={styles.header} variants={staggerItem}>
          <h1>{post.title}</h1>
          <p className={styles.dek}>{post.excerpt}</p>
        </motion.div>
      </motion.div>

      <hr className={styles.divider} />

      <motion.article
        className={styles.article}
        initial={reduceMotion ? false : "hidden"}
        animate="show"
        variants={revealVariants(16, 0.08)}
      >
        {post.body.map((block, index) => {
          if (block.type === "h2") return <h2 key={index}>{block.text}</h2>;
          if (block.type === "list")
            return (
              <ul key={index}>
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          return <p key={index}>{block.text}</p>;
        })}
      </motion.article>

      <hr className={styles.divider} />

      {(prev || next) && (
        <nav className={styles.footerNav} aria-label="More posts">
          {prev ? (
            <Link href={`/blog/${prev.slug}`} className={styles.footerLink}>
              <span>Previous</span>
              <span className={styles.footerLinkTitle}>{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/blog/${next.slug}`} className={`${styles.footerLink} ${styles.footerLinkNext}`}>
              <span>Next</span>
              <span className={styles.footerLinkTitle}>{next.title}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      <motion.div
        className={styles.finalCard}
        initial={reduceMotion ? false : "hidden"}
        whileInView={reduceMotion ? undefined : "show"}
        viewport={{ once: true, amount: 0.4 }}
        variants={revealVariants(18)}
      >
        <div>
          <h2>Put this into practice in your own vault</h2>
          <p>Sign up free — no credit card required.</p>
        </div>
        <motion.div whileHover={reduceMotion ? undefined : HOVER_LIFT} whileTap={reduceMotion ? undefined : TAP_PRESS}>
          <button type="button" onClick={() => openAuth("sign-up")} className={styles.primaryAction}>Sign up free</button>
        </motion.div>
      </motion.div>
    </main>
  );
}
