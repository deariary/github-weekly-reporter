import { Img, Layout, makeScene2D, Node, Txt } from "@motion-canvas/2d";
import { waitFor } from "@motion-canvas/core";

import reportImg from "../../report.png";

// 1280x640 OG image - single frame, no animation

export default makeScene2D(function* (view) {
  view.fill("#050505");

  view.add(
    <>
      {/* Report screenshot, tilted */}
      <Node rotation={-12} scale={1.4} x={200} y={30}>
        <Img
          src={reportImg}
          width={700}
          radius={12}
          y={-200}
        />
      </Node>

      {/* Title text, left side */}
      <Layout
        layout
        direction="column"
        gap={10}
        x={-250}
        y={-20}
      >
        <Txt
          text="GitHub"
          fontSize={72}
          fontWeight={900}
          fontFamily="'Inter', system-ui, sans-serif"
          fill="white"
          letterSpacing={-3}
        />
        <Txt
          text="Weekly Reporter"
          fontSize={72}
          fontWeight={900}
          fontFamily="'Inter', system-ui, sans-serif"
          fill="white"
          letterSpacing={-3}
        />
        <Txt
          text="Your week. Narrated by AI."
          fontSize={26}
          fontWeight={400}
          fontFamily="'Inter', system-ui, sans-serif"
          fill="rgba(255,255,255,0.5)"
          marginTop={12}
          letterSpacing={-0.5}
        />
      </Layout>
    </>,
  );

  yield* waitFor(0.1);
});
