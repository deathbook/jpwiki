import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("seed data has usable entries", async () => {
  const data = JSON.parse(await readFile(new URL("./data/wiki.json", import.meta.url), "utf8"));
  assert.ok(data.entries.length >= 3);
  assert.equal(new Set(data.entries.map((entry) => entry.slug)).size, data.entries.length);
});
