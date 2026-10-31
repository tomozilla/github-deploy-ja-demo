// デプロイボード: ビルド不要、フレームワークなし。3つの情報源をページ上で見比べます。
//  1. リポジトリにあるマイグレーションファイル（GitHub contents API。公開リポジトリなのでトークン不要）
//  2. 本番ブランチの最新の「Supabase Preview」チェック（GitHub check-runs API）
//  3. データベースが「適用済み」と記録しているマイグレーション（Edge Function。publishable key が必要）
// GitHub はトークンなしだと IP ごとに1時間あたり60リクエストまで。1回の更新で2リクエスト使うので、自動更新はありません。
const cfg = window.BOARD_CONFIG;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function getJson(url, label, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${label} がステータス ${res.status} を返しました`);
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
      getJson(`${gh}/contents/supabase/migrations?ref=${cfg.branch}`, "GitHub（マイグレーションファイル）"),
      getJson(`${gh}/commits/${cfg.branch}/check-runs`, "GitHub（チェック結果）"),
      getJson(cfg.functionUrl, "Edge Function", { headers: { apikey: cfg.publishableKey } }),
    ]);
    render(files, checks, applied.applied);
    $("meta").textContent = "更新時刻 " + new Date().toLocaleTimeString() +
      "。今回使った GitHub へのリクエスト: 2回（トークンなしの上限は1時間に60回）。";
  } catch (e) {
    $("banner").innerHTML = `<div class="banner warn">すべてを読み込めませんでした: ${esc(e.message)}。 ` +
      `これが解消するまで、下の表示は信用できません。（オフライン、レート制限、または config.js のキーの間違いが考えられます。）</div>`;
    $("rows").innerHTML = `<tr><td colspan="2">データがありません。</td></tr>`;
  } finally {
    btn.disabled = false;
  }
}

function render(files, checks, applied) {
  const appliedVersions = new Set(applied.map((a) => a.version));
  // チェック名「Supabase Preview」は GitHub 上の名前なので、そのままにしています
  const run = (checks.check_runs || []).find((r) => r.name === "Supabase Preview");
  const failed = run && run.conclusion === "failure";
  const running = run && run.status !== "completed";

  const repoFiles = files.filter((f) => f.name.endsWith(".sql")).map((f) => ({
    name: f.name, version: f.name.split("_")[0],
  })).sort((a, b) => a.version.localeCompare(b.version));
  const repoVersions = new Set(repoFiles.map((f) => f.version));

  let firstUnapplied = true;
  const rows = repoFiles.map((f) => {
    if (appliedVersions.has(f.version)) return row(f.name, "適用済み", "p-applied");
    // マイグレーションは順番に実行されます。最初の未適用ファイルが失敗し、残りはその後ろで待たされます。
    const label = failed ? (firstUnapplied ? "失敗 / 止めている原因" : "ブロック中") : running ? "実行中" : "未適用";
    const cls = failed ? "p-blocked" : "p-pending";
    firstUnapplied = false;
    return row(f.name, label, cls);
  });
  // データベースには適用済みなのに、リポジトリにはもうファイルがないもの（誰かがデータベースを直接変更した、またはファイルを消した）
  applied.filter((a) => !repoVersions.has(a.version)).forEach((a) =>
    rows.push(row(`${a.version}_${a.name}.sql`, "データベースにあるがリポジトリにない", "p-missing")));
  $("rows").innerHTML = rows.join("") || `<tr><td colspan="2">マイグレーションファイルが見つかりません。</td></tr>`;

  const waiting = repoFiles.filter((f) => !appliedVersions.has(f.version)).length;
  if (failed) {
    $("banner").innerHTML = `<div class="banner bad"><b>${esc(cfg.branch)} の直近のデプロイは失敗しました。</b> ` +
      `${waiting} 個のファイルが、データベースに適用済みとして記録されていません。</div>`;
    $("detail").innerHTML = `<h3>GitHub からのメッセージ</h3><pre>${esc(((run.output && run.output.summary) || "（メッセージなし）").replace(/^```\n?|\n?```\s*$/g, ""))}</pre>`;
  } else if (running) {
    $("banner").innerHTML = `<div class="banner warn">デプロイを実行中です。数秒たってから「更新」を押してください。</div>`;
  } else if (waiting === 0) {
    $("banner").innerHTML = `<div class="banner ok"><b>リポジトリのファイルはすべて適用済みです。</b> ` +
      `${esc(cfg.branch)} の直近のデプロイチェック: ${run ? esc(run.conclusion) : "見つかりません"}。</div>`;
  } else {
    $("banner").innerHTML = `<div class="banner warn">${waiting} 個のファイルが未適用ですが、失敗の報告はありません。 ` +
      `少し待つか、連携がオフになっていないか確認してください。</div>`;
  }
}

function row(name, label, cls) {
  return `<tr><td>${esc(name)}</td><td><span class="pill ${cls}">${esc(label)}</span></td></tr>`;
}

$("refresh").addEventListener("click", refresh);
if (!cfg || cfg.repo.includes("<")) {
  $("banner").innerHTML = `<div class="banner warn">まず config.example.js を config.js にコピーして、値を入れてください。</div>`;
  $("refresh").disabled = true;
} else {
  refresh();
}
