import { readFile } from "node:fs/promises";
const raw = await readFile(new URL("../data/wiki.json", import.meta.url), "utf8");
const data = JSON.parse(raw);
if (!Array.isArray(data.entries) || data.entries.length === 0) throw new Error("entries must be a non-empty array");
const slugs = new Set();
for (const entry of data.entries) {
  for (const key of ["slug", "title", "summary", "category", "content", "updatedAt", "status", "author"]) {
    if (typeof entry[key] !== "string" || !entry[key].trim()) throw new Error(`invalid ${key} in entry`);
  }
  if (slugs.has(entry.slug)) throw new Error(`duplicate slug: ${entry.slug}`);
  slugs.add(entry.slug);
  if (!Array.isArray(entry.tags)) throw new Error(`tags must be an array: ${entry.slug}`);
}
console.log(`Validated ${data.entries.length} wiki entries.`);
