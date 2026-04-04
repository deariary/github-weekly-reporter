// ISO week number calculation (timezone-aware)

export type WeekId = {
  year: number;
  week: number;
  path: string; // e.g. "2026/W14"
};

const localDateParts = (
  date: Date,
  tz: string,
): { year: number; month: number; day: number } => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year, month, day] = fmt.format(date).split("-").map(Number);
  return { year, month: month - 1, day };
};

const getISOWeekNumber = (date: Date, timezone: string): number => {
  const { year, month, day } = localDateParts(date, timezone);
  const d = new Date(Date.UTC(year, month, day));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
};

export const getWeekId = (
  date: Date = new Date(),
  timezone: string = "UTC",
): WeekId => {
  // Target the previous ISO week (the one we are reporting on)
  const { year, month, day } = localDateParts(date, timezone);
  const d = new Date(Date.UTC(year, month, day));
  const dow = d.getUTCDay() || 7; // 1=Mon..7=Sun
  // Go to previous week's Thursday (ISO week is identified by its Thursday)
  const prevThursday = new Date(Date.UTC(year, month, day - (dow - 1) - 7 + 3));
  const prevWeek = getISOWeekNumber(prevThursday, timezone);
  const prevYear = localDateParts(prevThursday, timezone).year;
  const padded = String(prevWeek).padStart(2, "0");
  return { year: prevYear, week: prevWeek, path: `${prevYear}/W${padded}` };
};
