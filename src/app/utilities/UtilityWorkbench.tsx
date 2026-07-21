"use client";

import type { ReactNode, RefObject } from "react";
import {
  CheckIcon,
  CopyIcon,
  LockKeyholeIcon,
  RefreshCwIcon,
} from "lucide-react";
import styles from "./utilities.module.css";

export function UtilityWorkbench({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.workbench} aria-labelledby="utility-workbench-title">
      <header className={styles.workbenchHeader}>
        <div>
          <p className={styles.workbenchKicker}>Free utility</p>
          <h2 id="utility-workbench-title">{title}</h2>
          <p>{description}</p>
        </div>
        <span className={styles.localBadge}>
          <LockKeyholeIcon aria-hidden="true" /> Local only
        </span>
      </header>
      {children}
    </section>
  );
}

export function UtilityOutput({
  value,
  label,
  outputRef,
  onCopy,
  onRegenerate,
  status,
}: {
  value: string;
  label: string;
  outputRef: RefObject<HTMLOutputElement | null>;
  onCopy: () => void;
  onRegenerate: () => void;
  status: "idle" | "copied" | "manual";
}) {
  const message =
    status === "copied"
      ? `${label} copied`
      : status === "manual"
        ? "Copy unavailable. The value is selected; copy it manually."
        : "";

  return (
    <div className={styles.outputPanel}>
      <span className={styles.outputLabel}>{label}</span>
      <output ref={outputRef} className={styles.outputValue} tabIndex={0}>
        {value}
      </output>
      <div className={styles.outputActions}>
        <button type="button" onClick={onRegenerate}>
          <RefreshCwIcon aria-hidden="true" /> Regenerate
        </button>
        <button type="button" className={styles.copyAction} onClick={onCopy}>
          {status === "copied" ? (
            <CheckIcon aria-hidden="true" />
          ) : (
            <CopyIcon aria-hidden="true" />
          )} Copy
        </button>
      </div>
      <p className={styles.srStatus} aria-live="polite">
        {message}
      </p>
    </div>
  );
}

export function UtilityRange({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.rangeControl} htmlFor={id}>
      <span>
        {label}
        <output htmlFor={id}>{value}</output>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}

export function UtilitySwitch({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className={styles.switchControl} htmlFor={id}>
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={onChange}
      />
    </label>
  );
}

export function UtilitySegments<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.segmentControl} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
