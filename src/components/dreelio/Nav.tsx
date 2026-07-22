"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRightIcon, ChevronDownIcon, MoonIcon, SearchIcon, SunIcon, XIcon } from "lucide-react";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./Nav.module.css";
import { VeloraBrandMark } from "./VeloraBrand";
import { NAV_LINKS, SEARCH_ITEMS, UTILITY_LINKS } from "./data";
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [signedIn, setSignedIn] = useState(initialSignedIn);
  const utilityMenuRef = useRef<HTMLLIElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (!searchOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => searchInputRef.current?.focus());

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [searchOpen]);

  const closeMobileMenu = () => {
    setOpen(false);
    setMobileUtilitiesOpen(false);
  };

  const openSearch = () => {
    closeMobileMenu();
    setUtilitiesOpen(false);
    setSearchOpen(true);
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredSearchItems = SEARCH_ITEMS.filter((item) =>
    normalizedSearch
      ? `${item.label} ${item.keywords}`.toLowerCase().includes(normalizedSearch)
      : item.popular,
  ).slice(0, 8);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const firstResult = filteredSearchItems[0];
    if (firstResult) window.location.assign(firstResult.href);
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
          <button
            type="button"
            className={styles.searchTrigger}
            aria-label="Search Velora Vault"
            onClick={openSearch}
          >
            <SearchIcon aria-hidden="true" />
          </button>
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
          <button
            type="button"
            className={styles.mobileSearchTrigger}
            aria-label="Search Velora Vault"
            onClick={openSearch}
          >
            <SearchIcon aria-hidden="true" />
          </button>
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

      <AnimatePresence initial={false}>
        {searchOpen && (
          <motion.div
            className={styles.searchOverlay}
            role="dialog"
            aria-modal="true"
            aria-label="Search Velora Vault"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
          >
            <button
              type="button"
              className={styles.searchClose}
              aria-label="Close search"
              onClick={() => setSearchOpen(false)}
            >
              <XIcon aria-hidden="true" />
            </button>
            <motion.div
              className={styles.searchPanel}
              initial={reduceMotion ? false : { opacity: 0, y: -12, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.99 }}
            >
              <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
                <SearchIcon aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="What are you looking for?"
                  aria-label="Search pages"
                  autoComplete="off"
                />
                <button type="submit" aria-label="Open first search result">
                  <ArrowUpRightIcon aria-hidden="true" />
                </button>
              </form>
              <p className={styles.searchLabel}>
                {normalizedSearch ? "Search results" : "Popular searches"}
              </p>
              <div className={styles.searchResults}>
                {filteredSearchItems.length > 0 ? filteredSearchItems.map((item) => (
                  <a key={item.href} href={item.href} onClick={() => setSearchOpen(false)}>
                    <SearchIcon aria-hidden="true" />
                    <span>{item.label}</span>
                    <ArrowUpRightIcon aria-hidden="true" />
                  </a>
                )) : (
                  <p className={styles.noResults}>No matching page found. Try “password” or “security”.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
