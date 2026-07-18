import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Hotspot } from "./Hotspot";

export const ScreenSlide: React.FC<{
  screen: {
    path: string;
    hotspots: { x: number; y: number; startAt: number }[];
  };
  duration: number;
}> = ({ screen, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // If there's a hotspot, we zoom in slightly when the first hotspot activates
  const firstHotspot = screen.hotspots[0];
  let scale = 1;
  let translateX = 0;
  let translateY = 0;

  if (firstHotspot) {
    const zoomProgress = spring({
      frame: frame - firstHotspot.startAt,
      fps,
      config: { damping: 20, mass: 1, stiffness: 100 },
    });

    scale = interpolate(zoomProgress, [0, 1], [1, 1.2]);
    
    // Pan slightly towards the hotspot
    const targetX = (640 - firstHotspot.x) * 0.2; // 1280/2 = 640
    const targetY = (400 - firstHotspot.y) * 0.2; // 800/2 = 400
    
    translateX = interpolate(zoomProgress, [0, 1], [0, targetX]);
    translateY = interpolate(zoomProgress, [0, 1], [0, targetY]);
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#111" }}>
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
          transformOrigin: "center center",
        }}
      >
        <Img
          src={staticFile(screen.path)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: 16,
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          }}
        />
        {screen.hotspots.map((hs, i) => (
          <Hotspot key={i} x={hs.x} y={hs.y} startAt={hs.startAt} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
