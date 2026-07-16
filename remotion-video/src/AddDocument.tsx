import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { blue, fontFamily, graphite, hairline, muted, paper, soft, white } from "./theme";
import { AppShell, loopFadeOpacity, press, SheetShell, Toast } from "./shared";

export const ADD_DOCUMENT_DURATION = 250;

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

const FileChip: React.FC<{ progress: number }> = ({ progress }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "14px 16px",
      borderRadius: 14,
      background: soft,
      opacity: progress,
      scale: interpolate(progress, [0, 1], [0.94, 1]),
    }}
  >
    <div
      style={{
        display: "grid",
        placeItems: "center",
        width: 34,
        height: 34,
        borderRadius: 9,
        background: blue,
        color: white,
        fontSize: 9,
        fontWeight: 700,
      }}
    >
      PDF
    </div>
    <span style={{ fontSize: 14, fontWeight: 600, color: graphite }}>Passport.pdf</span>
  </div>
);

const AiToggle: React.FC<{ progress: number }> = ({ progress }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "12px 14px",
      borderRadius: 14,
      background: soft,
    }}
  >
    <div
      style={{
        display: "grid",
        placeItems: "center",
        width: 18,
        height: 18,
        borderRadius: 5,
        border: `1.5px solid ${muted}`,
        background: `color-mix(in srgb, ${blue} ${Math.round(progress * 100)}%, transparent)`,
        borderColor: progress > 0.5 ? blue : muted,
        color: white,
        fontSize: 12,
        opacity: Math.max(progress, 0.001),
      }}
    >
      {progress > 0.5 ? "✓" : ""}
    </div>
    <span style={{ fontSize: 13, fontWeight: 550, color: graphite }}>
      Auto-rename using AI Vision
    </span>
  </div>
);

export const AddDocument: React.FC = () => {
  const frame = useCurrentFrame();

  const buttonPress = press(frame, 18);

  const sheetOffset = interpolate(frame, [26, 46], [100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });

  const sheetExit = interpolate(frame, [160, 180], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 1, 1),
  });

  const fileChipProgress = interpolate(frame, [54, 66], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const aiToggleProgress = interpolate(frame, [86, 98], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const savePress = press(frame, 132);
  const encrypting = frame >= 132 && frame < 160;

  const showSheet = frame >= 26 && frame < 180;
  const showNewRow = frame >= 156;
  const newRowProgress = interpolate(frame, [156, 174], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const toastProgress = interpolate(
    frame,
    [174, 186, 214, 226],
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
        opacity: loopFadeOpacity(frame, ADD_DOCUMENT_DURATION),
      }}
    >
      <div style={{ position: "relative", width: 640, height: 560 }}>
        <AppShell
          sectionLabel="Documents"
          actionLabel="Upload"
          buttonPress={buttonPress}
          rows={[
            { initial: "I", title: "Identity", detail: "2 documents", masked: false },
            { initial: "R", title: "Records", detail: "8 documents", masked: false },
          ]}
          newRow={{ initial: "P", title: "Passport", detail: "1 document", masked: false }}
          showNewRow={showNewRow}
          newRowProgress={newRowProgress}
        />
        {showSheet && (
          <SheetShell
            offset={frame < 160 ? sheetOffset : sheetExit}
            title="Secure File Upload"
            description="Encrypt a document before it is stored."
            primaryLabel={encrypting ? "Encrypting..." : "Encrypt & Upload"}
            primaryPressed={savePress}
          >
            <FileChip progress={fileChipProgress} />
            <AiToggle progress={aiToggleProgress} />
            <p style={{ margin: 0, color: muted, fontSize: 11, lineHeight: 1.5, borderTop: `1px solid ${hairline}`, paddingTop: 12 }}>
              Files selected for AI naming are sent securely for title extraction
              only. The document is encrypted before storage.
            </p>
          </SheetShell>
        )}
        <Toast progress={toastProgress} label="Encrypted and saved" />
      </div>
    </AbsoluteFill>
  );
};
