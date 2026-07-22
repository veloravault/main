"use client";

import { useEffect } from "react";
import { animate } from "framer-motion";

// A standard, evenly-paced ease-in-out - not APPLE_EASE (this codebase's
// usual curve for small UI transitions like fades/scales). That curve front
// loads almost all of its progress into the first ~25% of the duration and
// crawls for the rest; over a short distance that reads as snappy, but over
// a multi-thousand-pixel scroll it reads as a jump followed by a slow drift.
const SCROLL_EASE = [0.4, 0, 0.2, 1] as const;

// Distance-scaled duration: a short hop (one section down) shouldn't take as
// long as a jump from the top of a long page to its last FAQ category, but
// neither should feel sluggish or instant.
const MIN_DURATION = 0.35;
const MAX_DURATION = 1.1;
const PIXELS_PER_SECOND = 1800;

function scrollToTarget(target: HTMLElement, prefersReducedMotion: boolean) {
  // Every jump target across the site already declares its own
  // scroll-margin-top (to clear the fixed pill header) - read it instead of
  // guessing an offset, so this stays correct if those values ever change.
  const scrollMarginTop = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  const destination = target.getBoundingClientRect().top + window.scrollY - scrollMarginTop;

  if (prefersReducedMotion) {
    window.scrollTo({ top: destination, behavior: "instant" });
    return;
  }

  const distance = Math.abs(destination - window.scrollY);
  const duration = Math.min(MAX_DURATION, Math.max(MIN_DURATION, distance / PIXELS_PER_SECOND));

  animate(window.scrollY, destination, {
    type: "tween",
    duration,
    ease: SCROLL_EASE,
    // Explicit "instant": the page's global CSS sets scroll-behavior:smooth,
    // which every plain scrollTo() call inherits by default. Framer Motion
    // already interpolates `latest` smoothly across frames here - if each of
    // those per-frame scrollTo calls also tried to smoothly animate on top,
    // the browser would spend every frame chasing a target that just moved
    // again, compounding into a crawl that never catches up.
    onUpdate: (latest) => window.scrollTo({ top: latest, behavior: "instant" }),
  });
}

// Framer-Motion-driven replacement for the browser's native anchor-jump
// scroll, used site-wide on the marketing pages: same-page in-page anchors
// (FAQ's category jump nav, the security page's jump link, homepage section
// links) animate on click, and landing on a page with a hash already in the
// URL (cross-page links like /help#quick-answers) animates once mounted.
export function SmoothAnchorScroll() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (window.location.hash) {
      const target = document.getElementById(window.location.hash.slice(1));
      if (target) {
        const raf = requestAnimationFrame(() => scrollToTarget(target, prefersReducedMotion));
        return () => cancelAnimationFrame(raf);
      }
    }
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest("a[href*='#']");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (url.pathname !== window.location.pathname || url.origin !== window.location.origin || !url.hash) return;

      const target = document.getElementById(url.hash.slice(1));
      if (!target) return;

      event.preventDefault();
      history.pushState(null, "", url.hash);
      scrollToTarget(target, prefersReducedMotion);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
