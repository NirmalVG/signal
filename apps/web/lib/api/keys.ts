export const queryKeys = {
  repos: ["repos"] as const,
  repoStatus: (repoId: string) => ["repos", repoId, "status"] as const,
}
