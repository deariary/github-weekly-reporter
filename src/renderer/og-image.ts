// Generate OG image (1200x630) using satori + sharp

import satori from "satori";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const loadFont = (): ArrayBuffer => {
  const fontPath = join(__dirname, "..", "..", "assets", "Inter-SemiBold.woff");
  try {
    const buf = readFileSync(fontPath);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  } catch {
    throw new Error(
      `Font file not found at ${fontPath}. Ensure assets/Inter-SemiBold.woff exists.`,
    );
  }
};

export type OGImageData = {
  title: string;
  subtitle: string;
  username: string;
  dateRange: string;
  stats: { commits: number; prs: number; reviews: number };
};

const statChip = (value: number, label: string, color: string) => ({
  type: "div",
  props: {
    style: { display: "flex", alignItems: "baseline", gap: "8px" },
    children: [
      { type: "span", props: { style: { color, fontWeight: 600, fontSize: "24px" }, children: String(value) } },
      { type: "span", props: { style: { color: "rgba(255,255,255,0.4)", fontSize: "20px" }, children: label } },
    ],
  },
});

const buildSVG = async (data: OGImageData, font: ArrayBuffer): Promise<string> => {
  const element = {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "80px 90px",
        background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
        color: "#e0e0e0",
        fontFamily: "Inter",
      },
      children: [
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", gap: "16px" },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "22px",
                    color: "#39d353",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                  },
                  children: data.dateRange,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "56px",
                    fontWeight: 600,
                    lineHeight: 1.2,
                    letterSpacing: "-0.02em",
                    maxWidth: "960px",
                    color: "#ffffff",
                  },
                  children: data.title,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "30px",
                    color: "rgba(255,255,255,0.55)",
                    marginTop: "12px",
                    maxWidth: "960px",
                  },
                  children: data.subtitle,
                },
              },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            },
            children: [
              {
                type: "div",
                props: {
                  style: { display: "flex", gap: "40px" },
                  children: [
                    statChip(data.stats.commits, "commits", "#39d353"),
                    statChip(data.stats.prs, "PRs", "#8957e5"),
                    statChip(data.stats.reviews, "reviews", "#58a6ff"),
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "22px",
                    color: "rgba(255,255,255,0.45)",
                  },
                  children: `@${data.username}`,
                },
              },
            ],
          },
        },
      ],
    },
  };

  return satori(element as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: "Inter",
        data: font,
        weight: 600,
        style: "normal",
      },
    ],
  });
};

export const generateOGImage = async (data: OGImageData): Promise<Buffer> => {
  const font = loadFont();
  const svg = await buildSVG(data, font);
  return sharp(Buffer.from(svg)).png().toBuffer();
};
