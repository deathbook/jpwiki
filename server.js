import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const dataPath = path.join(root, "data", "wiki.json");
const staticRoot = path.join(root, "public");
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };

async function loadData() { return JSON.parse(await readFile(dataPath, "utf8")); }
function json(res, status, body) { res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }); res.end(JSON.stringify(body)); }
function clean(value) { return String(value || "").trim().slice(0, 80); }
async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/api/health") return json(res, 200, { ok: true, service: "jpwiki", time: new Date().toISOString() });
  if (url.pathname === "/api/entries") {
    const data = await loadData();
    const q = clean(url.searchParams.get("q")).toLocaleLowerCase("zh-CN");
    const category = clean(url.searchParams.get("category"));
    let entries = data.entries;
    if (category) entries = entries.filter((e) => e.category === category);
    if (q) entries = entries.filter((e) => [e.title, e.summary, e.content, e.category, ...(e.tags || [])].join(" ").toLocaleLowerCase("zh-CN").includes(q));
    return json(res, 200, { entries, total: entries.length });
  }
  const match = url.pathname.match(/^\/api\/entries\/([^/]+)$/);
  if (match) {
    const data = await loadData();
    const entry = data.entries.find((item) => item.slug === decodeURIComponent(match[1]));
    return entry ? json(res, 200, entry) : json(res, 404, { error: "条目不存在" });
  }
  let requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const file = path.resolve(staticRoot, `.${requested}`);
  if (!file.startsWith(path.resolve(staticRoot))) return json(res, 400, { error: "invalid path" });
  try { const body = await readFile(file); res.writeHead(200, { "content-type": mime[path.extname(file)] || "application/octet-stream" }); res.end(body); }
  catch { res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }); res.end("Not found"); }
}
const server = http.createServer((req, res) => route(req, res).catch((error) => { console.error(error); json(res, 500, { error: "服务器暂时不可用" }); }));
server.listen(port, () => console.log(`JPWiki listening on http://localhost:${port}`));
