// Handlebars custom helpers

import Handlebars from "handlebars";

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

  hbs.registerHelper("heatmapLevel", (count: number): number => {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 10) return 3;
    return 4;
  });

  hbs.registerHelper("weekday", (dateStr: string): string => {
    const date = new Date(dateStr + "T00:00:00Z");
    return WEEKDAY_SHORT[date.getUTCDay()];
  });

  // Block helpers for equality comparison
  hbs.registerHelper("eq", function (this: unknown, a: unknown, b: unknown, options: Handlebars.HelperOptions) {
    return a === b ? options.fn(this) : options.inverse(this);
  });

  hbs.registerHelper("neq", function (this: unknown, a: unknown, b: unknown, options: Handlebars.HelperOptions) {
    return a !== b ? options.fn(this) : options.inverse(this);
  });
};
