import { Composition } from "remotion";
import { Demo2, DEMO2_FRAMES } from "./Demo2";
import { Pitch, PITCH_FRAMES } from "./Pitch";
import { FPS, H, W } from "./theme";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Demo" component={Demo2} durationInFrames={DEMO2_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="Pitch" component={Pitch} durationInFrames={PITCH_FRAMES} fps={FPS} width={W} height={H} />
  </>
);
