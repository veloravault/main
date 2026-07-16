import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { blue, fontFamily, graphite, paper, soft, white } from "./theme";
import { AppShell, Field, loopFadeOpacity, press, SheetShell, Toast, typedText } from "./shared";

export const ADD_CARD_DURATION = 260;

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

const TypeToggle: React.FC<{ progress: number }> = ({ progress }) => (
  <div
    style={{
      display: "flex",
      borderRadius: 12,
      padding: 4,
      background: soft,
      gap: 4,
    }}
  >
    {["Debit", "Credit"].map((label, index) => {
      const active = index === 1 ? progress : 1 - progress;
      return (
        <div
          key={label}
          style={{
            flex: 1,
            textAlign: "center",
            padding: "8px 0",
            borderRadius: 9,
            fontSize: 13,
            fontWeight: 650,
            color: active > 0.5 ? white : graphite,
            background: `color-mix(in srgb, ${blue} ${Math.round(active * 100)}%, transparent)`,
          }}
        >
          {label} Card
        </div>
      );
    })}
  </div>
);

export const AddCard: React.FC = () => {
  const frame = useCurrentFrame();

  const buttonPress = press(frame, 18);

  const sheetOffset = interpolate(frame, [26, 46], [100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });

  const sheetExit = interpolate(frame, [188, 208], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 1, 1),
  });

  const toggleProgress = interpolate(frame, [54, 66], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const nicknameProgress = interpolate(frame, [72, 94], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const numberProgress = interpolate(frame, [100, 130], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const expiryProgress = interpolate(frame, [136, 148], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cvvProgress = interpolate(frame, [150, 160], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const savePress = press(frame, 178);

  const showSheet = frame >= 26 && frame < 208;
  const showNewRow = frame >= 184;
  const newRowProgress = interpolate(frame, [184, 202], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const toastProgress = interpolate(
    frame,
    [202, 214, 236, 248],
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
        opacity: loopFadeOpacity(frame, ADD_CARD_DURATION),
      }}
    >
      <div style={{ position: "relative", width: 640, height: 560 }}>
        <AppShell
          sectionLabel="Wallet"
          actionLabel="New"
          buttonPress={buttonPress}
          rows={[
            { initial: "V", title: "Velora Visa", detail: "Debit card", trailing: "•• 2486" },
          ]}
          newRow={{
            initial: "C",
            title: "Chase Sapphire",
            detail: "Credit card",
            trailing: "•• 4471",
          }}
          showNewRow={showNewRow}
          newRowProgress={newRowProgress}
        />
        {showSheet && (
          <SheetShell
            offset={frame < 188 ? sheetOffset : sheetExit}
            title="New Card"
            description="Scan or enter card details. Everything is encrypted before saving."
            primaryLabel="Encrypt & Save"
            primaryPressed={savePress}
          >
            <TypeToggle progress={toggleProgress} />
            <Field
              label="Nickname / Title"
              placeholder="e.g. Chase Sapphire"
              value={typedText("Chase Sapphire", nicknameProgress)}
            />
            <Field
              label="Card Number"
              placeholder="XXXX XXXX XXXX XXXX"
              value={typedText("4471 8820 1190 4471", numberProgress)}
              mono
            />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Field
                  label="Expiry"
                  placeholder="MM/YY"
                  value={typedText("08/29", expiryProgress)}
                  mono
                />
              </div>
              <div style={{ flex: 1 }}>
                <Field
                  label="CVV"
                  placeholder="123"
                  value={typedText("492", cvvProgress)}
                  masked
                />
              </div>
            </div>
          </SheetShell>
        )}
        <Toast progress={toastProgress} />
      </div>
    </AbsoluteFill>
  );
};
