import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
const port = 3217;
let server;
test.before(async () => {
  server = spawn(process.execPath, ["server.js"], { env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try { await fetch(`http://localhost:${port}/api/health`); return; } catch { await new Promise((resolve) => setTimeout(resolve, 50)); }
  }
  throw new Error("server did not start");
});
test.after(() => server?.kill());
test("entries API returns bounded pagination metadata", async () => {
  const response = await fetch(`http://localhost:${port}/api/entries?page=1&limit=1`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.entries.length, 1);
  assert.equal(body.page, 1);
  assert.equal(body.limit, 1);
  assert.ok(body.pages >= 3);
  assert.ok(body.categories.includes("指南"));
});
test("entries API keeps malformed slugs as client errors", async () => {
  const response = await fetch(`http://localhost:${port}/api/entries/%E0%A4%A`);
  assert.equal(response.status, 400);
});
