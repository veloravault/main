import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
} from "remotion";

const paper = "#fbfbfd";
const white = "#ffffff";
const soft = "#f2f2f4";
const graphite = "#1d1d1f";
const muted = "#6e6e73";
const blue = "#0071e3";
const hairline = "rgba(29, 29, 31, 0.12)";

const fontFamily =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif';

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

const Row = ({
  initial,
  title,
  email,
  masked = true,
}: {
  initial: string;
  title: string;
  email: string;
  masked?: boolean;
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
      <small style={{ fontSize: 12, color: muted }}>{email}</small>
    </div>
    <b
      style={{
        color: muted,
        fontFamily: "ui-monospace, SFMono-Regular, monospace",
        fontSize: 12,
        letterSpacing: "0.12em",
      }}
    >
      {masked ? "••••••" : ""}
    </b>
  </div>
);

const NewRow: React.FC<{ progress: number }> = ({ progress }) => (
  <div
    style={{
      opacity: progress,
      translate: `0 ${interpolate(progress, [0, 1], [-14, 0])}px`,
    }}
  >
    <Row initial="N" title="Netflix" email="Vault item" />
  </div>
);

const NewButton: React.FC<{ pressed: number }> = ({ pressed }) => (
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
    <span style={{ fontSize: 16, lineHeight: 0 }}>+</span> New
  </div>
);

const AppShell: React.FC<{
  buttonPress: number;
  showNewRow: boolean;
  newRowProgress: number;
}> = ({ buttonPress, showNewRow, newRowProgress }) => (
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
        Passwords
      </span>
      <NewButton pressed={buttonPress} />
    </div>
    <div style={{ flex: 1 }}>
      <Row initial="G" title="Google" email="personal@icloud.com" />
      <Row initial="A" title="Apple ID" email="velora@icloud.com" />
      {showNewRow && <NewRow progress={newRowProgress} />}
    </div>
  </div>
);

const typedText = (value: string, progress: number) => {
  const count = Math.round(
    interpolate(progress, [0, 1], [0, value.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  return value.slice(0, count);
};

const Field = ({
  label,
  placeholder,
  value,
  masked = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  masked?: boolean;
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
        fontFamily: masked ? "ui-monospace, SFMono-Regular, monospace" : fontFamily,
        letterSpacing: masked ? "0.2em" : "-0.01em",
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

const Sheet: React.FC<{
  offset: number;
  titleProgress: number;
  passwordProgress: number;
  savePressed: number;
}> = ({ offset, titleProgress, passwordProgress, savePressed }) => (
  <AbsoluteFill style={{ justifyContent: "flex-end" }}>
    <div
      style={{
        translate: `0 ${offset}%`,
        width: "100%",
        borderRadius: "28px 28px 0 0",
        background: white,
        boxShadow: "0 -30px 80px rgba(0,0,0,0.22)",
        padding: "30px 32px 32px",
        display: "grid",
        gap: 22,
      }}
    >
      <div>
        <strong style={{ fontSize: 20, fontWeight: 650, color: graphite }}>
          New Password
        </strong>
        <p style={{ marginTop: 6, color: muted, fontSize: 13, lineHeight: 1.5 }}>
          Add a credential encrypted with your existing master key.
        </p>
      </div>
      <Field
        label="Title"
        placeholder="e.g. Netflix, Bank"
        value={typedText("Netflix", titleProgress)}
      />
      <Field
        label="Password"
        placeholder="••••••••••••"
        value={typedText("nF-9vault!22", passwordProgress)}
        masked
      />
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
            scale: interpolate(savePressed, [0, 1], [1, 0.95]),
          }}
        >
          Save Password
        </div>
      </div>
    </div>
  </AbsoluteFill>
);

const Toast: React.FC<{ progress: number }> = ({ progress }) => (
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
    Saved to vault
  </div>
);

export const AddPassword: React.FC = () => {
  const frame = useCurrentFrame();

  const press = (start: number, duration = 10) =>
    interpolate(frame, [start, start + duration / 2, start + duration], [0, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  const buttonPress = press(18);

  const sheetOffset = interpolate(frame, [26, 46], [100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });

  const sheetExit = interpolate(frame, [172, 192], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 1, 1),
  });

  const titleProgress = interpolate(frame, [52, 82], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const passwordProgress = interpolate(frame, [90, 128], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const savePress = press(150);

  const showSheet = frame >= 26 && frame < 192;
  const showNewRow = frame >= 168;
  const newRowProgress = interpolate(frame, [168, 186], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const toastProgress = interpolate(
    frame,
    [186, 198, 226, 238],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        fontFamily,
        background: `radial-gradient(circle at 50% 20%, ${soft}, ${paper} 60%)`,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ position: "relative", width: 640, height: 560 }}>
        <AppShell
          buttonPress={buttonPress}
          showNewRow={showNewRow}
          newRowProgress={newRowProgress}
        />
        {showSheet && (
          <Sheet
            offset={frame < 172 ? sheetOffset : sheetExit}
            titleProgress={titleProgress}
            passwordProgress={passwordProgress}
            savePressed={savePress}
          />
        )}
        <Sequence from={0}>
          <Toast progress={toastProgress} />
        </Sequence>
      </div>
    </AbsoluteFill>
  );
};
