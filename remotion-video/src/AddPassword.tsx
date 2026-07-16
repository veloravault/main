import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { fontFamily, paper, soft } from "./theme";
import {
  AppShell,
  Field,
  loopFadeOpacity,
  press,
  SheetShell,
  Toast,
  typedText,
} from "./shared";

export const ADD_PASSWORD_DURATION = 260;

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

export const AddPassword: React.FC = () => {
  const frame = useCurrentFrame();

  const buttonPress = press(frame, 18);

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

  const savePress = press(frame, 150);

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
        opacity: loopFadeOpacity(frame, ADD_PASSWORD_DURATION),
      }}
    >
      <div style={{ position: "relative", width: 640, height: 560 }}>
        <AppShell
          sectionLabel="Passwords"
          actionLabel="New"
          buttonPress={buttonPress}
          rows={[
            { initial: "G", title: "Google", detail: "personal@icloud.com" },
            { initial: "A", title: "Apple ID", detail: "velora@icloud.com" },
          ]}
          newRow={{ initial: "N", title: "Netflix", detail: "Vault item" }}
          showNewRow={showNewRow}
          newRowProgress={newRowProgress}
        />
        {showSheet && (
          <SheetShell
            offset={frame < 172 ? sheetOffset : sheetExit}
            title="New Password"
            description="Add a credential encrypted with your existing master key."
            primaryLabel="Save Password"
            primaryPressed={savePress}
          >
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
          </SheetShell>
        )}
        <Toast progress={toastProgress} />
      </div>
    </AbsoluteFill>
  );
};
