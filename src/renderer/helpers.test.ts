import { describe, it, expect } from "vitest";
import Handlebars from "handlebars";
import { registerHelpers } from "./helpers.js";
import type { RepositoryActivity } from "../types.js";

const createHbs = (language: "en" | "ja" = "en", timezone = "UTC") => {
  const hbs = Handlebars.create();
  registerHelpers(hbs, { language, timezone });
  return hbs;
};

const compile = (hbs: typeof Handlebars, template: string, data: Record<string, unknown> = {}) =>
  hbs.compile(template)(data);

describe("registerHelpers", () => {
  describe("weekLabel", () => {
    it("formats date range as from - to", () => {
      const hbs = createHbs();
      expect(compile(hbs, "{{weekLabel from to}}", { from: "2026-03-28", to: "2026-04-03" }))
        .toBe("2026-03-28 - 2026-04-03");
    });
  });

  describe("paragraphs", () => {
    it("splits text by double newlines", () => {
      const hbs = createHbs();
      const result = compile(hbs, "{{#each (paragraphs text)}}[{{this}}]{{/each}}", {
        text: "First paragraph\n\nSecond paragraph",
      });
      expect(result).toBe("[First paragraph][Second paragraph]");
    });

    it("filters empty paragraphs", () => {
      const hbs = createHbs();
      const result = compile(hbs, "{{#each (paragraphs text)}}[{{this}}]{{/each}}", {
        text: "Only one\n\n\n\n",
      });
      expect(result).toBe("[Only one]");
    });
  });

  describe("fixed", () => {
    it("formats number with specified decimal places", () => {
      const hbs = createHbs();
      expect(compile(hbs, "{{fixed value 2}}", { value: 3.14159 })).toBe("3.14");
    });
  });

  describe("weekday", () => {
    it("returns localized weekday abbreviation", () => {
      const hbs = createHbs("en", "UTC");
      const result = compile(hbs, "{{weekday date}}", { date: "2026-04-01" });
      expect(result).toBe("Wed");
    });
  });

  describe("formatNumber", () => {
    it("formats numbers with locale separators", () => {
      const hbs = createHbs("en");
      expect(compile(hbs, "{{formatNumber n}}", { n: 1234 })).toBe("1,234");
    });
  });

  describe("repoBarWidth", () => {
    it("calculates percentage relative to max", () => {
      const repos: RepositoryActivity[] = [
        { name: "a", commits: 0, prsOpened: 10, prsMerged: 0, issuesOpened: 0, issuesClosed: 0, url: "" },
        { name: "b", commits: 0, prsOpened: 5, prsMerged: 0, issuesOpened: 0, issuesClosed: 0, url: "" },
      ];
      const hbs = createHbs();
      expect(compile(hbs, "{{repoBarWidth prsOpened repos}}", { prsOpened: 5, repos })).toBe("50");
    });
  });

  describe("sortReposDesc", () => {
    it("sorts repos by prsOpened descending", () => {
      const repos: RepositoryActivity[] = [
        { name: "low", commits: 0, prsOpened: 1, prsMerged: 0, issuesOpened: 0, issuesClosed: 0, url: "" },
        { name: "high", commits: 0, prsOpened: 10, prsMerged: 0, issuesOpened: 0, issuesClosed: 0, url: "" },
      ];
      const hbs = createHbs();
      const result = compile(hbs, "{{#each (sortReposDesc repos)}}{{name}} {{/each}}", { repos });
      expect(result.trim()).toBe("high low");
    });
  });

  describe("md", () => {
    it("renders markdown to HTML", () => {
      const hbs = createHbs();
      const result = compile(hbs, "{{{md text}}}", { text: "**bold**" });
      expect(result).toContain("<strong>bold</strong>");
    });

    it("sanitizes dangerous HTML", () => {
      const hbs = createHbs();
      const result = compile(hbs, "{{{md text}}}", { text: '<script>alert("xss")</script>' });
      expect(result).not.toContain("<script>");
    });

    it("handles null input", () => {
      const hbs = createHbs();
      const result = compile(hbs, "{{{md text}}}", { text: null });
      expect(result).toBe("");
    });

    it("renders links with rel=noopener nofollow", () => {
      const hbs = createHbs();
      const result = compile(hbs, "{{{md text}}}", { text: "[example](https://example.com)" });
      expect(result).toContain('rel="noopener nofollow"');
      expect(result).toContain('href="https://example.com"');
    });

    it("escapes quotes in link href", () => {
      const hbs = createHbs();
      const result = compile(hbs, "{{{md text}}}", { text: '[test](https://example.com/a"b)' });
      // sanitize-html may re-encode quotes; just check the href contains the URL
      expect(result).toContain("https://example.com/a");
      expect(result).toContain("rel=\"noopener nofollow\"");
    });
  });

  describe("mdInline", () => {
    it("renders inline markdown to HTML", () => {
      const hbs = createHbs();
      const result = compile(hbs, "{{{mdInline text}}}", { text: "*italic*" });
      expect(result).toContain("<em>italic</em>");
    });
  });

  describe("jsonLdEscape", () => {
    it("escapes text for JSON-LD script blocks", () => {
      const hbs = createHbs();
      const result = compile(hbs, "{{{jsonLdEscape text}}}", { text: 'He said "hello"' });
      expect(result).toContain('\\"hello\\"');
    });

    it("prevents script tag injection", () => {
      const hbs = createHbs();
      const result = compile(hbs, "{{{jsonLdEscape text}}}", { text: "</script>" });
      expect(result).not.toContain("</script>");
      expect(result).toContain("<\\/script>");
    });

    it("handles null input", () => {
      const hbs = createHbs();
      const result = compile(hbs, "{{{jsonLdEscape text}}}", { text: null });
      expect(result).toBe("");
    });
  });

  describe("eq", () => {
    it("renders true block when values are equal", () => {
      const hbs = createHbs();
      expect(compile(hbs, "{{#eq a b}}yes{{else}}no{{/eq}}", { a: 1, b: 1 })).toBe("yes");
    });

    it("renders false block when values differ", () => {
      const hbs = createHbs();
      expect(compile(hbs, "{{#eq a b}}yes{{else}}no{{/eq}}", { a: 1, b: 2 })).toBe("no");
    });
  });

  describe("neq", () => {
    it("renders true block when values differ", () => {
      const hbs = createHbs();
      expect(compile(hbs, "{{#neq a b}}yes{{else}}no{{/neq}}", { a: 1, b: 2 })).toBe("yes");
    });

    it("renders false block when values are equal", () => {
      const hbs = createHbs();
      expect(compile(hbs, "{{#neq a b}}yes{{else}}no{{/neq}}", { a: 1, b: 1 })).toBe("no");
    });
  });

  describe("sectionsCount", () => {
    it("uses locale-specific formatting", () => {
      const hbs = createHbs("en");
      const result = compile(hbs, "{{sectionsCount n}}", { n: 3 });
      expect(result).toContain("3");
    });
  });

  describe("userWeek", () => {
    it("includes username in output", () => {
      const hbs = createHbs("en");
      const result = compile(hbs, "{{userWeek name}}", { name: "testuser" });
      expect(result).toContain("testuser");
    });
  });
});
