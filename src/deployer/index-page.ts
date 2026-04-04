// Generate the index.html that lists all archived reports

import Handlebars from "handlebars";
import type { Language, UserProfile } from "../types.js";
import { getLocale, getFontConfig } from "../i18n/index.js";
import { buildCSS } from "../renderer/themes.js";

export type IndexPageData = {
  username?: string;
  avatarUrl?: string;
  profile?: UserProfile;
};

export type ReportEntryStats = {
  commits: number;
  prs: number;
  reviews: number;
};

export type ReportEntry = {
  path: string;
  week: string;
  year: string;
  title?: string;
  subtitle?: string;
  dateLabel: string;
  stats?: ReportEntryStats;
};

type YearGroup = {
  year: string;
  reports: ReportEntry[];
};

const TEMPLATE = `<!DOCTYPE html>
<html lang="{{lang}}">
<head>
  <title>{{siteTitle}}</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="{{siteTitle}}" />
  <meta name="view-transition" content="same-origin" />
  <style>{{{css}}}</style>
  <style>
    body { background: #050505; color: #e8e8e8; overflow-x: hidden; }

    /* GRAIN OVERLAY */
    body::after {
      content: '';
      position: fixed;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events: none;
      z-index: 9999;
    }

    /* NAV */
    .index-nav {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 100;
      background: rgba(5,5,5,0.8);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .index-nav-inner {
      max-width: 960px;
      margin: 0 auto;
      padding: 0.75rem 3rem;
      display: flex;
      align-items: center;
      min-height: 56px;
    }
    .nav-site-title {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.4);
    }

    /* HERO */
    .hero {
      position: relative;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 0 3rem 6rem;
      overflow: hidden;
    }

    /* GEOMETRIC DECORATIONS */
    .geo-circle {
      position: absolute;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.04);
    }
    .geo-circle-1 { width: 600px; height: 600px; top: -200px; right: -100px; }
    .geo-circle-2 { width: 400px; height: 400px; top: 10%; left: -150px; border-color: {{accentColor}}15; }
    .geo-circle-3 { width: 200px; height: 200px; bottom: 20%; right: 10%; background: {{accentColor}}08; }
    .geo-line {
      position: absolute;
      background: rgba(255,255,255,0.03);
    }
    .geo-line-1 { width: 1px; height: 100%; top: 0; left: 33.33%; }
    .geo-line-2 { width: 1px; height: 100%; top: 0; left: 66.66%; }
    .geo-dot {
      position: absolute;
      width: 4px; height: 4px;
      border-radius: 50%;
      background: {{accentColor}}40;
    }
    .geo-dot-1 { top: 30%; left: 33.33%; }
    .geo-dot-2 { top: 60%; left: 66.66%; }
    .geo-dot-3 { top: 45%; right: 15%; }

    .hero-inner {
      max-width: 960px;
      margin: 0 auto;
      width: 100%;
      position: relative;
      z-index: 1;
    }

    /* AVATAR - offset, large, with gradient ring */
    .hero-avatar-wrap {
      position: absolute;
      top: 25vh;
      right: 3rem;
      z-index: 2;
    }
    .hero-avatar {
      width: 180px; height: 180px;
      border-radius: 50%;
      border: 3px solid transparent;
      background-image: linear-gradient(#050505, #050505), linear-gradient(135deg, {{accentColor}}, #8957e5, #f78166);
      background-origin: border-box;
      background-clip: padding-box, border-box;
      transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .hero-avatar-wrap:hover .hero-avatar {
      transform: scale(1.08) rotate(3deg);
    }

    /* MASSIVE TITLE */
    .hero-title {
      font-size: clamp(4rem, 12vw, 9rem);
      font-weight: 900;
      letter-spacing: -0.06em;
      line-height: 0.9;
      color: #ffffff;
      margin-bottom: 3rem;
      max-width: 70%;
    }

    /* PROFILE - asymmetric, stacked */
    .hero-profile {
      display: flex;
      align-items: flex-start;
      gap: 4rem;
      text-decoration: none;
      color: inherit;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .hero-profile:hover .hero-display-name {
      color: #ffffff;
      text-shadow: 0 0 20px {{accentColor}}80, 0 0 60px {{accentColor}}30;
    }
    .hero-profile:hover .hero-handle {
      text-shadow: 0 0 12px {{accentColor}}60;
    }
    .hero-profile:hover .hero-avatar {
      border-color: {{accentColor}};
      box-shadow: 0 0 30px {{accentColor}}40;
    }
    .hero-profile:hover .hero-stat-value {
      color: {{accentColor}};
      text-shadow: 0 0 16px {{accentColor}}50;
    }
    .hero-name-block {}
    .hero-display-name {
      font-size: 1.5rem;
      font-weight: 300;
      letter-spacing: 0.05em;
      color: rgba(255,255,255,0.9);
      margin-bottom: 0.5rem;
      transition: all 0.4s ease;
    }
    .hero-handle {
      font-family: {{monoFamily}};
      font-size: 0.6875rem;
      color: {{accentColor}};
      letter-spacing: 0.05em;
      transition: all 0.4s ease;
    }
    .hero-bio {
      font-size: 0.875rem;
      color: rgba(255,255,255,0.35);
      margin-top: 0.75rem;
      max-width: 300px;
      line-height: 1.6;
    }
    .hero-stats {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .hero-stat {
      font-family: {{monoFamily}};
      font-size: 0.6875rem;
      color: rgba(255,255,255,0.25);
    }
    .hero-stat-value {
      display: block;
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: rgba(255,255,255,0.9);
      line-height: 1;
      margin-bottom: 0.125rem;
      transition: all 0.4s ease;
    }

    /* CONTENT */
    .index-content {
      max-width: 960px;
      margin: 0 auto;
      padding: 0 3rem 6rem;
      position: relative;
    }

    .year-group { margin-bottom: 5rem; }
    .year-label {
      font-family: {{monoFamily}};
      font-size: 6rem;
      font-weight: 900;
      letter-spacing: -0.05em;
      color: rgba(255,255,255,0.04);
      line-height: 1;
      margin-bottom: 2rem;
      user-select: none;
    }

    /* WEEK ITEMS - editorial layout */
    .week-list {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .week-item {
      display: grid;
      grid-template-columns: 80px 1fr auto;
      gap: 2rem;
      align-items: baseline;
      padding: 2rem 0;
      text-decoration: none;
      color: inherit;
      border-top: 1px solid rgba(255,255,255,0.06);
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }
    .week-item:last-child { border-bottom: 1px solid rgba(255,255,255,0.06); }
    .week-item::before {
      content: '';
      position: absolute;
      left: -3rem; top: 0; bottom: 0;
      width: 2px;
      background: {{accentColor}};
      transform: scaleY(0);
      transform-origin: top;
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .week-item:hover { padding-left: 1rem; }
    .week-item:hover::before { transform: scaleY(1); }

    .week-item-week {
      font-family: {{monoFamily}};
      font-size: 0.6875rem;
      font-weight: 700;
      color: {{accentColor}};
      letter-spacing: 0.1em;
    }
    .week-item-content {}
    .week-item-title {
      font-size: 1.25rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      margin-bottom: 0.375rem;
      transition: color 0.3s;
    }
    .week-item:hover .week-item-title { color: {{accentColor}}; }
    .week-item-subtitle {
      font-size: 0.875rem;
      color: rgba(255,255,255,0.35);
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .week-item-date {
      font-family: {{monoFamily}};
      font-size: 0.75rem;
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: rgba(255,255,255,0.2);
      padding-top: 0.25rem;
    }
    .week-item-stat-value { font-weight: 700; }
    .stat-commits .week-item-stat-value { color: #3fb950; }
    .stat-prs .week-item-stat-value { color: #8957e5; }
    .stat-reviews .week-item-stat-value { color: #58a6ff; }

    /* FOOTER */
    .footer {
      max-width: 960px;
      margin: 0 auto;
      text-align: center;
      padding: 4rem 3rem;
      font-size: 0.8125rem;
      color: rgba(255,255,255,0.3);
      border-top: 1px solid rgba(255,255,255,0.08);
    }
    .footer a { color: rgba(255,255,255,0.5); text-decoration: none; transition: color 0.2s; }
    .footer a:hover { color: rgba(255,255,255,0.6); }

    @media (max-width: 768px) {
      .hero { padding: 0 1.5rem 4rem; min-height: auto; padding-top: 8rem; }
      .hero-title { font-size: clamp(3rem, 15vw, 5rem); max-width: 100%; }
      .hero-avatar-wrap { position: relative; top: auto; right: auto; margin-bottom: 2rem; }
      .hero-avatar { width: 100px; height: 100px; }
      .hero-profile { flex-direction: column; gap: 2rem; }
      .hero-stats { flex-direction: row; gap: 2rem; }
      .index-nav-inner { padding: 0.75rem 1.5rem; }
      .index-content { padding: 0 1.5rem 4rem; }
      .week-item { grid-template-columns: 1fr; gap: 0.5rem; }
      .week-item::before { left: -1.5rem; }
      .week-item-stats { margin-top: 0.5rem; }
      .year-label { font-size: 3rem; }
    }
  </style>
</head>
<body>

<nav class="index-nav">
  <div class="index-nav-inner">
    <span class="nav-site-title">{{siteTitle}}</span>
  </div>
</nav>

<section class="hero">
  <!-- Geometric decorations -->
  <div class="geo-circle geo-circle-1"></div>
  <div class="geo-circle geo-circle-2"></div>
  <div class="geo-circle geo-circle-3"></div>
  <div class="geo-line geo-line-1"></div>
  <div class="geo-line geo-line-2"></div>
  <div class="geo-dot geo-dot-1"></div>
  <div class="geo-dot geo-dot-2"></div>
  <div class="geo-dot geo-dot-3"></div>

  {{#if avatarUrl}}
  <a href="https://github.com/{{username}}" class="hero-avatar-wrap" target="_blank" rel="noopener nofollow">
    <img src="{{avatarUrl}}" alt="{{username}}" class="hero-avatar" width="180" height="180" />
  </a>
  {{/if}}

  <div class="hero-inner">
    <h1 class="hero-title">{{weeklyReports}}</h1>

    {{#if username}}
    <a href="https://github.com/{{username}}" class="hero-profile" target="_blank" rel="noopener nofollow">
      <div class="hero-name-block">
        <div class="hero-display-name">{{displayName}}</div>
        <div class="hero-handle">@{{username}}</div>
        {{#if profile.company}}<div class="hero-bio">{{profile.company}}</div>{{/if}}
        {{#if profile.location}}<div class="hero-bio">{{profile.location}}</div>{{/if}}
      </div>
      {{#if profile}}
      <div class="hero-stats">
        {{#if profile.followers}}<div class="hero-stat"><span class="hero-stat-value">{{profile.followers}}</span>followers</div>{{/if}}
        {{#if profile.publicRepos}}<div class="hero-stat"><span class="hero-stat-value">{{profile.publicRepos}}</span>repos</div>{{/if}}
      </div>
      {{/if}}
    </a>
    {{/if}}
  </div>
</section>

<div class="index-content">
  {{#each yearGroups}}
  <div class="year-group">
    <div class="year-label">{{this.year}}</div>
    <div class="week-list">
      {{#each this.reports}}
      <a href="{{this.path}}/" class="week-item">
        <div class="week-item-week">{{this.week}}</div>
        <div class="week-item-content">
          <div class="week-item-title">{{#if this.title}}{{this.title}}{{else}}Week {{this.week}}{{/if}}</div>
          {{#if this.subtitle}}<div class="week-item-subtitle">{{this.subtitle}}</div>{{/if}}
          <div class="week-item-date">{{this.dateLabel}}</div>
        </div>
        {{#if this.stats}}
        <div class="week-item-stats">
          <span class="week-item-stat stat-commits"><span class="week-item-stat-value">{{this.stats.commits}}</span> commits</span>
          <span class="week-item-stat stat-prs"><span class="week-item-stat-value">{{this.stats.prs}}</span> PRs</span>
          <span class="week-item-stat stat-reviews"><span class="week-item-stat-value">{{this.stats.reviews}}</span> reviews</span>
        </div>
        {{/if}}
      </a>
      {{/each}}
    </div>
  </div>
  {{/each}}
</div>

<footer class="footer">
  {{poweredBy}} <a href="https://deariary.com?utm_source=github-weekly-reporter&utm_medium=footer" target="_blank" rel="noopener">deariary</a>
  &nbsp;&middot;&nbsp;
  {{generatedWith}} <a href="https://github.com/deariary/github-weekly-reporter" target="_blank" rel="noopener">github-weekly-reporter</a>
</footer>

</body>
</html>`;

