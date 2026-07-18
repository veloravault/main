import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Hotspot: React.FC<{
  x: number;
  y: number;
  startAt: number;
}> = ({ x, y, startAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - startAt,
    fps,
    config: { damping: 12, mass: 0.5 },
  });

  const pulse = Math.sin((frame - startAt) / 5) * 0.2 + 1; // Subtle pulsing

  if (frame < startAt) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${entrance * pulse})`,
        width: 60,
        height: 60,
        borderRadius: "50%",
        border: "3px solid #007AFF",
        backgroundColor: "rgba(0, 122, 255, 0.15)",
        zIndex: 50,
        pointerEvents: "none",
        boxShadow: "0 0 15px rgba(0, 122, 255, 0.5)",
      }}
    />
  );
};
