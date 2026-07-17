# Auth pages and public footer redesign

Date: 2026-07-17

## Goal

Fix the login and signup pages so their content never collides with navigation, remove marketing-page chrome from account entry, and replace the existing oversized floating footer card with a deliberate full-width public footer.

The work must preserve all authentication handlers, redirect behavior, form validation, security copy, theme support, reduced-motion handling, authentic payment assets, and the established Apple-ecosystem visual direction.

## Root cause

The public navigation is fixed and therefore does not reserve layout space. `AuthShell` independently centers its stage inside a viewport-height grid, using padding and an estimated navigation clearance. The stage height differs substantially between sign-in and sign-up. As a result, the taller signup stage can extend under the fixed header while the shorter login stage leaves excessive empty space. `PublicPageShell` also appends the full marketing footer to both routes, making short account journeys feel like incomplete marketing pages.

The fix is architectural: account pages get their own in-flow chrome instead of compensating for a fixed marketing header with page-specific spacing constants.

## Approved direction

### Dedicated account chrome

Login and signup use a purpose-built account frame rather than `PublicPageShell`.

- A compact, centered top bar contains the Velora mark and name on the left and the existing theme control on the right.
- The brand returns to the homepage. No marketing navigation, signup promotion, hamburger menu, or public footer appears on these routes.
- The header participates in document flow. It must never overlay the form.
- The remaining viewport area centers the auth stage when space permits.
- On shorter viewports, the stage aligns below the header with a minimum gap and the page scrolls naturally.
- Safe-area insets apply at the top and bottom on mobile.

The account frame is intentionally quieter than the marketing shell. Its single job is helping a person authenticate without distraction.

### Auth stage

The existing compact field language is retained but tightened.

- Sign-in and sign-up remain separate routes and forms.
- Heading, description, form, recovery action, route cross-link, and security note form one bounded vertical composition.
- Sign-in and signup use the same width and spacing scale.
- Signup no longer begins behind the header at any supported viewport height.
- The form does not stretch to fill unused page height.
- Existing loading, validation, notice, and error states remain unchanged.
- Motion remains a single restrained stage entrance and respects reduced-motion preferences.

### Public footer: “vault threshold”

The current translucent rounded card is removed. The replacement is a full-width deep graphite footer that clearly closes the public page.

Palette:

- Vault graphite: `#0b0b0d`
- Raised graphite: `#151518`
- Primary text: `#f5f5f7`
- Muted text: `#a1a1a6`
- Velora blue: `#2997ff`
- Trust green: `#30d158`

Typography continues to use the project’s Apple-system/Geist stack. Hierarchy comes from scale, weight, and spacing rather than decorative type.

The footer has three bands:

1. **Identity and promise** — a large Velora lockup plus the concise statement “Encrypted before storage. Yours to unlock.” This is the signature element.
2. **Navigation** — the existing public destinations in two compact, accessible columns. No duplicated calls to action.
3. **Trust rail** — authentic Visa, Mastercard, RuPay, and UPI image assets; net-banking/Razorpay text; the Razorpay security statement; copyright and legal links.

The payment marks remain downloaded brand assets rendered through `next/image`. They are not redrawn in JSX, CSS, or generated SVG.

On mobile, the bands stack in reading order, link columns remain two-up where space permits, and payment marks wrap without horizontal overflow. The footer keeps generous but controlled padding and does not become a second hero section.

## Component architecture

### New account frame

Create a focused auth-page frame under `src/components/auth/`.

Responsibilities:

- render the compact account header;
- provide theme switching through the existing `ThemeProvider` contract;
- reserve layout space naturally through grid/flex flow;
- provide the background and safe-area behavior;
- render route content without a public footer.

`/login` and `/signup` switch from `PublicPageShell` to this frame. `AuthGateway`, `SignInForm`, and `SignUpForm` keep their authentication responsibilities unchanged.

`AuthShell` receives an embedded/account-frame presentation mode so it does not create a second viewport-height page inside the frame. Standalone confirmation, reset, and onboarding uses keep their existing full-page behavior.

### Footer rebuild

`Footer.tsx` keeps ownership of public links, trust copy, motion, and payment badges, but its markup is rebuilt around the three footer bands. `Footer.module.css` is replaced rather than incrementally patched. `PaymentBadges` continues to own payment asset rendering and receives only the styling adjustments needed for the graphite background.

`PublicPageShell` continues to render the shared marketing navigation and redesigned footer for normal public pages.

## Responsive behavior

### Desktop and tablet

- Account frame top bar sits at least 20 px from the viewport edge and remains in flow.
- Auth content has a minimum 32 px clearance below the bar.
- The full stage remains visible without touching either header or viewport edge when height allows.
- Footer identity/promise and navigation share the top grid; the trust rail spans the bottom.

### Mobile

- Account frame respects `safe-area-inset-top` and `safe-area-inset-bottom`.
- Header controls retain a minimum 44 px target.
- Auth stage begins below the header; no negative margins or viewport-position guesses are allowed.
- Input text remains at least 16 px to prevent iOS zoom.
- Footer stacks cleanly and has no horizontal overflow at 320 px width.

## Accessibility

- Brand and theme controls have explicit accessible names.
- Heading structure remains one `h1` per auth page.
- Focus-visible treatment remains present for all controls.
- Status and error messages retain their live-region semantics.
- Footer navigation uses semantic lists and descriptive group labels.
- Payment logos retain accurate alt text.
- Reduced-motion preferences disable nonessential entrance and hover motion.

## Testing and verification

Add regression assertions that:

- login and signup use the dedicated account frame, not `PublicPageShell`;
- the account frame does not import or render `Footer` or marketing navigation links;
- the frame uses in-flow layout rather than a fixed header;
- the embedded auth shell does not claim a second `100dvh` viewport;
- mobile controls meet 44 px targets and fields retain 16 px input text;
- the redesigned footer contains the approved promise, semantic navigation, Razorpay trust copy, and authentic payment assets;
- the old frosted-card footer structure is absent;
- reduced-motion and responsive rules remain present.

Run the full unit/integrity suite, ESLint, TypeScript, and a production build. Browser verification covers `/login` and `/signup` at desktop and 390×844 mobile viewports, plus the public footer at desktop and mobile. Capture layout metrics to confirm the auth heading begins below the account header and that body width never exceeds viewport width.

## Non-goals

- No changes to Supabase Auth calls, confirmation tokens, session handling, redirects, or onboarding security.
- No return of the removed authentication popup.
- No payment-provider or billing behavior changes.
- No new marketing destinations or newsletter form.
- No generated or hand-drawn payment-network logos.
