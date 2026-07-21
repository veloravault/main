# Velora Vault Utility Pages Redesign

**Date:** 2026-07-22

**Status:** Approved design

**Routes:**

- `/utilities/password-generator`
- `/utilities/passphrase-generator`
- `/utilities/username-generator`
- `/utilities/password-strength`

## Objective

Redesign Velora Vault's four public utility pages around the clear page hierarchy and prominent interactive-tool model used by Bitwarden's public generators, while keeping Velora Vault's own visual identity, navigation, voice, dark mode, privacy posture, and footer.

The redesign must make each utility immediately useful, remove the current clipped and oversized layouts, work cleanly from small phones through large desktops, and establish a shared system that keeps the four routes consistent without forcing their tool-specific logic into one oversized component.

## Design principles

1. **The tool is the hero.** Visitors must be able to generate, test, and copy without scrolling through marketing content first.
2. **Velora remains recognizable.** Bitwarden informs hierarchy and interaction patterns only. Velora's Geist typography, system-blue accent, iOS-inspired grouped controls, rounded public navigation, dark mode, and graphite footer remain the visual foundation.
3. **Privacy is visible and true.** Each tool explains that processing is local. Generated values and tested passwords are never sent to Velora by these pages.
4. **One shared system, four focused tools.** Reusable presentation components own layout and accessibility patterns. Each route owns its utility-specific state and generation or analysis logic.
5. **Content earns its space.** Educational sections answer likely questions, explain safe usage, and cross-link the other tools. Decorative stat cards and artificial empty height are removed.

## Information architecture

Each route follows the same top-level sequence:

1. Existing Velora public navigation
2. Compact route-specific hero introduction
3. Large interactive secure workbench
4. Local-processing reassurance
5. Three concise security benefits
6. Two or three route-specific educational sections
7. Best-practices guidance
8. Related utility links
9. Velora account call to action
10. Existing Velora footer

The hero and workbench should read as one opening composition on desktop. On mobile, the heading precedes the workbench and no important action is pushed below artificial viewport-height spacing.

## Visual system

### Color

Use existing project tokens wherever possible:

- Canvas: `#FFFFFF`
- Grouped surface: `#F2F2F7`
- Primary ink: `#000000`
- Action blue: `#007AFF`
- Success green: `#30D158`
- Footer graphite: `#0B0B0D`

Dark-mode values come from the existing Velora theme. New components must use semantic variables instead of hard-coded light-only colors except where a stable brand color is intentional.

### Typography

- Geist Sans: display, body, labels, buttons, and educational content
- Geist Mono: generated values, password analysis metrics, and other character-sensitive output

Headlines use Velora's compact negative tracking. Body copy remains plain, direct, and focused on the user's action.

### Signature element: the secure workbench

Every utility uses one large blue-tinted workbench that visually joins the output and controls. It is the memorable element of the system and replaces the current small device-like card floating beside a large heading.

The workbench contains:

- A clear utility label and local-only privacy marker
- A prominent output or input area
- Primary copy or analysis feedback
- Regenerate action where applicable
- Grouped, labeled controls with visible current values
- A short contextual hint or validation message when needed

The workbench uses Velora's rounded grouped rows, segmented controls, pill actions, subtle separators, and restrained shadow. Decoration outside the workbench stays quiet.

### Motion

Use one restrained opening reveal and short state transitions for regeneration, copy confirmation, segmented selection, and score changes. Motion must not delay interaction. `prefers-reduced-motion` disables nonessential transforms and staged reveals.

## Component architecture

Create a small shared utility-page layer under the utilities feature rather than duplicating complete layouts.

Suggested responsibilities:

- `UtilityPageShell`: page width, hero/workbench composition, privacy statement, benefits, educational content, related tools, and CTA slots
- `UtilityWorkbench`: shared workbench header, output area, controls region, and action region
- `UtilityOutput`: overflow-safe monospace output with copy and regenerate controls
- `UtilityControlGroup`: consistent labeled rows, ranges, toggles, segmented controls, help text, and validation
- `UtilityBenefits`: concise three-item benefit band
- `RelatedUtilities`: links to the other three routes with the current route excluded
- Route clients: state, secure generation, strength analysis, and route-specific control composition

Shared components expose narrow props and slots. They do not know how passwords, passphrases, usernames, or zxcvbn scores are computed.

## Utility behavior

### Password generator

- Default length: 14
- Length range: 5–128
- Toggles: uppercase, lowercase, numbers, symbols
- At least one character set must remain enabled
- Generation uses the existing cryptographically secure random helper
- Every generated password must include at least one character from every enabled character set when length permits, then shuffle securely
- Output updates when settings change and when Regenerate is pressed
- Copy provides an accessible confirmation without changing layout width
- Show a compact strength label derived from length and enabled character diversity; it is guidance, not a substitute for the dedicated tester

### Passphrase generator

- Default word count: 4
- Word-count range: 3–20
- Separators: hyphen, space, period, comma, or none
- Toggles: capitalize words and append a number
- Uses the existing word dictionaries and secure random selection
- Output wraps without breaking the page at long word counts
- Regenerate and copy behavior match the password generator

