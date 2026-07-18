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

function errorName(reason: unknown): string | null {
  if (reason && typeof reason === "object" && "name" in reason) {
    const name = (reason as { name?: unknown }).name;
    return typeof name === "string" ? name : null;
  }
  return null;
}

export function normalizeBiometricError(
  reason: unknown,
  operation: BiometricOperation,
): BiometricError {
  if (reason instanceof BiometricError) return reason;

  const options = { cause: reason };
  switch (errorName(reason)) {
    case "NotAllowedError":
    case "AbortError":
      return new BiometricError(
        "prompt_cancelled",
        "Face ID, Touch ID, or your device prompt was cancelled or timed out. Try again.",
        options,
      );
    case "NotSupportedError":
      return new BiometricError(
        "unsupported",
        "This device or browser does not support the biometric unlock required by Velora Vault. Use your PIN or master key instead.",
        options,
      );
    case "SecurityError":
      return new BiometricError(
        "insecure_context",
        "Biometric unlock is blocked here. Open Velora Vault in a secure, supported browser and try again.",
        options,
      );
    case "InvalidStateError":
      return operation === "enroll"
        ? new BiometricError(
            "credential_exists",
            "Biometric unlock may already be registered on this device. Try unlocking first or reset biometric unlock in Settings.",
            options,
          )
        : new BiometricError(
            "credential_unavailable",
            "This device could not find the saved biometric credential. Unlock with your master key, then set up biometric unlock again.",
            options,
          );
    default:
      return new BiometricError(
        "unexpected",
        operation === "enroll"
          ? "Biometric setup could not be completed. Try again or continue with your master key."
          : "Biometric unlock could not be completed. Use your PIN or master key and try again.",
        options,
      );
  }
}

