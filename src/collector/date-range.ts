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

// Get the local hour and minute at a given UTC instant in the given timezone.
const localTimeParts = (
  utcInstant: Date,
  tz: string,
): { hour: number; minute: number; day: number; month: number } => {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
  const parts = dtf.formatToParts(utcInstant);
  return {
    hour: Number(parts.find((p) => p.type === "hour")?.value ?? 0),
    minute: Number(parts.find((p) => p.type === "minute")?.value ?? 0),
    day: Number(parts.find((p) => p.type === "day")?.value ?? 0),
    month: Number(parts.find((p) => p.type === "month")?.value ?? 0),
  };
};

// Find the UTC instant that corresponds to midnight (00:00:00) of the given
// local date in `tz`. Uses an iterative approach to handle DST correctly.
const midnightInTz = (
  year: number,
  month: number,
  day: number,
  tz: string,
): Date => {
  // Start with UTC midnight of that calendar date as initial guess
  const rough = new Date(Date.UTC(year, month, day));

  // See what local time our guess corresponds to
  const local = localTimeParts(rough, tz);
  const localOffsetMs = (local.hour * 60 + local.minute) * 60_000;

  let candidate: Date;
  if (local.day === day && local.month === month + 1) {
    // Same day: subtract local time to reach midnight
    candidate = new Date(rough.getTime() - localOffsetMs);
  } else if (local.day > day || local.month > month + 1) {
    // Local date ahead (positive offset, e.g. JST +9)
    candidate = new Date(rough.getTime() - localOffsetMs);
  } else {
    // Local date behind (negative offset, e.g. EST -5)
    candidate = new Date(rough.getTime() + (24 * 60 * 60_000 - localOffsetMs));
  }

  // Verify: the candidate should be midnight of the target date.
  // If DST shifted the offset, the candidate might be off by an hour.
  const check = localTimeParts(candidate, tz);
  if (check.day === day && check.month === month + 1 && check.hour === 0 && check.minute === 0) {
    return candidate;
  }

  // Correction: adjust by the remaining local time at the candidate
  const remainMs = (check.hour * 60 + check.minute) * 60_000;
  if (remainMs > 0) {
    // If local time is ahead of midnight, subtract
    const adjusted = new Date(candidate.getTime() - remainMs);
    const recheck = localTimeParts(adjusted, tz);
    if (recheck.day === day && recheck.month === month + 1) {
      return adjusted;
    }
    // If subtracting went to previous day, try adding (24h - remain)
    const adjusted2 = new Date(candidate.getTime() + (24 * 60 * 60_000 - remainMs));
    const recheck2 = localTimeParts(adjusted2, tz);
    if (recheck2.day === day && recheck2.month === month + 1) {
      return adjusted2;
    }
  }

  // Fallback: brute-force search in 30-minute increments around the rough guess
  for (let offsetH = -14; offsetH <= 14; offsetH += 0.5) {
    const probe = new Date(rough.getTime() - offsetH * 3_600_000);
    const p = localTimeParts(probe, tz);
    if (p.day === day && p.month === month + 1 && p.hour === 0 && p.minute === 0) {
      return probe;
    }
  }

  return candidate;
};

// Parse a "YYYY-MM-DD" string as a date in the given timezone.
// Returns the UTC instant corresponding to noon of that local date,
// so that getWeekId / buildWeeklyRange resolve the correct day.
export const parseLocalDate = (dateStr: string, timezone: string): Date => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const midnight = midnightInTz(year, month - 1, day, timezone);
  return new Date(midnight.getTime() + 12 * 3_600_000);
};

export const buildWeeklyRange = (
  now: Date = new Date(),
  timezone: string = "UTC",
): DateRange => {
  const { year, month, day } = localDateParts(now, timezone);

  // "to" is end of today in the user's timezone (23:59:59.999)
  // Use next day's midnight - 1ms to handle DST days that are 23 or 25 hours
  const nextDay = new Date(Date.UTC(year, month, day + 1));
  const nextDayParts = {
    year: nextDay.getUTCFullYear(),
    month: nextDay.getUTCMonth(),
    day: nextDay.getUTCDate(),
  };
  const tomorrowMidnight = midnightInTz(nextDayParts.year, nextDayParts.month, nextDayParts.day, timezone);
  const to = new Date(tomorrowMidnight.getTime() - 1);

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
