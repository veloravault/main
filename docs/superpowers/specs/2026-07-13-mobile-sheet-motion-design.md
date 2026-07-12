# Mobile Sheet Motion and Scrollbar Design

## Objective

Remove visible native scrollbar tracks from mobile sheets and the command palette while preserving scrolling, then add restrained Apple-style entrance and exit motion.

## Scroll Behavior

- Password, Document, Note, Wallet, and Bank form bodies remain independently scrollable.
- Magic Import phase content remains independently scrollable.
- Command palette results remain independently scrollable.
- Scrollbar tracks are hidden with both `scrollbar-width: none` and WebKit scrollbar rules.
- Touch momentum, mouse-wheel scrolling, keyboard scrolling, and overscroll containment remain functional.
- Grabbers, titles, and close controls remain outside scrolling regions.

## Sheet Motion

- Responsive form sheets and Magic Import enter from below the viewport with a soft opacity transition.
- Duration is 320ms using `cubic-bezier(.22,.88,.36,1)` to approximate an iOS spring without bounce.
- Closing reverses the same motion.
- The final resting state has no translation or scale.
- Motion uses `transform: translate3d(0,100%,0)` rather than the CSS `translate` property so it does not conflict with Tailwind's centering variables.
- Wallet card details use the same sheet motion.

## Command Palette Motion

- Existing Framer Motion remains: short fade and subtle scale/vertical movement.
- The results scrollbar is hidden without changing the palette's maximum height.

## Accessibility

- `prefers-reduced-motion: reduce` disables all sheet movement and uses an instant state change.
- Hiding scrollbar visuals must not disable scrolling or remove keyboard focus behavior.

## Verification

- Do not add automated test cases.
- Run the production Next.js build.
- Confirm compiled CSS retains scrollbar-hiding declarations and sheet open/closed transforms.
- Browser visual verification remains desirable when the supported browser integration is available.
