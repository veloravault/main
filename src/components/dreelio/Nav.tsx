"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import {
  ArrowUpRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleHelpIcon,
  ContactRoundIcon,
  CreditCardIcon,
  FileTextIcon,
  GaugeIcon,
  KeyRoundIcon,
  MoonIcon,
  NewspaperIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SunIcon,
  TextCursorInputIcon,
  UserRoundIcon,
  WorkflowIcon,
  XIcon,
} from "lucide-react";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./Nav.module.css";
import { VeloraBrandMark } from "./VeloraBrand";
import type { PublicNavIcon } from "./data";
import { NAV_GROUPS, PRIMARY_NAV_LINKS, SEARCH_ITEMS } from "./data";
import {
  APPLE_EASE,
  HOVER_LIFT,
  TAP_PRESS,
  revealVariants,
} from "./motion";
import { useTheme } from "@/components/ThemeProvider";
import { supabase } from "@/lib/supabase";

const NAV_ICONS: Record<PublicNavIcon, typeof KeyRoundIcon> = {
  "bank-card": CreditCardIcon,
  contact: ContactRoundIcon,
  document: FileTextIcon,
  help: CircleHelpIcon,
  import: SparklesIcon,
  journal: NewspaperIcon,
  password: KeyRoundIcon,
  passphrase: TextCursorInputIcon,
  security: ShieldCheckIcon,
  strength: GaugeIcon,
  username: UserRoundIcon,
  workflow: WorkflowIcon,
};

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

type DesktopNavGroupProps = {
  group: (typeof NAV_GROUPS)[number];
  reduceMotion: boolean | null;
};

function DesktopNavGroup({ group, reduceMotion }: DesktopNavGroupProps) {
  // The native <details>/<summary> stays the source of truth for open/closed
  // so the mega menu still works before React hydrates. `open` here only
  // switches which Framer Motion variant the (always-mounted) panel targets -
  // it never gates whether the panel renders, and it never remounts the
  // panel. Remounting on toggle (e.g. via a changing `key`) raced against the
  // browser's own synchronous <details> toggle: the old, fully-visible
  // content would flash in for a frame before React swapped in a fresh,
  // invisible element to animate from - that flash-then-reset is what read
  // as jitter. A persistent element with a variant switch has no such race:
  // its current (hidden) inline style is already applied the instant the
  // browser reveals it, so it only ever animates forward, never flashes.
  const [open, setOpen] = useState(false);

  const panelTransition = {
    duration: reduceMotion ? 0 : 0.22,
    ease: APPLE_EASE,
    staggerChildren: reduceMotion ? 0 : 0.045,
    delayChildren: reduceMotion ? 0 : 0.05,
  };
  const sectionTransition = { duration: reduceMotion ? 0 : 0.22, ease: APPLE_EASE };

  const dropdownPanelVariants: Variants = {
    hidden: { opacity: 0, y: -8 },
    show: { opacity: 1, y: 0, transition: panelTransition },
  };
  const megaMenuSectionVariants: Variants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: sectionTransition },
  };

  return (
    <li className={styles.navItem}>
      <details
        className={styles.navGroup}
        name="desktop-primary-navigation"
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary className={styles.navGroupTrigger}>
          {group.label}
          <ChevronDownIcon aria-hidden="true" />
        </summary>
        <motion.div
          id={`desktop-${group.id}-menu`}
          className={styles.dropdownPanel}
          data-menu={group.id}
          aria-label={`${group.label} navigation`}
          initial={false}
          animate={open ? "show" : "hidden"}
          variants={dropdownPanelVariants}
        >
          <div className={styles.dropdownGrid}>
            {group.sections.map((section) => (
              <motion.section
                key={section.heading}
                className={styles.megaMenuSection}
                data-highlight={("highlight" in section && section.highlight) || undefined}
                variants={megaMenuSectionVariants}
              >
                <h2>{section.heading}</h2>
                <div className={styles.megaMenuLinks}>
                  {section.links.map((link) => {
                    const Icon = NAV_ICONS[link.icon];

                    return (
                      <a
                        key={link.href}
                        href={link.href}
                        className={styles.dropdownLink}
                      >
                        <span className={styles.desktopMenuIcon}>
                          <Icon aria-hidden="true" />
                        </span>
                        <span>{link.label}</span>
                        <ChevronRightIcon
                          className={styles.desktopMenuArrow}
                          aria-hidden="true"
                        />
                      </a>
                    );
                  })}
                </div>
              </motion.section>
            ))}
          </div>
        </motion.div>
      </details>
    </li>
  );
}

type NavProps = {
  /** Server-resolved signed-in state, so the CTA renders correctly on first
   * paint instead of always starting signed-out and swapping after the
   * client re-checks the session - that swap is a real layout shift. */
  initialSignedIn?: boolean;
};

export function Nav({ initialSignedIn = false }: NavProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [signedIn, setSignedIn] = useState(initialSignedIn);
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

  const openSearch = () => {
    document.querySelectorAll("details[open]").forEach((details) => details.removeAttribute("open"));
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
          {NAV_GROUPS.map((group) => (
            <DesktopNavGroup key={group.id} group={group} reduceMotion={reduceMotion} />
          ))}
          {PRIMARY_NAV_LINKS.map((link) => (
            <motion.li key={link.href} whileHover={reduceMotion ? undefined : { y: -1 }}>
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
                Get started free
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
          <details className={styles.mobileMenuDisclosure}>
            <summary className={styles.burger} aria-label="Toggle menu">
              <span />
              <span />
            </summary>
            <div className={styles.mobileMenu}>
              {NAV_GROUPS.map((group) => (
                <details className={styles.mobileNavGroup} name="mobile-primary-navigation" key={group.id}>
                  <summary className={styles.mobileNavTrigger}>
                    {group.label}
                    <ChevronDownIcon aria-hidden="true" />
                  </summary>
                  <div id={`mobile-${group.id}-menu`} className={styles.mobileSubmenu}>
                    {group.links.map((link) => {
                      const Icon = NAV_ICONS[link.icon];
                      return (
                        <a key={link.href} href={link.href}>
                          <span><Icon aria-hidden="true" /></span>
                          <span><strong>{link.label}</strong><small>{link.description}</small></span>
                        </a>
                      );
                    })}
                  </div>
                </details>
              ))}
              {PRIMARY_NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ))}
              {signedIn ? (
                <a href="/vault" className={`${shared.btn} ${shared.btnDark}`}>
                  Open vault
                </a>
              ) : (
                <>
                  <a href="/login" className={styles.mobileSignIn}>
                    Sign in
                  </a>
                  <a href="/signup" className={`${shared.btn} ${shared.btnDark}`}>
                    Get started free
                  </a>
                </>
              )}
            </div>
          </details>
        </div>
      </nav>

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
