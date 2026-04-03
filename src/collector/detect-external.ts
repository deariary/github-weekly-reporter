// Detect external repos from events (repos not owned by user or user's orgs)

import type { GitHubEvent } from "../types.js";

export const detectExternalRepos = (
  events: GitHubEvent[],
  username: string,
  userOrgs: string[],
): string[] => {
  const ownOwners = new Set([
    username.toLowerCase(),
    ...userOrgs.map((o) => o.toLowerCase()),
  ]);

  const externalRepos = new Set<string>();

  events.forEach((e) => {
    const owner = e.repo.split("/")[0]?.toLowerCase() ?? "";
    if (!ownOwners.has(owner)) {
      externalRepos.add(e.repo);
    }
  });

  return [...externalRepos];
};
