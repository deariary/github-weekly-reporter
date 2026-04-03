// Fetch the authenticated user's organizations

type OrgResponse = { login: string }[];

export const fetchUserOrgs = async (token: string): Promise<string[]> => {
  const response = await fetch("https://api.github.com/user/orgs?per_page=100", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "github-weekly-reporter",
    },
  });

  if (!response.ok) return [];
  const orgs = (await response.json()) as OrgResponse;
  return orgs.map((o) => o.login.toLowerCase());
};
