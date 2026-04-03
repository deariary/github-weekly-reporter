// Handlebars custom helpers

import Handlebars from "handlebars";
import { parse as mdParse, parseInline as mdInline } from "marked";
import type { RepositoryActivity, Language } from "../types.js";
import { getLocale, formatNumber as fmtNumber } from "../i18n/index.js";

export type HelperOptions = {
  language: Language;
  timezone: string;
};

export const registerHelpers = (
  hbs: typeof Handlebars,
  options: HelperOptions = { language: "en", timezone: "UTC" },
): void => {
  const locale = getLocale(options.language);

  hbs.registerHelper("weekLabel", (from: string, to: string): string =>
    `${from} - ${to}`,
  );

  hbs.registerHelper("paragraphs", (text: string): string[] =>
    text.split("\n\n").map((p) => p.trim()).filter(Boolean),
  );

  hbs.registerHelper("fixed", (value: number, digits: number): string =>
    value.toFixed(digits),
  );

  hbs.registerHelper("weekday", (dateStr: string): string => {
    const date = new Date(dateStr + "T00:00:00Z");
    return locale.weekdaysShort[date.getUTCDay()];
  });

  hbs.registerHelper("formatNumber", (n: number): string =>
    fmtNumber(n, options.language),
  );

  hbs.registerHelper(
    "repoBarWidth",
    (prsOpened: number, repos: RepositoryActivity[]): number => {
      const max = Math.max(...repos.map((r) => r.prsOpened), 1);
      return Math.round((prsOpened / max) * 100);
    },
  );

  hbs.registerHelper(
    "sortReposDesc",
    (repos: RepositoryActivity[]): RepositoryActivity[] =>
      [...repos].sort((a, b) => b.prsOpened - a.prsOpened),
  );

  // i18n formatters (functions that take arguments)
  hbs.registerHelper("sectionsCount", (n: number): string =>
    locale.sectionsCount(n),
  );

  hbs.registerHelper("itemsCount", (n: number): string =>
    locale.itemsCount(n),
  );

  hbs.registerHelper("userWeek", (username: string): string =>
    locale.userWeek(username),
  );

  // Markdown rendering
  hbs.registerHelper("md", (text: string): Handlebars.SafeString =>
    new Handlebars.SafeString(mdParse(text ?? "") as string),
  );

  hbs.registerHelper("mdInline", (text: string): Handlebars.SafeString =>
    new Handlebars.SafeString(mdInline(text ?? "") as string),
  );

  hbs.registerHelper("eq", function (this: unknown, a: unknown, b: unknown, opts: Handlebars.HelperOptions) {
    return a === b ? opts.fn(this) : opts.inverse(this);
  });

  hbs.registerHelper("neq", function (this: unknown, a: unknown, b: unknown, opts: Handlebars.HelperOptions) {
    return a !== b ? opts.fn(this) : opts.inverse(this);
  });
};
