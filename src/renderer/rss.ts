// RSS 2.0 feed generator for weekly reports

import type { ReportEntry } from "../deployer/index-page.js";

export type RSSChannelOptions = {
  title: string;
  link: string;
  description: string;
  language: string;
  timezone: string; // IANA timezone (e.g. "Asia/Tokyo")
};

const escapeXml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// Compute the pubDate for an RSS item.
// The weekly report cron fires at local 01:00 on the day after dateRange.to
// (i.e. Monday 01:00 local time). We reconstruct that UTC instant.
const computePubDate = (dateTo: string, timezone: string): string => {
  const [y, m, d] = dateTo.split("-").map(Number);
  // dateRange.to is Sunday. The next day (Monday) at 01:00 local time.
  const mondayLocal = new Date(Date.UTC(y, m - 1, d + 1));

  // Find UTC offset for the timezone at that date
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
  const parts = fmt.formatToParts(mondayLocal);
  const localHour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const localMin = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const localDay = Number(parts.find((p) => p.type === "day")?.value ?? 0);
  const localMonth = Number(parts.find((p) => p.type === "month")?.value ?? 0);

  // mondayLocal (UTC midnight of target calendar day) maps to localHour:localMin
  // in the given timezone. The offset in ms is: localTime - utcTime
  const offsetMs = ((localDay === d + 1 && localMonth === m)
    ? (localHour * 60 + localMin) * 60_000
    : localDay > d + 1 || localMonth > m
      ? (localHour * 60 + localMin) * 60_000
      : -((24 * 60 - localHour * 60 - localMin) * 60_000));

  // We want Monday 01:00 local = UTC midnight + (01:00 local offset in UTC)
  // local 01:00 = utc + offset => utc = local 01:00 - offset
  const targetUtc = new Date(mondayLocal.getTime() + 1 * 3_600_000 - offsetMs);
  return targetUtc.toUTCString();
};

const buildItem = (entry: ReportEntry, baseUrl: string, timezone: string): string => {
  const link = `${baseUrl}/${entry.path}/`;
  const title = escapeXml(entry.title ?? entry.dateLabel);
  const description = escapeXml(entry.subtitle ?? "");
  const ogImageUrl = `${baseUrl}/${entry.path}/og.png`;
  const pubDate = entry.dateTo
    ? computePubDate(entry.dateTo, timezone)
    : "";

  return [
    "    <item>",
    `      <title>${title}</title>`,
    `      <link>${escapeXml(link)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
    `      <description>${description}</description>`,
    ...(pubDate ? [`      <pubDate>${pubDate}</pubDate>`] : []),
    `      <enclosure url="${escapeXml(ogImageUrl)}" type="image/png" length="0" />`,
    "    </item>",
  ].join("\n");
};

export const buildRSSFeed = (
  entries: ReportEntry[],
  channel: RSSChannelOptions,
): string => {
  const sorted = [...entries].sort((a, b) => b.path.localeCompare(a.path));
  const items = sorted.map((e) => buildItem(e, channel.link, channel.timezone)).join("\n");

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
