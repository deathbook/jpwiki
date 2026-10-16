import { mkdir, writeFile } from "node:fs/promises";
const data = { entries: [
  { slug: "welcome", title: "欢迎来到 JPWiki", summary: "建平中学的开放知识库，从可验证的校园经验开始。", category: "指南", tags: ["新手", "社区"], updatedAt: new Date().toISOString().slice(0, 10), status: "待审核", author: "JPWiki 社区", content: "JPWiki 面向建平中学师生与校友，记录课程、社团、校园生活与实用指南。" }
]};
await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(new URL("../data/wiki.json", import.meta.url), JSON.stringify(data, null, 2) + "\n");
console.log("Seeded data/wiki.json");
