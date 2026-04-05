// Internationalization: locale strings, date/number formatting, LLM instructions

import type { Language } from "../types.js";
import { parseLocalDate } from "../collector/date-range.js";

export { getFontConfig } from "./fonts.js";
export type { FontConfig } from "./fonts.js";

// Static strings that can be used directly in templates
export type LocaleStrings = {
  weekdaysShort: string[];
  sectionSummary: string;
  sectionHighlights: string;
  allWeeks: string;
  prevWeek: string;
  nextWeek: string;
  share: string;
  poweredBy: string;
  generatedWith: string;
  weeklyReports: string;
  weeklyReport: string;
};

// Dynamic strings that require arguments (registered as Handlebars helpers)
export type LocaleFormatters = {
  sectionsCount: (n: number) => string;
  itemsCount: (n: number) => string;
  userWeek: (username: string) => string;
};

export type Locale = LocaleStrings & LocaleFormatters;

// BCP 47 locale tag for Intl APIs
const BCP47: Record<Language, string> = {
  en: "en-US",
  ja: "ja-JP",
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
  ko: "ko-KR",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  pt: "pt-BR",
  ru: "ru-RU",
};

// ---------------------------------------------------------------------------
// Locale definitions
// ---------------------------------------------------------------------------

const en: Locale = {
  weekdaysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  sectionSummary: "Summary",
  sectionHighlights: "Highlights",
  allWeeks: "All weeks",
  prevWeek: "Previous week",
  nextWeek: "Next week",
  share: "Share",
  poweredBy: "Powered by",
  generatedWith: "Generated with",
  weeklyReports: "Weekly Reports",
  weeklyReport: "Weekly Report",
  sectionsCount: (n) => `${n} sections`,
  itemsCount: (n) => `${n} items`,
  userWeek: (u) => `${u}'s Week`,
};

const ja: Locale = {
  weekdaysShort: ["日", "月", "火", "水", "木", "金", "土"],
  sectionSummary: "サマリー",
  sectionHighlights: "ハイライト",
  allWeeks: "すべての週",
  prevWeek: "前の週",
  nextWeek: "次の週",
  share: "シェア",
  poweredBy: "Powered by",
  generatedWith: "Generated with",
  weeklyReports: "ウィークリーレポート",
  weeklyReport: "ウィークリーレポート",
  sectionsCount: (n) => `${n} セクション`,
  itemsCount: (n) => `${n} 件`,
  userWeek: (u) => `${u} の一週間`,
};

const zhCN: Locale = {
  weekdaysShort: ["日", "一", "二", "三", "四", "五", "六"],
  sectionSummary: "摘要",
  sectionHighlights: "亮点",
  allWeeks: "所有周报",
  prevWeek: "上一周",
  nextWeek: "下一周",
  share: "分享",
  poweredBy: "Powered by",
  generatedWith: "Generated with",
  weeklyReports: "每周报告",
  weeklyReport: "每周报告",
  sectionsCount: (n) => `${n} 个部分`,
  itemsCount: (n) => `${n} 项`,
  userWeek: (u) => `${u} 的一周`,
};

const zhTW: Locale = {
  weekdaysShort: ["日", "一", "二", "三", "四", "五", "六"],
  sectionSummary: "摘要",
  sectionHighlights: "亮點",
  allWeeks: "所有週報",
  prevWeek: "上一週",
  nextWeek: "下一週",
  share: "分享",
  poweredBy: "Powered by",
  generatedWith: "Generated with",
  weeklyReports: "每週報告",
  weeklyReport: "每週報告",
  sectionsCount: (n) => `${n} 個部分`,
  itemsCount: (n) => `${n} 項`,
  userWeek: (u) => `${u} 的一週`,
};

const ko: Locale = {
  weekdaysShort: ["일", "월", "화", "수", "목", "금", "토"],
  sectionSummary: "요약",
  sectionHighlights: "하이라이트",
  allWeeks: "모든 주",
  prevWeek: "이전 주",
  nextWeek: "다음 주",
  share: "공유",
  poweredBy: "Powered by",
  generatedWith: "Generated with",
  weeklyReports: "주간 보고서",
  weeklyReport: "주간 보고서",
  sectionsCount: (n) => `${n}개 섹션`,
  itemsCount: (n) => `${n}개 항목`,
  userWeek: (u) => `${u}의 한 주`,
};

const es: Locale = {
  weekdaysShort: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
  sectionSummary: "Resumen",
  sectionHighlights: "Destacados",
  allWeeks: "Todas las semanas",
  prevWeek: "Semana anterior",
  nextWeek: "Semana siguiente",
  share: "Compartir",
  poweredBy: "Powered by",
  generatedWith: "Generated with",
  weeklyReports: "Informes semanales",
  weeklyReport: "Informe semanal",
  sectionsCount: (n) => `${n} secciones`,
  itemsCount: (n) => `${n} elementos`,
  userWeek: (u) => `Semana de ${u}`,
};

const fr: Locale = {
  weekdaysShort: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
  sectionSummary: "Résumé",
  sectionHighlights: "Points forts",
  allWeeks: "Toutes les semaines",
  prevWeek: "Semaine précédente",
  nextWeek: "Semaine suivante",
  share: "Partager",
  poweredBy: "Powered by",
  generatedWith: "Generated with",
  weeklyReports: "Rapports hebdomadaires",
  weeklyReport: "Rapport hebdomadaire",
  sectionsCount: (n) => `${n} sections`,
  itemsCount: (n) => `${n} éléments`,
  userWeek: (u) => `Semaine de ${u}`,
};

