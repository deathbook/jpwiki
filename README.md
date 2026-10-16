# JPWiki

建平中学 JPWiki 是一个由师生与校友共同维护的开放校园知识库，记录课程、社团、校园生活和实用指南。项目以 SHS Wiki 的社区协作思路为参考，使用独立的视觉风格，优先保证内容可核验、隐私友好和移动端可用。

## 本地运行

需要 Node.js 20 或更高版本：

```bash
npm run check
npm start
```

打开 <http://localhost:3000>。可用接口：

- `GET /api/health`：服务健康检查
- `GET /api/entries?q=关键词&category=分类`：搜索和筛选条目
- `GET /api/entries/:slug`：读取单个条目

## 内容贡献

内容目前保存在 `data/wiki.json`，提交前运行 `npm run check`。请不要提交个人隐私、未经证实的校务信息、联系方式或受版权保护的材料。新增内容应标明来源、适用学年和“待审核”状态，争议内容交由社区讨论。

欢迎通过 GitHub Issues 提交想法和错误报告，或创建分支提交 Pull Request。请先阅读 [贡献指南](CONTRIBUTING.md)。

## 许可证

代码使用 MIT License；社区内容默认使用 CC BY-SA 4.0，除非条目另有说明。