const weekToDateLabel = (path: string): string => {
  const [year, week] = path.split("/");
  return `${year} ${week}`;
};

const groupByYear = (reports: ReportEntry[]): YearGroup[] => {
  const sorted = [...reports].sort((a, b) => b.path.localeCompare(a.path));
  const groups = new Map<string, ReportEntry[]>();

  sorted.forEach((r) => {
    const existing = groups.get(r.year) ?? [];
    existing.push(r);
    groups.set(r.year, existing);
  });

  return [...groups.entries()].map(([year, reps]) => ({ year, reports: reps }));
};

export const renderIndexPage = (
  reports: ReportEntry[],
  pageData?: IndexPageData,
  language: Language = "en",
  siteTitle?: string,
): string => {
  const locale = getLocale(language);
  const fontConfig = getFontConfig(language);
  const resolvedSiteTitle = siteTitle ?? (pageData?.username ? `${pageData.username}'s ${locale.weeklyReports}` : locale.weeklyReports);
  const template = Handlebars.compile(TEMPLATE);
  return template({
    yearGroups: groupByYear(reports),
    css: buildCSS(language),
    username: pageData?.username,
    avatarUrl: pageData?.avatarUrl,
    profile: pageData?.profile,
    displayName: pageData?.profile?.name ?? pageData?.username,
    siteTitle: resolvedSiteTitle,
    lang: language,
    weeklyReports: locale.weeklyReports,
    poweredBy: locale.poweredBy,
    generatedWith: locale.generatedWith,
    monoFamily: fontConfig.monoFamily,
    accentColor: "#39d353",
  });
};

export const buildReportEntry = (
  path: string,
  title?: string,
  subtitle?: string,
  stats?: ReportEntryStats,
): ReportEntry => ({
  path,
  week: path.split("/")[1] ?? path,
  year: path.split("/")[0] ?? "",
  title,
  subtitle,
  dateLabel: weekToDateLabel(path),
  stats,
});
