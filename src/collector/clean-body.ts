// Clean and truncate PR/Issue body text for storage and LLM consumption

const MAX_BODY_LENGTH = 300;

const stripHtmlComments = (text: string): string =>
  text.replace(/<!--[\s\S]*?-->/g, "");

const stripMarkdownTables = (text: string): string =>
  text.replace(/\|.*\|.*\n?(\|[-: ]+\|.*\n)?(\|.*\|.*\n?)*/g, "");

const stripCodeBlocks = (text: string): string =>
  text.replace(/```[\s\S]*?```/g, "");

const collapseWhitespace = (text: string): string =>
  text.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+/g, " ").trim();

const extractSummarySection = (text: string): string => {
  const summaryMatch = text.match(/## Summary\s*\n([\s\S]*?)(?=\n## |\n---|\z)/i);
  return summaryMatch ? summaryMatch[1].trim() : text;
};

export const cleanBody = (body: string | null): string | null => {
  if (!body) return null;

  const cleaned = [
    extractSummarySection,
    stripHtmlComments,
    stripMarkdownTables,
    stripCodeBlocks,
    collapseWhitespace,
  ].reduce((text, fn) => fn(text), body);

  if (!cleaned) return null;

  return cleaned.length > MAX_BODY_LENGTH
    ? cleaned.slice(0, MAX_BODY_LENGTH) + "..."
    : cleaned;
};
