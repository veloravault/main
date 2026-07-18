# Remotion Vault Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mismatched homepage product imagery with content-aligned shared vault previews and an autoplaying Remotion hero walkthrough that matches the real Apple-style vault UI.

**Architecture:** Extend `VeloraProductPreview` into a pure, deterministic demo UI supporting overview, passwords, documents, wallet, and mobile states. A Remotion composition reuses those presentational states to render an H.264 walkthrough and poster; the Next.js hero delivers the files through a resilient client media component with reduced-motion and data-saving fallbacks.

**Tech Stack:** Next.js 16.2.10 App Router, React 19.2.7, CSS Modules, Framer Motion 12, Remotion 4.0.490, H.264 MP4, Node test runner

## Global Constraints

- Install `remotion` and `@remotion/cli` at exactly `4.0.490` together.
- Use fictional demo records only; no credentials, production data, tracking, audio, network calls, or browser storage.
- Autoplay muted, loop, and inline only when motion/data preferences allow it.
- Preserve a generated poster on reduced motion, data saving, loading, or playback failure.
- Remove the oversized decorative hero `VaultSeal`.
- Keep all essential hero text and actions outside media.
- Do not modify `.claude/settings.json`.

---

### Task 1: Define content-aligned shared preview states

**Files:**
- Modify: `tests/landing-integrity.test.mjs`
- Modify: `src/components/dreelio/VeloraProductPreview.tsx`
- Modify: `src/components/dreelio/VeloraProductPreview.module.css`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Produces: `VeloraPreviewVariant = "overview" | "passwords" | "documents" | "wallet" | "mobile"` through the existing `variant` prop.
- Consumes: fictional constant records and Lucide icons only.

- [ ] **Step 1: Write the failing content-mapping test**

Assert the page maps nearby copy to `preview="passwords"`, `preview="documents"`, and `preview="wallet"`; assert the preview type contains all five variants; assert remote third-party images are absent from core product preview code.

- [ ] **Step 2: Run the landing integrity test and verify RED**

Run: `node --test tests/landing-integrity.test.mjs`

Expected: FAIL because the documents preview and explicit document feature mapping do not exist.

- [ ] **Step 3: Implement the documents state and align existing states**

Add a deterministic `Documents()` screen using the real vault vocabulary: category/list, protected document detail, file metadata, and encrypted status. Keep `Overview`, `Passwords`, `Wallet`, and `Mobile` structurally consistent with current app navigation, spacing, card radii, and Apple-style system colors. Do not add an oversized preview logo.

- [ ] **Step 4: Map every feature section to its matching state**

Update the homepage feature data/composition so password copy uses `passwords`, document copy uses `documents`, wallet copy uses `wallet`, and the Devices tabs continue to use `mobile` and `overview`.

- [ ] **Step 5: Run the landing integrity test and verify GREEN**

Run: `node --test tests/landing-integrity.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit shared preview alignment**

```bash
git add tests/landing-integrity.test.mjs src/components/dreelio/VeloraProductPreview.tsx src/components/dreelio/VeloraProductPreview.module.css src/app/page.tsx
git commit -m "feat: align landing previews with vault content"
```

### Task 2: Add resilient hero video delivery

**Files:**
- Create: `src/components/dreelio/HeroVaultMedia.tsx`
- Create: `src/components/dreelio/HeroVaultMedia.module.css`
- Modify: `tests/landing-integrity.test.mjs`
- Modify: `src/components/dreelio/Hero.tsx`
- Modify: `src/components/dreelio/Hero.module.css`

**Interfaces:**
- Produces: `HeroVaultMedia()` with no props, serving `/videos/velora-vault-walkthrough.mp4` and `/videos/velora-vault-walkthrough-poster.png`.
- Consumes: `matchMedia("(prefers-reduced-motion: reduce)")` and optional `navigator.connection.saveData` without assuming the non-standard connection API exists.

- [ ] **Step 1: Write the failing media contract test**

Assert the hero imports `HeroVaultMedia`, no longer imports/renders `VaultSeal`, and the client component contains `autoPlay`, `muted`, `loop`, `playsInline`, poster paths, reduced-motion detection, data-saving detection, and an error fallback.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/landing-integrity.test.mjs`

Expected: FAIL because `HeroVaultMedia` is absent and `VaultSeal` remains.

- [ ] **Step 3: Implement poster-first media behavior**

Implement a mounted preference check and a fail-safe poster layer:

```tsx
const shouldUsePoster = reduceMotion || saveData || failed;
return shouldUsePoster ? (
  <Image src={POSTER} alt="Velora Vault overview showing passwords, documents, and wallet records" fill priority />
) : (
  <video autoPlay muted loop playsInline poster={POSTER} preload="metadata" onError={() => setFailed(true)} aria-label="Velora Vault product walkthrough">
    <source src={VIDEO} type="video/mp4" />
  </video>
);
```

Avoid hydration mismatch by rendering the poster before the client preference check resolves. Keep a poster background behind video so a rejected autoplay or slow first frame is not blank.

- [ ] **Step 4: Replace the hero preview and remove the floating seal**

