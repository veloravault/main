# Auth Strength Meter and Onboarding Icon Design

## Scope

Improve the signup and onboarding authentication experience without changing images or SEO. The existing Apple-ecosystem direction remains the visual baseline.

## Password strength

Signup passwords and onboarding master keys use one shared, accessible strength meter. The meter contains four compact rounded segments and advances from one to four filled segments as the password moves through Weak, Fair, Strong, and Very Strong. Filled segments use system-aligned semantic colors: red, orange, blue, and green. The visible label and progressbar accessibility value remain synchronized with the same strength result.

## Onboarding symbols

Onboarding uses one consistent Lucide symbol vocabulary styled like Apple Settings: simple monochrome line symbols inside restrained rounded-square system fills. The vault introduction uses Key Round, zero-knowledge security uses Shield Check, profile selection uses User Round, master-key setup uses Lock Keyhole, and completion uses Circle Check. Intro benefit rows use meaning-specific symbols instead of repeating a generic checkmark.

## Constraints

- Do not add image assets or edit SEO surfaces.
- Do not use emoji, custom-drawn SVG marks, or licensed SF Symbols.
- Preserve the existing signup, onboarding, and client-only master-key behavior.
- Preserve reduced-motion behavior and mobile-safe layouts.
- Reuse the shared meter in both signup and onboarding to prevent visual drift.

## Verification

Add source-level regression coverage for the four strength states, semantic colors, progressive segment count, accessible progressbar attributes, shared usage, and the approved onboarding icon map. Then run focused tests, the full test suite, lint, type checking, production build, and responsive browser checks.
