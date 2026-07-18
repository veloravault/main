# Mobile Vault White Background

## Goal

Make the light-mode background of every authenticated vault screen pure white on mobile. Preserve the existing Apple-style cards, separators, safe areas, navigation chrome, and the true-black mobile dark theme.

## Scope

The change applies at viewports below 768px to the shared authenticated vault shell. Because Dashboard, Passwords, Documents, Notes, Wallet, Bank Accounts, and Settings all render inside the same `.ios-content-scroll` canvas, the background must be corrected centrally rather than in each feature component.

## Design

- Keep the global mobile light-mode `--background` token at `#F2F2F7` so public, authentication, card, and portal surfaces retain their existing treatment.
- Override `--background` to `#FFFFFF` only on the authenticated `.ios-app-shell`.
- Replace the mobile `.ios-content-scroll` gray gradient with a solid `var(--background)` canvas.
- Add a `.dark .ios-app-shell` override at `#000000`, so dark mode remains unchanged.
- Keep `--card`, separators, safe-area behavior, scrolling, header, and bottom tab bar behavior unchanged.
- Do not alter desktop background behavior.

## Verification

- Add an integrity assertion that the mobile light background token is white and the scroll canvas uses a solid background.
- Confirm the regression test fails before the CSS change and passes afterward.
- Run the full project integrity test suite.
- Visually inspect representative authenticated mobile screens at approximately 400px width, including Dashboard and Passwords, and confirm the canvas is white from header to tab bar without gray gaps.
