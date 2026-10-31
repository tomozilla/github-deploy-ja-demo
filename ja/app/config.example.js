// config.js（git 管理外）としてコピーし、値を入れてください。publishable key は公開前提のキーですが、config.js は念のため git に入れないでください。
window.BOARD_CONFIG = {
  repo: "<GITHUB_USER>/<REPO_NAME>",                                   // 公開リポジトリ。例: "your-name/github-deploy-demo"
  branch: "main",
  functionUrl: "https://<PROJECT_REF>.supabase.co/functions/v1/applied-migrations",
  publishableKey: "<PUBLISHABLE_KEY>",                                 // sb_publishable_...
};
