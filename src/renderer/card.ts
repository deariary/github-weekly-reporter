// Generate animated SVG card: news-ticker style headline scrolling
// LLM generates both the label badge and headline text for each item
// Text is repeated 50x so it never runs out before the user navigates away

import type { SummarySection, TickerItem } from "../types.js";

export type CardData = {
  username: string;
  weekLabel: string;
  title: string;
  summaries: SummarySection[];
  ticker?: TickerItem[];
  reportUrl?: string;
};

type CardColors = {
  bg: string;
  text: string;
  textSecondary: string;
  accentBg: string;
  tickerBg: string;
  tickerText: string;
  border: string;
  badgeColors: string[];
};

const LIGHT: CardColors = {
  bg: "#ffffff",
  text: "#111111",
  textSecondary: "#666666",
  accentBg: "#dc2626",
  tickerBg: "#111111",
  tickerText: "#ffffff",
  border: "#e5e5e5",
  badgeColors: ["#dc2626", "#2563eb", "#059669", "#d97706", "#7c3aed", "#0891b2"],
};

const DARK: CardColors = {
  bg: "#0d1117",
  text: "#e6edf3",
  textSecondary: "#8b949e",
  accentBg: "#f85149",
  tickerBg: "#161b22",
  tickerText: "#e6edf3",
  border: "#30363d",
  badgeColors: ["#f85149", "#58a6ff", "#3fb950", "#d29922", "#bc8cff", "#39d2c0"],
};

const WIDTH = 900;
const HEIGHT = 48;
const TICKER_H = 24;
const REPEATS = 50;
const SCROLL_PX_PER_SEC = 30;
const FALLBACK_LABELS = ["BREAKING", "UPDATE", "STATS", "SHIPPED", "REVIEW", "MERGED"];

const escapeXml = (s: string): string =>
  s.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const IDLE_ITEMS: TickerItem[] = [
  { label: "STANDBY", text: "Developer is recharging. Weekly report will resume shortly." },
  { label: "SOURCES SAY", text: "Unnamed keyboard spotted resting peacefully on desk." },
  { label: "DEVELOPING", text: "Local developer reportedly seen outdoors. Authorities investigating." },
  { label: "JUST IN", text: "Coffee reserves holding steady. No commits at this time." },
  { label: "EXCLUSIVE", text: "Anonymous sources confirm: sleep was had this week." },
];

const buildTickerItems = (data: CardData): TickerItem[] => {
  if (data.ticker && data.ticker.length > 0) return data.ticker;
  if (data.summaries.length > 0) {
    return data.summaries.map((s, i) => ({
      label: FALLBACK_LABELS[i % FALLBACK_LABELS.length],
      text: s.heading,
    }));
  }
  if (data.title) {
    return [{ label: FALLBACK_LABELS[0], text: data.title }];
  }
  return IDLE_ITEMS;
};

// Build one segment of ticker as SVG <tspan> elements with estimated width.
const buildSegmentSvg = (items: TickerItem[], colors: CardColors): { svg: string; estWidth: number } => {
  const parts: string[] = [];
  let estWidth = 0;

  items.forEach((item, i) => {
    const badgeColor = colors.badgeColors[i % colors.badgeColors.length];

    // Badge label
    const badgeText = ` ${item.label} `;
    parts.push(
      `<tspan fill="${badgeColor}" font-weight="800" font-size="10" letter-spacing="0.05em">${escapeXml(badgeText)}</tspan>`,
    );
    estWidth += badgeText.length * 6.5;

    // Headline text
    const headlineText = ` ${item.text}  `;
    parts.push(
      `<tspan fill="${colors.tickerText}" font-weight="600" font-size="12">${escapeXml(headlineText)}</tspan>`,
    );
    estWidth += headlineText.length * 5.8;
  });

  return { svg: parts.join(""), estWidth };
};

const buildSVG = (data: CardData, colors: CardColors): string => {
  const items = buildTickerItems(data);
  const segment = buildSegmentSvg(items, colors);

  const fullSvg = segment.svg.repeat(REPEATS);
  const totalWidth = segment.estWidth * REPEATS;
  const duration = totalWidth / SCROLL_PX_PER_SEC;

  const tickerY = HEIGHT - TICKER_H;
  const textY = tickerY + 16;

  const css = `
    .ticker-text { animation: scroll ${duration.toFixed(0)}s linear; }
    @keyframes scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-${totalWidth.toFixed(0)}px); }
    }`;

  const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
  const topH = HEIGHT - TICKER_H;
  const midY = topH / 2 + 4;

  const labelW = 82;
  const labelH = 15;
  const labelX = 8;
  const labelY = (topH - labelH) / 2;
  const weekX = labelX + labelW + 8;

  const topBar = [
    `<rect x="${labelX}" y="${labelY}" width="${labelW}" height="${labelH}" rx="2" fill="${colors.accentBg}"/>`,
    `<text x="${labelX + labelW / 2}" y="${midY}" font-family="${font}" text-anchor="middle" font-size="9" font-weight="800" fill="#fff" letter-spacing="0.08em">WEEKLY NEWS</text>`,
    `<text x="${weekX}" y="${midY}" font-family="${font}" font-size="11" font-weight="700" fill="${colors.text}">${escapeXml(data.weekLabel)}</text>`,
    `<text x="${WIDTH - 10}" y="${midY}" font-family="${font}" font-size="10" fill="${colors.textSecondary}" text-anchor="end">@${escapeXml(data.username)}</text>`,
    `<line x1="0" y1="${topH}" x2="10000" y2="${topH}" stroke="${colors.border}" stroke-width="0.5"/>`,
  ].join("\n");

  const ticker = [
    `<rect x="0" y="${tickerY}" width="10000" height="${TICKER_H}" fill="${colors.tickerBg}"/>`,
    `<clipPath id="tc"><rect x="0" y="${tickerY}" width="10000" height="${TICKER_H}"/></clipPath>`,
    `<g clip-path="url(#tc)">`,
    `  <text class="ticker-text" x="0" y="${textY}" font-family="${font}">${fullSvg}</text>`,
    `</g>`,
  ].join("\n");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="xMinYMid slice">`,
    `<style>${css}</style>`,
    `<rect width="10000" height="${HEIGHT}" fill="${colors.bg}"/>`,
    topBar,
    ticker,
    `</svg>`,
  ].join("\n");
};

export const generateCard = (data: CardData): string =>
  buildSVG(data, LIGHT);

export const generateDarkCard = (data: CardData): string =>
  buildSVG(data, DARK);
