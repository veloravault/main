import "./index.css";
import { Composition } from "remotion";
import { AddPassword } from "./AddPassword";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AddPassword"
        component={AddPassword}
        durationInFrames={240}
        fps={30}
        width={1280}
        height={960}
      />
    </>
  );
};
