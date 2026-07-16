import { AbsoluteFill, interpolate } from "remotion";
import { blue, fontFamily, graphite, hairline, muted, paper, soft, white } from "./theme";

/** A brief scale-down-and-back pulse, e.g. for a tapped button. */
export const press = (frame: number, start: number, duration = 10) =>
  interpolate(frame, [start, start + duration / 2, start + duration], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** Reveals `value` one character at a time as `progress` goes 0 -> 1. */
export const typedText = (value: string, progress: number) => {
  const count = Math.round(
    interpolate(progress, [0, 1], [0, value.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  return value.slice(0, count);
};

/**
 * Fades the whole scene in from, and back out to, the plain background at the
 * very start/end of the composition so the <video loop> restart lands on two
 * matching (empty) frames instead of jump-cutting mid-flow — the visible
 * "reset" that reads as a jittery glitch on an autoplaying, looping demo.
 */
export const loopFadeOpacity = (
  frame: number,
  totalDuration: number,
  fadeFrames = 16,
) =>
  Math.min(
    interpolate(frame, [0, fadeFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    interpolate(
      frame,
      [totalDuration - fadeFrames, totalDuration],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    ),
  );

export const ListRow = ({
  initial,
  title,
  detail,
  masked = true,
  trailing,
}: {
  initial: string;
  title: string;
  detail: string;
  masked?: boolean;
  trailing?: string;
}) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "48px 1fr auto",
      alignItems: "center",
      gap: 16,
      padding: "18px 22px",
      borderBottom: `1px solid ${hairline}`,
    }}
  >
    <div
      style={{
        display: "grid",
        placeItems: "center",
        width: 46,
        height: 46,
        borderRadius: 14,
        background: graphite,
        color: paper,
        fontSize: 16,
        fontWeight: 680,
      }}
    >
      {initial}
    </div>
    <div style={{ display: "grid", gap: 4 }}>
      <strong style={{ fontSize: 16, fontWeight: 650, color: graphite }}>
        {title}
      </strong>
      <small style={{ fontSize: 12, color: muted }}>{detail}</small>
    </div>
    <b
      style={{
        color: muted,
        fontFamily: "ui-monospace, SFMono-Regular, monospace",
        fontSize: 12,
        letterSpacing: "0.12em",
      }}
    >
      {trailing ?? (masked ? "••••••" : "")}
    </b>
  </div>
);

export const NewRow: React.FC<{
  progress: number;
  initial: string;
  title: string;
  detail: string;
  masked?: boolean;
  trailing?: string;
}> = ({ progress, initial, title, detail, masked, trailing }) => (
  <div
    style={{
      opacity: progress,
      translate: `0 ${interpolate(progress, [0, 1], [-14, 0])}px`,
    }}
  >
    <ListRow initial={initial} title={title} detail={detail} masked={masked} trailing={trailing} />
  </div>
);

export const ActionButton: React.FC<{ pressed: number; label: string }> = ({
  pressed,
  label,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 20px",
      borderRadius: 999,
      background: blue,
      color: white,
      fontSize: 14,
      fontWeight: 630,
      scale: interpolate(pressed, [0, 1], [1, 0.94]),
      boxShadow: `0 8px 24px rgba(0, 113, 227, ${interpolate(pressed, [0, 1], [0.28, 0.12])})`,
    }}
  >
    <span style={{ fontSize: 16, lineHeight: 0 }}>+</span> {label}
  </div>
);

type RowSpec = { initial: string; title: string; detail: string; masked?: boolean; trailing?: string };

export const AppShell: React.FC<{
  sectionLabel: string;
  actionLabel: string;
  buttonPress: number;
  rows: RowSpec[];
  newRow?: RowSpec;
  showNewRow: boolean;
  newRowProgress: number;
}> = ({ sectionLabel, actionLabel, buttonPress, rows, newRow, showNewRow, newRowProgress }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      borderRadius: 32,
      background: white,
      boxShadow: "0 40px 90px rgba(0,0,0,0.14)",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "24px 26px",
        borderBottom: `1px solid ${hairline}`,
      }}
    >
      <span style={{ fontSize: 15, fontWeight: 650, color: graphite }}>
        {sectionLabel}
      </span>
      <ActionButton pressed={buttonPress} label={actionLabel} />
    </div>
    <div style={{ flex: 1 }}>
      {rows.map((row) => (
        <ListRow key={row.title} {...row} />
      ))}
      {showNewRow && newRow && <NewRow progress={newRowProgress} {...newRow} />}
    </div>
  </div>
);

export const Field = ({
  label,
  placeholder,
  value,
  masked = false,
  mono = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  masked?: boolean;
  mono?: boolean;
}) => (
  <div style={{ display: "grid", gap: 8 }}>
    <span
      style={{
        color: muted,
        fontSize: 11,
        fontWeight: 650,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        marginLeft: 2,
      }}
    >
      {label}
    </span>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        minHeight: 52,
        borderRadius: 14,
        padding: "0 16px",
        background: soft,
        color: value ? graphite : muted,
        fontSize: 17,
        fontFamily: masked || mono ? "ui-monospace, SFMono-Regular, monospace" : fontFamily,
        letterSpacing: masked || mono ? "0.16em" : "-0.01em",
      }}
    >
      {value ? (masked ? "•".repeat(value.length) : value) : placeholder}
      {value.length > 0 && (
        <span
          style={{
            display: "inline-block",
            width: 2,
            height: 20,
            marginLeft: 3,
            background: blue,
          }}
        />
      )}
    </div>
  </div>
);

export const SheetShell: React.FC<{
  offset: number;
  title: string;
  description: string;
  primaryLabel: string;
  primaryPressed: number;
  children: React.ReactNode;
}> = ({ offset, title, description, primaryLabel, primaryPressed, children }) => (
  <AbsoluteFill style={{ justifyContent: "flex-end" }}>
    <div
      style={{
        translate: `0 ${offset}%`,
        width: "100%",
        borderRadius: "28px 28px 0 0",
        background: white,
        boxShadow: "0 -30px 80px rgba(0,0,0,0.22)",
        padding: "28px 32px 32px",
        display: "grid",
        gap: 18,
      }}
    >
      <div>
        <strong style={{ fontSize: 20, fontWeight: 650, color: graphite }}>
          {title}
        </strong>
        <p style={{ marginTop: 6, color: muted, fontSize: 13, lineHeight: 1.5 }}>
          {description}
        </p>
      </div>
      {children}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
          marginTop: 4,
        }}
      >
        <div style={{ color: muted, fontSize: 14, fontWeight: 580, padding: "12px 6px" }}>
          Cancel
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "12px 22px",
            borderRadius: 999,
            background: blue,
            color: white,
            fontSize: 14,
            fontWeight: 630,
            scale: interpolate(primaryPressed, [0, 1], [1, 0.95]),
          }}
        >
          {primaryLabel}
        </div>
      </div>
    </div>
  </AbsoluteFill>
);

export const Toast: React.FC<{ progress: number; label?: string }> = ({
  progress,
  label = "Saved to vault",
}) => (
  <div
    style={{
      position: "absolute",
      top: 28,
      left: "50%",
      translate: "-50% 0",
      opacity: progress,
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "12px 20px",
      borderRadius: 999,
      background: "rgba(29,29,31,0.92)",
      color: "#fff",
      fontSize: 14,
      fontWeight: 600,
      boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
      whiteSpace: "nowrap",
    }}
  >
    <span
      style={{
        display: "grid",
        placeItems: "center",
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "#32d74b",
        color: "#1d1d1f",
        fontSize: 12,
      }}
    >
      ✓
    </span>
    {label}
  </div>
);
