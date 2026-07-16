# Landing Page Motion Design

## Goal

Add restrained, Apple-like Framer Motion throughout the public Velora Vault landing page without changing its copy, information architecture, or inside-app experience.

## Scope Boundary

Changes are limited to `src/components/dreelio/**` and landing-specific tests. The implementation must not touch vault modules, authentication, dashboards, database code, or the shared inside-app shell. Existing uncommitted landing-page work must be preserved.

## Motion Language

- Use one consistent ease-out curve with short durations and travel distances.
- Reveal headings and major content blocks as they enter the viewport.
- Stagger repeated cards, pills, rows, list items, and blog posts.
- Add low-amplitude scroll parallax to hero and major product imagery.
- Crossfade and slightly scale stateful imagery when device tabs change.
- Add subtle lift, scale, or spring feedback to interactive cards, buttons, tabs, and links.
- Keep continuous motion limited to existing purposeful demonstrations and marquees.

## Section Treatment

- **Navigation:** Preserve the existing theme transition and add restrained entrance and link/button feedback.
- **Hero:** Stagger headline, supporting copy, actions, dashboard, and encryption badge. Give the dashboard a small scroll-linked depth shift.
- **Devices:** Reveal the heading and frame; crossfade the selected device image; add tactile tab feedback.
- **Feature splits:** Reveal copy and media from their natural side, stagger pills, lift the CTA, and add subtle media parallax.
- **Features:** Retain the existing animated widgets, align their timing with the shared motion language, and preserve reduced-motion behavior.
- **Highlights:** Stagger cards and add gentle hover/tap lift.
- **Testimonials:** Reveal the promise statement and marquee container without increasing the marquee speed or adding distracting continuous motion.
- **Pricing:** Reveal and stagger plans, animate the Personal/Family state change, and add tactile card and CTA feedback.
- **Blog:** Reveal the heading, featured story, and post grid in sequence; add restrained image/card hover feedback.
- **Final CTA and footer:** Use a calm closing reveal with subtle link and button feedback.

## Accessibility and Performance

- Respect `prefers-reduced-motion` through `useReducedMotion`; reduced-motion users receive opacity-only or immediate state changes.
- Use transform and opacity for animation to avoid layout shifts.
- Trigger scroll reveals once, and keep scroll-linked movement low amplitude.
- Do not delay navigation or hide essential content behind animation.
- Preserve semantic HTML and keyboard behavior.

## Verification

- Add a landing-specific regression test for shared motion tokens, section coverage, and reduced-motion support.
- Run the focused tests and lint on landing files.
- Run the production build and separate pre-existing failures from new failures.
- Visually inspect desktop, mobile, and reduced-motion states in the local landing page.
