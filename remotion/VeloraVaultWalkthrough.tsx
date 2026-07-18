import type { ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { VeloraProductPreview } from "../src/components/dreelio/VeloraProductPreview";
import styles from "./VeloraVaultWalkthrough.module.css";

const SCENE_FRAMES = 60;

function VaultScene({ children }: { children: ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({ frame, fps, config: { damping: 24, stiffness: 150, mass: 0.9 } });
  const exit = interpolate(frame, [SCENE_FRAMES - 10, SCENE_FRAMES], [1, 0], {
    easing: Easing.inOut(Easing.ease),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = Math.min(entrance, exit);
  const scale = interpolate(entrance, [0, 1], [1.018, 1]);

  return (
    <AbsoluteFill className={styles.scene} style={{ opacity, transform: `scale(${scale})` }}>
      <div className={styles.product}>{children}</div>
    </AbsoluteFill>
  );
}

export function VeloraVaultWalkthrough() {
  return (
    <AbsoluteFill className={styles.canvas}>
      <Sequence from={0} durationInFrames={SCENE_FRAMES}>
        <VaultScene><VeloraProductPreview variant="overview" /></VaultScene>
      </Sequence>
      <Sequence from={54} durationInFrames={SCENE_FRAMES}>
        <VaultScene><VeloraProductPreview variant="passwords" /></VaultScene>
      </Sequence>
      <Sequence from={108} durationInFrames={SCENE_FRAMES}>
        <VaultScene><VeloraProductPreview variant="documents" /></VaultScene>
      </Sequence>
      <Sequence from={162} durationInFrames={SCENE_FRAMES}>
        <VaultScene><VeloraProductPreview variant="wallet" /></VaultScene>
      </Sequence>
      <Sequence from={216} durationInFrames={54}>
        <VaultScene><VeloraProductPreview variant="overview" /></VaultScene>
      </Sequence>
    </AbsoluteFill>
  );
}

