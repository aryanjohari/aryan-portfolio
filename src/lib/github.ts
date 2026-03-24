import { siteConfig } from "../../site.config";

/**
 * Placeholder for GitHub data fetching. Use `siteConfig.urls.githubApiBase` as the API root.
 */
export async function fetchGithubUserRepos(): Promise<readonly unknown[]> {
  const _base = siteConfig.urls.githubApiBase;
  return [];
}
