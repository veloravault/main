import { Composition } from "remotion";
import { VeloraVaultWalkthrough } from "./VeloraVaultWalkthrough";

export function RemotionRoot() {
  return (
    <Composition
      id="VeloraVaultWalkthrough"
      component={VeloraVaultWalkthrough}
      durationInFrames={270}
      fps={30}
      width={1280}
      height={900}
    />
  );
}

