import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import screensData from "./screens.json";
import { ScreenSlide } from "./ScreenSlide";
import { MousePointer } from "./MousePointer";

export const WalkthroughComposition: React.FC = () => {
  const { fps } = useVideoConfig();

  const screens = screensData.screens;
  const transitionDuration = 15;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <TransitionSeries>
        {screens.map((screen, index) => {
          return (
            <React.Fragment key={screen.id}>
              <TransitionSeries.Sequence durationInFrames={screen.duration}>
                <ScreenSlide screen={screen} duration={screen.duration} />
              </TransitionSeries.Sequence>
              
              {index < screens.length - 1 && (
                <TransitionSeries.Transition
                  presentation={slide({ direction: "from-right" })}
                  timing={linearTiming({ durationInFrames: transitionDuration })}
                />
              )}
            </React.Fragment>
          );
        })}
      </TransitionSeries>

      {/* Global animated mouse pointer */}
      <Sequence from={30} durationInFrames={120}>
        <MousePointer 
          startX={1000} startY={700}
          endX={250} endY={300}
          startAt={10} clickAt={60}
        />
      </Sequence>
      
      <Sequence from={150} durationInFrames={120}>
        <MousePointer 
          startX={250} startY={300}
          endX={600} endY={150}
          startAt={10} clickAt={60}
        />
      </Sequence>

      <Sequence from={270} durationInFrames={120}>
        <MousePointer 
          startX={600} startY={150}
          endX={800} endY={200}
          startAt={10} clickAt={60}
        />
      </Sequence>

    </AbsoluteFill>
  );
};