Swap `VeloraProductPreview variant="overview"` for `HeroVaultMedia`; delete the `VaultSeal` import/render and `.seal` CSS. Preserve the encryption badge and stable aspect ratio.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `node --test tests/landing-integrity.test.mjs tests/dreelio-motion.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit delivery behavior**

```bash
git add tests/landing-integrity.test.mjs src/components/dreelio/HeroVaultMedia.tsx src/components/dreelio/HeroVaultMedia.module.css src/components/dreelio/Hero.tsx src/components/dreelio/Hero.module.css
git commit -m "feat: add resilient hero walkthrough media"
```

### Task 3: Build and render the Remotion composition

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `remotion/index.ts`
- Create: `remotion/Root.tsx`
- Create: `remotion/VeloraVaultWalkthrough.tsx`
- Create: `remotion/VeloraVaultWalkthrough.module.css`
- Create: `tests/remotion-media.test.mjs`
- Create: `public/videos/velora-vault-walkthrough.mp4` (generated)
- Create: `public/videos/velora-vault-walkthrough-poster.png` (generated)

**Interfaces:**
- Produces: composition id `VeloraVaultWalkthrough`, 1280×900, 30 fps, 270 frames; package scripts `media:studio`, `media:render`, and `media:poster`.
- Consumes: deterministic shared preview variants from Task 1.

- [ ] **Step 1: Write the failing Remotion contract test**

Assert matching pinned Remotion versions, the composition id and dimensions, all five scene variants, render scripts, output paths, and the absence of credentials/network APIs from `remotion/**`.

- [ ] **Step 2: Run the media test and verify RED**

Run: `node --test tests/remotion-media.test.mjs`

Expected: FAIL because Remotion files and dependencies do not exist.

- [ ] **Step 3: Install matching Remotion packages**

Run: `npm install --save-dev --save-exact remotion@4.0.490 @remotion/cli@4.0.490`

Expected: `package.json` and lockfile contain the same exact version for both packages.

- [ ] **Step 4: Register the composition**

Register:

```tsx
<Composition
  id="VeloraVaultWalkthrough"
  component={VeloraVaultWalkthrough}
  durationInFrames={270}
  fps={30}
  width={1280}
  height={900}
/>
```

Add scripts:

```json
"media:studio": "remotion studio remotion/index.ts",
"media:render": "remotion render remotion/index.ts VeloraVaultWalkthrough public/videos/velora-vault-walkthrough.mp4 --codec=h264 --crf=22 --overwrite",
"media:poster": "remotion still remotion/index.ts VeloraVaultWalkthrough public/videos/velora-vault-walkthrough-poster.png --frame=254 --overwrite"
```

- [ ] **Step 5: Implement the five-scene sequence**

Use `Sequence`, `interpolate`, `spring`, `AbsoluteFill`, and shared preview variants. Sequence overview (0–54), passwords (54–108), documents (108–162), wallet (162–216), and overview return (216–270). Each scene gets a short opacity/scale transition and remains readable for most of its interval. Use no audio or remote assets.

- [ ] **Step 6: Run the media test and verify GREEN**

Run: `node --test tests/remotion-media.test.mjs`

Expected: PASS.

- [ ] **Step 7: Render video and poster**

Run sequentially:

```bash
npm run media:render
npm run media:poster
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,r_frame_rate -of default=noprint_wrappers=1 public/videos/velora-vault-walkthrough.mp4
```

Expected: H.264, 1280×900, 30 fps, approximately 9 seconds; poster is 1280×900.

- [ ] **Step 8: Inspect representative frames**

Render stills at frames 30, 84, 138, 192, and 246 to a temporary directory. Visually confirm no clipped content, duplicate/oversized logo, unrelated UI language, or mismatch between scene and adjacent landing content.

- [ ] **Step 9: Commit composition and generated delivery assets**

```bash
git add package.json package-lock.json remotion tests/remotion-media.test.mjs public/videos/velora-vault-walkthrough.mp4 public/videos/velora-vault-walkthrough-poster.png
git commit -m "feat: render exact vault hero walkthrough"
```

### Task 4: Full verification and browser QA

**Files:**
- Modify only if a verification failure proves a regression in files from Tasks 1–3.

**Interfaces:**
- Consumes: all implementation commits.
- Produces: verified desktop/mobile/reduced-motion landing and green repository gates.

- [ ] **Step 1: Run focused project tests**

Run: `node --test tests/biometric-errors.test.mjs tests/landing-integrity.test.mjs tests/landing-trust.test.mjs tests/security-page-visual.test.mjs tests/dreelio-motion.test.mjs tests/remotion-media.test.mjs`

Expected: PASS.

- [ ] **Step 2: Run full automated gates sequentially**

Run:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Expected: all commands exit 0 with no new warnings attributable to this pass.

- [ ] **Step 3: Run local browser QA**

Verify `/` at 1440×1000 and 390×844, `/security` at both widths, normal motion, reduced motion, and simulated video failure. Confirm the hero autoplays muted where allowed, poster fallback is stable, the oversized logo is gone, every preview matches nearby copy, and all public navigation remains usable.

- [ ] **Step 4: Verify biometric recovery copy**

Trigger cancellation/timeout where the browser permits, confirm raw W3C text is absent, and verify PIN/master-key fallback remains usable. If platform prompts cannot be deterministically triggered, rely on the focused mapper tests and verify one supported manual cancellation path.

- [ ] **Step 5: Commit any verification-only correction**

If corrections were required, stage only files owned by these plans and commit:

```bash
git commit -m "fix: close security and media QA gaps"
```
