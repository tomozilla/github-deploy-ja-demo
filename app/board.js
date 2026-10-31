// Deploy board: no build step, no framework. Three sources, compared on the page:
//  1. migration files in the repo (GitHub contents API, public repo, no token)
//  2. the latest "Supabase Preview" check on the production branch (GitHub check-runs API)
//  3. the migrations the database says it applied (Edge Function, needs the publishable key)
// GitHub allows 60 unauthenticated requests per hour per IP, and one refresh uses 2, so there is NO auto-refresh.
const cfg = window.BOARD_CONFIG;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function getJson(url, label, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${label} answered ${res.status}`);
  return res.json();
}

async function refresh() {
  const btn = $("refresh");
  btn.disabled = true;
  $("banner").innerHTML = "";
  $("detail").innerHTML = "";
  try {
    const gh = "https://api.github.com/repos/" + cfg.repo;
    const [files, checks, applied] = await Promise.all([
      getJson(`${gh}/contents/supabase/migrations?ref=${cfg.branch}`, "GitHub (migration files)"),
      getJson(`${gh}/commits/${cfg.branch}/check-runs`, "GitHub (check results)"),
      getJson(cfg.functionUrl, "The Edge Function", { headers: { apikey: cfg.publishableKey } }),
    ]);
    render(files, checks, applied.applied);
    $("meta").textContent = "Updated " + new Date().toLocaleTimeString() +
      ". GitHub requests used: 2 (limit 60 per hour without a token).";
  } catch (e) {
    $("banner").innerHTML = `<div class="banner warn">Could not load everything: ${esc(e.message)}. ` +
      `Nothing below is trustworthy until this works. (Offline, rate limit, or a wrong key in config.js.)</div>`;
    $("rows").innerHTML = `<tr><td colspan="2">No data.</td></tr>`;
  } finally {
    btn.disabled = false;
  }
}

function render(files, checks, applied) {
  const appliedVersions = new Set(applied.map((a) => a.version));
  const run = (checks.check_runs || []).find((r) => r.name === "Supabase Preview");
  const failed = run && run.conclusion === "failure";
  const running = run && run.status !== "completed";

  const repoFiles = files.filter((f) => f.name.endsWith(".sql")).map((f) => ({
    name: f.name, version: f.name.split("_")[0],
  })).sort((a, b) => a.version.localeCompare(b.version));
  const repoVersions = new Set(repoFiles.map((f) => f.version));

  let firstUnapplied = true;
  const rows = repoFiles.map((f) => {
    if (appliedVersions.has(f.version)) return row(f.name, "applied", "p-applied");
    // Migrations run in order: the first unapplied file is the one that fails, the rest wait behind it.
    const label = failed ? (firstUnapplied ? "failed / blocking" : "blocked") : running ? "running" : "pending";
    const cls = failed ? "p-blocked" : "p-pending";
    firstUnapplied = false;
    return row(f.name, label, cls);
  });
  // Applied in the database but no file in the repo any more (someone changed the database or deleted a file)
  applied.filter((a) => !repoVersions.has(a.version)).forEach((a) =>
    rows.push(row(`${a.version}_${a.name}.sql`, "in database, not in repo", "p-missing")));
  $("rows").innerHTML = rows.join("") || `<tr><td colspan="2">No migration files found.</td></tr>`;

  const waiting = repoFiles.filter((f) => !appliedVersions.has(f.version)).length;
  if (failed) {
    $("banner").innerHTML = `<div class="banner bad"><b>The last deploy on ${esc(cfg.branch)} failed.</b> ` +
      `${waiting} file(s) are not recorded as applied in the database.</div>`;
    $("detail").innerHTML = `<h3>What GitHub says</h3><pre>${esc(((run.output && run.output.summary) || "(no message)").replace(/^```\n?|\n?```\s*$/g, ""))}</pre>`;
  } else if (running) {
    $("banner").innerHTML = `<div class="banner warn">A deploy is running. Press Refresh in a few seconds.</div>`;
  } else if (waiting === 0) {
    $("banner").innerHTML = `<div class="banner ok"><b>Everything in the repo is applied.</b> ` +
      `Last deploy check on ${esc(cfg.branch)}: ${run ? esc(run.conclusion) : "none found"}.</div>`;
  } else {
    $("banner").innerHTML = `<div class="banner warn">${waiting} file(s) not applied and no failure reported. ` +
      `Wait a moment, or the integration may be off.</div>`;
  }
}

function row(name, label, cls) {
  return `<tr><td>${esc(name)}</td><td><span class="pill ${cls}">${esc(label)}</span></td></tr>`;
}

$("refresh").addEventListener("click", refresh);
if (!cfg || cfg.repo.includes("<")) {
  $("banner").innerHTML = `<div class="banner warn">Copy config.example.js to config.js and fill it in first.</div>`;
  $("refresh").disabled = true;
} else {
  refresh();
}
