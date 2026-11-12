import { parse } from "yaml";

import { isNonEmptyString, isRecord } from "./schema-helpers";

const BRANCH = "main";

export type FetchedProject = {
  yamlText: string;
  /** The face image named by the yaml, if any. */
  face?: { repoPath: string; bytes: Uint8Array };
};

function rawUrl(repo: string, path: string): string {
  return `https://raw.githubusercontent.com/${repo}/${BRANCH}/${path}`;
}

async function getOrThrow(fetchImpl: typeof fetch, url: string, token?: string): Promise<Response> {
  const response = await fetchImpl(url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
  if (!response.ok) {
    const hint = response.status === 404 && !token ? "; private repos need GITHUB_TOKEN" : "";
    throw new Error(`GET ${url} failed with HTTP ${response.status}${hint}`);
  }
  return response;
}

/**
 * Downloads a repo's portfolio.yaml (and the face image it names) from main.
 * Validation happens later, in the same place as for local projects.
 */
export async function fetchRepoProject(
  repo: string,
  { fetchImpl = fetch, token }: { fetchImpl?: typeof fetch; token?: string } = {},
): Promise<FetchedProject> {
  const yamlText = await (await getOrThrow(fetchImpl, rawUrl(repo, "portfolio.yaml"), token)).text();

  const data: unknown = parse(yamlText);
  const repoPath = isRecord(data) && isNonEmptyString(data.face) ? data.face.replace(/^\/+/, "") : undefined;
  if (!repoPath) {
    return { yamlText };
  }

  const imageResponse = await getOrThrow(fetchImpl, rawUrl(repo, repoPath), token);
  return { yamlText, face: { repoPath, bytes: new Uint8Array(await imageResponse.arrayBuffer()) } };
}
