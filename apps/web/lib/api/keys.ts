export const queryKeys = {
  config: ["config"] as const,
  repos: ["repos"] as const,
  repoStatus: (repoId: string) => ["repos", repoId, "status"] as const,
  repoFile: (repoId: string, path: string) =>
    ["repos", repoId, "file", path] as const,
}
