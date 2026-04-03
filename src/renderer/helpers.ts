// Handlebars custom helpers

import Handlebars from "handlebars";

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
};
