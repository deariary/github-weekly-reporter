// Generate OG image (1200x630) using satori + sharp

import satori from "satori";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load a font for satori (bundled Inter subset or fallback)
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

type OGImageData = {
  title: string;
  subtitle: string;
  username: string;
  dateRange: string;
  stats: { commits: number; prs: number; reviews: number };
};

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
        padding: "60px 70px",
        background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
        color: "#e0e0e0",
        fontFamily: "Inter",
      },
      children: [
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", gap: "12px" },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "18px",
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
                    fontSize: "48px",
                    fontWeight: 600,
                    lineHeight: 1.2,
                    letterSpacing: "-0.02em",
                    maxWidth: "900px",
                  },
                  children: data.title,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "22px",
                    color: "rgba(255,255,255,0.6)",
                    marginTop: "4px",
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
                  style: { display: "flex", gap: "32px", fontSize: "16px" },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", gap: "6px" },
                        children: [
                          { type: "span", props: { style: { color: "#39d353", fontWeight: 600 }, children: String(data.stats.commits) } },
                          { type: "span", props: { style: { color: "rgba(255,255,255,0.4)" }, children: "commits" } },
                        ],
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", gap: "6px" },
                        children: [
                          { type: "span", props: { style: { color: "#8957e5", fontWeight: 600 }, children: String(data.stats.prs) } },
                          { type: "span", props: { style: { color: "rgba(255,255,255,0.4)" }, children: "PRs" } },
                        ],
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", gap: "6px" },
                        children: [
                          { type: "span", props: { style: { color: "#58a6ff", fontWeight: 600 }, children: String(data.stats.reviews) } },
                          { type: "span", props: { style: { color: "rgba(255,255,255,0.4)" }, children: "reviews" } },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "18px",
                    color: "rgba(255,255,255,0.5)",
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