### Username generator

- Two modes: readable words and random string
- Readable mode controls word count, separator, capitalization, and appended number
- Random-string mode controls length and uppercase, lowercase, and number sets
- At least one random-string character set must remain enabled
- Random generation uses the existing secure helper
- Mode changes reveal only relevant settings and preserve sensible defaults
- Regenerate and copy behavior match the other generators

### Password strength tester

- Empty state invites the visitor to type a password
- Password is masked by default with an explicit show/hide control
- Analysis remains entirely in the browser using the existing zxcvbn integration
- Results include four-level strength, estimated offline crack time, guess count, warning, and suggestions
- Result changes are announced without announcing every keystroke excessively
- The page never logs, stores, copies, or transmits the tested password
- Feedback layout remains stable as results appear

## Responsive behavior

### Large desktop: 1200px and above

- Content width aligns with the public navigation and footer rhythm
- Opening composition uses a compact intro column and a wider workbench column
- The workbench may divide output and settings into two internal columns
- Educational sections alternate media-like callouts and text only when that improves scanning

### Tablet: 768px–1199px

- Opening columns tighten without reducing readable measure
- Workbench stays two-column only when controls retain comfortable widths
- Benefit items may use a three-column row or wrap cleanly

### Mobile: below 768px

- Single-column flow
- Output or password input appears before settings
- Primary actions remain visually obvious and stretch when useful
- Interactive targets are at least 44px high
- Text inputs use at least 16px type to avoid iOS focus zoom
- Generated values wrap or scroll within their own bounded output area
- No horizontal overflow, clipped controls, fixed hero height, or oversized blank sections
- Padding accounts for device safe areas

## Accessibility

- Semantic heading order with one `h1` per route
- Visible keyboard focus on every interactive control
- Native inputs where practical; custom toggles expose name, state, and disabled behavior correctly
- Range inputs have associated labels, current values, minimums, and maximums
- Copy confirmation uses a polite live region
- Regeneration does not steal focus
- Strength updates use a debounced or suitably restrained announcement
- Text and controls meet WCAG AA contrast in light and dark modes
- Page remains usable at 200% zoom and with reduced motion

## Security and privacy

- Preserve `crypto.getRandomValues`-backed random selection through the existing secure-random abstraction
- Do not add analytics events containing generated or tested values
- Do not persist utility values to local storage, cookies, URL parameters, server actions, or APIs
- Clipboard access occurs only after an explicit user action
- Never write generated or tested values to the console
- User-facing copy must accurately state that these utility operations are local

## Content direction

Content should follow Bitwarden's useful question-and-answer hierarchy without copying its language. Each route includes:

- Why this type of credential or check matters
- How the tool works locally
- Best practices and mistakes to avoid
- When to use the other Velora utilities

Copy uses active voice and avoids unsupported breach statistics or absolute security claims. The account CTA connects the free tool to Velora's encrypted vault without implying that generated values are automatically saved.

## Error and edge states

- A prevented all-options-off action leaves the last valid option on and surfaces a short hint
- Empty generated output is never shown during normal operation
- Clipboard failure produces actionable inline feedback and leaves the value selectable
- Unsupported clipboard APIs fall back to selecting the output and instructing the visitor to copy manually
- Very long outputs remain readable and never expand the page horizontally
- zxcvbn warnings and suggestions render safely as text

## Testing strategy

### Logic tests

- Password length and enabled-set guarantees
- Secure shuffle and character-set validation behavior
- Passphrase word count, separators, capitalization, and appended number
- Username mode-specific rules and all-options-off prevention
- Strength-label mappings and empty/result states

### Component and interaction tests

- Copy success and failure feedback
- Regenerate behavior
- Range, toggle, and segmented-control labeling
- Username mode switching
- Password visibility control
- Strength result rendering
- Related-tools links exclude the current utility

### Verification

- ESLint
- Existing Node test suite
- Production Next.js build
- Visual inspection at representative mobile, tablet, and desktop widths
- Keyboard-only pass
- Light mode, dark mode, and reduced-motion checks
- Browser console free of hydration and runtime errors on all four routes

## Acceptance criteria

The redesign is complete when:

1. All four routes use the shared hierarchy and Velora secure-workbench visual system.
2. Existing generator and strength-analysis capabilities remain available, with the behavior defined above.
3. Pages contain no artificial blank regions, clipped tool cards, horizontal overflow, or desktop-only assumptions.
4. All values remain local and secure generation continues to use the existing cryptographic helper.
5. Mobile, tablet, and desktop layouts are usable in both light and dark themes.
6. Keyboard focus, labels, status announcements, and reduced-motion behavior are implemented.
7. Lint, tests, and production build pass.
8. All four routes render without browser console errors.

## Out of scope

- Saving generated credentials directly into a signed-in vault
- Adding new server endpoints or persistence
- Reworking the global navigation or footer
- Copying Bitwarden branding, artwork, awards, statistics, or page text
- Creating additional utility routes
