// Compute the date range for the past 7 days (UTC-based)

export type DateRange = {
  from: Date;
  to: Date;
};

export const buildWeeklyRange = (now: Date = new Date()): DateRange => {
  const to = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23, 59, 59, 999,
    ),
  );

  const from = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - 6,
      0, 0, 0, 0,
    ),
  );

  return { from, to };
};

export const toISODate = (date: Date): string =>
  date.toISOString().split("T")[0];
