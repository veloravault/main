# Public Header Navigation Design

## Goal

Make every shipped Velora Vault product, utility, and support page easy to discover from a header that remains calm at desktop, 125 percent zoom, and mobile widths.

## Information architecture

- Products: Password Manager, How it works, Secure Documents, Digital Wallet, Magic Import.
- Utilities: Password Generator, Passphrase Generator, Username Generator, Password Strength Tester.
- Resources: Security, Help Center, Blog, Contact.
- Pricing remains a direct primary-navigation link.
- Search, Sign in, Get started free, and appearance remain action controls. Authenticated visitors see Open vault instead of the public account actions.

This follows the useful category separation seen across Bitwarden, 1Password, Proton Pass, and NordPass without copying their enterprise-heavy navigation.

## Interaction

Desktop dropdowns open by button activation, keep only one panel open, close on outside pointer input, close on Escape, and close when a destination is selected. Panels use ordinary navigation links rather than application menu roles.

Mobile uses one accordion state shared by Products, Utilities, and Resources. Pricing remains visible as a direct link. The menu is scrollable within the viewport and all controls retain at least a 44px touch target.

## Visual direction

The existing white or black floating capsule remains. Dropdown panels use Velora blue for small icons, a restrained white or black surface, thin separators, clear titles, and short plain-language descriptions. Products receives the widest two-column panel; Utilities and Resources remain compact. Motion is limited to the existing short opacity and position transition and respects reduced-motion preferences.

## Responsive behavior

The complete desktop navigation remains visible above 1024px, including a 1152px CSS viewport that represents 125 percent zoom on a 1440px display. At 1024px and below, the mobile controls and accordion menu take over. Neither state may create horizontal overflow at 390px, 1024px, 1152px, or 1440px.

## Testing

- Static contracts verify all categories, routes, descriptions, dropdown semantics, mobile accordions, focus styles, and the 1024px breakpoint.
- Browser checks verify desktop dropdown behavior, outside or Escape closure, the 1152px desktop state, mobile accordion behavior, and zero horizontal overflow.
- The full test suite, lint, and production build must pass before commit.
