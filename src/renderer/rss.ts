// RSS 2.0 feed generator for weekly reports

import type { ReportEntry } from "../deployer/index-page.js";

export type RSSChannelOptions = {
  title: string;
  link: string;
  description: string;
  language: string;
};

const escapeXml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const weekPathToDate = (path: string): string => {
  const [yearStr, weekStr] = path.split("/");
  const year = Number(yearStr);
  const week = Number(weekStr?.replace("W", ""));
  // ISO week: Jan 4 is always in week 1. Find the Monday of the given week.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7; // 1=Mon..7=Sun
  const monday = new Date(jan4.getTime() + (1 - dayOfWeek + (week - 1) * 7) * 86_400_000);
  // Use Sunday (end of week) as publication date
  const sunday = new Date(monday.getTime() + 6 * 86_400_000);
  return sunday.toUTCString();
};

const buildItem = (entry: ReportEntry, baseUrl: string): string => {
  const link = `${baseUrl}/${entry.path}/`;
  const title = escapeXml(entry.title ?? entry.dateLabel);
  const description = escapeXml(entry.subtitle ?? "");
  const ogImageUrl = `${baseUrl}/${entry.path}/og.png`;
  const pubDate = weekPathToDate(entry.path);

  return [
    "    <item>",
    `      <title>${title}</title>`,
    `      <link>${escapeXml(link)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
    `      <description>${description}</description>`,
    `      <pubDate>${pubDate}</pubDate>`,
    `      <enclosure url="${escapeXml(ogImageUrl)}" type="image/png" length="0" />`,
    "    </item>",
  ].join("\n");
};

export const buildRSSFeed = (
  entries: ReportEntry[],
  channel: RSSChannelOptions,
): string => {
  const sorted = [...entries].sort((a, b) => b.path.localeCompare(a.path));
  const items = sorted.map((e) => buildItem(e, channel.link)).join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(channel.title)}</title>`,
    `    <link>${escapeXml(channel.link)}/</link>`,
    `    <description>${escapeXml(channel.description)}</description>`,
    `    <language>${escapeXml(channel.language)}</language>`,
    `    <atom:link href="${escapeXml(channel.link)}/feed.xml" rel="self" type="application/rss+xml" />`,
    items,
    "  </channel>",
    "</rss>",
  ].join("\n");
};
