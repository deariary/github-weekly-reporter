import { Img, makeScene2D } from "@motion-canvas/2d";
import {
  createRef,
  easeInOutCubic,
  easeOutCubic,
  waitFor,
} from "@motion-canvas/core";

import indexImg from "../../index.png";

export default makeScene2D(function* (view) {
  view.fill("#050505");

  const img = createRef<Img>();

  view.add(
    <Img
      ref={img}
      src={indexImg}
      width={1000}
      radius={20}

      opacity={0}
      scale={1.8}
    />,
  );

  // Fade in zoomed, then pull back
  yield* img().opacity(1, 1.5, easeOutCubic);

  yield* img().scale(0.7, 3, easeInOutCubic);

  yield* waitFor(1.5);

  // Fade out
  yield* img().opacity(0, 1, easeInOutCubic);
});
