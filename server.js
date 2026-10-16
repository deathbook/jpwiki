import http from "node:http";
import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomUUID } from "node:crypto";


const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const dataPath = path.join(root, "data", "wiki.json");
const suggestionsPath = process.env.SUGGESTIONS_PATH || path.join(root, "data", "suggestions.json");
const maxRequestBytes = 32 * 1024;
const rateWindowMs = 60 * 1000;
const rateLimit = 5;
const requestLog = new Map();
const staticRoot = path.join(root, "public");
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };

async function loadData() { return JSON.parse(await readFile(dataPath, "utf8")); }
function json(res, status, body) { res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }); res.end(JSON.stringify(body)); }
function clean(value, max = 80) { return String(value ?? "").trim().slice(0, max); }
function clientKey(req) { return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim(); }
function isRateLimited(req) {
  const now = Date.now();
  const key = clientKey(req);
  const recent = (requestLog.get(key) || []).filter((timestamp) => now - timestamp < rateWindowMs);
  recent.push(now);
  requestLog.set(key, recent);
  return recent.length > rateLimit;
}
async function readJsonBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxRequestBytes) throw Object.assign(new Error("request too large"), { status: 413 });
    chunks.push(chunk);
  }
  if (!size) throw Object.assign(new Error("request body required"), { status: 400 });
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw Object.assign(new Error("invalid json"), { status: 400 }); }
}
function validateSuggestion(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "请求格式不正确" };
  const type = body.type === "correction" ? "correction" : body.type === "new" ? "new" : "";
  const title = clean(body.title, 120);
  const summary = clean(body.summary, 300);
  const content = clean(body.content, 10000);
  const source = clean(body.source, 500);
  const slug = clean(body.slug, 80);
  const tags = Array.isArray(body.tags) ? body.tags.map((tag) => clean(tag, 24)).filter(Boolean).slice(0, 8) : [];
  if (!type) return { error: "请选择建议类型" };
  if (title.length < 2) return { error: "标题至少需要 2 个字" };
  if (summary.length < 10) return { error: "摘要至少需要 10 个字" };
  if (content.length < 20) return { error: "内容至少需要 20 个字" };
  if (type === "correction" && !slug) return { error: "修正现有条目时请填写条目标识" };
  if (!source) return { error: "请填写公开来源或核验说明" };
  return { value: { type, title, summary, content, source, slug, tags } };
}
async function saveSuggestion(suggestion) {
  const dir = path.dirname(suggestionsPath);
  await mkdir(dir, { recursive: true });
  let current = { suggestions: [] };
  try { current = JSON.parse(await readFile(suggestionsPath, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (!Array.isArray(current.suggestions)) current.suggestions = [];
  current.suggestions.push(suggestion);
  const temporary = `${suggestionsPath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(current, null, 2) + "\n", "utf8");
  await rename(temporary, suggestionsPath);
}
async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/api/health") return json(res, 200, { ok: true, service: "jpwiki", time: new Date().toISOString() });
  if (url.pathname === "/api/suggestions" && req.method === "POST") {
    if (isRateLimited(req)) return json(res, 429, { error: "提交过于频繁，请稍后再试" });
    const body = await readJsonBody(req);
    const result = validateSuggestion(body);
    if (result.error) return json(res, 400, { error: result.error });
    const suggestion = { id: randomUUID(), ...result.value, status: "pending", createdAt: new Date().toISOString() };
    await saveSuggestion(suggestion);
    return json(res, 201, { id: suggestion.id, status: suggestion.status, message: "已收到建议，审核后会处理" });
  }
  if (url.pathname === "/api/suggestions") return json(res, 405, { error: "仅支持 POST" });
  if (url.pathname === "/api/entries") {
    const data = await loadData();
    const q = clean(url.searchParams.get("q")).toLocaleLowerCase("zh-CN");
    const category = clean(url.searchParams.get("category"));
    const requestedPage = Number.parseInt(url.searchParams.get("page") || "1", 10);
    const requestedLimit = Number.parseInt(url.searchParams.get("limit") || "20", 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 10000) : 1;
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 50) : 20;
    let entries = data.entries;
    if (category) entries = entries.filter((e) => e.category === category);
    if (q) entries = entries.filter((e) => [e.title, e.summary, e.content, e.category, ...(e.tags || [])].join(" ").toLocaleLowerCase("zh-CN").includes(q));
    const total = entries.length;
    const categories = [...new Set(data.entries.map((entry) => entry.category))].sort();
    const start = (page - 1) * limit;
    return json(res, 200, { entries: entries.slice(start, start + limit), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)), categories });
  }
  const match = url.pathname.match(/^\/api\/entries\/([^/]+)$/);
  if (match) {
    const data = await loadData();
    let slug;
    try { slug = decodeURIComponent(match[1]); } catch { return json(res, 400, { error: "无效的条目标识" }); }
    const entry = data.entries.find((item) => item.slug === slug);
    return entry ? json(res, 200, entry) : json(res, 404, { error: "条目不存在" });
  }
  // Client-side detail view: serve the shell for /entry/:slug and let app.js load the record.
  if (url.pathname.match(/^\/entry\/[^/]+$/)) url.pathname = "/index.html";
  let requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const file = path.resolve(staticRoot, `.${requested}`);
  const relative = path.relative(staticRoot, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return json(res, 400, { error: "invalid path" });
  try { const body = await readFile(file); res.writeHead(200, { "content-type": mime[path.extname(file)] || "application/octet-stream" }); res.end(body); }
  catch { res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }); res.end("Not found"); }
}
const server = http.createServer((req, res) => route(req, res).catch((error) => { if (error.status) return json(res, error.status, { error: error.status === 413 ? "请求内容过大" : error.status === 400 ? error.message : "请求无法处理" }); console.error(error); json(res, 500, { error: "服务器暂时不可用" }); }));
server.listen(port, () => console.log(`JPWiki listening on http://localhost:${port}`));

