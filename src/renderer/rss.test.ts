import { describe, it, expect } from "vitest";
import { buildRSSFeed } from "./rss.js";
import type { ReportEntry } from "../deployer/index-page.js";

const makeEntry = (
  path: string,
  title: string,
  subtitle: string,
  dateTo?: string,
): ReportEntry => ({
  path,
  week: path.split("/")[1] ?? path,
  year: path.split("/")[0] ?? "",
  title,
  subtitle,
  dateLabel: `${path.split("/")[0]} ${path.split("/")[1]}`,
  dateTo,
});

const defaultChannel = (overrides: Record<string, string> = {}) => ({
  title: "Dev Pulse",
  link: "https://user.github.io/repo",
  description: "Weekly reports by @testuser",
  language: "en",
  timezone: "UTC",
  ...overrides,
});

describe("buildRSSFeed", () => {
  it("generates valid RSS 2.0 XML with items sorted newest-first", () => {
    const entries: ReportEntry[] = [
      makeEntry("2026/W12", "Week 12 Title", "Week 12 subtitle", "2026-03-22"),
      makeEntry("2026/W14", "Week 14 Title", "Week 14 subtitle", "2026-04-05"),
      makeEntry("2026/W13", "Week 13 Title", "Week 13 subtitle", "2026-03-29"),
    ];

    const feed = buildRSSFeed(entries, defaultChannel());

    expect(feed).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(feed).toContain('<rss version="2.0"');
    expect(feed).toContain("<title>Dev Pulse</title>");
    expect(feed).toContain("<link>https://user.github.io/repo/</link>");
    expect(feed).toContain("<description>Weekly reports by @testuser</description>");
    expect(feed).toContain("<language>en</language>");

    // Items should be sorted newest first (W14, W13, W12)
    const w14Pos = feed.indexOf("Week 14 Title");
    const w13Pos = feed.indexOf("Week 13 Title");
    const w12Pos = feed.indexOf("Week 12 Title");
    expect(w14Pos).toBeLessThan(w13Pos);
    expect(w13Pos).toBeLessThan(w12Pos);
  });

  it("includes OG image in enclosure and media:content", () => {
    const entries = [makeEntry("2026/W14", "Title", "Subtitle", "2026-04-05")];
    const feed = buildRSSFeed(entries, defaultChannel({ link: "https://example.com" }));

    // enclosure tag
    expect(feed).toContain('url="https://example.com/2026/W14/og.png"');
    expect(feed).toContain('type="image/png"');

    // media:content with dimensions
    expect(feed).toContain('<media:content url="https://example.com/2026/W14/og.png"');
    expect(feed).toContain('width="1200"');
    expect(feed).toContain('height="630"');
    expect(feed).toContain('medium="image"');
  });

  it("includes permalink guids", () => {
    const entries = [makeEntry("2026/W14", "Title", "Subtitle", "2026-04-05")];
    const feed = buildRSSFeed(entries, defaultChannel({ link: "https://example.com" }));

    expect(feed).toContain('<guid isPermaLink="true">https://example.com/2026/W14/</guid>');
  });

  it("escapes XML special characters", () => {
    const entries = [makeEntry("2026/W14", "Title <>&\"'", "Sub <>&", "2026-04-05")];
    const feed = buildRSSFeed(entries, defaultChannel({
      title: "Site & Title",
      description: "A <desc>",
    }));

    expect(feed).toContain("Site &amp; Title");
    expect(feed).toContain("Title &lt;&gt;&amp;&quot;&apos;");
    expect(feed).toContain("Sub &lt;&gt;&amp;");
    expect(feed).toContain("A &lt;desc&gt;");
  });

  it("includes atom:link for self-reference", () => {
    const entries = [makeEntry("2026/W14", "Title", "Sub", "2026-04-05")];
    const feed = buildRSSFeed(entries, defaultChannel({ language: "ja" }));

    expect(feed).toContain('href="https://user.github.io/repo/feed.xml"');
    expect(feed).toContain('rel="self"');
    expect(feed).toContain("<language>ja</language>");
  });

  it("computes pubDate as Monday 01:00 local in UTC timezone", () => {
    // dateRange.to = 2026-04-05 (Sunday), so pubDate = Monday 2026-04-06 01:00 UTC
    const entries = [makeEntry("2026/W14", "Title", "Sub", "2026-04-05")];
    const feed = buildRSSFeed(entries, defaultChannel({ timezone: "UTC" }));

    expect(feed).toContain("<pubDate>");
    expect(feed).toContain("Mon, 06 Apr 2026 01:00:00 GMT");
  });

  it("computes pubDate with Asia/Tokyo timezone", () => {
    // dateRange.to = 2026-04-05 (Sunday)
    // Monday 01:00 JST = Sunday 16:00 UTC
    const entries = [makeEntry("2026/W14", "Title", "Sub", "2026-04-05")];
    const feed = buildRSSFeed(entries, defaultChannel({ timezone: "Asia/Tokyo" }));

    expect(feed).toContain("Sun, 05 Apr 2026 16:00:00 GMT");
  });

  it("computes pubDate with US/Eastern timezone", () => {
    // dateRange.to = 2026-04-05 (Sunday), EDT is UTC-4 in April
    // Monday 01:00 EDT = Monday 05:00 UTC
    const entries = [makeEntry("2026/W14", "Title", "Sub", "2026-04-05")];
    const feed = buildRSSFeed(entries, defaultChannel({ timezone: "US/Eastern" }));

    expect(feed).toContain("Mon, 06 Apr 2026 05:00:00 GMT");
  });

  it("omits pubDate when dateTo is not available", () => {
    const entry: ReportEntry = {
      path: "2026/W14",
      week: "W14",
      year: "2026",
      title: undefined,
      subtitle: undefined,
      dateLabel: "2026 W14",
    };

    const feed = buildRSSFeed([entry], defaultChannel());

    expect(feed).toContain("<title>2026 W14</title>");
    expect(feed).not.toContain("<pubDate>");
  });

  it("includes overview and stats in description", () => {
    const entry: ReportEntry = {
      path: "2026/W14",
      week: "W14",
      year: "2026",
      title: "Big Week",
      subtitle: "Shipped auth refactor",
      overview: "This week focused on the auth refactor. The new OAuth2 flow is live.",
      dateLabel: "2026 W14",
      dateTo: "2026-04-05",
      stats: { commits: 42, prs: 5, reviews: 8 },
    };

    const feed = buildRSSFeed([entry], defaultChannel());

    expect(feed).toContain("Shipped auth refactor");
    expect(feed).toContain("This week focused on the auth refactor");
    expect(feed).toContain("Commits: 42, PRs: 5, Reviews: 8");
  });

  it("includes only subtitle when overview and stats are absent", () => {
    const entries = [makeEntry("2026/W14", "Title", "Just a subtitle", "2026-04-05")];
    const feed = buildRSSFeed(entries, defaultChannel());

    expect(feed).toContain("Just a subtitle");
    expect(feed).not.toContain("Commits:");
  });

  it("includes channel image with site OG image", () => {
    const feed = buildRSSFeed([], defaultChannel({ link: "https://example.com" }));

    expect(feed).toContain("<image>");
    expect(feed).toContain("<url>https://example.com/og.png</url>");
    expect(feed).toContain("<width>1200</width>");
    expect(feed).toContain("<height>630</height>");
  });

  it("includes media RSS namespace", () => {
    const feed = buildRSSFeed([], defaultChannel());

    expect(feed).toContain('xmlns:media="http://search.yahoo.com/mrss/"');
  });

  it("returns empty items for empty entries", () => {
    const feed = buildRSSFeed([], defaultChannel());

    expect(feed).toContain("<channel>");
    expect(feed).not.toContain("<item>");
  });
});
