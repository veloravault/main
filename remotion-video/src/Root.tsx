import "./index.css";
import { Composition } from "remotion";
import { ADD_CARD_DURATION, AddCard } from "./AddCard";
import { ADD_DOCUMENT_DURATION, AddDocument } from "./AddDocument";
import { ADD_PASSWORD_DURATION, AddPassword } from "./AddPassword";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AddPassword"
        component={AddPassword}
        durationInFrames={ADD_PASSWORD_DURATION}
        fps={30}
        width={1280}
        height={960}
      />
      <Composition
        id="AddDocument"
        component={AddDocument}
        durationInFrames={ADD_DOCUMENT_DURATION}
        fps={30}
        width={1280}
        height={960}
      />
      <Composition
        id="AddCard"
        component={AddCard}
        durationInFrames={ADD_CARD_DURATION}
        fps={30}
        width={1280}
        height={960}
      />
    </>
  );
};