const de: Locale = {
  weekdaysShort: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
  sectionSummary: "Zusammenfassung",
  sectionHighlights: "Highlights",
  allWeeks: "Alle Wochen",
  prevWeek: "Vorherige Woche",
  nextWeek: "Nächste Woche",
  share: "Teilen",
  poweredBy: "Powered by",
  generatedWith: "Generated with",
  weeklyReports: "Wochenberichte",
  weeklyReport: "Wochenbericht",
  sectionsCount: (n) => `${n} Abschnitte`,
  itemsCount: (n) => `${n} Einträge`,
  userWeek: (u) => `${u}s Woche`,
};

const pt: Locale = {
  weekdaysShort: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
  sectionSummary: "Resumo",
  sectionHighlights: "Destaques",
  allWeeks: "Todas as semanas",
  prevWeek: "Semana anterior",
  nextWeek: "Próxima semana",
  share: "Compartilhar",
  poweredBy: "Powered by",
  generatedWith: "Generated with",
  weeklyReports: "Relatórios semanais",
  weeklyReport: "Relatório semanal",
  sectionsCount: (n) => `${n} seções`,
  itemsCount: (n) => `${n} itens`,
  userWeek: (u) => `Semana de ${u}`,
};

const ru: Locale = {
  weekdaysShort: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
  sectionSummary: "Итоги",
  sectionHighlights: "Основное",
  allWeeks: "Все недели",
  prevWeek: "Предыдущая неделя",
  nextWeek: "Следующая неделя",
  share: "Поделиться",
  poweredBy: "Powered by",
  generatedWith: "Generated with",
  weeklyReports: "Еженедельные отчеты",
  weeklyReport: "Еженедельный отчет",
  sectionsCount: (n) => `${n} разделов`,
  itemsCount: (n) => `${n} элементов`,
  userWeek: (u) => `Неделя ${u}`,
};

const locales: Record<Language, Locale> = {
  en,
  ja,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  ko,
  es,
  fr,
  de,
  pt,
  ru,
};

export const getLocale = (language: Language): Locale =>
  locales[language] ?? locales.en;

// ---------------------------------------------------------------------------
// Formatting helpers (use BCP 47 tags for Intl APIs)
// ---------------------------------------------------------------------------

export const getBcp47 = (language: Language): string =>
  BCP47[language] ?? "en-US";

export const formatDate = (
  dateStr: string,
  language: Language,
  timezone: string = "UTC",
): string => {
  const date = parseLocalDate(dateStr, timezone);
  const tag = getBcp47(language);
  const usesNumericMonth = ["ja", "zh-CN", "zh-TW", "ko"].includes(language);
  return date.toLocaleDateString(tag, {
    timeZone: timezone,
    year: "numeric",
    month: usesNumericMonth ? "numeric" : "short",
    day: "numeric",
  });
};

export const formatNumber = (n: number, language: Language): string =>
  n.toLocaleString(getBcp47(language));

// ---------------------------------------------------------------------------
// LLM language instructions
// ---------------------------------------------------------------------------

const LLM_INSTRUCTIONS: Record<Language, string | null> = {
  en: null,
  ja: [
    "IMPORTANT: Write ALL text content in Japanese.",
    "Use casual, plain form (da/dearu style). NEVER use desu/masu form.",
    "Write like a developer jotting down notes in their personal log.",
    "Technical terms (OAuth, JWT, PR, etc.) can stay in English.",
    "Example tone: 'OAuth2 PKCE移行を進めた。認証フロー全体をリファクタし、JWTに切り替えた。'",
  ].join(" "),
  "zh-CN": [
    "IMPORTANT: Write ALL text content in Simplified Chinese.",
    "Use a casual, direct tone like a developer's personal notes.",
    "Technical terms can stay in English.",
  ].join(" "),
  "zh-TW": [
    "IMPORTANT: Write ALL text content in Traditional Chinese.",
    "Use a casual, direct tone like a developer's personal notes.",
    "Technical terms can stay in English.",
  ].join(" "),
  ko: [
    "IMPORTANT: Write ALL text content in Korean.",
    "Use a casual, direct tone (haeyo or haera style).",
    "Technical terms can stay in English.",
  ].join(" "),
  es: [
    "IMPORTANT: Write ALL text content in Spanish.",
    "Use a casual, direct tone like a developer's personal log.",
  ].join(" "),
  fr: [
    "IMPORTANT: Write ALL text content in French.",
    "Use a casual, direct tone like a developer's personal log. Use 'tu' form if addressing the reader.",
  ].join(" "),
  de: [
    "IMPORTANT: Write ALL text content in German.",
    "Use a casual, direct tone like a developer's personal log.",
  ].join(" "),
  pt: [
    "IMPORTANT: Write ALL text content in Brazilian Portuguese.",
    "Use a casual, direct tone like a developer's personal log.",
  ].join(" "),
  ru: [
    "IMPORTANT: Write ALL text content in Russian.",
    "Use a casual, direct tone like a developer's personal log.",
    "Technical terms can stay in English.",
  ].join(" "),
};

export const llmLanguageInstruction = (language: Language): string | null =>
  LLM_INSTRUCTIONS[language] ?? null;
