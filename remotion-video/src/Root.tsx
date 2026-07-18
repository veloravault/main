import "./index.css";
import { Composition } from "remotion";
import { WalkthroughComposition } from "./WalkthroughComposition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="WalkthroughComposition"
        component={WalkthroughComposition}
        durationInFrames={435}
        fps={30}
        width={1280}
        height={800}
      />
    </>
  );
};

