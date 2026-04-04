import { defineConfig } from "vite";
import mc from "@motion-canvas/vite-plugin";

// Handle CJS/ESM interop
const motionCanvas =
  typeof mc === "function" ? mc : (mc as { default: typeof mc }).default;

export default defineConfig({
  plugins: [motionCanvas()],
  server: {
    hmr: {
      port: 9011,
    },
  },
});
