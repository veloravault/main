import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const MousePointer: React.FC<{
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startAt: number;
  clickAt: number;
}> = ({ startX, startY, endX, endY, startAt, clickAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Move animation
  const moveProgress = spring({
    frame: frame - startAt,
    fps,
    config: { damping: 14, stiffness: 60 },
  });

  const x = interpolate(moveProgress, [0, 1], [startX, endX]);
  const y = interpolate(moveProgress, [0, 1], [startY, endY]);

  // Click pulse animation
  const clickProgress = spring({
    frame: frame - clickAt,
    fps,
    config: { damping: 12 },
  });
  
  const scale = interpolate(clickProgress, [0, 0.5, 1], [1, 0.8, 1]);
  const pulseOpacity = interpolate(clickProgress, [0, 0.2, 1], [0, 0.5, 0]);
  const pulseScale = interpolate(clickProgress, [0, 1], [1, 3]);

  if (frame < startAt) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `scale(${scale})`,
        zIndex: 100,
        pointerEvents: "none",
      }}
    >
      {frame >= clickAt && (
        <div
          style={{
            position: "absolute",
            width: 40,
            height: 40,
            borderRadius: "50%",
            backgroundColor: "rgba(0, 122, 255, 0.5)",
            transform: `translate(-50%, -50%) scale(${pulseScale})`,
            opacity: pulseOpacity,
          }}
        />
      )}
      <svg
        width="24"
        height="36"
        viewBox="0 0 24 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.3))",
        }}
      >
        <path
          d="M2.5 3L17.5 18L10 19L15 28L11 30L6 21L2 25V3Z"
          fill="black"
          stroke="white"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
};
