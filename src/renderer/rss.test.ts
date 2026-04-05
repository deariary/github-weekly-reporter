import { describe, it, expect } from "vitest";
import { buildRSSFeed } from "./rss.js";
import type { ReportEntry } from "../deployer/index-page.js";

const makeEntry = (path: string, title: string, subtitle: string): ReportEntry => ({
  path,
  week: path.split("/")[1] ?? path,
  year: path.split("/")[0] ?? "",
  title,
  subtitle,
  dateLabel: `${path.split("/")[0]} ${path.split("/")[1]}`,
});

describe("buildRSSFeed", () => {
  it("generates valid RSS 2.0 XML with items sorted newest-first", () => {
    const entries: ReportEntry[] = [
      makeEntry("2026/W12", "Week 12 Title", "Week 12 subtitle"),
      makeEntry("2026/W14", "Week 14 Title", "Week 14 subtitle"),
      makeEntry("2026/W13", "Week 13 Title", "Week 13 subtitle"),
    ];

    const feed = buildRSSFeed(entries, {
      title: "Dev Pulse",
      link: "https://user.github.io/repo",
      description: "Weekly reports by @testuser",
      language: "en",
    });

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

  it("includes OG image URLs in enclosure tags", () => {
    const entries = [makeEntry("2026/W14", "Title", "Subtitle")];

    const feed = buildRSSFeed(entries, {
      title: "Test",
      link: "https://example.com",
      description: "desc",
      language: "en",
    });

    expect(feed).toContain('url="https://example.com/2026/W14/og.png"');
    expect(feed).toContain('type="image/png"');
  });

  it("includes permalink guids", () => {
    const entries = [makeEntry("2026/W14", "Title", "Subtitle")];

    const feed = buildRSSFeed(entries, {
      title: "Test",
      link: "https://example.com",
      description: "desc",
      language: "en",
    });

    expect(feed).toContain('<guid isPermaLink="true">https://example.com/2026/W14/</guid>');
  });

  it("escapes XML special characters", () => {
    const entries = [makeEntry("2026/W14", "Title <>&\"'", "Sub <>&")];

    const feed = buildRSSFeed(entries, {
      title: "Site & Title",
      link: "https://example.com",
      description: "A <desc>",
      language: "en",
    });

    expect(feed).toContain("Site &amp; Title");
    expect(feed).toContain("Title &lt;&gt;&amp;&quot;&apos;");
    expect(feed).toContain("Sub &lt;&gt;&amp;");
    expect(feed).toContain("A &lt;desc&gt;");
  });

  it("includes atom:link for self-reference", () => {
    const entries = [makeEntry("2026/W14", "Title", "Sub")];

    const feed = buildRSSFeed(entries, {
      title: "Test",
      link: "https://example.com",
      description: "desc",
      language: "ja",
    });

    expect(feed).toContain('href="https://example.com/feed.xml"');
    expect(feed).toContain('rel="self"');
    expect(feed).toContain("<language>ja</language>");
  });

  it("uses dateLabel as fallback title when title is undefined", () => {
    const entry: ReportEntry = {
      path: "2026/W14",
      week: "W14",
      year: "2026",
      title: undefined,
      subtitle: undefined,
      dateLabel: "2026 W14",
    };

    const feed = buildRSSFeed([entry], {
      title: "Test",
      link: "https://example.com",
      description: "desc",
      language: "en",
    });

    expect(feed).toContain("<title>2026 W14</title>");
  });

  it("returns empty items for empty entries", () => {
    const feed = buildRSSFeed([], {
      title: "Test",
      link: "https://example.com",
      description: "desc",
      language: "en",
    });

    expect(feed).toContain("<channel>");
    expect(feed).not.toContain("<item>");
  });
});
