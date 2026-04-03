// Theme CSS definitions for report rendering

import type { Theme } from "../types.js";

type ThemeColors = {
  bg: string;
  bgCard: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  heatmapEmpty: string;
  heatmapL1: string;
  heatmapL2: string;
  heatmapL3: string;
  heatmapL4: string;
};

const THEMES: Record<Theme, ThemeColors> = {
  default: {
    bg: "#ffffff",
    bgCard: "#f6f8fa",
    text: "#1f2328",
    textSecondary: "#656d76",
    border: "#d0d7de",
    accent: "#0969da",
    heatmapEmpty: "#ebedf0",
    heatmapL1: "#9be9a8",
    heatmapL2: "#40c463",
    heatmapL3: "#30a14e",
    heatmapL4: "#216e39",
  },
  dark: {
    bg: "#0d1117",
    bgCard: "#161b22",
    text: "#e6edf3",
    textSecondary: "#8b949e",
    border: "#30363d",
    accent: "#58a6ff",
    heatmapEmpty: "#161b22",
    heatmapL1: "#0e4429",
    heatmapL2: "#006d32",
    heatmapL3: "#26a641",
    heatmapL4: "#39d353",
  },
};

export const getThemeColors = (theme: Theme): ThemeColors =>
  THEMES[theme] ?? THEMES.default;

export const buildCSS = (theme: Theme): string => {
  const c = getThemeColors(theme);

  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      background: ${c.bg};
      color: ${c.text};
      line-height: 1.6;
      padding: 2rem 1rem;
    }
    .container { max-width: 860px; margin: 0 auto; }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid ${c.border};
    }
    .avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      border: 2px solid ${c.border};
    }
    .header-text h1 { font-size: 1.5rem; font-weight: 600; }
    .header-text .date-range { color: ${c.textSecondary}; font-size: 0.875rem; }

    /* Stats cards */
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 0.75rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: ${c.bgCard};
      border: 1px solid ${c.border};
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
    }
    .stat-card .value { font-size: 1.75rem; font-weight: 700; color: ${c.accent}; }
    .stat-card .label { font-size: 0.75rem; color: ${c.textSecondary}; text-transform: uppercase; letter-spacing: 0.05em; }

    /* Section */
    .section { margin-bottom: 2rem; }
    .section h2 {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid ${c.border};
    }

    /* Heatmap */
    .heatmap {
      display: flex;
      gap: 4px;
      justify-content: center;
    }
    .heatmap-day {
      width: 36px;
      height: 36px;
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 0.625rem;
      color: ${c.textSecondary};
    }
    .heatmap-day .count { font-weight: 700; font-size: 0.75rem; color: ${c.text}; }
    .heatmap-level-0 { background: ${c.heatmapEmpty}; }
    .heatmap-level-1 { background: ${c.heatmapL1}; }
    .heatmap-level-2 { background: ${c.heatmapL2}; }
    .heatmap-level-3 { background: ${c.heatmapL3}; }
    .heatmap-level-4 { background: ${c.heatmapL4}; }

    /* Language bar */
    .lang-bar {
      display: flex;
      height: 10px;
      border-radius: 5px;
      overflow: hidden;
      margin-bottom: 0.75rem;
    }
    .lang-bar-segment { height: 100%; }
    .lang-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      list-style: none;
      font-size: 0.8125rem;
    }
    .lang-list li { display: flex; align-items: center; gap: 0.35rem; }
    .lang-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .lang-pct { color: ${c.textSecondary}; }

    /* Repos table */
    .repo-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .repo-table th, .repo-table td {
      padding: 0.5rem 0.75rem;
      text-align: left;
      border-bottom: 1px solid ${c.border};
    }
    .repo-table th {
      font-weight: 600;
      color: ${c.textSecondary};
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .repo-table a { color: ${c.accent}; text-decoration: none; }
    .repo-table a:hover { text-decoration: underline; }

    /* AI narrative */
    .narrative {
      background: ${c.bgCard};
      border: 1px solid ${c.border};
      border-radius: 8px;
      padding: 1.25rem;
      font-size: 0.9375rem;
      line-height: 1.75;
    }

    /* Footer */
    .footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid ${c.border};
      text-align: center;
      font-size: 0.8125rem;
      color: ${c.textSecondary};
    }
    .footer a { color: ${c.accent}; text-decoration: none; }
    .footer a:hover { text-decoration: underline; }

    /* Responsive */
    @media (max-width: 600px) {
      .stats { grid-template-columns: repeat(2, 1fr); }
      .header { flex-direction: column; text-align: center; }
      .heatmap-day { width: 28px; height: 28px; }
    }
  `;
};
