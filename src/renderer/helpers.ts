// Handlebars custom helpers

import Handlebars from "handlebars";
import type { RepositoryActivity } from "../types.js";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const registerHelpers = (hbs: typeof Handlebars): void => {
  hbs.registerHelper("weekLabel", (from: string, to: string): string =>
    `${from} — ${to}`,
  );

  hbs.registerHelper("paragraphs", (text: string): string[] =>
    text.split("\n\n").map((p) => p.trim()).filter(Boolean),
  );

  hbs.registerHelper("fixed", (value: number, digits: number): string =>
    value.toFixed(digits),
  );

  hbs.registerHelper("weekday", (dateStr: string): string => {
    const date = new Date(dateStr + "T00:00:00Z");
    return WEEKDAY_SHORT[date.getUTCDay()];
  });

  hbs.registerHelper("formatNumber", (n: number): string =>
    n.toLocaleString("en-US"),
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

  hbs.registerHelper("eq", function (this: unknown, a: unknown, b: unknown, options: Handlebars.HelperOptions) {
    return a === b ? options.fn(this) : options.inverse(this);
  });

  hbs.registerHelper("neq", function (this: unknown, a: unknown, b: unknown, options: Handlebars.HelperOptions) {
    return a !== b ? options.fn(this) : options.inverse(this);
  });
};
