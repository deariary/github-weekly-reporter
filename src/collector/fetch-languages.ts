// Fetch language breakdown for active repositories

import type { graphql } from "@octokit/graphql";
import { REPO_LANGUAGES_QUERY } from "./queries.js";
import type { LanguageBreakdown } from "../types.js";

type LanguagesResponse = {
  repository: {
    languages: {
      edges: {
        size: number;
        node: { name: string; color: string | null };
      }[];
    };
  };
};

type LanguageAccumulator = Map<string, { bytes: number; color: string }>;

const fetchRepoLanguages = async (
  gql: typeof graphql,
  repoFullName: string,
): Promise<{ name: string; bytes: number; color: string }[]> => {
  const [owner, name] = repoFullName.split("/");
  try {
    const { repository } = await gql<LanguagesResponse>(REPO_LANGUAGES_QUERY, {
      owner,
      name,
    });
    return repository.languages.edges.map((e) => ({
      name: e.node.name,
      bytes: e.size,
      color: e.node.color ?? "#8b8b8b",
    }));
  } catch {
    // Repository may be inaccessible with the given token
    return [];
  }
};

export const fetchLanguages = async (
  gql: typeof graphql,
  repoNames: string[],
): Promise<LanguageBreakdown[]> => {
  const uniqueRepos = [...new Set(repoNames)];
  const allLanguages = await Promise.all(
    uniqueRepos.map((repo) => fetchRepoLanguages(gql, repo)),
  );

  const accumulated = allLanguages.flat().reduce<LanguageAccumulator>(
    (acc, lang) => {
      const existing = acc.get(lang.name);
      acc.set(lang.name, {
        bytes: (existing?.bytes ?? 0) + lang.bytes,
        color: existing?.color ?? lang.color,
      });
      return acc;
    },
    new Map(),
  );

  const totalBytes = [...accumulated.values()].reduce(
    (sum, l) => sum + l.bytes,
    0,
  );

  return [...accumulated.entries()]
    .map(([language, { bytes, color }]) => ({
      language,
      bytes,
      percentage: totalBytes > 0 ? (bytes / totalBytes) * 100 : 0,
      color,
    }))
    .sort((a, b) => b.bytes - a.bytes);
};
