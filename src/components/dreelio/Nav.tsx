"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDownIcon, MoonIcon, SunIcon } from "lucide-react";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./Nav.module.css";
import { VeloraBrandMark } from "./VeloraBrand";
import { NAV_LINKS, UTILITY_LINKS } from "./data";
import {
  HOVER_LIFT,
  LANDING_VIEWPORT,
  TAP_PRESS,
  revealVariants,
} from "./motion";
import { useTheme } from "@/components/ThemeProvider";
import { supabase } from "@/lib/supabase";

type ThemeToggleProps = {
  className?: string;
  isDark: boolean;
  onToggle: () => void;
  reduceMotion: boolean | null;
};

function ThemeToggle({
  className,
  isDark,
  onToggle,
  reduceMotion,
}: ThemeToggleProps) {
  return (
    <motion.button
      type="button"
      className={className}
      onClick={onToggle}
      aria-label="Toggle appearance"
      whileHover={reduceMotion ? undefined : { scale: 1.04 }}
      whileTap={reduceMotion ? undefined : TAP_PRESS}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? "sun" : "moon"}
          initial={reduceMotion ? false : { opacity: 0, rotate: -30, scale: 0.82 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, rotate: 30, scale: 0.82 }}
          transition={{ duration: 0.16 }}
        >
          {isDark ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

type NavProps = {
  /** Server-resolved signed-in state, so the CTA renders correctly on first
   * paint instead of always starting signed-out and swapping after the
   * client re-checks the session — that swap is a real layout shift. */
  initialSignedIn?: boolean;
};

export function Nav({ initialSignedIn = false }: NavProps) {
  const [open, setOpen] = useState(false);
  const [utilitiesOpen, setUtilitiesOpen] = useState(false);
  const [mobileUtilitiesOpen, setMobileUtilitiesOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(initialSignedIn);
  const utilityMenuRef = useRef<HTMLLIElement>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const reduceMotion = useReducedMotion();

  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  // Keeps the nav's CTAs from contradicting the page body (e.g. Pricing
  // already swaps its own CTAs for a signed-in visitor) when a signed-in
  // member revisits a public page via a bookmark or the back button.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) setSignedIn(data.session != null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setSignedIn(session != null);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!utilitiesOpen) return;

    const closeOnPointerDown = (event: PointerEvent) => {
      if (!utilityMenuRef.current?.contains(event.target as Node)) {
        setUtilitiesOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setUtilitiesOpen(false);
    };

    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [utilitiesOpen]);

  const closeMobileMenu = () => {
    setOpen(false);
    setMobileUtilitiesOpen(false);
  };

  const featureLink = NAV_LINKS[0];
  const remainingLinks = NAV_LINKS.slice(1);

  return (
    <motion.header
      className={styles.header}
      // Above-the-fold on every page: skip the hidden→shown entrance so the
      // nav never ships as `opacity:0` in the server HTML.
      initial={false}
      animate="show"
      variants={revealVariants(14, 0.04)}
    >
      <nav className={styles.nav} aria-label="Primary">
        <motion.a
          href="/"
          className={styles.brand}
          aria-label="Velora Vault home"
          whileHover={reduceMotion ? undefined : { scale: 1.01 }}
          whileTap={reduceMotion ? undefined : TAP_PRESS}
        >
          <VeloraBrandMark className={styles.mark} />
          <span>Velora Vault</span>
        </motion.a>

        <ul className={styles.links}>
          <motion.li whileHover={reduceMotion ? undefined : { y: -1 }}>
            <a href={featureLink.href}>{featureLink.label}</a>
          </motion.li>
          <motion.li
            ref={utilityMenuRef}
            className={styles.utilityMenu}
            whileHover={reduceMotion ? undefined : { y: -1 }}
          >
            <button
              type="button"
              className={styles.utilityTrigger}
              aria-haspopup="menu"
              aria-expanded={utilitiesOpen}
              aria-controls="utilities-menu"
              onClick={() => setUtilitiesOpen((current) => !current)}
            >
              Utilities
              <ChevronDownIcon data-open={utilitiesOpen} aria-hidden="true" />
            </button>
            <AnimatePresence initial={false}>
              {utilitiesOpen && (
                <motion.ul
                  id="utilities-menu"
                  className={styles.utilityDropdown}
                  role="menu"
                  initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                >
                  {UTILITY_LINKS.map((link) => (
                    <li key={link.href} role="none">
                      <a
                        href={link.href}
                        role="menuitem"
                        onClick={() => setUtilitiesOpen(false)}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </motion.li>
          {remainingLinks.map((link) => (
            <motion.li
              key={link.label}
              whileHover={reduceMotion ? undefined : { y: -1 }}
            >
              <a href={link.href}>{link.label}</a>
            </motion.li>
          ))}
        </ul>

        <div className={styles.authActions}>
          {signedIn ? (
            <motion.a
              href="/vault"
              className={`${shared.btn} ${shared.btnDark} ${styles.cta}`}
              whileHover={reduceMotion ? undefined : HOVER_LIFT}
              whileTap={reduceMotion ? undefined : TAP_PRESS}
            >
              Open vault
            </motion.a>
          ) : (
            <>
              <motion.a
                href="/login"
                className={styles.signIn}
                whileHover={reduceMotion ? undefined : { y: -1 }}
              >
                Sign in
              </motion.a>
              <motion.a
                href="/signup"
                className={`${shared.btn} ${shared.btnDark} ${styles.cta}`}
                whileHover={reduceMotion ? undefined : HOVER_LIFT}
                whileTap={reduceMotion ? undefined : TAP_PRESS}
              >
                Sign up
              </motion.a>
            </>
          )}
          <ThemeToggle
            className={styles.themeToggle}
            isDark={resolvedTheme === "dark"}
            onToggle={toggleTheme}
            reduceMotion={reduceMotion}
          />
        </div>

        <div className={styles.mobileControls}>
          <ThemeToggle
            className={styles.mobileThemeToggle}
            isDark={resolvedTheme === "dark"}
            onToggle={toggleTheme}
            reduceMotion={reduceMotion}
          />
          <button
            className={styles.burger}
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => {
              if (open) setMobileUtilitiesOpen(false);
              setOpen(!open);
            }}
          >
            <span data-open={open} />
            <span data-open={open} />
          </button>
        </div>
      </nav>

      <AnimatePresence initial={false}>
        {open && (
        <motion.div
          className={styles.mobileMenu}
          initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.99 }}
          transition={{ duration: 0.24 }}
          viewport={LANDING_VIEWPORT}
        >
          <a href={featureLink.href} onClick={closeMobileMenu}>
            {featureLink.label}
          </a>
          <div className={styles.mobileUtilityGroup}>
            <button
              type="button"
              className={styles.mobileUtilityTrigger}
              aria-expanded={mobileUtilitiesOpen}
              aria-controls="mobile-utilities-menu"
              onClick={() => setMobileUtilitiesOpen((current) => !current)}
            >
              Utilities
              <ChevronDownIcon data-open={mobileUtilitiesOpen} aria-hidden="true" />
            </button>
            <AnimatePresence initial={false}>
              {mobileUtilitiesOpen && (
                <motion.div
                  id="mobile-utilities-menu"
                  className={styles.mobileUtilityLinks}
                  initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {UTILITY_LINKS.map((link) => (
                    <a key={link.href} href={link.href} onClick={closeMobileMenu}>
                      {link.label}
                    </a>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {remainingLinks.map((link) => (
            <a key={link.label} href={link.href} onClick={closeMobileMenu}>
              {link.label}
            </a>
          ))}
          {signedIn ? (
            <a
              href="/vault"
              className={`${shared.btn} ${shared.btnDark}`}
              onClick={closeMobileMenu}
            >
              Open vault
            </a>
          ) : (
            <>
              <a
                href="/login"
                className={styles.mobileSignIn}
                onClick={closeMobileMenu}
              >
                Sign in
              </a>
              <a
                href="/signup"
                className={`${shared.btn} ${shared.btnDark}`}
                onClick={closeMobileMenu}
              >
                Sign up
              </a>
            </>
          )}
        </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
