// Compute the date range for the past 7 days, timezone-aware

export type DateRange = {
  from: Date;
  to: Date;
};

// Resolve the local date components (year, month, day) in the given timezone.
const localDateParts = (
  now: Date,
  tz: string,
): { year: number; month: number; day: number } => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA formats as YYYY-MM-DD
  const [year, month, day] = fmt.format(now).split("-").map(Number);
  return { year, month: month - 1, day };
};

// Find the UTC instant that corresponds to midnight (00:00:00) of the given
// local date in `tz`.
const midnightInTz = (
  year: number,
  month: number,
  day: number,
  tz: string,
): Date => {
  // Start with UTC midnight of that calendar date as a rough estimate
  const rough = new Date(Date.UTC(year, month, day));

  // Determine what local time it is at our rough estimate
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
  const parts = dtf.formatToParts(rough);
  const localHour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const localMinute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const localDay = Number(parts.find((p) => p.type === "day")?.value ?? day);
  const localMonth = Number(parts.find((p) => p.type === "month")?.value ?? month + 1);

  // The local time at our rough guess tells us the timezone offset
  // If local day matches, subtract the local time to get back to midnight
  // If local day is ahead (e.g. day+1), we're behind: add the difference
  const localOffsetMs = (localHour * 60 + localMinute) * 60_000;

  if (localDay === day && localMonth === month + 1) {
    // Local date matches: we're ahead by localOffsetMs
    return new Date(rough.getTime() - localOffsetMs);
  }

  if (localDay > day || localMonth > month + 1) {
    // Local date is ahead (positive offset timezone, e.g. JST +9)
    return new Date(rough.getTime() - localOffsetMs);
  }

  // Local date is behind (negative offset timezone, e.g. US/Pacific -7/-8)
  // Local time is (24 - offset) hours of the previous day
  return new Date(rough.getTime() + (24 * 60 * 60_000 - localOffsetMs));
};

export const buildWeeklyRange = (
  now: Date = new Date(),
  timezone: string = "UTC",
): DateRange => {
  const { year, month, day } = localDateParts(now, timezone);

  // "to" is end of today in the user's timezone (23:59:59.999)
  const todayMidnight = midnightInTz(year, month, day, timezone);
  const to = new Date(todayMidnight.getTime() + 24 * 60 * 60_000 - 1);

  // "from" is start of (today - 6 days) in the user's timezone (00:00:00.000)
  const fromDate = new Date(Date.UTC(year, month, day - 6));
  const fromParts = {
    year: fromDate.getUTCFullYear(),
    month: fromDate.getUTCMonth(),
    day: fromDate.getUTCDate(),
  };
  const from = midnightInTz(fromParts.year, fromParts.month, fromParts.day, timezone);

  return { from, to };
};

export const toISODate = (date: Date, timezone: string = "UTC"): string => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(date);
};
