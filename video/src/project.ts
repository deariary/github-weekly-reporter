import { makeProject } from "@motion-canvas/core";
import report from "./scenes/report?scene";
import index from "./scenes/index?scene";
import tagline from "./scenes/tagline?scene";
import bgm from "../bgm.mp3";

export default makeProject({
  scenes: [report, index, tagline],
  audio: bgm,
});
