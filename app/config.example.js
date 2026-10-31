// Copy to config.js (git-ignored) and fill in. Publishable keys are public by design, but keep config.js out of git anyway.
window.BOARD_CONFIG = {
  repo: "<GITHUB_USER>/<REPO_NAME>",                                   // public repo, e.g. "your-name/github-deploy-demo"
  branch: "main",
  functionUrl: "https://<PROJECT_REF>.supabase.co/functions/v1/applied-migrations",
  publishableKey: "<PUBLISHABLE_KEY>",                                 // sb_publishable_...
};
