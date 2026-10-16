import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
const port = 3221;
const suggestionsPath = new URL("./data/test-suggestions.json", import.meta.url);
let server;
test.before(async () => {
  await rm(suggestionsPath, { force: true });
  server = spawn(process.execPath, ["server.js"], { env: { ...process.env, PORT: String(port), SUGGESTIONS_PATH: fileURLToPath(suggestionsPath) }, stdio: "ignore" });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { await fetch(`http://localhost:${port}/api/health`); return; } catch { await new Promise((resolve) => setTimeout(resolve, 50)); }
  }
  throw new Error("server did not start");
});
test.after(async () => { server?.kill(); await rm(suggestionsPath, { force: true }); });
test("suggestions API validates and persists submissions", async () => {
  const response = await fetch(`http://localhost:${port}/api/suggestions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "new", title: "图书馆使用建议", summary: "帮助新同学了解公共空间的使用方法。", content: "建议补充开放时间、安静区域和借阅流程，并标明信息适用的学年。", source: "根据现场公告核验，待维护者复核。" }) });
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.status, "pending");
  const stored = JSON.parse(await readFile(suggestionsPath, "utf8"));
  assert.equal(stored.suggestions.length, 1);
  assert.equal(stored.suggestions[0].title, "图书馆使用建议");
});
test("suggestions API rejects incomplete corrections", async () => {
  const response = await fetch(`http://localhost:${port}/api/suggestions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "correction", title: "修正", summary: "太短", content: "也太短", source: "" }) });
  assert.equal(response.status, 400);
});
