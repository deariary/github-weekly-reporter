// ISO week number calculation (timezone-aware)

import { localDateParts } from "../collector/date-range.js";

export type WeekId = {
  year: number;
  week: number;
  path: string; // e.g. "2026/W14"
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

// Current ISO week ID. Used by daily-fetch to store events for the
// week that is still in progress.
export const getCurrentWeekId = (
  date: Date = new Date(),
  timezone: string = "UTC",
): WeekId => {
  const { year, month, day } = localDateParts(date, timezone);
  const d = new Date(Date.UTC(year, month, day));
  const dow = d.getUTCDay() || 7; // 1=Mon..7=Sun
  // This week's Thursday
  const thisThursday = new Date(Date.UTC(year, month, day - (dow - 1) + 3));
  const week = getISOWeekNumber(thisThursday, timezone);
  const weekYear = localDateParts(thisThursday, timezone).year;
  const padded = String(week).padStart(2, "0");
  return { year: weekYear, week, path: `${weekYear}/W${padded}` };
};
