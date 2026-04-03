// ISO week number calculation

export type WeekId = {
  year: number;
  week: number;
  path: string; // e.g. "2026/W14"
};

const getISOWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
};

export const getWeekId = (date: Date = new Date()): WeekId => {
  const year = date.getUTCFullYear();
  const week = getISOWeekNumber(date);
  const padded = String(week).padStart(2, "0");
  return { year, week, path: `${year}/W${padded}` };
};
