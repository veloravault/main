import type { Variants } from "framer-motion";

export const APPLE_EASE = [0.22, 1, 0.36, 1] as const;

export const LANDING_VIEWPORT = {
  once: true,
  // A low threshold, not 0.2: a fast/instant scroll (anchor jump, browser
  // scroll restoration, a quick trackpad flick) can cross a 20%-visible
  // threshold in one frame and be missed entirely, leaving the element stuck
  // at `opacity:0` - reproduced on the pricing page's comparison table, FAQ,
  // and final CTA. Any-pixel-visible is far less likely to be skipped.
  amount: 0.01,
} as const;

export const revealVariants = (distance = 22, delay = 0): Variants => ({
  hidden: { opacity: 0, y: distance },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.62, delay, ease: APPLE_EASE },
  },
});

export const fadeScaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.985 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.58, ease: APPLE_EASE },
  },
  exit: {
    opacity: 0,
    scale: 0.99,
    transition: { duration: 0.2, ease: APPLE_EASE },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.06,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: APPLE_EASE },
  },
};

export const HOVER_LIFT = {
  y: -4,
  scale: 1.01,
  transition: { duration: 0.24, ease: APPLE_EASE },
} as const;

export const TAP_PRESS = {
  scale: 0.985,
  transition: { duration: 0.14, ease: APPLE_EASE },
} as const;

