import { Layout, makeScene2D, Txt } from "@motion-canvas/2d";
import {
  all,
  chain,
  createRef,
  easeInOutCubic,
  easeOutCubic,
  waitFor,
} from "@motion-canvas/core";

export default makeScene2D(function* (view) {
  view.fill("#050505");

  const title = createRef<Txt>();
  const line1 = createRef<Txt>();
  const line2 = createRef<Txt>();
  const line3 = createRef<Txt>();

  const fontProps = {
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    fill: "rgba(255,255,255,0.5)",
    fontSize: 42,
    fontWeight: 400,
    opacity: 0,
    letterSpacing: -0.5,
  } as const;

  view.add(
    <Layout layout direction="column" alignItems="center" gap={24}>
      <Txt
        ref={title}
        text="Your week. Narrated by AI."
        fontSize={120}
        fontWeight={800}
        fontFamily="'Inter', system-ui, -apple-system, sans-serif"
        fill="white"
        opacity={0}
        letterSpacing={-3}
      />
      <Layout layout direction="column" alignItems="center" gap={12} marginTop={32}>
        <Txt ref={line1} text="AI turns your GitHub activity into a meaningful story." {...fontProps} />
        <Txt ref={line2} text="One command to set up. Zero maintenance." {...fontProps} />
        <Txt ref={line3} text="Free and open source." {...fontProps} />
      </Layout>
    </Layout>,
  );

  // Title fades in
  yield* title().opacity(1, 1.5, easeInOutCubic);

  // Lines fade in one by one
  yield* chain(
    line1().opacity(1, 0.8, easeOutCubic),
    line2().opacity(1, 0.8, easeOutCubic),
    line3().opacity(1, 0.8, easeOutCubic),
  );

  yield* waitFor(2.5);

  // All fade out
  yield* all(
    title().opacity(0, 1, easeInOutCubic),
    line1().opacity(0, 1, easeInOutCubic),
    line2().opacity(0, 1, easeInOutCubic),
    line3().opacity(0, 1, easeInOutCubic),
  );
});
