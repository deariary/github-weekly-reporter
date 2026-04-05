// GitHub API helpers and repository management

// ── GitHub API helpers ───────────────────────────────────────

type GitHubHeaders = Record<string, string>;

const ghHeaders = (token: string): GitHubHeaders => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
});

const ghFetch = async (
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> =>
  fetch(`https://api.github.com${path}`, {
    method,
    headers: ghHeaders(token),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

export const ghGet = (token: string, path: string) => ghFetch(token, "GET", path);
export const ghPost = (token: string, path: string, body: unknown) => ghFetch(token, "POST", path, body);
export const ghPut = (token: string, path: string, body: unknown) => ghFetch(token, "PUT", path, body);

// ── Token validation ─────────────────────────────────────────

export const validateToken = async (
  token: string,
): Promise<{ login: string; tokenType: "classic" | "fine-grained" }> => {
  const res = await ghGet(token, "/user");
  if (res.status === 401) {
    throw new Error(
      "Invalid or expired token.\n\n" +
        "  Create a token at: https://github.com/settings/tokens\n\n" +
        "  Classic PAT scopes needed: repo, workflow\n" +
        "  Fine-grained PAT:\n" +
        "    Repository access: All repositories\n" +
        "    Permissions: Actions, Administration, Contents,\n" +
        "                 Pages, Secrets, Workflows (all Read & Write)",
    );
  }
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  const { login } = (await res.json()) as { login: string };
  const scopeHeader = res.headers.get("x-oauth-scopes");

  // Fine-grained tokens do not return x-oauth-scopes header.
  // We cannot validate permissions upfront, so we validate lazily
  // when each API call is made and provide clear error messages.
  if (scopeHeader === null) {
    return { login, tokenType: "fine-grained" };
  }

  // Classic PAT: validate scopes
  const scopes = scopeHeader.split(",").map((s) => s.trim());
  const missing = ["repo", "workflow"].filter((s) => !scopes.includes(s));
  if (missing.length > 0) {
    throw new Error(
      `Token is missing required scopes: ${missing.join(", ")}\n\n` +
        "  Create a new token at: https://github.com/settings/tokens/new?scopes=repo,workflow\n" +
        "  Required scopes: repo, workflow",
    );
  }

  return { login, tokenType: "classic" };
};

// ── Secret encryption (sealed box via libsodium) ────────────

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const setRepoSecret = async (
  token: string,
  repo: string,
  name: string,
  value: string,
): Promise<boolean> => {
  const { default: _sodium } = await import("libsodium-wrappers");
  await _sodium.ready;

  // Retry up to 3 times with backoff (new repos may need time to propagate)
  for (let attempt = 0; attempt < 3; attempt++) {
    const keyRes = await ghGet(token, `/repos/${repo}/actions/secrets/public-key`);
    if (!keyRes.ok) {
      if (attempt < 2) {
        await sleep(3000 * (attempt + 1));
        continue;
      }
      return false;
    }

    const { key, key_id } = (await keyRes.json()) as {
      key: string;
      key_id: string;
    };
    const keyBytes = _sodium.from_base64(key, _sodium.base64_variants.ORIGINAL);
    const encrypted = _sodium.crypto_box_seal(new TextEncoder().encode(value), keyBytes);
    const encryptedB64 = _sodium.to_base64(encrypted, _sodium.base64_variants.ORIGINAL);

    const res = await ghPut(token, `/repos/${repo}/actions/secrets/${name}`, {
      encrypted_value: encryptedB64,
      key_id,
    });
    if (res.ok) return true;

    const body = await res.text().catch(() => "");
    console.log(`      Attempt ${attempt + 1}/3 failed: ${res.status} ${body.slice(0, 200)}`);

    if (attempt < 2) {
      await sleep(3000 * (attempt + 1));
      continue;
    }
    return false;
  }
  return false;
};

// ── Repository management ────────────────────────────────────

export const ensureRepo = async (
  token: string,
  fullRepo: string,
): Promise<boolean> => {
  const res = await ghGet(token, `/repos/${fullRepo}`);
  if (res.ok) return false;

  const [owner, name] = fullRepo.split("/");
  const { login } = (await (await ghGet(token, "/user")).json()) as {
    login: string;
  };

  const homepage = `https://${owner}.github.io/${name}`;
  const body = {
    name,
    auto_init: true,
    private: false,
    description: "Weekly GitHub activity reports",
    homepage,
  };

  const createRes =
    owner === login
      ? await ghPost(token, "/user/repos", body)
      : await ghPost(token, `/orgs/${owner}/repos`, body);

  if (!createRes.ok) {
    const errBody = await createRes.text();
    throw new Error(
      `Failed to create ${fullRepo}: ${createRes.status}\n  ${errBody}`,
    );
  }

  // Wait for repo to be ready
  await new Promise((r) => setTimeout(r, 2000));
  return true;
};

const REPO_TOPICS = [
  "github-weekly-reporter",
  "weekly-report",
  "github-activity",
  "github-pages",
];

export const setRepoTopics = async (
  token: string,
  repo: string,
): Promise<void> => {
  await ghPut(token, `/repos/${repo}/topics`, { names: REPO_TOPICS });
};

export const addFileToRepo = async (
  token: string,
  repo: string,
  path: string,
  content: string,
  message: string,
): Promise<void> => {
  const existing = await ghGet(token, `/repos/${repo}/contents/${path}`);
  const sha = existing.ok
    ? ((await existing.json()) as { sha: string }).sha
    : undefined;

  const res = await ghPut(token, `/repos/${repo}/contents/${path}`, {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    ...(sha ? { sha } : {}),
  });
  if (!res.ok) {
    throw new Error(`Failed to add ${path}: ${res.status}`);
  }
};

export const enablePages = async (
  token: string,
  repo: string,
): Promise<string> => {
  // Enable Pages from main branch, /output directory (may already be enabled)
  await ghPost(token, `/repos/${repo}/pages`, {
    source: { branch: "gh-pages", path: "/" },
  });

  const [owner, name] = repo.split("/");
  return `https://${owner}.github.io/${name}`;
};
