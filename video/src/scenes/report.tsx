import { Img, makeScene2D, Node } from "@motion-canvas/2d";
import {
  createRef,
  easeInOutCubic,
  easeOutCubic,
  linear,
} from "@motion-canvas/core";

import reportImg from "../../report.png";

export default makeScene2D(function* (view) {
  view.fill("#050505");

  const world = createRef<Node>();
  const img = createRef<Img>();

  view.add(
    <Node ref={world} rotation={-15} scale={1.3}>
      <Img
        ref={img}
        src={reportImg}
        width={1000}
        radius={20}

        opacity={0}
        y={1200}
      />
    </Node>,
  );

  // Fade in
  yield* img().opacity(1, 1.5, easeOutCubic);

  // Slow scroll through report
  yield* img().position.y(-800, 12, linear);

  // Fade out
  yield* world().opacity(0, 1, easeInOutCubic);
});
