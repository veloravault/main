# WebAuthn Error Handling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace raw browser WebAuthn failures with stable, actionable Velora errors at every biometric enrollment and unlock surface.

**Architecture:** `src/lib/biometrics.ts` remains the credential boundary and gains a typed `BiometricError` plus one `normalizeBiometricError()` mapper. Enrollment and assertion calls normalize browser exceptions before they leave the library; existing UI call sites continue to render `Error.message`, which is now safe and consistent.

**Tech Stack:** TypeScript, WebAuthn, Web Crypto, React 19, Node test runner

## Global Constraints

- Do not change the credential-storage or encryption design.
- Preserve account-owner checks before and after WebAuthn prompts.
- Never render raw `DOMException`, database, or provider text.
- Keep PIN and master-key fallbacks available.
- Do not modify `.claude/settings.json`.

---

### Task 1: Normalize browser credential failures

**Files:**
- Create: `src/lib/biometricErrors.ts`
- Create: `tests/biometric-errors.test.mjs`
- Modify: `src/lib/biometrics.ts`

**Interfaces:**
- Produces: `BiometricErrorCode`, `BiometricError`, and `normalizeBiometricError(reason, operation)`.
- Consumes: native WebAuthn `DOMException.name` values and the operation union `"enroll" | "unlock"`.

- [ ] **Step 1: Write the failing mapping test**

Create source-contract assertions that import the compiled-independent helper source and verify mappings for `NotAllowedError`, `NotSupportedError`, `SecurityError`, `InvalidStateError`, `AbortError`, unknown errors, and already normalized `BiometricError` instances. Expected messages must be stable application copy and must not contain the raw W3C browser sentence.

```js
test("maps NotAllowedError to a retryable biometric prompt message", () => {
  const mapped = normalizeBiometricError(
    Object.assign(new Error("The operation either timed out or was not allowed."), { name: "NotAllowedError" }),
    "unlock",
  );
  assert.equal(mapped.code, "prompt_cancelled");
  assert.equal(mapped.message, "Face ID, Touch ID, or your device prompt was cancelled or timed out. Try again.");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/biometric-errors.test.mjs`

Expected: FAIL because `src/lib/biometricErrors.ts` and the normalization API do not exist.

- [ ] **Step 3: Implement the typed mapper**

Create the following public surface and map only known WebAuthn names; retain `cause` for diagnostics:

```ts
export type BiometricOperation = "enroll" | "unlock";
export type BiometricErrorCode =
  | "prompt_cancelled"
  | "unsupported"
  | "insecure_context"
  | "credential_exists"
  | "credential_unavailable"
  | "account_changed"
  | "reset_required"
  | "unexpected";

export class BiometricError extends Error {
  readonly code: BiometricErrorCode;

  constructor(
    code: BiometricErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "BiometricError";
    this.code = code;
  }
}

export function normalizeBiometricError(
  reason: unknown,
  operation: BiometricOperation,
): BiometricError;
```

Use operation-specific language for `InvalidStateError`: enrollment says biometric unlock may already be registered; unlock says the saved device credential is unavailable and master-key unlock should be used before setup is repeated.

- [ ] **Step 4: Normalize `create()` and `get()` at the boundary**

Wrap each native credential call only, leaving owner re-checks and AES operations intact:

```ts
try {
  credential = await navigator.credentials.create({ publicKey: options });
} catch (reason) {
  throw normalizeBiometricError(reason, "enroll");
}
```

Use the same pattern for `navigator.credentials.get()` with `"unlock"`. Convert unsupported-context and reset-required errors to explicit `BiometricError` values so all public biometric failures share the same type.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `node --test tests/biometric-errors.test.mjs`

Expected: PASS for every error class and explicit assertion that raw browser text is absent.

- [ ] **Step 6: Commit the boundary**

```bash
git add src/lib/biometricErrors.ts src/lib/biometrics.ts tests/biometric-errors.test.mjs
git commit -m "fix: normalize biometric credential errors"
```

### Task 2: Guard every biometric UI surface

**Files:**
- Modify: `tests/biometric-errors.test.mjs`
- Modify: `src/components/Auth.tsx`
- Modify: `src/components/Dashboard.tsx`
- Modify: `src/components/PinLock.tsx`
- Modify: `src/components/settings/LocalVerificationSheet.tsx`
- Modify: `src/components/settings/SecuritySettings.tsx`

**Interfaces:**
- Consumes: `BiometricError.message` from Task 1.
- Produces: consistent alert/toast behavior with master-key and PIN fallback preserved.

- [ ] **Step 1: Add a failing call-site contract test**

Assert all five UI modules call only `enableBiometrics()` or `unlockWithBiometrics()` and contain no raw W3C error text. Assert inline error containers keep `role="alert"`, and biometric buttons do not remove existing fallback controls.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/biometric-errors.test.mjs`

Expected: FAIL on any missing alert semantics or direct/raw native error exposure found by the contract.

- [ ] **Step 3: Apply the minimal UI fixes**

Keep the established catch pattern but ensure each surface uses the normalized error and clears working state:

```ts
} catch (reason) {
  const message = reason instanceof Error
    ? reason.message
    : "Biometric unlock could not be completed. Use your PIN or master key and try again.";
  setError(message);
}
```

Use enrollment wording on setup surfaces and unlock wording on unlock surfaces. Do not duplicate DOMException-name switches outside the library.

- [ ] **Step 4: Run focused and ownership regressions**

Run: `node --test tests/biometric-errors.test.mjs tests/vault-key-ownership.test.mjs tests/security-controls.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit UI integration**

```bash
git add tests/biometric-errors.test.mjs src/components/Auth.tsx src/components/Dashboard.tsx src/components/PinLock.tsx src/components/settings/LocalVerificationSheet.tsx src/components/settings/SecuritySettings.tsx
git commit -m "fix: show actionable biometric recovery errors"
```
